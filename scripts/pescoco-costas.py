#!/usr/bin/env python3
"""Desce o pescoço do jogador (costas) por baixo da gola: entre o fim do pescoço
(jogador-verso.png) e o topo da gola ficava uma fresta de 1–4 px por onde via-se
o fundo — uma linha branca (2026-11-12). Cada coluna do pescoço é prolongada
para baixo com a cor da sua última linha opaca, até 8 px dentro da gola (que a
tapa, porque o jogador é desenhado por baixo da camisola).

Idempotente: lê o PNG original da revisão ORIGEM.
Uso: python3 scripts/pescoco-costas.py
"""
import io, os, subprocess
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{RAIZ}/public/moldes/jog'
ORIGEM = '0113d40'
DENTRO = 8  # px que o pescoço entra por baixo da gola


def main():
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/jogador-verso.png'],
                       capture_output=True, check=True).stdout
    j = np.array(Image.open(io.BytesIO(b)).convert('RGBA'))
    g = np.array(Image.open(f'{J}/vestida-gola-verso.png').convert('RGBA'))
    n = 0
    for x in range(j.shape[1]):
        gola = np.where(g[:, x, 3] > 128)[0]
        pesc = np.where(j[330:480, x, 3] > 250)[0] + 330
        if not len(gola) or not len(pesc): continue
        fim, topo = pesc.max(), gola.min()
        if topo + DENTRO <= fim: continue
        cor = j[fim - 1, x].copy(); cor[3] = 255
        j[fim:topo + DENTRO + 1, x] = cor
        n += 1
    Image.fromarray(j).save(f'{J}/jogador-verso.png')
    print(f'{n} colunas do pescoço prolongadas')


if __name__ == '__main__':
    main()
