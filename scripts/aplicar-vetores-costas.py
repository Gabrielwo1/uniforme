#!/usr/bin/env python3
"""Troca as máscaras das COSTAS pelas peças em vetor do designer (2026-11-11,
pasta "SIMULADOR CORREÇÃO": manga esq/dir, tira do punho esq/dir, gola).

Porquê: as máscaras eram PNG com a orla em degraus (baixa resolução) e
contaminada — daí os "pontinhos" no punho, o preto que aparece à volta da gola
e o preto da manga maior que o branco do punho (queixas do cliente). O vetor
tem contorno liso e exato.

O que faz (sempre a partir dos PNG da revisão ORIGEM, por isso é idempotente):
  1. vestida-mangas-verso   → alfa = as duas tiras do punho (vetor)
  2. vestida-gola-verso     → alfa = a gola (vetor)
  3. vestida-camisola-verso e corpo-<estilo>-verso:
       · as mangas passam a ser as do vetor, cortadas rente ao fundo do punho
         (a manga já não "passa" por baixo do punho) — junto à costura do
         ombro ao sovaco mantém-se o PNG antigo, para não abrir fresta no tronco;
       · a camisola lisa é recortada onde a gola passa (sem pontas pretas à volta);
       · a cintura ganha uma curva suave (pedido do cliente: costas "não tão retas").
O RGB (sombreado) fica o do PNG; onde o alfa novo cobre píxeis que antes eram
vazios, o RGB vem do vizinho mais próximo.

Uso: python3 scripts/aplicar-vetores-costas.py [pasta-do-designer]
"""
import os, subprocess, sys, io
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
import vetor, costuras

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{RAIZ}/public/moldes/jog'
ORIGEM = '0113d40'  # revisão com as máscaras raster originais
DES = sys.argv[1] if len(sys.argv) > 1 else '/Users/syntax/Downloads/SIMULADOR CORREÇÃO'
W, H = 1520, 2460
CX, CY = costuras.CAIXA['verso'][:2]
ESTILOS = ['cruzada', 'social', 'bico2', 'vlinha']
CURVA = 0.030  # fração da meia-largura que a cintura recolhe no ponto mais estreito


def original(nome):
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/{nome}'],
                       capture_output=True, check=True).stdout
    return np.array(Image.open(io.BytesIO(b)).convert('RGBA')).astype(np.float32)


def vet(arq, alvo):
    """Alfa (0..1, tela inteira) do vetor encaixado em `alvo` (bool)."""
    vb, subs = vetor.carregar(f'{DES}/{arq}')
    ys, xs = np.where(alvo)
    b = (max(xs.min() - 40, 0), max(ys.min() - 40, 0), xs.max() + 40, ys.max() + 40)
    iou, (sx, sy, tx, ty) = vetor.encaixar(subs, vb, alvo[b[1]:b[3], b[0]:b[2]])
    print(f'  {os.path.basename(arq)}: IoU {iou:.3f}')
    return vetor.rasterizar(subs, sx, sy, tx + b[0], ty + b[1], (W, H), ss=4)


def poligono(pts):
    im = Image.new('1', (W, H), 0)
    ImageDraw.Draw(im).polygon([(x + CX, y + CY) for x, y in pts], fill=1)
    return np.array(im)


def com_alfa(rgba, alfa):
    """RGBA com o alfa novo. O RGB (sombreado) dos píxeis que passam a ser peça
    vem do vizinho mais próximo do MIOLO do PNG antigo (erodido 3 px): a orla
    antiga traz restos escuros/claros do recorte que não se querem arrastar."""
    solido = rgba[..., 3] > 128
    miolo = ndi.binary_erosion(solido, iterations=3)
    idx = ndi.distance_transform_edt(~miolo, return_distances=False, return_indices=True)
    out = rgba.copy()
    novo = (alfa > 0.02) & ~miolo
    for c in range(3):
        out[..., c] = np.where(novo, rgba[..., c][idx[0], idx[1]], rgba[..., c])
    out[..., 3] = np.clip(alfa, 0, 1) * 255
    return out


