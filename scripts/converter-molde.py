"""
Converte um template desenhado DENTRO DE UM MOLDE (o formato que o cliente
vai usar) para camadas por cor.

Formato de entrada (export do Figma/Illustrator):

    <mask id="..." style="mask-type:alpha"> <path d="silhueta"/> </mask>
    <g mask="url(#...)">
        <rect fill="#1F2A44"/>          ← fundo
        <path stroke="#CB9863" .../>    ← arte
        <g>                             ← o Figma embrulha grupos de arte
          <mask style="mask-type:luminance"> <path fill="white"/> </mask>
          <g mask="url(#...)"> ...arte... </g>
        </g>
    </g>

A máscara ALFA é a peça; o que está dentro do grupo é a estampa. A caixa da
máscara passa a ser o QUADRO — é ela que o motor mapeia para a caixa da
peça no visualizador, tal como fazia com a prancheta do Illustrator. A
silhueta em si não é precisa: o recorte já é feito pelo alfa do PNG da peça
— e é por isso que as máscaras de LUMINÂNCIA lá dentro se podem ignorar:
são estênceis do Figma, não desenho.

Cada COR distinta (de preenchimento ou de traço) vira uma camada
recolorível. O retângulo que cobre o molde inteiro não vira camada: passa
a ser a cor de fundo da peça.

    python3 scripts/converter-molde.py <svg> <saida.ts> <prefixo>

O `prefixo` é só informativo: as camadas são numeradas por posição
(cor1, cor2, ...), que é o que as liga entre peças.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

SVG_NS = '{http://www.w3.org/2000/svg}'
FORMAS = ('path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line')
ATRS = {
    'path': ('d',),
    'rect': ('x', 'y', 'width', 'height', 'rx', 'ry'),
    'circle': ('cx', 'cy', 'r'),
    'ellipse': ('cx', 'cy', 'rx', 'ry'),
    'polygon': ('points',),
    'polyline': ('points',),
    'line': ('x1', 'y1', 'x2', 'y2'),
}
# atributos de traço que têm de sobreviver à conversão
TRACO = ('stroke-width', 'stroke-linecap', 'stroke-linejoin',
         'stroke-dasharray', 'stroke-miterlimit', 'opacity', 'fill-rule')


def arredondar(texto):
    return re.sub(r'-?\d+\.\d+(?:e-?\d+)?',
                  lambda m: f'{round(float(m.group(0)), 1):g}', texto)


# O Figma exporta algumas cores pelo NOME. O painel de cores usa um
# <input type="color">, que só aceita #rrggbb — um 'white' lá dentro cairia
# em preto sem dar erro. Só as que o Figma costuma emitir.
NOMEADAS = {
    'white': '#ffffff', 'black': '#000000', 'red': '#ff0000',
    'lime': '#00ff00', 'blue': '#0000ff', 'yellow': '#ffff00',
    'aqua': '#00ffff', 'cyan': '#00ffff', 'fuchsia': '#ff00ff',
    'magenta': '#ff00ff', 'silver': '#c0c0c0', 'gray': '#808080',
    'grey': '#808080', 'maroon': '#800000', 'olive': '#808000',
    'green': '#008000', 'purple': '#800080', 'teal': '#008080',
    'navy': '#000080', 'orange': '#ffa500',
}


def normalizar_cor(v):
    """Leva a cor a #rrggbb, que é o que o painel de cores sabe editar."""
    v = v.strip().lower()
    if v in NOMEADAS:
        return NOMEADAS[v]
    if re.fullmatch(r'#[0-9a-f]{3}', v):
        return '#' + ''.join(c * 2 for c in v[1:])
    return v


def cor_de(el):
    """Cor efetiva do elemento: preenchimento ou, se não houver, traço."""
    for atr in ('fill', 'stroke'):
        v = el.get(atr)
        if v and v.lower() not in ('none', 'transparent'):
            return normalizar_cor(v), atr
    return None, None


def caixa_da_mascara(mascara):
    """Caixa envolvente da silhueta.

    O Figma declara a caixa nos atributos da máscara — é exata e é essa que
    se usa. Sem eles, resta estimar pelos números do path, o que engorda a
    caixa (os pontos de controlo das bézier caem fora do traço).
    """
    if all(mascara.get(a) is not None for a in ('x', 'y', 'width', 'height')):
        return tuple(float(mascara.get(a)) for a in ('x', 'y', 'width', 'height'))

    xs, ys = [], []
    for el in mascara.iter():
        d = el.get('d')
        if not d:
            continue
        nums = [float(n) for n in re.findall(r'-?\d+\.?\d*', d)]
        xs += nums[0::2]
        ys += nums[1::2]
    if not xs:
        return None
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)


