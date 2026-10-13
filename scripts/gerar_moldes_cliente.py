#!/usr/bin/env python3
"""Gera a pasta de MOLDES para o cliente montar a arte no editor dele
(Figma/Illustrator) e depois subir no painel de administração.

Para cada peça (camisola, calção) e lado (frente, verso) sai um SVG no formato
que o painel lê (ver src/lib/converterMolde.ts): a silhueta como <mask> ALFA
com a caixa EXATA da peça no simulador (kitCaixas.ts) + um grupo preso a essa
máscara com o retângulo de FUNDO (= cor base) onde se desenha a arte.
Por fora da máscara ficam as GUIAS — o painel ignora-as:
  RECORTE   linha de corte (a silhueta, a máscara real do simulador)
  SANGRIA   a silhueta alargada SANGRIA px — a arte deve chegar até aqui
  ZONAS     gola e punhos: são zonas à parte do simulador (não se pintam)

Escala: 2 px do SVG = 1 px da caixa (frente da camisola = 1420 × 1648).

Uso: python3 scripts/gerar_moldes_cliente.py <pasta_saida>
"""
import os, sys
import cv2
import numpy as np
from PIL import Image, ImageDraw

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'
ESC = 2                      # px SVG por px da caixa
SANGRIA = 12                 # px da caixa (= 24 px SVG ≈ 1,7 % da largura da camisola)
MARGEM = 60                  # folga à volta da caixa no SVG, para se ver a sangria
CAIXAS = {                   # espelha src/lib/kitCaixas.ts
    ('camisola', 'frente'): (384, 410, 710, 824), ('camisola', 'verso'): (292, 396, 733, 878),
    ('calcao', 'frente'): (447, 1200, 587, 386), ('calcao', 'verso'): (376, 1230, 589, 356),
}
NOMES = {'camisola': 'camisola', 'calcao': 'calcao'}


def mascara(png, caixa, sup=4):
    """Alfa da peça recortado à caixa, em super-resolução (sup×) → bool."""
    cx, cy, cw, ch = caixa
    a = np.array(Image.open(f'{J}/{png}').convert('RGBA'))[..., 3][cy:cy + ch, cx:cx + cw]
    g = cv2.resize(a, (cw * sup, ch * sup), interpolation=cv2.INTER_CUBIC)
    return g >= 128


def contornos(m, sup=4, eps=1.2, minimo=60):
    """Contornos externos como listas de pontos já em px SVG (caixa×ESC)."""
    c, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    saida = []
    for k in c:
        if cv2.contourArea(k) < minimo * sup * sup:
            continue
        k = cv2.approxPolyDP(k, eps, True)[:, 0, :].astype(float) * (ESC / sup)
        saida.append(k)
    return saida


def d_path(conts):
    return ' '.join('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in k) + ' Z' for k in conts)


def gerar(peca, lado, saida):
    caixa = CAIXAS[(peca, lado)]; cw, ch = caixa[2] * ESC, caixa[3] * ESC
    corpo = mascara(f'vestida-{peca}-{lado}.png', caixa)
    corte = contornos(corpo)
    k = np.ones((2 * SANGRIA * 4 + 1,) * 2, np.uint8)
    sangria = contornos(cv2.dilate(corpo.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * SANGRIA * 4 + 1,) * 2)).astype(bool))
    zonas = []
    if peca == 'camisola':
        for z in ('gola', 'mangas'):
            zonas += contornos(mascara(f'vestida-{z}-{lado}.png', caixa), minimo=20)
    nome = f'{peca}-{lado}'
    vb = f'{-MARGEM} {-MARGEM} {cw + 2 * MARGEM} {ch + 2 * MARGEM}'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{cw + 2 * MARGEM}" height="{ch + 2 * MARGEM}" viewBox="{vb}" fill="none">
  <title>KYPZL — molde {nome}</title>
  <!-- GUIAS: não entram no simulador (estão fora da máscara). Podem apagar-se. -->
  <g id="GUIAS-nao-entram-no-simulador">
    <path id="SANGRIA-a-arte-deve-chegar-aqui" d="{d_path(sangria)}" stroke="#00A3E0" stroke-width="1.5" stroke-dasharray="10 6"/>
    <path id="ZONAS-gola-e-punhos-nao-pintar" d="{d_path(zonas)}" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="3 5"/>
    <path id="RECORTE-linha-de-corte" d="{d_path(corte)}" stroke="#E5004F" stroke-width="1.5"/>
  </g>
  <!-- MOLDE: a silhueta é a máscara. Desenhe a arte DENTRO do grupo ARTE. -->
  <mask id="molde" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="{cw}" height="{ch}">
    <path d="{d_path(corte)}" fill="white"/>
  </mask>
  <g id="ARTE" mask="url(#molde)">
    <rect id="FUNDO-cor-base" x="{-MARGEM}" y="{-MARGEM}" width="{cw + 2 * MARGEM}" height="{ch + 2 * MARGEM}" fill="#D9D9D9"/>
  </g>
</svg>
'''
    open(f'{saida}/{nome}.svg', 'w').write(svg)

    # pré-visualização PNG com as três guias
    f = 1.0
    im = Image.new('RGB', (cw + 2 * MARGEM, ch + 2 * MARGEM), 'white'); d = ImageDraw.Draw(im, 'RGBA')
    for c in corte:
        d.polygon([(x + MARGEM, y + MARGEM) for x, y in c], fill=(217, 217, 217, 255))

    def tracejado(conts, cor, traco, folga, w=3):
        for c in conts:
            pts = [(x + MARGEM, y + MARGEM) for x, y in c]
            pts.append(pts[0]); acc = 0.0; on = True
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                l = float(np.hypot(x1 - x0, y1 - y0)); 
                if l == 0: continue
                t = 0.0
                while t < l:
                    seg = min(traco if on else folga, l - t) if False else min((traco if on else folga) - acc, l - t)
                    if on: d.line([(x0 + (x1 - x0) * t / l, y0 + (y1 - y0) * t / l), (x0 + (x1 - x0) * (t + seg) / l, y0 + (y1 - y0) * (t + seg) / l)], fill=cor, width=w)
                    t += seg; acc += seg
                    if acc >= (traco if on else folga) - 1e-6: on = not on; acc = 0.0
    tracejado(sangria, (0, 163, 224, 255), 10, 6)
    tracejado(zonas, (245, 158, 11, 255), 3, 5)
    for c in corte:
        d.line([(x + MARGEM, y + MARGEM) for x, y in c] + [(c[0][0] + MARGEM, c[0][1] + MARGEM)], fill=(229, 0, 79, 255), width=3)
    im.save(f'{saida}/{nome}-guia.png')
    return nome, cw, ch


def main():
    saida = sys.argv[1]; os.makedirs(saida, exist_ok=True)
    for peca in ('camisola', 'calcao'):
        for lado in ('frente', 'verso'):
            print(*gerar(peca, lado, saida))


if __name__ == '__main__':
    main()