def sem_escuros(rgba, limiar=95):
    """Punho: nas pontas o PNG traz sombra do tronco/braço cozida no sombreado
    (≈ preto) e, em multiply, vira uma mancha escura no branco. Esses píxeis
    levam o sombreado do vizinho claro mais próximo."""
    lum = rgba[..., :3].mean(-1)
    bom = (rgba[..., 3] > 128) & (lum >= limiar)
    mau = (rgba[..., 3] > 128) & ~bom
    mau[:, 350:950] = False   # só as pontas EXTERIORES; a sombra junto ao sovaco é de propósito
    idx = ndi.distance_transform_edt(~bom, return_distances=False, return_indices=True)
    out = rgba.copy()
    for c in range(3):
        out[..., c] = np.where(mau, rgba[..., c][idx[0], idx[1]], rgba[..., c])
    return out


def salvar(nome, rgba):
    Image.fromarray(np.clip(rgba + 0.5, 0, 255).astype(np.uint8)).save(f'{J}/{nome}')


def curva_cintura(rgba, y0, y1):
    """Recolhe os dois lados do tronco entre y0 e y1 (máx. CURVA da meia-largura,
    a ~37% da descida; 0 nas pontas), em RGB e alfa."""
    a = rgba[..., 3] > 128
    ys, xs = np.where(a[y0:y1]); c = (xs.min() + xs.max()) / 2
    out = rgba.copy()
    X = np.arange(W, dtype=np.float32)
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        k = CURVA * np.sin(np.pi * t ** 0.7)   # 0 nas pontas, máximo a ~37% da descida
        src = c + (X - c) / (1 - k)   # imagem nova em x ← imagem antiga em src
        for ch in range(4):
            out[y, :, ch] = np.interp(src, X, rgba[y, :, ch])
    return out


