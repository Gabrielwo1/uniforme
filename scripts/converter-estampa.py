"""
Converte o SVG de um tema (export do Illustrator) em camadas por cor, no
formato que o motor (`PecaMockup`) consome.

    python3 scripts/converter-estampa.py <svg> <saida.ts> <prefixo-ids>

A camada deduz-se da COR: todas as formas com o mesmo preenchimento formam
uma camada recolorível — é a mecânica que o cliente descreveu, lida do
ficheiro em vez de exigida ao designer. As cores podem vir de atributos ou
do CSS interno (o export por omissão do Illustrator).

Decisões de conversão:
  - O retângulo de fundo (o que cobre o quadro inteiro) NÃO vira camada:
    sai da estampa e a cor do fundo passa a ser a cor da zona "corpo".
    Senão o cliente teria dois swatches em que um não faz nada.
  - As máscaras de recorte são preservadas (as riscas do tema recortam a
    textura), com os ids prefixados e com o marcador __L__ para o lado —
    frente e verso montam no DOM ao mesmo tempo e ids repetidos fariam o
    recorte de um lado apanhar o do outro.
  - Formas só com traço (sem fill) ficam de fora — no tema são guias.
  - Coordenadas arredondadas a 1 decimal: o ficheiro cai para ~metade sem
    diferença visível a este tamanho.
"""
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

SVG_NS = '{http://www.w3.org/2000/svg}'
FORMAS = ('path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line')
# atributos geométricos que passam para a saída, por tipo de forma
ATRS = {'path': ('d',), 'rect': ('x', 'y', 'width', 'height', 'rx', 'ry'),
        'circle': ('cx', 'cy', 'r'), 'ellipse': ('cx', 'cy', 'rx', 'ry'),
        'polygon': ('points',), 'polyline': ('points',), 'line': ('x1', 'y1', 'x2', 'y2')}


def classes_css(raiz):
    fills = {}
    for st in raiz.iter(f'{SVG_NS}style'):
        for sel, corpo in re.findall(r'([^{}]+)\{([^}]*)\}', st.text or ''):
            m = re.search(r'(?<!-)fill:\s*([^;]+)', corpo)
            if not m:
                continue
            for cls in re.findall(r'\.([\w-]+)', sel):
                fills[cls] = m.group(1).strip()
    return fills


def cor_de(el, css):
    fill = el.get('fill')
    if fill is None:
        m = re.search(r'fill:\s*([^;]+)', el.get('style', ''))
        fill = m.group(1).strip() if m else None
    if fill is None:
        for cls in el.get('class', '').split():
            if cls in css:
                fill = css[cls]
                break
    if fill is None or fill.lower() in ('none', 'transparent'):
        return None
    return fill.lower().strip()


NUMERO = re.compile(r'-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')


def arredondar(texto):
    """Números com 1 decimal, sem zeros à direita.

    Percorre o texto por TOKENS em vez de substituir por regex solta: nos
    paths comprimidos do Illustrator um número pode começar onde o anterior
    acaba ("-.94.03"), e uma regex que exija dígitos antes do ponto salta o
    primeiro e casa "94.03" A MEIO dele — dois números arredondados como um,
    um token a menos, e o browser rejeita o path a partir daí. Os separadores
    são reescritos (vírgula só onde faz falta), porque arredondar muda a
    forma textual e os separadores implícitos do original deixam de servir.
    """
    saida = []
    apos_numero = False
    i = 0
    while i < len(texto):
        m = NUMERO.match(texto, i)
        if m:
            v = f'{round(float(m.group(0)), 1):g}'
            if apos_numero and not v.startswith('-'):
                saida.append(',')
            saida.append(v)
            apos_numero = True
            i = m.end()
            continue
        ch = texto[i]
        if ch not in ' ,\t\n':
            saida.append(ch)
            apos_numero = False
        i += 1
    return ''.join(saida)


def clip_ref(el):
    v = el.get('clip-path', '')
    m = re.search(r'url\(#([^)]+)\)', v)
    return m.group(1) if m else None


def emitir(el, fill=None, prefixo=''):
    """Reescreve a forma só com a geometria (e a cor, quando é de camada)."""
    tag = el.tag.split('}')[1]
    partes = [f'<{tag}']
    for a in ATRS[tag]:
        if el.get(a) is not None:
            partes.append(f' {a}="{arredondar(el.get(a))}"')
    if fill:
        partes.append(f' fill="{fill}"')
    partes.append('/>')
    return ''.join(partes)


