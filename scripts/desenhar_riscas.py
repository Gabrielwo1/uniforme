#!/usr/bin/env python3
"""Template do Cod. 010 "Riscas" REFEITO à régua — frente e verso.

Referência do cliente (fotos 143636 frente / 143652 costas): camisola de RISCAS
vermelhas e brancas na frente (5 riscas de igual largura de costura a costura:
V B V B V — vermelha ao centro e nas duas pontas), COSTAS em marinho liso, MANGAS
brancas com punho marinho e um vivo vermelho fino na costura exterior.

O que estava mal (2026-10-08): o verso tinha o painel marinho TRAÇADO da foto —
passava por cima da manga e deixava restos brancos rasgados; na frente as riscas
vermelhas corriam pelas mangas (as mangas saíam vermelhas). Aqui o tronco é
desenhado até à COSTURA REAL ombro→sovaco (scripts/costuras.py) e a manga fica
branca, só com o vivo.

Esquema de camadas (3; igual nos dois lados — as camadas são POSICIONAIS):
  cor1  base branca (cobre a caixa toda → controla riscas brancas e mangas)  #FFFFFF
  cor2  painel marinho das costas                                          #1F2A44
  cor3  vermelho: riscas da frente + vivo das mangas                       #E52424

Uso: python3 scripts/desenhar_riscas.py <saida_dir>  → pedido-010-<lado>.json
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import costuras as C

BRANCO, MARINHO, VERMELHO = '#FFFFFF', '#1F2A44', '#E52424'
TORSO = {'frente': (141, 574), 'verso': (150, 585)}   # bordos do tronco abaixo do sovaco (medidos na máscara)
VIVO = (4.0, 6.5)                                      # (para fora, para dentro) em px — a máscara corta o de fora


def f(v): return f'{v:.1f}'.rstrip('0').rstrip('.')


def rect(x0, y0, x1, y1, cor):
    return f'<path fill="{cor}" d="M{f(x0)} {f(y0)}H{f(x1)}V{f(y1)}H{f(x0)}Z"/>'


def poli(pts, cor):
    return f'<path fill="{cor}" d="{C.d_path(pts)}"/>'


def vivo(lado, lado_ecra, cor):
    """Fita junto à silhueta exterior da manga, do ombro ao punho (polígono só com fill)."""
    pts = np.array(C.contorno_manga(lado, lado_ecra))
    # suaviza e calcula normais para o interior da peça
    k = np.ones(5) / 5
    px = np.convolve(np.pad(pts[:, 0], 2, mode='edge'), k, 'valid')
    py = np.convolve(np.pad(pts[:, 1], 2, mode='edge'), k, 'valid')
    tx, ty = np.gradient(px), np.gradient(py)
    n = np.hypot(tx, ty); tx, ty = tx / n, ty / n
    nx, ny = -ty, tx                                   # normal (roda a tangente 90°)
    sinal = 1 if (lado_ecra == 'esq') == (nx.mean() > 0) else -1   # aponta para dentro
    nx, ny = nx * sinal, ny * sinal
    fora = np.dstack([px - nx * VIVO[0], py - ny * VIVO[0]])[0]
    dentro = np.dstack([px + nx * VIVO[1], py + ny * VIVO[1]])[0]
    return poli(list(map(tuple, fora)) + list(map(tuple, dentro[::-1])), cor)


def desenhar(lado):
    cw, ch = C.CAIXA[lado][2:]
    tronco = C.poligono_tronco(lado)
    cp = lambda sufixo, corpo: (f'<defs><clipPath id="r10{lado[0]}{sufixo}__U__"><path d="{C.d_path(tronco)}"/></clipPath></defs>'
                                f'<g clip-path="url(#r10{lado[0]}{sufixo}__U__)">{corpo}</g>')
    cor1 = rect(-60, -140, cw + 60, ch + 140, BRANCO)
    if lado == 'frente':
        a, b = TORSO['frente']; w = (b - a) / 5
        riscas = (rect(-300, -140, a + w, ch + 140, VERMELHO)
                  + rect(a + 2 * w, -140, a + 3 * w, ch + 140, VERMELHO)
                  + rect(a + 4 * w, -140, cw + 300, ch + 140, VERMELHO))
        cor2 = '<g/>'
        cor3 = cp('c', riscas)
    else:
        cor2 = poli(tronco, MARINHO)
        cor3 = ''
    cor3 += vivo(lado, 'esq', VERMELHO) + vivo(lado, 'dir', VERMELHO)
    return [('cor1', BRANCO, cor1), ('cor2', MARINHO, cor2), ('cor3', VERMELHO, cor3)], cw, ch


def main():
    saida = sys.argv[1]; os.makedirs(saida, exist_ok=True)
    for lado in ('frente', 'verso'):
        camadas, cw, ch = desenhar(lado)
        dados = {
            'cod_modelo': '010', 'nome': 'Riscas', 'peca': 'camisola', 'lado': lado,
            'quadro': {'x': 0, 'y': 0, 'w': cw, 'h': ch},
            'cor_fundo': BRANCO,
            'gola_estilo': 'social' if lado == 'frente' else None,
            'cores_zonas': {'gola': MARINHO, 'mangas': MARINHO},
            'camadas': [{'id': i, 'cor': c, 'svg': s} for i, c, s in camadas],
        }
        json.dump({'codigo': '4554', 'acao': 'guardar-modelo', 'dados': dados},
                  open(f'{saida}/pedido-010-{lado}.json', 'w'), separators=(',', ':'))
        print(lado, [(i, len(s)) for i, _, s in camadas])


if __name__ == '__main__':
    main()
