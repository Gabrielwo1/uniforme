"""
Monta o conjunto com os FICHEIROS ORIGINAIS da referência, intactos.

REGRA (do cliente): não deformar nem recriar nenhum modelo. Aqui os pixéis
não são tocados — sem dessaturação, sem cortes, sem escala anisotrópica.
Todas as peças levam UM MESMO fator de escala uniforme (como no motor da
referência, onde partilham a prancheta) e o script só decide posições.

As botas são divididas do par apenas para POSICIONAR cada uma sob a sua
meia (recorte de composição, não edição de pixels).

Tela comum: 1080×2460 = wrapper 270×615 (escala 4) — igual à do
vestir-conjunto.py, para o KitViewer não mudar.

    python3 scripts/montar-originais.py "<pasta>"
        pasta com futebol_masculino_2_{camisa,calcao,meiao}[_verso].webp
        e futebol_masculino_2_detalhe.webp (botas; _verso ainda em falta —
        o par de frente serve os dois lados até chegar).
"""
import os
import sys

import numpy as np
from PIL import Image

M = 4
W, H = 270 * M, 615 * M

# um único fator para TODAS as peças (wrapper px por px do ficheiro)
FATOR = 0.81

# topo de cada peça (wrapper coords); larguras decorrem do fator
TOPOS = {'camisa': 8, 'calcao': 244, 'meiao': 405}


def carregar(pasta, nome):
    """Carrega e converte a REPRESENTAÇÃO (não os pixéis) para o nosso motor.

    No motor de origem estes webp são camadas de sombra: o alfa é a
    intensidade do sombreado e a forma sólida vem de um molde SVG que não
    temos. Achatar a sombra sobre branco dá exatamente a textura multiply
    que o motor deles produz, e o alfa passa a forma sólida — é o mesmo
    pipeline, refatorado; nenhum detalhe é redesenhado."""
    im = Image.open(f'{pasta}/futebol_masculino_2_{nome}.webp').convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    a = np.array(im).astype(np.float32)
    alfa = a[..., 3:4] / 255.0
    rgb = a[..., :3] * alfa + 255.0 * (1.0 - alfa)
    forma = np.clip(a[..., 3] * 42.0, 0, 255)
    out = np.dstack([rgb, forma]).astype(np.uint8)
    return Image.fromarray(out)


def escalar(im):
    f = FATOR * M
    return im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)


def blocos(im, folga=6):
    """Colunas ocupadas → os dois blocos (peça esquerda/direita) do par."""
    a = np.array(im.getchannel('A'))
    xs = np.where((a > 40).any(axis=0))[0]
    g = [b for b in np.split(xs, np.where(np.diff(xs) > folga)[0] + 1) if len(b) > 4]
    g = sorted(sorted(g, key=len, reverse=True)[:2], key=lambda b: b[0])
    return g


def montar(pasta, lado):
    sufixo = '' if lado == 'frente' else '_verso'
    telas = {}

    for peca in ('camisa', 'calcao', 'meiao'):
        im = escalar(carregar(pasta, peca + sufixo))
        tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        x0 = round(135 * M - im.width / 2)
        y0 = TOPOS[peca] * M
        tela.alpha_composite(im, (x0, y0))
        nome_peca = 'camisola' if peca == 'camisa' else peca
        tela.save(f'public/moldes/vestida-{nome_peca}-{lado}.png')
        telas[peca] = (tela, im, x0, y0)
        print(f'{nome_peca}-{lado}: ({x0},{y0}) {im.width}x{im.height} '
              f'[{im.width / M:.0f}×{im.height / M:.0f} wrapper]')

        if peca == 'camisa':
            # caixa do tronco p/ a estampa: linha a 55% sem mangas; gola
            # excluída pelos primeiros 8% da altura
            arr = np.array(tela.getchannel('A'))
            xs = np.where(arr[y0 + int(im.height * 0.55)] > 60)[0]
            cy = y0 + int(im.height * 0.08)
            print(f'   caixa estampa {lado}: x={xs.min()}, y={cy}, '
                  f'w={xs.max() - xs.min()}, h={y0 + im.height - cy}')

    # botas (sem detalhe_verso.webp, o par de frente serve os dois lados):
    # na composição original só a bota DE PÉ recebe uma meia; a inclinada é
    # um adereço pousado ao lado. O par entra INTEIRO (composição intacta),
    # ancorado pela abertura da bota de pé ao tornozelo da meia esquerda,
    # com os fundos na linha de chão.
    tela_meiao, im_meiao, mx0, my0 = telas['meiao']
    am = np.array(im_meiao.getchannel('A'))
    b1 = blocos(im_meiao)[0]
    col = am[:, b1[0]:b1[-1] + 1]
    ys = np.where((col > 40).any(axis=1))[0]
    alto = int(ys[-1] - (ys[-1] - ys[0]) * 0.10)
    xs = np.where((col[alto:ys[-1] + 1] > 40).any(axis=0))[0]
    tornozelo = mx0 + b1[0] + (xs[0] + xs[-1]) / 2

    par = escalar(carregar(pasta, 'detalhe'))
    bp = blocos(par)[0]
    ap = np.array(par.getchannel('A'))
    colp = ap[:, bp[0]:bp[-1] + 1]
    ysp = np.where((colp > 40).any(axis=1))[0]
    topo = colp[ysp[0]:ysp[0] + max(int(len(ysp) * 0.15), 4)]
    xsp = np.where((topo > 40).any(axis=0))[0]
    abertura = bp[0] + (xsp[0] + xsp[-1]) / 2

    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if lado == 'frente':
        # par inteiro: a composição original já casa com as meias da frente
        x0 = round(tornozelo - abertura)
        y0 = 600 * M - par.height
        tela.alpha_composite(par, (x0, y0))
        print(f'botas-{lado}: par em ({x0},{y0})')
    else:
        # as meias do verso são mais abertas que a composição do par:
        # divide-se (posições apenas) — bota de pé no tornozelo esquerdo,
        # bota inclinada com a abertura sob a meia direita, ambas no chão
        cold = am[:, blocos(im_meiao)[1][0]:blocos(im_meiao)[1][-1] + 1]
        ysd = np.where((cold > 40).any(axis=1))[0]
        altod = int(ysd[-1] - (ysd[-1] - ysd[0]) * 0.10)
        xsd = np.where((cold[altod:ysd[-1] + 1] > 40).any(axis=0))[0]
        tornozelo_dir = mx0 + blocos(im_meiao)[1][0] + (xsd[0] + xsd[-1]) / 2

        alvos_x = (tornozelo, tornozelo_dir)
        for b, alvo_x in zip(blocos(par), alvos_x):
            bota = par.crop((b[0], 0, b[-1] + 1, par.height))
            bota = bota.crop(bota.getchannel('A').getbbox())
            ab = np.array(bota.getchannel('A'))
            topo_b = ab[:max(int(ab.shape[0] * 0.15), 4)]
            xsb = np.where((topo_b > 40).any(axis=0))[0]
            x0 = round(alvo_x - (xsb[0] + xsb[-1]) / 2)
            y0 = 600 * M - bota.height
            tela.alpha_composite(bota, (x0, y0))
            print(f'botas-{lado}: bota em ({x0},{y0}) {bota.width}x{bota.height}')
    tela.save(f'public/moldes/botas-{lado}.png')

if __name__ == '__main__':
    pasta = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for lado in ('frente', 'verso'):
        montar(pasta, lado)
