#!/usr/bin/env python3
"""Arredonda o topo do ombro onde a camisola e a manga do designer se encontram.

Porquê (cliente, 2026-11-16): no vetor do designer a manga nasce com uma ponta fina
e o corpo acaba num canto vertical — na frente (ombro direito do ecrã) o corpo sobra
num degrau acima da manga e nas costas (ombro esquerdo do ecrã) a ponta da manga
espreita acima do corpo. A silhueta real do ombro é uma curva contínua.

O que faz: em cada um dos 4 ombros acha a ponta da manga e liga os dois lados com uma
corda (L px para cada lado): se o corpo é o mais alto, baixa-o até à ponta da manga; se
é a ponta da manga, baixa-a até ao canto do corpo. Só REMOVE píxeis (o RGB não muda) e
onde o topo já é contínuo não toca em nada, por isso é idempotente.

Correr DEPOIS de aplicar-vetores-frente.py / aplicar-vetores-costas.py (e de
pescoco-frente.py). Uso: python3 scripts/ombro-suave.py
"""
import os
import numpy as np
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{RAIZ}/public/moldes/jog'
ESTILOS = ['cruzada', 'social', 'bico2', 'vlinha']
MEIO = 740
L = 44           # colunas da corda, do lado que desce


def ler(nome):
    return np.array(Image.open(f'{J}/{nome}').convert('RGBA')).astype(np.float32)


def topo(alfa, x):
    c = np.where(alfa[:, x] > 0.5)[0]
    return float(c.min()) if len(c) else np.nan


def main():
    for lado in ('frente', 'verso'):
        nomes = [f'vestida-camisola-{lado}.png', f'vestida-manga-{lado}.png'] + [f'corpo-{e}-{lado}.png' for e in ESTILOS]
        img = {n: ler(n) for n in nomes}
        cam, man = img[nomes[0]][..., 3] / 255, img[nomes[1]][..., 3] / 255
        H, W = cam.shape
        Y = np.arange(H)[:, None]
        for sl, le in ((slice(0, MEIO), 'esq'), (slice(MEIO, W), 'dir')):
            q = 1 if le == 'dir' else -1             # lado da manga relativamente à ponta
            ym = np.where((man[:, sl] > 0.5).any(1))[0].min()
            xs = np.where((man[ym:ym + 3, sl] > 0.5).any(0))[0] + sl.start
            xc = int(round(xs.mean()))               # ponta da manga
            tm, tc = topo(man, xc), topo(cam, xc)
            if tc < tm - 2:                      # corpo mais alto: desce até à ponta da manga
                xa = xc - q * L
                ya, xb, yb = topo(np.maximum(cam, man), xa), xc, tm
                nota = 'corpo desce até à ponta da manga'
            elif tm < tc - 2:                    # ponta da manga mais alta: desce até ao canto do corpo
                xa = xc + q * L
                ya, xb, yb = topo(man, xa), xc, tc
                nota = 'ponta da manga desce até ao canto do corpo'
            else:
                print(f'{lado} {le}: já contínuo')
                continue
            xl, xr = sorted((xa, xb))
            if tm < tc - 2: xl, xr = (xl, xr + 5) if q < 0 else (xl - 5, xr)   # a agulha tem 2-3 colunas
            xx = np.arange(xl, xr + 1)
            corda = ya + (yb - ya) * np.clip((xx - xa) / (xb - xa), 0, 1)
            tira = 0.0
            for n in nomes:
                a = img[n][..., 3]
                bloco = a[:, xl:xr + 1] / 255
                cima = np.clip(corda[None, :] - Y + 0.5, 0, 1)    # 1 bem acima da corda
                novo = bloco * (1 - cima)
                tira = max(tira, float((bloco.sum() - novo.sum()) / max(1, len(xx))))
                a[:, xl:xr + 1] = novo * 255
            print(f'{lado} {le}: ponta x={xc} (manga y={tm:.0f}, corpo y={tc:.0f}) — {nota}; corda x {xl}-{xr}, média {tira:.1f}px/coluna')
        for n in nomes:
            Image.fromarray(np.clip(img[n] + 0.5, 0, 255).astype(np.uint8)).save(f'{J}/{n}')


if __name__ == '__main__':
    main()
