#!/usr/bin/env python3
"""Template do Cod. 011 "Azul Royal" (e 012) DESENHADO À RÉGUA — frente e verso.

Porquê (2026-10-05, cliente: "o topo azul não está igual, o nosso está escuro
com manchas"): a arte antiga era um TRACE do mockup gerado por IA. (1) a camada
de base do verso era pintada com a cor da camada da FRENTE (#222222 — as
camadas de cor são POSICIONAIS e partilhadas entre os lados: cf ?? cv), o que
deixava o topo preto; (2) o trace posteriza — os pontos de meio-tom viraram
blocos e os riscos finos viraram manchas. Aqui o grafismo é construído de raiz
a partir da foto do cliente (143751 frente / 143809 costas): V grosso, linha
fina, debrum, hem, meio-tom de pontos e riscos, tudo em COORDENADAS DA CAIXA
da peça (quadro = caixa → escala 1), uma camada por cor editável.

Esquema de camadas (5; mesmo nos dois lados; cores por omissão = blocos da PALETA):
  cor1  base royal            #4DA3E8  (Azul-claro)
  cor2  painel marinho em V + os RISCOS AZUIS (mistura screen)  #1F2A44
  cor3  brancos (V, linha fina, debrum, bainha, riscos)  #FFFFFF
  cor4  pontos no marinho     #4DA3E8
  cor5  pontos no royal       #87CEEB  (Azul-celeste)

Geometria medida nas silhuetas do palco (vestida-camisola-*.png):
  frente: torso 139..574 (C=356,5), sleeve/armpit y≈385, caixa 710×824
  verso : torso 150..585 (C=367,5), armpit y≈410,       caixa 733×878
O V é desenhado entre os bordos do torso; a máscara da peça faz o recorte.

Uso: python3 scripts/desenhar_royal.py <saida_dir>  → pedido-011-<lado>.json
"""

import json
import math
import os
import sys

PALETA_ROYAL = '#4DA3E8'
PALETA_MARINHO = '#1F2A44'
BRANCO = '#FFFFFF'
PONTOS_NAVY = '#4DA3E8'
RISCOS = '#2563EB'
PONTOS_ROYAL = '#87CEEB'

