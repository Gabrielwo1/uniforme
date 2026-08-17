"""
Monta o ambiente do JOGADOR a partir do mockup do designer ("UNIFORME DINO").

O designer entregou, por lado, o AVATAR (jogador já vestido) e as peças
isoladas (CAMISETA, BERMUDA, MEIAO, CHUTEIRA). As peças foram exportadas
recortadas ao conteúdo, por isso perderam a prancheta comum — mas como o
avatar veste EXATAMENTE as mesmas peças, a posição de cada uma encontra-se
por correspondência de padrão (`cv2.matchTemplate`) dentro do avatar.

É isso que torna este encaixe perfeito e não afinado à mão: cada peça volta
ao pixel de onde saiu. Nada é distorcido — a única transformação é a escala
comum que leva o mockup à tela do visualizador.

    python3 scripts/montar-dino.py "<pasta UNIFORME DINO>"
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

M = 4
W, H = 270 * M, 615 * M          # tela comum do visualizador
SAIDA = 'public/moldes/jog'

# altura do avatar na tela (wrapper px) e topo — deixa margem para a sombra
ALTURA_AVATAR = 596
TOPO_AVATAR = 6

LADOS = {'frente': ('PARTE FRENTE', 'FRENTE'), 'verso': ('PARTE COSTA', 'COSTA')}
PECAS = {'camisola': 'CAMISETA', 'calcao': 'BERMUDA', 'meiao': 'MEIAO'}

# Golas e punhos: entregues DEPOIS, já na prancheta completa do avatar
# (1912×5125), por isso dispensam a procura — a caixa do alfa dá a posição.
# São zonas próprias da camisola, para a estampa não lhes passar por cima
# (a camada MANGA cobre a manga inteira, não apenas o punho).
BASE_EXTRAS = '/Users/syntax/Downloads/MANGAS E GOLAS'
EXTRAS = {'gola': 'GOLA', 'mangas': 'MANGA'}
LADOS_EXTRAS = {'frente': ('MANGAS E GOLAS FRENTE', 'FRENTE'),
                'verso': ('MANGAS E GOLAS COSTAS', 'COSTAS')}

# Luminância alvo da mediana: estas camadas vieram muito escuras (a gola do
# verso é preto puro) e em multiply matariam a cor escolhida. Normalizar
# mantém o sombreado relativo e devolve-lhes a gama das outras peças.
LUM_ALVO = 205


def normalizar(im):
    a = np.array(im).astype(np.float32)
    op = a[..., 3] > 60
    if not op.any():
        return im
    med = float(np.median(a[..., :3][op]))
    if med >= LUM_ALVO - 5:
        return im
    a[..., :3] = np.clip(a[..., :3] + (LUM_ALVO - med), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def carregar(base, pasta, nome, sufixo):
    return Image.open(f'{base}/{pasta}/{nome} {sufixo}.webp').convert('RGBA')


def localizar(avatar, peca):
    """Onde é que a peça assenta no avatar (canto superior esquerdo).

    A correspondência é feita no canal alfa: a silhueta é o sinal mais
    limpo (a cor do tecido é quase uniforme e daria correlação fraca).
    """
    alvo = np.array(avatar.getchannel('A'))
    modelo = np.array(peca.getchannel('A'))
    r = cv2.matchTemplate(alvo, modelo, cv2.TM_CCORR_NORMED)
    _, score, _, canto = cv2.minMaxLoc(r)
    return canto, score


def montar(base, lado):
    pasta, sufixo = LADOS[lado]
    avatar = carregar(base, pasta, 'AVATAR', sufixo)
    caixa = avatar.getchannel('A').getbbox()
    esc = ALTURA_AVATAR * M / (caixa[3] - caixa[1])

    def para_tela(im, canto):
        """Leva um recorte do espaço do avatar para a tela comum."""
        larg = max(1, round(im.width * esc))
        alt = max(1, round(im.height * esc))
        x = round((canto[0] - caixa[0]) * esc + (W - (caixa[2] - caixa[0]) * esc) / 2)
        y = round((canto[1] - caixa[1]) * esc + TOPO_AVATAR * M)
        tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        tela.alpha_composite(im.resize((larg, alt), Image.LANCZOS), (x, y))
        return tela, x, y, larg, alt

    print(f'--- {lado} (escala {esc:.4f}) ---')

    tela, *_ = para_tela(avatar.crop(caixa), (caixa[0], caixa[1]))
    tela.save(f'{SAIDA}/jogador-{lado}.png')
    print(f'  avatar: {caixa[2]-caixa[0]}x{caixa[3]-caixa[1]} → tela')

    for chave, nome in PECAS.items():
        peca = carregar(base, pasta, nome, sufixo)
        canto, score = localizar(avatar, peca)
        tela, x, y, larg, alt = para_tela(peca, canto)
        tela.save(f'{SAIDA}/vestida-{chave}-{lado}.png')
        print(f'  {chave:9s} match {score:.3f} em {canto} → caixa '
              f'x={x}, y={y}, w={larg}, h={alt}')

    # golas e punhos: mesma prancheta do avatar, posição pela caixa do alfa
    pasta_e, sufixo_e = LADOS_EXTRAS[lado]
    for chave, nome in EXTRAS.items():
        extra = Image.open(f'{BASE_EXTRAS}/{pasta_e}/{nome} {sufixo_e}.webp').convert('RGBA')
        cx = extra.getchannel('A').getbbox()
        tela, x, y, larg, alt = para_tela(normalizar(extra.crop(cx)), (cx[0], cx[1]))
        tela.save(f'{SAIDA}/vestida-{chave}-{lado}.png')
        print(f'  {chave:9s} caixa alfa {cx} → x={x}, y={y}, w={larg}, h={alt}')

    # chuteiras: camada estática, dessaturada para não brigar com as cores
    bota = carregar(base, pasta, 'CHUTEIRA', sufixo)
    canto, score = localizar(avatar, bota)
    a = np.array(bota).astype(np.float32)
    cinza = a[..., :3].mean(2, keepdims=True)
    a[..., :3] = cinza * 0.35 + a[..., :3] * 0.65   # tira o laranja forte
    bota = Image.fromarray(a.astype(np.uint8))
    tela, x, y, *_ = para_tela(bota, canto)
    tela.save(f'{SAIDA}/botas-{lado}.png')
    print(f'  chuteira  match {score:.3f} em {canto} → ({x},{y})')


if __name__ == '__main__':
    base = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(SAIDA, exist_ok=True)
    for lado in LADOS:
        montar(base, lado)
