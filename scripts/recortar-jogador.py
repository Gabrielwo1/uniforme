"""
Prepara o jogador do ambiente de teste (?lab=jogador): apaga o KIT da foto
e deixa só o corpo — cabeça, braços, joelhos e chuteiras.

Porquê: enquanto o kit da foto ficar por baixo, ele espreita nas folgas das
nossas peças e denuncia as cores antigas. Removido o kit, as nossas peças
são a única roupa e podem recolorir à vontade; basta que cubram as fronteiras
de pele (gola, cava, coxa, cano da meia), o que é fácil porque sobrepor um
pouco de pele lê-se como manga/calção mais compridos.

O corpo é reconhecido por PELE (R>G>B com margem), mais duas bandas onde se
guarda tudo: o topo (cabelo/cabeça) e o fundo (chuteiras).

    python3 scripts/recortar-jogador.py <pasta com jogcut-{lado}.png>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

# bandas verticais, em fração da altura do recorte
BANDA_CABECA = 0.155     # até aqui guarda tudo (cabelo + rosto + pescoço)
BANDA_BOTAS = 0.915      # a partir daqui guarda tudo (chuteiras)


def pele(a):
    """Máscara de pele: R>G>B com margem, nem muito escura nem lavada.

    O `r - b < 110` exclui o vermelho forte do kit da foto (r-b ~170),
    que de outra forma passaria por pele nas orlas das riscas."""
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    lum = (r + g + b) / 3
    return ((a[..., 3] > 60) & (r > g) & (g >= b)
            & (r - b > 18) & (r - b < 110) & (lum > 55) & (lum < 225))


def recortar(caminho, saida):
    im = Image.open(caminho).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())
    a = np.array(im)
    h = a.shape[0]

    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    # vermelho forte do kit: some sempre, mesmo nas bandas de "guardar tudo"
    # (na banda das botas sobrava a barra vermelha do fundo da meia)
    kit_vermelho = (r > 110) & (r - g > 60) & (r - b > 60)
    # dilatar: a orla suavizada da máscara traria de volta pixels vermelhos
    kit_vermelho = np.array(
        Image.fromarray((kit_vermelho * 255).astype('uint8')).filter(ImageFilter.MaxFilter(7))
    ) > 127

    corpo = pele(a)
    corpo[: int(h * BANDA_CABECA)] = a[: int(h * BANDA_CABECA), :, 3] > 60
    corpo[int(h * BANDA_BOTAS):] = a[int(h * BANDA_BOTAS):, :, 3] > 60
    corpo &= ~kit_vermelho

    m = Image.fromarray((corpo * 255).astype('uint8'))
    # abertura: come as lascas finas das costuras do kit (2-4 px) sem
    # comer os braços; depois fecho, para tapar sombras dentro da pele
    m = m.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    m = m.filter(ImageFilter.GaussianBlur(1.2))

    a[..., 3] = (a[..., 3].astype(np.float32) * (np.array(m) / 255.0)).astype(np.uint8)
    out = Image.fromarray(a)
    out = out.crop(out.getchannel('A').getbbox())
    out.save(saida)
    print(f'{os.path.basename(saida)}: {out.width}x{out.height}')
    return out


def marcos(im):
    """Fronteiras onde as nossas peças têm de chegar (fração da altura)."""
    a = np.array(im.getchannel('A'))
    h, w = a.shape
    linhas = (a > 60).sum(1)
    cheio = np.where(linhas > 0)[0]
    print('   perfil (fração da altura → largura ocupada):')
    for f in (0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90):
        y = int(h * f)
        xs = np.where(a[y] > 60)[0]
        if len(xs):
            print(f'     {f:.2f}: x {xs.min():4d}..{xs.max():4d}  '
                  f'ocupado {linhas[y]:4d}px')
    return cheio


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs('public/moldes/jog', exist_ok=True)
    for lado in ('frente', 'verso'):
        print(f'--- {lado} ---')
        im = recortar(f'{pasta}/jogcut-{lado}.png',
                      f'public/moldes/jog/jogador-{lado}.png')
        marcos(im)
