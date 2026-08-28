"""
SUPERSEDIDO por scripts/montar-dino2.py (segundo mockup do designer).
Fica como referência do primeiro envio.

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

# O AVATAR vem do primeiro envio; as PEÇAS vêm do envio branco, que é o
# bom: já brancas (o realce quase não tem trabalho) e quase todas na
# prancheta completa do avatar, o que dispensa a procura.
BASE_AVATAR = '/Users/syntax/Downloads/UNIFORME DINO'
LADOS = {'frente': ('PARTE FRENTE', 'FRENTE'), 'verso': ('PARTE COSTA', 'COSTA')}

BASE_PECAS = '/Users/syntax/Downloads/UNIFORME WEBP SIMULADOR DINO'
PASTAS_PECAS = {'frente': 'UNIFORME FRENTE', 'verso': 'UNIFORME COSTAS'}

# Nomes explícitos: o designer não é consistente (MANGA/MANGAS,
# BRANCA/BRANCO), por isso a tabela é a fonte da verdade.
# A camisola é só o TRONCO — as mangas são zona à parte, para a estampa
# não lhes passar por cima.
NA_PRANCHETA = {                       # posição pela caixa do alfa
    'camisola': {'frente': 'CAMISETA FRENTE BRANCA',
                 'verso': 'CAMISETA COSTAS BRANCA'},
    'calcao': {'frente': 'BERMUDA FRENTE BRANCA',
               'verso': 'BERMUDA BRANCA COSTAS'},
    'gola': {'frente': 'GOLA FRENTE BRANCA',
             'verso': 'GOLA BRANCA COSTAS'},
    'mangas': {'frente': 'MANGA FRENTE BRANCA',
               'verso': 'MANGAS BRANCAS COSTA'},
}
RECORTADAS = {                         # posição por correspondência
    'meiao': {'frente': 'MEIAO FRENTE BRANCO',
              'verso': 'MEIAO BRANCO COSTAS'},
    'botas': {'frente': 'CHUTEIRA FRENTE BRANCA',
              'verso': 'CHUTEIRA BRANCA COSTAS'},
}

# As peças recoloríveis entram em MULTIPLY sobre a cor escolhida, por isso
# a sua luminância é um fator: um tecido a 170 devolve 67% da cor, e um
# branco escolhido sai cinzento. Realçar leva o topo da gama a ~245, para
# o branco sair branco, mantendo as dobras (que são relativas).
LUM_TOPO = 245


def realcar(im):
    """Leva o p98 da luminância a LUM_TOPO, preservando o sombreado."""
    a = np.array(im).astype(np.float32)
    op = a[..., 3] > 60
    if not op.any():
        return im
    p98 = float(np.percentile(a[..., :3][op], 98))
    # camadas quase pretas (a gola do verso) não se salvam por ganho:
    # levanta-se primeiro o patamar e só depois se aplica o ganho
    if p98 < 60:
        a[..., :3] += 150 - p98
        p98 = 150
    a[..., :3] = np.clip(a[..., :3] * (LUM_TOPO / p98), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def carregar(base, pasta, nome, sufixo):
    return Image.open(f'{base}/{pasta}/{nome} {sufixo}.webp').convert('RGBA')


def localizar(avatar, peca):
    """Onde e em que escala é que a peça assenta no avatar.

    A correspondência é feita no canal alfa: a silhueta é o sinal mais
    limpo (a cor do tecido é quase uniforme e daria correlação fraca).

    É MULTI-ESCALA porque o designer nem sempre exporta as peças à escala
    do avatar — o meião do envio branco veio 30% maior. Devolve o canto,
    a escala escolhida e o resultado.
    """
    alvo = np.array(avatar.getchannel('A'))
    melhor = (None, 1.0, -1.0)
    for escala in np.arange(0.60, 1.26, 0.02):
        larg = int(peca.width * escala)
        alt = int(peca.height * escala)
        if larg < 8 or alt < 8 or larg > alvo.shape[1] or alt > alvo.shape[0]:
            continue
        modelo = np.array(peca.resize((larg, alt), Image.LANCZOS).getchannel('A'))
        _, score, _, canto = cv2.minMaxLoc(
            cv2.matchTemplate(alvo, modelo, cv2.TM_CCORR_NORMED))
        if score > melhor[2]:
            melhor = (canto, float(escala), score)
    return melhor


def montar(lado):
    pasta, sufixo = LADOS[lado]
    avatar = carregar(BASE_AVATAR, pasta, 'AVATAR', sufixo)
    caixa = avatar.getchannel('A').getbbox()
    esc = ALTURA_AVATAR * M / (caixa[3] - caixa[1])
    pasta_p = f'{BASE_PECAS}/{PASTAS_PECAS[lado]}'

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

    for chave, nomes in NA_PRANCHETA.items():
        im = Image.open(f'{pasta_p}/{nomes[lado]}.webp').convert('RGBA')
        cx = im.getchannel('A').getbbox()
        tela, x, y, larg, alt = para_tela(realcar(im.crop(cx)), (cx[0], cx[1]))
        tela.save(f'{SAIDA}/vestida-{chave}-{lado}.png')
        print(f'  {chave:9s} prancheta → caixa x={x}, y={y}, w={larg}, h={alt}')

    for chave, nomes in RECORTADAS.items():
        im = Image.open(f'{pasta_p}/{nomes[lado]}.webp').convert('RGBA')
        canto, escala, score = localizar(avatar, im)
        im = im.resize((int(im.width * escala), int(im.height * escala)), Image.LANCZOS)
        # as botas não recolorem: entram como camada estática
        tela, x, y, larg, alt = para_tela(realcar(im) if chave == 'meiao' else im, canto)
        nome = 'botas' if chave == 'botas' else f'vestida-{chave}'
        tela.save(f'{SAIDA}/{nome}-{lado}.png')
        print(f'  {chave:9s} match {score:.3f} escala {escala:.2f} → caixa '
              f'x={x}, y={y}, w={larg}, h={alt}')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(SAIDA, exist_ok=True)
    for lado in LADOS:
        montar(lado)