def main():
    print('a ler as máscaras originais e a encaixar os vetores…')
    cam0 = original('vestida-camisola-verso.png')
    man0 = original('vestida-mangas-verso.png')
    gol0 = original('vestida-gola-verso.png')
    cam, man, gol = cam0[..., 3] > 128, man0[..., 3] > 128, gol0[..., 3] > 128
    X = np.arange(W)[None, :]

    tira = np.maximum(vet('TIRA MANGA COSTA LADO ESQUERDO.svg', man & (X < 660)),
                      vet('TIRA MANGA COSTA LADO DIREITO.svg', man & (X >= 660)))
    gola = vet('GOLA/GOLA SVG.svg', gol)
    manga = {}
    for le, arq in (('esq', 'MANGAS/MANGA ESQUERDA COSTAS SVG.svg'), ('dir', 'MANGAS/MANGA DIREITA COSTAS SVG.svg')):
        manga[le] = (vet(arq, poligono(costuras.poligono_manga('verso', le)) & cam),
                     poligono(costuras.poligono_manga('verso', le)))

    # fundo do punho por coluna (a manga acaba aí); fora das colunas do punho usa a mais próxima
    fundo = np.full(W, -1.0)
    for x in range(W):
        ys = np.where(tira[:, x] > 0.5)[0]
        if len(ys): fundo[x] = ys.max() + 1
    ok = np.where(fundo >= 0)[0]
    for x in range(W):
        if fundo[x] < 0:
            lado = ok[ok < 660] if x < 660 else ok[ok >= 660]
            fundo[x] = fundo[lado[np.argmin(np.abs(lado - x))]]
    YY = np.arange(H)[:, None]
    abaixo = np.clip(YY - fundo[None, :] + 0.5, 0, 1)   # 0 acima do fundo do punho, 1 abaixo

    # o punho não chega ao sovaco: nas pontas interiores pára 8 px antes do fim do PNG antigo
    # (ali o sombreado antigo tem a sombra do tronco cozida e o vetor é mais comprido)
    for sl, ref in ((slice(0, 660), 'esq'), (slice(660, W), 'dir')):
        cols = np.where(man[:, sl].any(0))[0] + sl.start
        if ref == 'esq': tira[:, cols.max() - 8:660] = 0
        else: tira[:, 660:cols.min() + 8] = 0

    # ---- punho e gola
    salvar('vestida-mangas-verso.png', sem_escuros(com_alfa(man0, tira)))
    salvar('vestida-gola-verso.png', com_alfa(gol0, gola))
    print('punho e gola trocados')

    def contorno_exterior(alfa, le):
        """x do bordo exterior de cada linha (NaN onde vazio)."""
        xs = np.full(H, np.nan)
        for y in range(H):
            c = np.where(alfa[y] > 0.5)[0]
            if len(c): xs[y] = c.min() if le == 'esq' else c.max()
        return xs

    def manga_final(le, antigo):
        """Manga do vetor, com o bordo exterior a casar com o PNG antigo no
        ombro (transição de 40 linhas — sem degrau) e a fechar rente ao extremo
        exterior do punho (sem cunha preta ao lado do branco)."""
        v, pol = manga[le]
        v = v * (1 - abaixo)
        dirp = 1 if le == 'esq' else -1                    # sentido para DENTRO da manga
        xo, xv = contorno_exterior(antigo * pol, le), contorno_exterior(v * pol, le)
        yA = int(np.nanmin(np.where(np.isnan(xv), np.nan, np.arange(H))))
        alvo = np.where(np.isnan(xv), xo, xv)              # bordo exterior desejado, por linha
        for y in range(yA, min(yA + 40, H)):
            if not np.isnan(xo[y]) and not np.isnan(xv[y]):
                s_ = (y - yA) / 40; s_ = s_ * s_ * (3 - 2 * s_)
                alvo[y] = xo[y] + (xv[y] - xo[y]) * s_
        # extremo exterior do punho, linha a linha (o fim da tira é inclinado)
        sl = slice(0, 660) if le == 'esq' else slice(660, W)
        xe = np.full(H, np.nan)
        for y in range(H):
            c = np.where(tira[y, sl] > 0.5)[0]
            if len(c): xe[y] = (c.min() - 0.5) if le == 'esq' else (c.max() + 660 + 0.5)
        ye = int(np.nanmin(np.where(np.isnan(xe), np.nan, np.arange(H))))
        for y in range(ye - 50, H):
            ref = xe[y] if not np.isnan(xe[y]) else xe[min(max(y, ye), ye + 1)]
            base = alvo[y] if not np.isnan(alvo[y]) else ref
            f = min(1.0, (y - (ye - 50)) / 50)
            if dirp * (ref - base) > 0:
                alvo[y] = base + (ref - base) * f
        U = np.maximum(antigo, v)
        U = np.where(np.arange(H)[:, None] < yA, antigo, np.where(np.arange(H)[:, None] < yA + 40, U, v))
        X_ = np.arange(W)[None, :]
        dentro = np.clip((X_ - alvo[:, None]) * dirp + 0.5, 0, 1)
        return U * np.where(np.isnan(alvo)[:, None], 1, dentro)

    # costura ombro→sovaco: aí mantém-se o PNG antigo (não abrir fresta no tronco)
    banda = np.zeros((H, W), bool)
    for le in ('esq', 'dir'):
        t, a = costuras.ombro('verso', le), costuras.GEO['verso'][le]
        im = Image.new('1', (W, H), 0)
        ImageDraw.Draw(im).line([(t[0] + CX, t[1] + CY), (a[0] + CX, a[1] + CY)], fill=1, width=1)
        d = ndi.distance_transform_edt(~np.array(im))
        banda |= (d <= 8) & (YY <= a[1] + CY)

    # corpo recortado onde a gola passa: por coluna, tira o que está acima do fundo da gola
    gfundo = np.full(W, -1.0)
    for x in range(W):
        ys = np.where(gola[:, x] > 0.5)[0]
        if len(ys): gfundo[x] = ys.max()
    gx = np.where(gfundo >= 0)[0]
    fora_gola = np.zeros((H, W), bool)
    for x in range(gx.min() - 4, gx.max() + 5):
        gb = gfundo[min(max(x, gx.min()), gx.max())]
        fora_gola[:int(gb) + 1, x] = True

    for nome in ['vestida-camisola-verso.png'] + [f'corpo-{e}-verso.png' for e in ESTILOS]:
        r = original(nome)
        a_old = r[..., 3] / 255
        novo = a_old.copy()
        for le in ('esq', 'dir'):
            v, pol = manga[le][0], manga[le][1]
            v = manga_final(le, a_old)                  # manga do vetor, rente ao punho
            zona = pol & ~banda
            novo = np.where(zona, v, novo)
            novo = np.where(pol & banda, np.maximum(novo, v), novo)
        if nome == 'vestida-camisola-verso.png':       # os corpo-<estilo> trazem o seu próprio decote
            novo = np.where(fora_gola, 0, novo)
        r = com_alfa(r, novo)
        ys = np.where((r[..., 3] > 128).any(1))[0]
        r = curva_cintura(r, costuras.GEO['verso']['esq'][1] + CY + 30, min(ys.max(), 1273))
        salvar(nome, r)
        print('corpo:', nome)


if __name__ == '__main__':
    main()
