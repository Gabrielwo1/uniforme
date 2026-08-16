"""
Recorta o jogador do ambiente de teste (?lab=jogador) para SÓ AS PARTES
VISÍVEIS: cabeça/pescoço, braços, joelhos e chuteiras. O kit cinza liso da
foto desaparece — as nossas peças passam a ser a única roupa e recolorem
sem denunciar a foto.

O kit cinza separa-se do corpo com fiabilidade (é dessaturado e claro,
a pele é quente e o cabelo escuro), ao contrário do kit preto/vermelho
anterior, que partilhava gamas com o cabelo e as sombras da pele.

Depois da separação por cor, o recorte é ARRUMADO:
  - só os blocos grandes ficam (fora fragmentos e ruído das costuras);
  - o pescoço é cortado por um arco, não a direito;
  - os joelhos e os tornozelos são cortados por linhas horizontais
    comuns aos dois lados, para as peças assentarem alinhadas.

    python3 scripts/recortar-jogador.py <pasta com jogcinza-{lado}.png>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

# fronteiras (fração da altura do recorte) medidas nas bandas do kit cinza
PESCOCO = 0.175      # arco do pescoço: onde a gola da camisola vai assentar
JOELHO_CIMA = 0.660  # topo do joelho — a bainha do calção fica por cima
JOELHO_BAIXO = 0.725  # base do joelho — o cano da meia entra aqui
BOTA = 0.905         # daqui para baixo é chuteira: guarda-se tudo

AREA_MINIMA = 900    # blocos menores que isto são ruído das costuras


def mascara_corpo(im):
    """Tudo menos o kit cinza: pele, cabelo e chuteiras."""
    a = np.array(im)
    rgb = a[..., :3].astype(int)
    op = a[..., 3] > 60
    # o kit é dessaturado em TODA a gama (as dobras sombreadas também), por
    # isso o critério é só a saturação; o cabelo e as chuteiras, que também
    # são dessaturados, ficam salvos pelas bandas da cabeça e das botas
    sat = rgb.max(2) - rgb.min(2)
    return op & ~(sat < 32)


def limpar(m, area_minima=AREA_MINIMA):
    """Fica só com os blocos grandes (cabeça, braços, joelhos, botas)."""
    rotulos, n = ndimage.label(m)
    if n == 0:
        return m
    areas = ndimage.sum(m, rotulos, range(1, n + 1))
    manter = np.zeros(n + 1, bool)
    manter[1:][areas >= area_minima] = True
    return manter[rotulos]


def arredondar_pescoco(m, h, w):
    """Corta o pescoço por um arco, para a gola assentar naturalmente."""
    y = int(h * PESCOCO)
    corte = Image.new('L', (w, h), 255)
    d = ImageDraw.Draw(corte)
    raio = int(w * 0.16)
    d.rectangle([0, y, w, h], fill=0)          # abaixo do pescoço: fora
    d.ellipse([w // 2 - raio, y - raio, w // 2 + raio, y + raio], fill=255)
    return m & (np.array(corte) > 127)


def recortar(caminho, saida):
    im = Image.open(caminho).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    a = np.array(im)
    h, w = a.shape[:2]

    corpo = mascara_corpo(im)
    # cabeça e chuteiras ficam INTEIRAS: cabelo e barba são escuros e
    # dessaturados, e o filtro de cor comia-os
    corpo[: int(h * PESCOCO)] = a[: int(h * PESCOCO), :, 3] > 60
    corpo[int(h * BOTA):] = a[int(h * BOTA):, :, 3] > 60

    # limpar antes e depois de fechar os buracos das sombras
    corpo = limpar(corpo)
    m = Image.fromarray((corpo * 255).astype('uint8'))
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    corpo = limpar(np.array(m) > 127)

    # cortes limpos: pescoço em arco, joelho e tornozelo a direito
    cabeca = corpo.copy()
    cabeca[int(h * PESCOCO):] = False
    cabeca = arredondar_pescoco(corpo, h, w)

    joelhos = corpo.copy()
    joelhos[: int(h * JOELHO_CIMA)] = False
    joelhos[int(h * JOELHO_BAIXO):] = False

    resto = corpo.copy()          # braços (entre pescoço e joelho) e botas
    resto[: int(h * PESCOCO)] = False
    resto[int(h * JOELHO_CIMA): int(h * BOTA)] = False

    corpo = cabeca | joelhos | resto

    m = Image.fromarray((corpo * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0))
    a[..., 3] = (a[..., 3].astype(np.float32) * (np.array(m) / 255.0)).astype(np.uint8)

    out = Image.fromarray(a).crop(Image.fromarray(a).getchannel('A').getbbox())
    out.save(saida)
    print(f'{os.path.basename(saida)}: {out.width}x{out.height}')
    return out


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs('public/moldes/jog', exist_ok=True)
    for lado in ('frente', 'verso'):
        recortar(f'{pasta}/jogcinza-{lado}.png', f'public/moldes/jog/jogador-{lado}.png')
