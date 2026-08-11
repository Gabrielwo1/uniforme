"""
Inspeciona os ficheiros que o designer envia (PSD, SVG, PNG) e descreve a
estrutura que lá está — para a nomenclatura ser deduzida do ficheiro em vez
de imposta ao designer.

    python3 scripts/analisar-assets.py <ficheiro> [<ficheiro> ...]

O que interessa em cada tipo:

  SVG  as cores distintas de preenchimento. Cada cor distinta é uma camada
       recolorível em potência — é isto que substitui o "uma camada por cor"
       que estávamos a pedir à mão. Sinaliza também o que NÃO é recolorível
       (padrões, imagens embutidas, gradientes), porque aí a troca de cor
       não pega e a estampa tem de ser tratada de outra maneira.

  PSD  a árvore de camadas com nomes e caixas envolventes, para casar cada
       camada com uma zona (corpo / gola / punhos).

  PNG  enquadramento e caixa do alfa. Duas zonas da mesma peça têm de vir
       na mesma tela; se as caixas do alfa forem iguais às da imagem, o
       ficheiro foi recortado ao conteúdo e já perdeu o alinhamento.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter

SVG_NS = '{http://www.w3.org/2000/svg}'


def titulo(txt):
    print(f'\n{"=" * 72}\n{txt}\n{"=" * 72}')


def tamanho(caminho):
    n = os.path.getsize(caminho)
    for u in ('B', 'KB', 'MB', 'GB'):
        if n < 1024:
            return f'{n:.0f} {u}' if u == 'B' else f'{n:.1f} {u}'
        n /= 1024
    return f'{n:.1f} TB'


# ─────────────────────────────────────────────────────────────────── SVG ──

def cor_de(el):
    """Cor de preenchimento efetiva do elemento, de `fill` ou de `style`."""
    fill = el.get('fill')
    if fill is None:
        m = re.search(r'fill:\s*([^;]+)', el.get('style', ''))
        fill = m.group(1).strip() if m else None
    if fill is None or fill.lower() in ('none', 'transparent'):
        return None
    return fill.lower().strip()


def normalizar(cor):
    """#abc -> #aabbcc, rgb() -> hex, para não contar a mesma cor duas vezes."""
    if cor.startswith('#') and len(cor) == 4:
        return '#' + ''.join(c * 2 for c in cor[1:])
    m = re.match(r'rgb\(\s*(\d+)\D+(\d+)\D+(\d+)', cor)
    if m:
        return '#%02x%02x%02x' % tuple(int(g) for g in m.groups())
    return cor


def analisar_svg(caminho):
    titulo(f'SVG · {os.path.basename(caminho)}  ({tamanho(caminho)})')
    raiz = ET.parse(caminho).getroot()

    vb = raiz.get('viewBox')
    print(f'viewBox : {vb or "AUSENTE — sem isto não há como alinhar"}')
    print(f'tamanho : {raiz.get("width", "?")} × {raiz.get("height", "?")}')
    if vb:
        p = [float(x) for x in vb.replace(',', ' ').split()]
        if len(p) == 4 and abs(p[2] - p[3]) > 1:
            print(f'  ⚠ prancheta não quadrada ({p[2]:.0f} × {p[3]:.0f}) '
                  f'— a peça é quadrada, isto vai desalinhar')

    # o que não recolore
    for tag, aviso in [
        ('pattern', 'padrão do Illustrator — a troca de cor NÃO pega'),
        ('image', 'imagem embutida (raster) — a troca de cor NÃO pega'),
        ('linearGradient', 'gradiente — recolore mal, vira cor chapada'),
        ('radialGradient', 'gradiente — recolore mal, vira cor chapada'),
        ('filter', 'efeito raster — devia ter sido expandido'),
    ]:
        n = len(raiz.findall(f'.//{SVG_NS}{tag}'))
        if n:
            print(f'  ⚠ {n} × <{tag}>: {aviso}')

    clips = len(raiz.findall(f'.//{SVG_NS}clipPath'))
    if clips:
        print(f'  · {clips} máscaras de recorte (ok, só não podem ter cor própria)')

    # cores = camadas recoloríveis em potência
    dentro_de_defs = {id(e) for d in raiz.iter(f'{SVG_NS}defs') for e in d.iter()}
    cores, referencias, total = Counter(), Counter(), 0
    for el in raiz.iter():
        if id(el) in dentro_de_defs:
            continue  # defs não desenham
        if not el.tag.startswith(SVG_NS):
            continue
        if el.tag.split('}')[1] not in ('path', 'rect', 'circle', 'ellipse',
                                        'polygon', 'polyline'):
            continue
        total += 1
        c = cor_de(el)
        if c is None:
            continue
        # `fill="url(#x)"` aponta para um padrão ou gradiente: não é uma cor,
        # e é justamente o que não se consegue recolorir
        (referencias if c.startswith('url(') else cores)[normalizar(c)] += 1

    print(f'\nformas desenhadas: {total}')
    if total > 4000:
        print('  ⚠ muitas formas — o SVG vai pesar no browser; '
              'talvez a textura deva ser imagem repetível em vez de vetor')

    print(f'\ncores distintas: {len(cores)}  → cada uma é uma camada recolorível')
    for cor, n in cores.most_common():
        print(f'  {cor:<10} {n:>6} formas')
    if len(cores) > 8:
        print('  ⚠ muitas cores — provavelmente há tons quase iguais '
              'para juntar na mesma camada')

    if referencias:
        print('\nformas pintadas com padrão/gradiente — NÃO recoloríveis:')
        for ref, n in referencias.most_common():
            print(f'  {ref:<18} {n:>6} formas')

    # nomes que o Illustrator tenha deixado, se houver
    nomes = [n for el in raiz.iter()
             if (n := el.get('id') or el.get('data-name'))
             and not re.fullmatch(r'(Layer|Camada|Capa)[_\s-]*\d*|\w{1,3}\d+', n)]
    print(f'\nnomes úteis no ficheiro: {", ".join(sorted(set(nomes))[:12]) or "nenhum"}')


