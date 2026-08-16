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

# Perfis de montagem. O "padrao" é o layout flutuante da versão principal
# (um único fator para todas as peças). O "jogador" é o AMBIENTE DE TESTE
# (?lab=jogador): as peças vestem o jogador recortado — fator e topo por
# peça (escala sempre uniforme; nada é distorcido), sem camada de botas
# porque o jogador traz as dele.
PERFIS = {
    'padrao': dict(
        saida='public/moldes',
        fatores={'camisa': 0.81, 'calcao': 0.81, 'meiao': 0.81},
        topos={'camisa': 8, 'calcao': 244, 'meiao': 405},
        botas=True,
    ),
    # Ambiente de teste: o jogador está RECORTADO às partes visíveis
    # (scripts/recortar-jogador.py) — cabeça, braços, joelhos e chuteiras.
    # As peças têm de fechar as fronteiras desse recorte, medidas no alfa:
    # pescoço y117, cava/braços y191, joelho y406..438, bota y548.
    'jogador': dict(
        saida='public/moldes/jog',
        fatores={'camisa': 0.75, 'calcao': 0.86, 'meiao': 0.74},
        topos={'camisa': 104, 'calcao': 292, 'meiao': 424},
        botas=False,
        # joelhos do jogador (wrapper x): cada meia do par ancora à sua
        # perna — divisão só de posicionamento
        pernas={'frente': (95.1, 174.1), 'verso': (91.7, 175.5)},
    ),
}
PERFIL = PERFIS['padrao']
FATOR = 0.81


def carregar(pasta, nome):
    """Carrega e converte a REPRESENTAÇÃO (não os pixéis) para o nosso motor.

    No motor de origem estes webp são camadas de sombra: o alfa é a
    intensidade do sombreado e a forma sólida vem de um molde SVG que não
    temos. Achatar a sombra sobre branco dá exatamente a textura multiply
    que o motor deles produz, e o alfa passa a forma sólida — é o mesmo
    pipeline, refatorado; nenhum detalhe é redesenhado."""
    base = f'{pasta}/futebol_masculino_2_{nome}'
    caminho = base + ('.webp' if os.path.exists(base + '.webp') else '.png')
    im = Image.open(caminho).convert('RGBA')
    caixa = im.getchannel('A').getbbox()
    im = im.crop(caixa)
    a = np.array(im).astype(np.float32)
    alfa = a[..., 3:4] / 255.0
    rgb = a[..., :3] * alfa + 255.0 * (1.0 - alfa)
    forma = np.clip(a[..., 3] * 42.0, 0, 255)
    out = np.dstack([rgb, forma]).astype(np.uint8)
    # a caixa devolve-se junto: peças que partilham a prancheta (camisa e
    # gola) alinham-se pelo desvio entre os seus recortes
    return Image.fromarray(out), caixa


def escalar(im, f=None):
    f = (f if f is not None else FATOR) * M
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

    saida = PERFIL['saida']
    for peca in ('camisa', 'calcao', 'meiao'):
        fator = PERFIL['fatores'][peca]
        im, caixa = carregar(pasta, peca + sufixo)
        im = escalar(im, fator)
        tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        x0 = round(135 * M - im.width / 2)
        topo = PERFIL['topos'][peca]
        if peca == 'meiao' and 'pernas' in PERFIL:
            # par dividido: cada meia centrada na sua perna do jogador
            y0m = topo * M
            for b, cx in zip(blocos(im), PERFIL['pernas'][lado]):
                meia = im.crop((b[0], 0, b[-1] + 1, im.height))
                meia = meia.crop(meia.getchannel('A').getbbox())
                tela.alpha_composite(meia, (round(cx * M - meia.width / 2), y0m))
            nome_peca = 'meiao'
            tela.save(f'{saida}/vestida-meiao-{lado}.png')
            telas[peca] = (tela, im, x0, y0m)
            print(f'meiao-{lado}: par dividido nas pernas {PERFIL["pernas"][lado]}')
            continue
        # o par de botas do verso é raso (só calcanhares): as meias do
        # verso descem um pouco para entrar neles
        if peca == 'meiao' and lado == 'verso':
            topo += 15
        y0 = topo * M
        tela.alpha_composite(im, (x0, y0))
        nome_peca = 'camisola' if peca == 'camisa' else peca
        tela.save(f'{saida}/vestida-{nome_peca}-{lado}.png')
        telas[peca] = (tela, im, x0, y0)
        print(f'{nome_peca}-{lado}: ({x0},{y0}) {im.width}x{im.height} '
              f'[{im.width / M:.0f}×{im.height / M:.0f} wrapper]')

        if peca == 'camisa':
            gola, caixa_g = carregar(pasta, 'gola' + sufixo)
            gola = escalar(gola, fator)
            tg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            gx = round(x0 + (caixa_g[0] - caixa[0]) * fator * M)
            gy = round(y0 + (caixa_g[1] - caixa[1]) * fator * M)
            tg.alpha_composite(gola, (gx, gy))
            tg.save(f'{saida}/vestida-gola-{lado}.png')
            print(f'gola-{lado}: ({gx},{gy}) {gola.width}x{gola.height}')

            # caixa do tronco p/ a estampa: linha a 55% sem mangas; gola
            # excluída pelos primeiros 8% da altura
            arr = np.array(tela.getchannel('A'))
            xs = np.where(arr[y0 + int(im.height * 0.55)] > 60)[0]
            cy = y0 + int(im.height * 0.08)
            print(f'   caixa estampa {lado}: x={xs.min()}, y={cy}, '
                  f'w={xs.max() - xs.min()}, h={y0 + im.height - cy}')

    if not PERFIL['botas']:
        return

    # botas: cada lado usa o SEU par original (detalhe / detalhe_verso),
    # inteiro — composição intacta — ancorado pela abertura da primeira
    # bota ao tornozelo da meia esquerda, fundos na linha de chão.
    tela_meiao, im_meiao, mx0, my0 = telas['meiao']
    am = np.array(im_meiao.getchannel('A'))
    b1 = blocos(im_meiao)[0]
    col = am[:, b1[0]:b1[-1] + 1]
    ys = np.where((col > 40).any(axis=1))[0]
    alto = int(ys[-1] - (ys[-1] - ys[0]) * 0.10)
    xs = np.where((col[alto:ys[-1] + 1] > 40).any(axis=0))[0]
    tornozelo = mx0 + b1[0] + (xs[0] + xs[-1]) / 2

    par, _ = carregar(pasta, 'detalhe' + sufixo)
    par = escalar(par, PERFIL['fatores']['meiao'])
    bp = blocos(par)[0]
    ap = np.array(par.getchannel('A'))
    colp = ap[:, bp[0]:bp[-1] + 1]
    ysp = np.where((colp > 40).any(axis=1))[0]
    topo = colp[ysp[0]:ysp[0] + max(int(len(ysp) * 0.15), 4)]
    xsp = np.where((topo > 40).any(axis=0))[0]
    abertura = bp[0] + (xsp[0] + xsp[-1]) / 2

    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0 = round(tornozelo - abertura)
    y0 = 600 * M - par.height
    tela.alpha_composite(par, (x0, y0))
    tela.save(f"{PERFIL['saida']}/botas-{lado}.png")
    print(f'botas-{lado}: par em ({x0},{y0}) {par.width}x{par.height}')

if __name__ == '__main__':
    pasta = sys.argv[1]
    PERFIL = PERFIS[sys.argv[2] if len(sys.argv) > 2 else 'padrao']
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(PERFIL['saida'], exist_ok=True)
    for lado in ('frente', 'verso'):
        montar(pasta, lado)
