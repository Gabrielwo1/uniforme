"""
Mede onde está o centro de cada perna, para as âncoras de aplicação
(escudo na coxa, logo na meia) do `kitLocais`.

Porque é preciso um script: a caixa de uma peça é o envolvente do alfa, e as
duas pernas ocupam-na de forma assimétrica e diferente em cada lado. Pior —
as pernas AFASTAM-SE à medida que se desce, por isso a medição tem de ser
feita exatamente à altura onde a âncora assenta (`ALTURA`); um valor tirado
ao tornozelo põe o escudo fora da peça à altura do joelho.

O resultado vai para PERNAS_PADRAO / PERNAS_JOGADOR em src/lib/kitCaixas.ts.

    python3 scripts/medir-pernas.py
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

# TEM de coincidir com o `cy` das âncoras de perna em src/lib/kitLocais.ts
ALTURA = {'calcao': 0.40, 'meiao': 0.16}

VARIANTES = (('public/moldes', 'PERNAS_PADRAO'), ('public/moldes/jog', 'PERNAS_JOGADOR'))


def pernas(caminho, cy):
    a = np.array(Image.open(caminho).getchannel('A'))
    ys, xs = np.nonzero(a > 40)
    x0, y0 = xs.min(), ys.min()
    w, h = xs.max() - x0 + 1, ys.max() - y0 + 1

    linha = a[y0 + int(h * cy)] > 40
    rot, n = ndimage.label(linha)
    blocos = sorted((np.nonzero(rot == i)[0] for i in range(1, n + 1)),
                    key=lambda b: b.min())
    if len(blocos) >= 2:
        # pernas já separadas: o centro de cada uma
        centros = (blocos[0].mean(), blocos[-1].mean())
    else:
        # peça ainda inteira (o calção, à altura da coxa): os quartos do vão
        lo, hi = blocos[0].min(), blocos[0].max()
        centros = (lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.75)
    return tuple((c - x0) / w for c in centros)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    for raiz, nome in VARIANTES:
        print(f'const {nome} = {{')
        for peca, cy in ALTURA.items():
            lados = []
            for lado in ('frente', 'verso'):
                e, d = pernas(f'{raiz}/vestida-{peca}-{lado}.png', cy)
                lados.append(f'{lado}: [{e:.3f}, {d:.3f}]')
            print(f'  {peca}: {{ {", ".join(lados)} }},')
        print('};')