def main(entrada, saida, prefixo):
    arvore = ET.parse(entrada)
    raiz = arvore.getroot()
    css = classes_css(raiz)
    vb = [float(x) for x in raiz.get('viewBox').replace(',', ' ').split()]

    # clipPaths por id (o rect lá dentro, reescrito limpo)
    clips = {}
    for cp in raiz.iter(f'{SVG_NS}clipPath'):
        formas = [emitir(f) for f in cp if f.tag.split('}')[1] in ATRS]
        clips[cp.get('id')] = ''.join(formas)

    # o quadro da arte = o rect de recorte mais comum
    caixas = Counter()
    for cp in raiz.iter(f'{SVG_NS}clipPath'):
        for r in cp.iter(f'{SVG_NS}rect'):
            caixas[tuple(float(r.get(a, 0)) for a in ('x', 'y', 'width', 'height'))] += 1
    quadro = caixas.most_common(1)[0][0] if caixas else (0, 0, vb[2], vb[3])
    print(f'quadro da arte: x={quadro[0]} y={quadro[1]} w={quadro[2]} h={quadro[3]}')

    dentro_de_defs = {id(e) for d in raiz.iter(f'{SVG_NS}defs') for e in d.iter()}

    def e_fundo(el, cor):
        """Rect que cobre o quadro todo — vira cor da zona, não camada."""
        if el.tag != f'{SVG_NS}rect':
            return False
        caixa = tuple(float(el.get(a, 0)) for a in ('x', 'y', 'width', 'height'))
        return all(abs(a - b) < 2 for a, b in zip(caixa, quadro))

    # percorre na ordem do documento, com a cadeia de clips dos antepassados
    camadas = {}      # cor -> [trechos svg]
    usados = {}       # cor -> {ids de clip}
    cor_fundo = None
    ignorados = 0

    def andar(el, cadeia):
        nonlocal cor_fundo, ignorados
        for filho in el:
            if id(filho) in dentro_de_defs or not filho.tag.startswith(SVG_NS):
                continue
            tag = filho.tag.split('}')[1]
            c = clip_ref(filho)
            nova = cadeia + ([c] if c else [])
            if tag == 'g':
                andar(filho, nova)
                continue
            if tag not in ATRS:
                continue
            cor = cor_de(filho, css)
            if cor is None:
                ignorados += 1
                continue
            if e_fundo(filho, cor):
                cor_fundo = cor
                continue
            trecho = emitir(filho, fill=cor)
            for cid in reversed(nova):
                trecho = f'<g clip-path="url(#{prefixo}__L__{cid})">{trecho}</g>'
            camadas.setdefault(cor, []).append(trecho)
            usados.setdefault(cor, set()).update(nova)

    andar(raiz, [])

    print(f'cor de fundo: {cor_fundo or "nenhuma"}')
    print(f'camadas: {len(camadas)}   formas ignoradas (sem fill): {ignorados}')

    linhas = [
        '// Gerado por scripts/converter-estampa.py — não editar à mão.',
        f'// Origem: {entrada.split("/")[-1]}',
        '//',
        '// `svg` está no espaço do quadro da arte; quem consome aplica o',
        '// transform para a caixa do corpo e troca __L__ pelo lado (frente/',
        '// verso), para os ids dos recortes não colidirem entre os dois.',
        '',
        'export const QUADRO = '
        f'{{ x: {quadro[0]}, y: {quadro[1]}, w: {quadro[2]}, h: {quadro[3]} }};',
        '',
        f'export const COR_FUNDO = {cor_fundo!r};' if cor_fundo else
        'export const COR_FUNDO = null;',
        '',
        'export const CAMADAS = [',
    ]
    for i, (cor, trechos) in enumerate(camadas.items()):
        defs = ''.join(f'<clipPath id="{prefixo}__L__{cid}">{clips[cid]}</clipPath>'
                       for cid in sorted(usados[cor]))
        svg = (f'<defs>{defs}</defs>' if defs else '') + ''.join(trechos)
        linhas += [
            '  {',
            f'    id: {f"cor{i + 1}"!r},',
            f'    cor: {cor!r},',
            f'    svg: `{svg}`,',
            '  },',
        ]
    linhas += ['];', '']

    with open(saida, 'w') as f:
        f.write('\n'.join(linhas))
    import os
    print(f'gerado: {saida}  ({os.path.getsize(saida) / 1e6:.1f} MB)')


if __name__ == '__main__':
    main(*sys.argv[1:4])
