"""
Monta o conjunto FLUTUANTE (estética do simulador de referência): as peças
não vestem um corpo — ficam empilhadas ao alto, camisola grande, calção
abaixo, par de meias em baixo, cada uma nas suas proporções NATURAIS
(escala uniforme, zero distorção).

As escalas relativas entre as peças seguem a régua da referência
(calção ~75% da largura da camisa, meião ~67%); os assets são nossos.
Tudo é gravado numa tela comum que mapeia a coluna inteira do visualizador,
por isso os slots do KitViewer são todos idênticos (absolute inset-0).

Tela comum: 1080×2460 = wrapper 270×615 (escala 4).

    python3 scripts/vestir-conjunto.py <pasta com c-{peca}-{lado}.png>
"""
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance

M = 4
W, H = 270 * M, 615 * M

# layout flutuante (wrapper coords): topo da peça + largura alvo
ALVOS = {
    'camisola': dict(topo=10, largura=216, base=256),
    'calcao': dict(topo=262, largura=162, base=396),
    'meiao': dict(topo=404, largura=145, base=600, ancora='base'),
}


def instalar(origem, peca, lado):
    im = Image.open(origem).convert('RGBA')
    im = im.crop(im.getchannel('A').getbbox())

    # neutralizar: o alfa recorta, os cinzas dão o sombreado (multiply);
    # claro q.b. para um branco escolhido pelo cliente sair branco
    r, g, b, a = im.split()
    rgb = ImageEnhance.Color(Image.merge('RGB', (r, g, b))).enhance(0.0)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.30)
    im = Image.merge('RGBA', (*rgb.split(), a))

    alvo = ALVOS[peca]
    # escala UNIFORME (sem distorção), limitada pela largura E pela altura
    esc = min(alvo['largura'] * M / im.width,
              (alvo['base'] - alvo['topo']) * M / im.height)
    im = im.resize((int(im.width * esc), int(im.height * esc)), Image.LANCZOS)

    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    x0 = int(135 * M - im.width / 2)
    # âncora 'base': frente e verso terminam na mesma linha de chão,
    # mesmo quando os recortes têm alturas diferentes
    if alvo.get('ancora') == 'base':
        y0 = int(alvo['base'] * M - im.height)
    else:
        y0 = int(alvo['topo'] * M)
    tela.alpha_composite(im, (x0, y0))
    tela.save(f'public/moldes/vestida-{peca}-{lado}.png')
    print(f'{peca}-{lado}: canvas ({x0},{y0})..({x0 + im.width},{y0 + im.height})'
          f'  [{im.width / M:.0f}×{im.height / M:.0f} wrapper]')

    # caixa do tronco p/ a estampa (sem gola nem mangas): linha a 60%,
    # gola excluída pelos primeiros 9% da altura
    if peca == 'camisola':
        arr = np.array(tela.getchannel('A'))
        py = y0 + int(im.height * 0.60)
        xs = np.where(arr[py] > 60)[0]
        cy = y0 + int(im.height * 0.09)
        print(f'   caixa estampa: x={xs.min()}, y={cy}, '
              f'w={xs.max() - xs.min()}, h={y0 + im.height - cy}')


def componentes(im):
    """Divide a imagem nos seus blocos horizontais (bota esquerda/direita)."""
    a = np.array(im.getchannel('A'))
    colunas = (a > 60).any(axis=0)
    xs = np.where(colunas)[0]
    saltos = np.where(np.diff(xs) > 12)[0]
    grupos = np.split(xs, saltos + 1)
    grupos = sorted(sorted(grupos, key=len, reverse=True)[:2], key=lambda g: g[0])
    return [im.crop((g[0], 0, g[-1] + 1, im.height)).crop(
        im.crop((g[0], 0, g[-1] + 1, im.height)).getchannel('A').getbbox())
        for g in grupos]


def instalar_botas(origem, lado, altura=64, folga_y=6):
    """Chuteiras estáticas (não recolorem): cada bota ancorada ao pé da meia
    correspondente na tela já cozida — como na referência, a meia entra na
    bota."""
    meias = Image.open(f'public/moldes/vestida-meiao-{lado}.png')
    a = np.array(meias.getchannel('A'))
    ys, xs = np.where(a > 60)
    fundo_meia = ys.max()
    # centros dos dois pés: colunas na faixa dos últimos 12% da meia
    faixa = a[int(fundo_meia - (fundo_meia - ys.min()) * 0.12):fundo_meia + 1]
    cols = np.where((faixa > 60).any(axis=0))[0]
    g = np.split(cols, np.where(np.diff(cols) > 20)[0] + 1)
    g = sorted(sorted(g, key=len, reverse=True)[:2], key=lambda x: x[0])
    centros = [(x[0] + x[-1]) / 2 for x in g]

    par = Image.open(origem).convert('RGBA')
    par = par.crop(par.getchannel('A').getbbox())
    botas = componentes(par)

    tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for bota, cx in zip(botas, centros):
        esc = altura * M / bota.height
        b = bota.resize((int(bota.width * esc), int(bota.height * esc)), Image.LANCZOS)
        x0 = int(cx - b.width / 2)
        y0 = int(fundo_meia + folga_y * M - b.height)
        tela.alpha_composite(b, (x0, y0))
        print(f'botas-{lado}: bota em ({x0},{y0}) {b.width}x{b.height}')
    tela.save(f'public/moldes/botas-{lado}.png')


if __name__ == '__main__':
    pasta = sys.argv[1]
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for peca in ('camisola', 'calcao', 'meiao'):
        nome = 'camisa' if peca == 'camisola' else peca
        for lado in ('frente', 'verso'):
            instalar(f'{pasta}/c-{nome}-{lado}.png', peca, lado)
    for lado in ('frente', 'verso'):
        instalar_botas(f'{pasta}/botas-{lado}-raw.png', lado)
