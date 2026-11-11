#!/usr/bin/env python3
"""Corta a PONTA da manga que sobra para fora do punho, nas COSTAS.

A máscara da camisola do designer (vestida-camisola-verso.png) é uns píxeis
mais larga do que a tira do punho (vestida-mangas-verso.png) na ponta exterior
de cada manga: por baixo da linha do topo do punho fica um bico de manga sem
punho, que aparece de outra cor (cliente, 2026-11-11, "a manga ainda está
fora"). Aqui o alfa desses bicos passa a 0, em todas as máscaras do verso
(camisola e corpo-<estilo>). Só o alfa muda. Os originais ficam no git.

Também apara o PUNHO (vestida-mangas-verso.png) onde pende para fora do braço, no
vão entre o braço e o tronco: a tira é ~16 px mais larga do que o braço e a ponta
interior fica a flutuar sobre o fundo (cliente: "o vão no sovaço"). Só se retiram os
píxeis do punho que não têm NADA por trás — nem camisola nem avatar.

Uso: python3 scripts/limpar-manga-costas.py
"""
import glob
import numpy as np
from PIL import Image

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'

mangas = np.array(Image.open(f'{J}/vestida-mangas-verso.png').convert('RGBA'))[..., 3] > 128
H, W = mangas.shape
cols = np.where(mangas.any(axis=0))[0]
meio = (cols.min() + cols.max()) // 2           # as duas mangas ficam de cada lado do meio
esq, dir_ = cols[cols < meio], cols[cols >= meio]
x_esq, x_dir = esq.min(), dir_.max()
y_esq = np.where(mangas[:, x_esq:x_esq + 3].any(axis=1))[0].min()   # topo do punho na ponta esquerda
y_dir = np.where(mangas[:, x_dir - 2:x_dir + 1].any(axis=1))[0].min()

for f in ['vestida-camisola-verso.png'] + [p.split('/')[-1] for p in sorted(glob.glob(f'{J}/corpo-*-verso.png'))]:
    img = Image.open(f'{J}/{f}').convert('RGBA')
    a = np.array(img)
    corte = np.zeros((H, W), bool)
    corte[y_esq - 2:, :x_esq] = True            # ponta esquerda: à esquerda do punho, de cima do punho para baixo
    corte[y_dir - 2:, x_dir + 1:] = True        # ponta direita
    # só na zona das mangas (não toca no tronco nem nas pernas)
    zona = np.zeros((H, W), bool)
    zona[y_esq - 2:y_esq + 120, :meio] = True
    zona[y_dir - 2:y_dir + 120, meio:] = True
    antes = int((a[..., 3] > 0).sum())
    a[..., 3] = np.where(corte & zona, 0, a[..., 3])
    Image.fromarray(a).save(f'{J}/{f}', optimize=True)
    print(f, 'píxeis retirados:', antes - int((a[..., 3] > 0).sum()))

# --- punho: fora o que paira sobre o vazio -------------------------------
av = np.array(Image.open(f'{J}/jogador-verso.png').convert('RGBA'))[..., 3] > 50
cam = np.array(Image.open(f'{J}/vestida-camisola-verso.png').convert('RGBA'))[..., 3] > 20
img = Image.open(f'{J}/vestida-mangas-verso.png').convert('RGBA')
a = np.array(img)
vazio = (a[..., 3] > 0) & ~av & ~cam
a[..., 3] = np.where(vazio, 0, a[..., 3])
Image.fromarray(a).save(f'{J}/vestida-mangas-verso.png', optimize=True)
print('vestida-mangas-verso.png píxeis retirados:', int(vazio.sum()))

# (corta também as 3 últimas linhas do punho: é aí que a borda serrilhada do
# punho, semitransparente, deixava ver a cor ESCURA da manga por baixo)
# --- franja por baixo do punho (frente E costas) ---------------------------
# A máscara da camisola passa 5-7 px para lá da borda de baixo do punho, em
# todas as colunas: um fio de manga ESCURA que, sobre pele, se vê como pontos
# pretos ao longo do punho (cliente, 2026-11-11). Corta-se esse fio — só nas
# colunas do punho, sem a ponta interior (onde começa o tronco).
for lado in ('verso', 'frente'):
    mg = np.array(Image.open(f'{J}/vestida-mangas-{lado}.png').convert('RGBA'))[..., 3] > 128
    cs = np.where(mg.any(axis=0))[0]
    meio_ = (cs.min() + cs.max()) // 2
    lados_ = ((cs[cs < meio_], 'esq'), (cs[cs >= meio_], 'dir'))
    for f in [f'vestida-camisola-{lado}.png'] + [q.split('/')[-1] for q in sorted(glob.glob(f'{J}/corpo-*-{lado}.png'))]:
        img = Image.open(f'{J}/{f}').convert('RGBA')
        a = np.array(img)
        n = 0
        for xs_, nome in lados_:
            x0, x1 = xs_.min(), xs_.max()
            interior = (x1 - 4) if nome == 'esq' else x1          # esq: o interior é o fim; dir: o início
            ini = x0 if nome == 'esq' else x0 + 4
            fim = interior if nome == 'esq' else x1
            for x in range(ini, fim + 1):
                ys = np.where(mg[:, x])[0]
                if len(ys) == 0:
                    continue
                yb = ys.max()
                n += int((a[yb - 3:yb + 9, x, 3] > 0).sum())
                a[yb - 3:yb + 9, x, 3] = 0
        Image.fromarray(a).save(f'{J}/{f}', optimize=True)
        print(f, 'franja retirada:', n)
