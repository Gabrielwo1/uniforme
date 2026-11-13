#!/usr/bin/env python3
"""Fecha a fresta clara entre o pescoço do jogador (frente) e a gola: junto ao
bordo interior da gola o PNG do jogador deixa 1–2 px por onde se via o fundo
(2026-11-13). Na faixa de 3 px à volta da gola o pescoço passa a opaco, e os
píxeis vazios espremidos entre a pele e a gola levam a cor da pele mais próxima
— a gola, desenhada por cima da pele, tapa o excesso.

Idempotente: lê o PNG original da revisão ORIGEM; a gola vem do PNG atual.
Uso: python3 scripts/pescoco-frente.py   (depois de aplicar-vetores-frente.py)
"""
import io, os, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{RAIZ}/public/moldes/jog'
ORIGEM = '0113d40'
FAIXA = 3  # px à volta da gola
PONTAS = 16  # linhas do topo da gola que não se tocam


def main():
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/jogador-frente.png'],
                       capture_output=True, check=True).stdout
    j = np.array(Image.open(io.BytesIO(b)).convert('RGBA'))
    g = np.array(Image.open(f'{J}/vestida-gola-frente.png').convert('RGBA'))[..., 3] > 128
    cam = np.array(Image.open(f'{J}/vestida-camisola-frente.png').convert('RGBA'))[..., 3] > 128
    pele = j[..., 3] > 200
    zona = ndi.binary_dilation(g, iterations=FAIXA)
    # só a zona do pescoço: acima do fundo da gola e fora do que a camisola já tapa
    janela = np.zeros_like(g); ys, xs = np.where(g); janela[ys.min():ys.max() + 1, xs.min():xs.max() + 1] = True
    zona &= janela & ~g
    zona[:ys.min() + PONTAS] = False   # as pontas da gola, no topo, ficam como estão (senão ganham um rebordo claro)
    idx = ndi.distance_transform_edt(~pele, return_distances=True, return_indices=True)
    dist, (iy, ix) = idx
    vazio = zona & (j[..., 3] <= 200) & (dist <= FAIXA) & ~cam
    cor = j[iy, ix]
    out = j.copy()
    out[vazio] = cor[vazio]; out[vazio, 3] = 255
    out[zona & (j[..., 3] > 0), 3] = 255
    # restos brancos/cinzentos da camisola da foto original, que o colar antigo tapava e o novo (mais
    # justo) deixa ver nas pontas: píxeis claros e sem cor de pele, à volta da gola, ficam transparentes
    lum = out[..., :3].mean(-1)
    resto = ndi.binary_dilation(g, iterations=12) & ~g & (out[..., 3] > 0) & (lum > 140) \
        & (out[..., 0].astype(int) - out[..., 2] <= 22)
    out[resto, 3] = 0
    print(f'{resto.sum()} píxeis de resto da camisola da foto removidos')
    Image.fromarray(out).save(f'{J}/jogador-frente.png')
    print(f'{vazio.sum()} píxeis de fresta fechados')


if __name__ == '__main__':
    main()