# ─────────────────────────────────────────────────────────────────── PSD ──

def analisar_psd(caminho):
    from psd_tools import PSDImage
    titulo(f'PSD · {os.path.basename(caminho)}  ({tamanho(caminho)})')
    psd = PSDImage.open(caminho)
    print(f'tela: {psd.width} × {psd.height}')
    if psd.width != psd.height:
        print('  ⚠ tela não quadrada — vamos ter de a quadrar na exportação')

    print('\ncamadas (nome · caixa · visível):')

    def andar(grupo, nivel=0):
        for c in grupo:
            vis = '●' if c.visible else '○'
            cx = f'{c.left},{c.top} → {c.right},{c.bottom}'
            print(f'  {"  " * nivel}{vis} {c.name:<34} {cx}')
            if c.is_group():
                andar(c, nivel + 1)

    andar(psd)

    alvos = ('gola', 'collar', 'punho', 'cuff', 'manga', 'sleeve', 'corpo',
             'body', 'barra', 'hem', 'sombra', 'shadow', 'luz', 'light')
    achados = [c.name for c in psd.descendants()
               if any(a in c.name.lower() for a in alvos)]
    print(f'\ncamadas que parecem zonas: {", ".join(achados) or "nenhuma óbvia"}')


# ─────────────────────────────────────────────────────────────────── PNG ──

def analisar_png(caminho):
    from PIL import Image
    titulo(f'PNG · {os.path.basename(caminho)}  ({tamanho(caminho)})')
    im = Image.open(caminho)
    print(f'tamanho: {im.width} × {im.height}   modo: {im.mode}')
    if im.width != im.height:
        print('  ⚠ não é quadrado')

    if 'A' not in im.getbands():
        print('  ⚠ SEM canal alfa — sem recorte não há contorno para colorir')
        return

    alfa = im.getchannel('A')
    caixa = alfa.getbbox()
    if not caixa:
        print('  ⚠ totalmente transparente')
        return
    l, t, r, b = caixa
    print(f'conteúdo: {l},{t} → {r},{b}  ({r - l} × {b - t} px)')
    if (l, t, r, b) == (0, 0, im.width, im.height):
        print('  ⚠ o conteúdo toca as 4 margens — parece recortado ao conteúdo, '
              'e aí as zonas não vão assentar umas nas outras')
    else:
        print(f'  margens: esq {l}  topo {t}  dir {im.width - r}  base {im.height - b}'
              '   ← têm de ser iguais em todas as zonas da mesma peça')

    # a cor da zona é aplicada por baixo; se o PNG já tiver cor, ela contamina
    rgb = im.convert('RGBA')
    px = [p for p in rgb.getdata() if p[3] > 200]
    if px:
        amostra = px[::max(1, len(px) // 4000)]
        desvio = sum(max(p[:3]) - min(p[:3]) for p in amostra) / len(amostra)
        media = sum(sum(p[:3]) / 3 for p in amostra) / len(amostra)
        print(f'saturação média: {desvio:.1f} / 255   luminosidade média: {media:.0f}')
        if desvio > 18:
            print('  ⚠ ainda tem cor — dessaturar, senão tinge tudo o que o cliente escolher')


def main(caminhos):
    for c in caminhos:
        if not os.path.exists(c):
            print(f'não existe: {c}')
            continue
        ext = os.path.splitext(c)[1].lower()
        try:
            {'.svg': analisar_svg, '.psd': analisar_psd, '.psb': analisar_psd,
             '.png': analisar_png, '.tif': analisar_png, '.tiff': analisar_png,
             '.jpg': analisar_png, '.jpeg': analisar_png}[ext](c)
        except KeyError:
            print(f'extensão não suportada: {c}')
        except Exception as e:
            print(f'falhou em {c}: {type(e).__name__}: {e}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