LADOS = {
    'frente': dict(
        cw=710, ch=824, C=356.5, H=217.5, yE=298, yC=408, off2=90, arm=385,
        # debrum do ombro: do pescoço ao topo da costura da manga e daí cai
        # pela costura (pontos medidos na grelha da peça)
        ombro_e=[(225, 20), (160, 48), (108, 82), (100, 125), (100, 195), (106, 250)],
        ombro_d=[(440, 18), (520, 46), (592, 86), (602, 130), (592, 200), (580, 252)],
        ponto_r1=(600, 120),
    ),
    'verso': dict(
        cw=733, ch=878, C=367.5, H=217.5, yE=348, yC=458, off2=80, arm=410,
        ombro_e=[(268, 14), (215, 44), (150, 80), (104, 108), (100, 160), (112, 225)],
        ombro_d=[(468, 14), (520, 44), (590, 78), (640, 108), (642, 160), (628, 235)],
        ponto_r1=(585, 120),
    ),
}


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def f1(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def poligono(pts, cor):
    d = 'M' + ' L'.join(f'{f1(x)} {f1(y)}' for x, y in pts) + ' Z'
    return f'<path fill="{cor}" d="{d}"/>'


def fita_v(g, y_ends, y_center, meia, margem=8):
    """Faixa em V (espessura vertical 2*meia) de lado a lado do torso."""
    xl, xr, C = g['C'] - g['H'] - margem, g['C'] + g['H'] + margem, g['C']
    sup = [(xl, y_ends - meia), (C, y_center - meia), (xr, y_ends - meia)]
    inf = [(xr, y_ends + meia), (C, y_center + meia), (xl, y_ends + meia)]
    return sup + inf


def y_banda(g, x, y_ends, y_center):
    t = clamp(abs(x - g['C']) / g['H'])
    return y_ends + (y_center - y_ends) * (1 - t)


def sliver(p0, p1, t0, curva=0.0):
    """Risco afilado: espessura t0 em p0 e agulha em p1, com curvatura."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    mx, my = (x0 + x1) / 2 + nx * curva, (y0 + y1) / 2 + ny * curva
    a = (x0 + nx * t0, y0 + ny * t0)
    b = (x0 - nx * t0, y0 - ny * t0)
    c1 = (mx + nx * t0 * 0.55, my + ny * t0 * 0.55)
    c2 = (mx - nx * t0 * 0.55, my - ny * t0 * 0.55)
    return (f'M{f1(a[0])} {f1(a[1])} Q{f1(c1[0])} {f1(c1[1])} {f1(x1)} {f1(y1)} '
            f'Q{f1(c2[0])} {f1(c2[1])} {f1(b[0])} {f1(b[1])} Z')


def riscos(lista, cor):
    return f'<path fill="{cor}" d="{" ".join(sliver(*r) for r in lista)}"/>'


def pontos(g, regioes, cor, rmax=4.0, passo=10.5):
    """Meio-tom: grelha escalonada; o raio vem do peso 0..1 de cada região."""
    ds = []
    y = -20.0
    fila = 0
    while y < g['ch'] + 20:
        x = -20.0 + (passo / 2 if fila % 2 else 0)
        while x < g['cw'] + 20:
            w = max(r(x, y) for r in regioes) if g['C'] - g['H'] <= x <= g['C'] + g['H'] else 0
            rr = rmax * (w ** 0.85)
            if rr >= 0.9:
                ds.append(f'M{f1(x - rr)} {f1(y)}a{f1(rr)} {f1(rr)} 0 1 0 {f1(2 * rr)} 0'
                          f'a{f1(rr)} {f1(rr)} 0 1 0 {f1(-2 * rr)} 0')
            x += passo
        y += passo * 0.866
        fila += 1
    return f'<path fill="{cor}" d="{"".join(ds)}"/>' if ds else '<g/>'


CAIXAS = {'frente': (384, 410, 710, 824), 'verso': (292, 396, 733, 878)}
RAIZ_MOLDES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'moldes', 'jog')


def bainha(lado, espessura=11.0):
    """Faixa branca EXATAMENTE no rebordo inferior da camisola.

    O contorno vem da máscara real da peça (vestida-camisola-<lado>.png): para
    cada coluna, a última linha opaca. A faixa vai de (contorno - espessura)
    para fora do tecido — a máscara da peça recorta o excesso, por isso o
    branco fica rente à orla, seguindo-lhe a curva natural. (Pedido do
    cliente 2026-10-05: nada de "U" desenhado por dentro.)
    """
    import numpy as np
    from PIL import Image

    cx, cy, cw, ch = CAIXAS[lado]
    a = np.array(Image.open(os.path.join(RAIZ_MOLDES, f'vestida-camisola-{lado}.png')).convert('RGBA'))[..., 3]
    sub = a[cy:cy + ch + 40, cx:cx + cw] > 128
    # só o corpo da camisola: ignora a faixa das mangas (acima da axila)
    base = []
    for x in range(cw):
        col = np.where(sub[:, x])[0]
        if len(col) and col.max() > ch * 0.6:
            base.append((x, float(col.max())))
    if not base:
        return '<g/>'
    xs = [p[0] for p in base]
    ys = np.array([p[1] for p in base])
    k = 5  # suaviza a serrilha da máscara sem mexer na curva
    ys_s = np.convolve(np.pad(ys, (k, k), mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='valid')
    topo = [(x, y - espessura) for x, y in zip(xs, ys_s)]
    fundo = [(x, y + 40) for x, y in zip(xs[::-1], ys_s[::-1])]
    return poligono(topo + fundo, BRANCO)


def desenhar(lado):
    g = LADOS[lado]
    cw, ch, C, H, yE, yC = g['cw'], g['ch'], g['C'], g['H'], g['yE'], g['yC']
    xL, xR = C - H, C + H
    yE2, yC2 = yE + g['off2'], yC + g['off2']

    def acima(x, y):  # distância acima da banda grossa (>0 = royal)
        return y_banda(g, x, yE, yC) - y

    def abaixo1(x, y):  # distância abaixo da banda grossa
        return y - y_banda(g, x, yE, yC)

    def abaixo2(x, y):  # distância abaixo da linha fina
        return y - y_banda(g, x, yE2, yC2)

    def un(x):  # 0 na borda esquerda do torso → 1 ao centro
        return clamp((x - xL) / H) if x < C else clamp((xR - x) / H)

    # --- cor1 base royal (sangria total; a máscara da peça recorta) ----------
    cor1 = f'<rect fill="{PALETA_ROYAL}" x="-60" y="-60" width="{cw + 120}" height="{ch + 120}"/>'

    # --- cor2 painel marinho em V (do centro da banda grossa para baixo) -----
    arm = g['arm']
    cor2 = poligono([
        (xL - 6, yE), (C, yC), (xR + 6, yE), (xR + 6, arm), (cw + 60, arm),
        (cw + 60, ch + 60), (-60, ch + 60), (-60, arm), (xL - 6, arm),
    ], PALETA_MARINHO)

    # --- cor3 brancos ---------------------------------------------------------
    partes = [poligono(fita_v(g, yE, yC, 10.5), BRANCO),
              poligono(fita_v(g, yE2, yC2, 4.8), BRANCO)]
    tracos = []
    # debrum do ombro/costura (largura 5) — traço com fill none
    def curva(pts):
        # Catmull-Rom → Bézier: o debrum é uma curva contínua (como a foto),
        # não uma poligonal com cantos no topo da costura
        P = [pts[0]] + list(pts) + [pts[-1]]
        d = f'M{pts[0][0]} {pts[0][1]}'
        for i in range(1, len(P) - 2):
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f' C{f1(c1[0])} {f1(c1[1])} {f1(c2[0])} {f1(c2[1])} {p2[0]} {p2[1]}'
        return f'<path fill="none" stroke="{BRANCO}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" d="{d}"/>'
    tracos += [curva(g['ombro_e']), curva(g['ombro_d'])]
    # riscos brancos afilados PARALELOS à banda (como a foto): o k-ésimo corre
    # a dk px acima/abaixo da linha central, afilando para o centro
    def paralelo(x0, x1, dk, t0, curva=0):
        return ((x0, y_banda(g, x0, yE, yC) + dk), (x1, y_banda(g, x1, yE, yC) + dk), t0, curva)
    brancos = [
        paralelo(xL + 6, C - 78, -70, 8.5, -3),
        paralelo(xL + 14, C - 104, -46, 4.5, -2),
        paralelo(xL + 26, C - 120, -24, 2.4, -1),
        paralelo(xL + 34, C - 66, 38, 6.5, 2),            # entre as linhas, esquerda
        paralelo(xR - 30, C + 92, 36, 5, 2),              # entre as linhas, direita
        paralelo(xR - 10, xR - 78, -112, 4.5, 2),         # ombro direito
        paralelo(xR - 8, xR - 64, -34, 3.8, 1),
    ]
    brancos.append(((xR - 8, yE + 120), (xR - 40, yE + 220), 3, 2))
    cor3 = ''.join(partes) + ''.join(tracos) + bainha(lado) + riscos(brancos, BRANCO)

    # --- cor4 pontos no marinho ----------------------------------------------
    regs4 = [
        # entre a banda grossa e a linha fina: leque junto ao bordo esquerdo
        lambda x, y: clamp(1 - un(x) / 0.78) * clamp(1 - (abaixo1(x, y) - 14) / 78)
        if x < C and abaixo1(x, y) > 14 and abaixo2(x, y) < -14 else 0,
        lambda x, y: clamp(1 - un(x) / 0.62) * clamp(1 - (abaixo1(x, y) - 14) / 78)
        if x >= C and abaixo1(x, y) > 14 and abaixo2(x, y) < -14 else 0,
        # abaixo da linha fina: dois leques que descem
        lambda x, y: clamp(1 - un(x) / 0.6) * clamp(1 - (abaixo2(x, y) - 14) / 150)
        if x < C and abaixo2(x, y) > 14 else 0,
        lambda x, y: clamp(1 - un(x) / 0.55) * clamp(1 - (abaixo2(x, y) - 14) / 150)
        if x >= C and abaixo2(x, y) > 14 else 0,
    ]
    cor4 = pontos(g, regs4, PONTOS_NAVY, rmax=3.9, passo=10.5)
    # três pontos soltos sobre o marinho (como a foto)
    soltos = [(C - 10, yC2 + 170, 3.4), (C + 66, yC2 + 212, 3.4), (C + 104, yC2 + 198, 3.8)]
    solt = ''.join(f'<circle fill="{PONTOS_NAVY}" cx="{f1(x)}" cy="{f1(y)}" r="{f1(r)}"/>' for x, y, r in soltos)
    cor4 = (cor4 if cor4 != '<g/>' else '') + solt

    # --- cor5 riscos azuis (finos, no marinho) --------------------------------
    azuis = [
        ((xL + 22, yE2 + 4), (C - 30, yC2 + 120), 2.6, 4),
        ((xR - 14, yE2 + 8), (xR - 128, yC2 + 112), 3.2, -5),
        ((xR - 30, yE2 + 60), (C + 70, yC2 + 190), 2.4, 4),
        ((C + 20, yC2 + 236), (xR - 24, yC2 + 134), 3.0, -9),
        ((C + 30, yC2 + 252), (xR - 70, yC2 + 190), 2.0, 5),
    ]
    # Os riscos azuis NÃO são camada própria (cliente 2026-10-06: "a E deve ser
    # junto à B"): vivem dentro da camada B do painel, em mistura SCREEN com a
    # cor da própria camada — o motor repinta tudo com a cor de B, e o screen
    # sobre ela dá sempre um tom mais claro da MESMA cor, por isso os riscos
    # seguem a B e continuam visíveis. Desenhados 3x = clareamento mais forte.
    d_riscos = ' '.join(sliver(p0, p1, t0 * 1.45, cv) for p0, p1, t0, cv in azuis)
    riscos_b = ('<g style="mix-blend-mode:screen">'
                + ''.join(f'<path fill="{PALETA_MARINHO}" d="{d_riscos}"/>' for _ in range(3))
                + '</g>')
    cor2 = cor2 + riscos_b

    # --- cor6 pontos no royal (acima da banda grossa) --------------------------
    r1x, r1y = g['ponto_r1']
    regs6 = [
        lambda x, y: clamp(1 - un(x) / 0.68) * clamp(1 - (acima(x, y) - 6) / 84)
        if x < C and acima(x, y) > 6 else 0,
        lambda x, y: clamp(1 - un(x) / 0.62) * clamp(1 - (acima(x, y) - 6) / 84)
        if x >= C and acima(x, y) > 6 else 0,
        lambda x, y: clamp(1 - math.hypot(x - r1x, (y - r1y) * 1.25) / 46),
    ]
    cor6 = pontos(g, regs6, PONTOS_ROYAL, rmax=3.8, passo=10.5)

    return [
        ('cor1', PALETA_ROYAL, cor1),
        ('cor2', PALETA_MARINHO, cor2),
        ('cor3', BRANCO, cor3),
        ('cor4', PONTOS_NAVY, cor4),
        ('cor5', PONTOS_ROYAL, cor6),
    ], g


def main():
    saida = sys.argv[1]
    os.makedirs(saida, exist_ok=True)
    for lado in ('frente', 'verso'):
        camadas, g = desenhar(lado)
        dados = {
            'cod_modelo': '011', 'nome': 'Azul Royal', 'peca': 'camisola', 'lado': lado,
            'quadro': {'x': 0, 'y': 0, 'w': g['cw'], 'h': g['ch']},
            'cor_fundo': PALETA_ROYAL,
            'cores_zonas': {'gola': '#FFFFFF', 'mangas': '#FFFFFF'},
            'camadas': [{'id': i, 'cor': c, 'svg': s} for i, c, s in camadas],
        }
        json.dump({'codigo': '4554', 'acao': 'guardar-modelo', 'dados': dados},
                  open(f'{saida}/pedido-011-{lado}.json', 'w'), separators=(',', ':'))
        print(lado, [(i, len(s)) for i, _, s in camadas])


if __name__ == '__main__':
    main()