def desenhaveis(el):
    """Elementos que desenham, saltando o conteúdo das <mask> encaixadas.

    Uma máscara é um estêncil: as suas formas dizem ONDE se vê o que está
    por baixo, não o que se pinta. Contá-las dava uma camada branca
    fantasma em cada grupo que o Figma embrulha.
    """
    for filho in el:
        if filho.tag == f'{SVG_NS}mask':
            continue
        yield filho
        yield from desenhaveis(filho)


def emitir(el, cor, atr):
    tag = el.tag.split('}')[1]
    partes = [f'<{tag}']
    for a in ATRS[tag]:
        if el.get(a) is not None:
            partes.append(f' {a}="{arredondar(el.get(a))}"')
    for a in TRACO:
        if el.get(a) is not None:
            partes.append(f' {a}="{el.get(a)}"')
    # o motor reescreve `fill` e `stroke`; marcar o que este elemento usa
    partes.append(f' {atr}="{cor}"')
    if atr == 'stroke':
        partes.append(' fill="none"')
    partes.append('/>')
    return ''.join(partes)


def main(entrada, saida, prefixo):
    raiz = ET.parse(entrada).getroot()

    mascaras = {m.get('id'): m for m in raiz.iter(f'{SVG_NS}mask')}
    if not mascaras:
        sys.exit('SVG sem <mask> — este conversor espera arte dentro de um molde.')

    # o molde é a máscara ALFA; as de luminância que aparecem lá dentro são
    # efeitos do Figma e o grupo delas não é o molde
    def e_molde(g):
        m = re.search(r'url\(#([^)]+)\)', g.get('mask', '') or '')
        return m and 'luminance' not in (mascaras.get(m.group(1), raiz).get('style') or '')

    grupo = next((g for g in raiz.iter(f'{SVG_NS}g') if e_molde(g)), None)
    if grupo is None:
        sys.exit('SVG sem grupo preso a uma máscara alfa.')

    ref = re.search(r'url\(#([^)]+)\)', grupo.get('mask')).group(1)
    quadro = caixa_da_mascara(mascaras[ref])
    print(f'molde: x={quadro[0]:.0f} y={quadro[1]:.0f} '
          f'w={quadro[2]:.0f} h={quadro[3]:.0f}')

    # o retângulo que cobre o molde inteiro é o fundo, não uma camada
    def e_fundo(el):
        if el.tag != f'{SVG_NS}rect':
            return False
        x, y = float(el.get('x', 0)), float(el.get('y', 0))
        w, h = float(el.get('width', 0)), float(el.get('height', 0))
        return (x <= quadro[0] and y <= quadro[1]
                and x + w >= quadro[0] + quadro[2]
                and y + h >= quadro[1] + quadro[3])

    camadas, cor_fundo, ignorados = {}, None, 0
    for el in desenhaveis(grupo):
        if not el.tag.startswith(SVG_NS) or el.tag.split('}')[1] not in ATRS:
            continue
        cor, atr = cor_de(el)
        if cor is None:
            ignorados += 1
            continue
        if e_fundo(el):
            cor_fundo = cor
            continue
        camadas.setdefault(cor, []).append(emitir(el, cor, atr))

    print(f'fundo: {cor_fundo or "nenhum"}   camadas: {len(camadas)}'
          f'   ignorados: {ignorados}')

    linhas = [
        '// Gerado por scripts/converter-molde.py — não editar à mão.',
        f'// Origem: {os.path.basename(entrada)}',
        '//',
        '// O QUADRO é a caixa do molde no SVG; o motor mapeia-o para a caixa',
        '// da peça no visualizador. O recorte fica a cargo do alfa do PNG.',
        '',
        f'export const QUADRO = {{ x: {quadro[0]:.1f}, y: {quadro[1]:.1f}, '
        f'w: {quadro[2]:.1f}, h: {quadro[3]:.1f} }};',
        '',
        f'export const COR_FUNDO = {cor_fundo!r};' if cor_fundo
        else 'export const COR_FUNDO = null;',
        '',
        'export const CAMADAS = [',
    ]
    for i, (cor, trechos) in enumerate(camadas.items()):
        # O id é POSICIONAL (cor1, cor2, ...), não a cor: as cores mudam de
        # peça para peça e de tema para tema, a posição não. É o que faz a
        # "cor 1" da camisola ser a mesma slot que a "cor 1" do calção — a
        # numeração que a referência mostra e que o cadeado usa para repetir.
        linhas += [
            '  {',
            f'    id: {f"cor{i + 1}"!r},',
            f'    cor: {cor!r},',
            f'    svg: `{"".join(trechos)}`,',
            '  },',
        ]
    linhas += ['];', '']

    with open(saida, 'w') as f:
        f.write('\n'.join(linhas))
    print(f'gerado: {saida} ({os.path.getsize(saida) / 1024:.1f} KB)')


if __name__ == '__main__':
    main(*sys.argv[1:4])
