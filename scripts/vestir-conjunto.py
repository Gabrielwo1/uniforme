"""
"Veste" as peças geradas no jogador-modelo: cada PNG de peça é escalado
(anisotropicamente, dentro do razoável) e posicionado sobre os marcos do
corpo do jogador, e gravado numa TELA COMUM que mapeia a coluna inteira
do visualizador. Assim todos os slots do KitViewer são idênticos
(absolute inset-0) e o alinhamento vive aqui, medível e repetível —
não em margens de CSS afinadas à mão.

Tela comum: 1080×2460 = região do wrapper x 0..270, y -40..575 (escala 4).

    python3 scripts/vestir-conjunto.py <pasta com c-{peca}-{lado}.png>

Os alvos (em coordenadas do wrapper) vêm do canal alfa do jogador —
ver as medições em conversa; se o jogador mudar, medir de novo e ajustar.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance

M = 4                       # wrapper px -> canvas px
W, H = 270 * M, 615 * M     # 1080 × 2460
DY = 40                     # wrapper y -40 -> canvas y 0

# Alvos por peça: onde a peça assenta no jogador (wrapper coords).
# As PROPORÇÕES entre peças seguem a régua do simulador de referência
# (calção ≈ 75% da largura da camisa, meião ≈ 67%, camisa curta a acabar
# na cintura, calção bem visível) — só as proporções; os assets são nossos.
ALVOS = {
    # camisola: gola na base do pescoço, bainha na cintura; largura = vão
    # das mangas, pouco além dos braços do jogador (162)
    'camisola': dict(topo=48, base=288, largura=188, linha_largura=0.30),
    # calção: cós escondido sob a bainha, termina bem acima do joelho;
    # largura na linha mais larga (a bainha evasê)
    'calcao': dict(topo=282, base=398, largura=132, linha_largura=0.60),
    # meião: topo abaixo do joelho, pé no chão; largura = vão exterior
    # do par na linha dos pés
    'meiao': dict(topo=436, base=571, largura=120, linha_largura=0.95),
}


def instalar(origem, peca, lado):
    im = Image.open(origem).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())

    # neutralizar: o alfa recorta, os cinzas dão o sombreado (multiply)
    r, g, b, a = im.split()
    # clarear bem: estes cinzas entram em multiply sobre a cor escolhida —
    # se o tecido ficar a ~200, um branco escolhido pelo cliente sai cinzento
    rgb = ImageEnhance.Color(Image.merge('RGB', (r, g, b))).enhance(0.0)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.30)
    im = Image.merge('RGBA', (*rgb.split(), a))

    alvo = ALVOS[peca]

    # largura da peça na linha de referência (ex.: cós do calção)
    arr = np.array(im.getchannel('A'))
    py = int((arr.shape[0] - 1) * alvo['linha_largura'])
    xs = np.where(arr[py] > 60)[0]
    larg_ref = xs.max() - xs.min()

    esc_y = (alvo['base'] - alvo['topo']) * M / im.height
    esc_x = alvo['largura'] * M / larg_ref
    im = im.resize((int(im.width * esc_x), int(im.height * esc_y)), Image.LANCZOS)

    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0 = int(135 * M - im.width / 2)
    y0 = int((alvo['topo'] + DY) * M)
    tela.alpha_composite(im, (x0, y0))
    tela.save(f'public/moldes/vestida-{peca}-{lado}.png')

    print(f'{peca}-{lado}: esc_x {esc_x:.2f} esc_y {esc_y:.2f} '
          f'→ canvas ({x0},{y0})..({x0 + im.width},{y0 + im.height})')

    # caixa do tronco (para a estampa da camisola): linha a 60% sem mangas
    if peca == 'camisola':
        arr2 = np.array(tela.getchannel('A'))
        py2 = y0 + int(im.height * 0.60)
        xs2 = np.where(arr2[py2] > 60)[0]
        print(f'   tronco a 60%: x {xs2.min()}..{xs2.max()}  '
              f'(caixa p/ estampa: x={xs2.min()}, y={y0}, '
              f'w={xs2.max() - xs2.min()}, h={im.height})')


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for peca in ('camisola', 'calcao', 'meiao'):
        nome = 'camisa' if peca == 'camisola' else peca
        for lado in ('frente', 'verso'):
            instalar(f'{pasta}/c-{nome}-{lado}.png', peca, lado)
