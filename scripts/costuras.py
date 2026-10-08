#!/usr/bin/env python3
"""Costuras da camisola no palco — a fronteira TRONCO / MANGAS, em coordenadas
da CAIXA da peça (origem no canto da caixa; frente 710×824, verso 733×878).

Porquê (2026-10-08, cliente: "a manga não está bem definida", "pontos amarelos
que devem ser só da faixa da manga", "vão no sovaco entre a lateral do peito e
o braço"): os temas traçados de foto têm arte que escorre para a manga e para o
sovaco (a silhueta da peça é a máscara; o resto é lixo do trace). A solução é
dar à arte uma costura REAL — a do ombro ao sovaco — e deixar a manga com a sua
própria cor, só com a faixa do punho (zona `mangas`) por cima.

A costura vai do OMBRO (T) ao SOVACO (A) em recta; desce depois pela lateral
do tronco. T mede-se na silhueta da máscara (a manga começa um pouco para
dentro do contorno), A é o canto côncavo onde a manga encontra o tronco.

Usos:
  poligono_tronco(lado)          → pontos do tronco (caixa)
  poligono_manga(lado, 'esq')    → pontos da manga (caixa) — esq/dir = lado do ECRÃ
  contorno_manga(lado, 'esq')    → pontos da silhueta exterior da manga (para o vivo)
  para_arte(pts, quadro, lado)   → pontos em coordenadas da arte (quadro)
"""
import numpy as np
from PIL import Image

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'
CAIXA = {'frente': (384, 410, 710, 824), 'verso': (292, 396, 733, 878)}

# ombro (y do ponto T e quanto entra da silhueta) e sovaco (x, y) — por lado do ecrã
GEO = {
    'frente': dict(yT=112, entra=24, esq=(137, 384), dir=(576, 384)),
    'verso': dict(yT=116, entra=20, esq=(148, 409), dir=(587, 409)),
}
_mascara = {}


def mascara(lado):
    if lado not in _mascara:
        cx, cy, cw, ch = CAIXA[lado]
        a = np.array(Image.open(f'{J}/vestida-camisola-{lado}.png').convert('RGBA'))[..., 3] > 128
        _mascara[lado] = a[cy:cy + ch, cx:cx + cw]
    return _mascara[lado]


def _sil(lado, y, lado_ecra):
    xs = np.where(mascara(lado)[y])[0]
    return float(xs[0] if lado_ecra == 'esq' else xs[-1])


def ombro(lado, lado_ecra):
    g = GEO[lado]; x = _sil(lado, g['yT'], lado_ecra)
    return (x + g['entra'], g['yT']) if lado_ecra == 'esq' else (x - g['entra'], g['yT'])


def poligono_tronco(lado, topo=-120, fundo=None, folga=16):
    """Tronco: da costura do ombro para baixo. Abaixo do sovaco (+folga, a aba
    da manga ainda desce uns px junto à costura) o contorno sai para fora —
    a máscara recorta, e assim a lateral que alarga até à bainha leva a arte."""
    cw, ch = CAIXA[lado][2:]; fundo = fundo or ch + 120
    g = GEO[lado]; tl, tr = ombro(lado, 'esq'), ombro(lado, 'dir'); al, ar = g['esq'], g['dir']
    ya, yb = al[1] + folga, ar[1] + folga
    return [(tl[0], topo), (tr[0], topo), tr, ar, (ar[0], yb), (cw + 300, yb), (cw + 300, fundo),
            (-300, fundo), (-300, ya), (al[0], ya), al, tl]


def poligono_manga(lado, lado_ecra, largo=240, folga=16):
    """A manga acaba no sovaco (+folga): abaixo disso já é a lateral do tronco."""
    cw, ch = CAIXA[lado][2:]; g = GEO[lado]; t = ombro(lado, lado_ecra); a = g[lado_ecra]
    topo, fundo = -120, a[1] + folga
    if lado_ecra == 'esq':
        return [(-largo, topo), (t[0], topo), t, a, (a[0], fundo), (-largo, fundo)]
    return [(cw + largo, topo), (t[0], topo), t, a, (a[0], fundo), (cw + largo, fundo)]


def contorno_manga(lado, lado_ecra, y0=None, y1=None):
    """Pontos (x, y) da silhueta exterior da manga, do ombro ao punho."""
    g = GEO[lado]; y0 = y0 if y0 is not None else g['yT'] - 18
    y1 = y1 if y1 is not None else g[lado_ecra][1] - 22
    return [(_sil(lado, y, lado_ecra), float(y)) for y in range(y0, y1, 4)]


def para_arte(pts, quadro, lado):
    cx, cy, cw, ch = CAIXA[lado]
    sx, sy = cw / quadro['w'], ch / quadro['h']
    return [(quadro['x'] + x / sx, quadro['y'] + y / sy) for x, y in pts]


def d_path(pts):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z'
