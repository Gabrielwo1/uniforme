#!/usr/bin/env python3
"""Limpa a FRANJA CLARA que o avatar base traz na bainha do calção.

O avatar do designer tem os calções brancos apagados, mas ficaram restos
claros (cinzento/branco quase neutro) à volta da bainha, por cima da coxa. Com
calção claro não se vê; com calção ESCURO (013 Hexágonos, preto) aparece como
uma linha branca a "recortar" o calção (cliente, 2026-10-08).

Só mexe na faixa da bainha (y ≥ 1500 e dentro da caixa do calção ±40 px): os
píxeis quase neutros e claros são repintados com a pele vizinha (inpaint de
Telea); o canal alfa NÃO muda. Os originais ficam no git.

Uso: python3 scripts/limpar-franja-calcao.py
"""
import cv2
import numpy as np
from PIL import Image

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'

for lado in ('verso', 'frente'):
    img = Image.open(f'{J}/jogador-{lado}.png').convert('RGBA')
    a = np.array(img).astype(int)
    r, g, b, al = (a[..., i] for i in range(4))
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    # claro e pouco saturado, OU claro de mais para ser pele (mistura pele+franja)
    rem = (al > 20) & ((((mx - mn) < 28) & (mx > 120)) | (mn > 130))
    sh = np.array(Image.open(f'{J}/vestida-calcao-{lado}.png').convert('RGBA'))[..., 3] > 128
    ys, xs = np.where(sh)
    faixa = np.zeros_like(rem)
    faixa[1500:1610, xs.min() - 40:xs.max() + 40] = True
    alvo = (rem & faixa).astype(np.uint8)
    alvo = cv2.dilate(alvo, np.ones((5, 5), np.uint8))
    rgb = np.array(img)[..., :3].copy()
    # a pele vizinha: o inpaint só usa píxeis opacos (não a transparência)
    novo = cv2.inpaint(rgb, alvo, 5, cv2.INPAINT_TELEA)
    out = np.array(img); out[..., :3] = np.where(alvo[..., None] > 0, novo, out[..., :3])

    # Fecha o VÃO entre a bainha e a coxa: por coluna, desde um pouco acima da
    # bainha (fim da máscara do calção) até 10 px abaixo, o que ainda estiver
    # transparente e tenha pele opaca logo por baixo passa a pele — senão o
    # fundo cinzento espreita numa linha fina por baixo de um calção escuro.
    alfa = out[..., 3].astype(int)
    vao = np.zeros(alfa.shape, np.uint8)
    for x in range(xs.min() - 10, xs.max() + 10):
        col = np.where(sh[:, x])[0]
        col = col[col > 1450]
        if len(col) == 0:
            continue
        yb = col.max()
        if np.percentile(alfa[yb + 12:yb + 40, x], 20) < 200:   # sem pele por baixo: é o vão entre as pernas
            continue
        faixa = slice(yb - 3, yb + 11)
        vao[faixa, x] = (alfa[faixa, x] < 245)
    vao = cv2.morphologyEx(vao, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    rgb2 = out[..., :3].copy()
    pele = cv2.inpaint(rgb2, vao, 5, cv2.INPAINT_TELEA)
    out[..., :3] = np.where(vao[..., None] > 0, pele, out[..., :3])
    out[..., 3] = np.where(vao > 0, 255, out[..., 3])
    print(lado, 'vão fechado (px):', int(vao.sum()))
    Image.fromarray(out).save(f'{J}/jogador-{lado}.png', optimize=True)
    print(lado, 'píxeis repintados:', int(alvo.sum()))
