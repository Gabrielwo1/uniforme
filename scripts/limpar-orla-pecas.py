#!/usr/bin/env python3
"""Tira os PONTOS ESCUROS da orla das peças (punhos, mangas, gola, calção…).

Os PNG das zonas do designer trazem, nos píxeis da ORLA (alfa < 250), cores
que não são as do tecido: restos do fundo com que foram recortados (alguns
quase pretos, outros brancos). Como o PNG também serve de sombreado em
multiply, esses píxeis desenham uma linha de pontos escuros — ou um fio claro —
à volta da peça (cliente: "aqueles pontos na manga").

Remédio de produção (decontaminação): cada píxel da orla ganha a cor RGB do
píxel OPACO mais próximo (alfa ≥ 250). O ALFA não muda — a forma é a mesma.
Os originais ficam no git.

Uso: python3 scripts/limpar-orla-pecas.py
"""
import glob
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'
PADROES = ['vestida-*.png', 'corpo-*.png', 'gola-*-frente.png', 'gola-*-verso.png', 'linha-*.png']

feitos = 0
for padrao in PADROES:
    for f in sorted(glob.glob(f'{J}/{padrao}')):
        nome = f.split('/')[-1]
        if '-pele-' in nome:          # a pele do avatar é imagem, não tecido
            continue
        a = np.array(Image.open(f).convert('RGBA'))
        opaco = a[..., 3] >= 250
        if opaco.sum() < 100:
            continue
        orla = (a[..., 3] > 0) & ~opaco
        _, (iy, ix) = ndi.distance_transform_edt(~opaco, return_indices=True)
        rgb = a[..., :3].copy()
        rgb[orla] = a[iy[orla], ix[orla], :3]
        a[..., :3] = rgb
        Image.fromarray(a).save(f, optimize=True)
        feitos += 1
        print(nome, 'orla repintada:', int(orla.sum()))
print('ficheiros:', feitos)
