#!/usr/bin/env python3
"""Troca as máscaras das COSTAS pelas peças em vetor do designer, com o
sombreado novo dele (2026-11-11). Pasta "parte 2 simulador dino peças":
camisola inteira (costas camiseta.svg + sombreamento PNG), gola (+ sombreamento
PNG) e as duas tiras do punho (mangas com tiras/TIRA …).

Porquê: as máscaras eram PNG com a orla em degraus (baixa resolução) e
contaminada — daí os "pontinhos" no punho, o preto que aparece à volta da gola
e o preto da manga maior que o branco do punho (queixas do cliente). O vetor
tem contorno liso e exato.

O que faz (sempre a partir dos PNG da revisão ORIGEM, por isso é idempotente):
  1. vestida-camisola-verso e corpo-<estilo>-verso:
       · alfa = silhueta em vetor da camisola (já com as mangas); as mangas
         fecham rente ao fundo do punho (a manga já não "passa" por baixo do
         punho) e o corpo é recortado onde a gola passa (sem pontas pretas);
       · a cintura ganha uma curva suave (pedido do cliente: costas "não tão retas");
       · RGB = sombreamento do designer, encaixado na silhueta.
  2. vestida-mangas-verso → alfa = as duas tiras do punho (vetor); RGB = o do PNG
     antigo (o sombreamento da camisola traz restos da pele no fim das mangas e o
     das tiras nunca veio), sem as pontas escuras e 8 px mais curto no sovaco.
  3. vestida-gola-verso   → alfa = a gola (vetor), RGB = sombreamento da gola.
Os vetores de manga (MANGA LADO …) já não são precisos: a silhueta da camisola
traz as mangas. O vetor vem cortado à medida e sem posição na tela; vetor.py
regista-o na máscara antiga por IoU.

Uso: python3 scripts/aplicar-vetores-costas.py [pasta-do-designer]
"""
import os, subprocess, sys, io
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(__file__))
import vetor, costuras

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = f'{RAIZ}/public/moldes/jog'
ORIGEM = '0113d40'  # revisão com as máscaras raster originais
DES = sys.argv[1] if len(sys.argv) > 1 else '/Users/syntax/Downloads/parte 2 simulador dino peças'
W, H = 1520, 2460
CX, CY = costuras.CAIXA['verso'][:2]
ESTILOS = ['cruzada', 'social', 'bico2', 'vlinha']
CURVA = 0.030  # fração da meia-largura que a cintura recolhe no ponto mais estreito
PESCOCO = 500  # acima desta linha os corpo-<estilo> trazem pontas do decote que a camisola lisa não tem


def original(nome):
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/{nome}'],
                       capture_output=True, check=True).stdout
    return np.array(Image.open(io.BytesIO(b)).convert('RGBA')).astype(np.float32)


def vet(arq, alvo, folga=24):
    """(alfa 0..1 na tela inteira, caixa do vetor na tela) do vetor encaixado em `alvo` (bool)."""
    vb, subs = vetor.carregar(f'{DES}/{arq}')
    ys, xs = np.where(alvo)
    b = (max(xs.min() - 40, 0), max(ys.min() - 40, 0), xs.max() + 40, ys.max() + 40)
    iou, (sx, sy, tx, ty) = vetor.encaixar(subs, vb, alvo[b[1]:b[3], b[0]:b[2]], folga=folga)
    print(f'  {os.path.basename(arq)}: IoU {iou:.3f}')
    tx, ty = tx + b[0], ty + b[1]
    return vetor.rasterizar(subs, sx, sy, tx, ty, (W, H), ss=4), (tx, ty, vb[2] * sx, vb[3] * sy)


def sombreado(png, caixa):
    """RGB (H, W, 3) do sombreamento do designer encaixado em `caixa` (x, y, w, h na
    tela). O PNG só traz alfa constante dentro da peça, por isso o RGB fora dela é
    lixo: fica-se com o miolo (alfa erodido 3 px) e o resto leva o vizinho mais próximo."""
    x, y, w, h = caixa
    src = Image.open(png).convert('RGBA')
    # o sombreado é neutro (R−B ≈ −10…+3); nos fins das mangas traz restos da pele do modelo
    # (rosado, R−B > 8) — viraria um fio castanho sob o punho. Esses píxeis levam o vizinho neutro.
    px = np.array(src)
    mau = (px[..., 3] > 0) & (px[..., 0].astype(int) - px[..., 2] > 8)
    if mau.any():
        idx = ndi.distance_transform_edt(mau | (px[..., 3] == 0), return_distances=False, return_indices=True)
        px[mau] = px[idx[0][mau], idx[1][mau]]
        src = Image.fromarray(px)
    pw, ph = max(int(round(w)), 1), max(int(round(h)), 1)
    # sub-píxel: saída (X, Y) lê a entrada em ((X - x) * pw / w, (Y - y) * ph / h)
    afim = (pw / w, 0, -x * pw / w, 0, ph / h, -y * ph / h)

    def tela(im):
        im = im.resize((pw, ph), Image.LANCZOS)
        return np.array(im.transform((W, H), Image.AFFINE, afim, Image.BICUBIC)).astype(np.float32)

    # RGB e alfa à parte: com alfa 29/255 constante, redimensionar o RGBA (pré-multiplicado) esmaga o RGB
    rgb, alfa = tela(src.convert('RGB')), tela(src.getchannel('A'))
    miolo = ndi.binary_erosion(alfa > 14, iterations=3)
    idx = ndi.distance_transform_edt(~miolo, return_distances=False, return_indices=True)
    return rgb[idx[0], idx[1]]


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


def com_rgb(rgb, alfa):
    return np.dstack([rgb, np.clip(alfa, 0, 1) * 255])


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
    X, YY = np.arange(W)[None, :], np.arange(H)[:, None]

    torso, cx = vet('costas camiseta.svg', cam | man | gol, folga=40)
    tira = np.maximum(vet('mangas com tiras/TIRA MANGA LADO ESQUERDO COSTAS.svg', man & (X < 660))[0],
                      vet('mangas com tiras/TIRA MANGA LADO DIREITO COSTAS.svg', man & (X >= 660))[0])
    gola, cg = vet('GOLA SVG.svg', gol)
    sombra = sombreado(f'{DES}/costas camiseta sombreamento_Images/costas camiseta sombreamento_ImgID1.png', cx)
    sombra_gola = sombreado(f'{DES}/GOLA SOMBREAMENTO_Images/GOLA SOMBREAMENTO_ImgID1.png', cg)

    # ---- punho e gola
    # punho: o designer não mandou o sombreamento das tiras e o da camisola traz restos da pele
    # do modelo e sombras do braço no fim das mangas — mantém-se o RGB do PNG antigo. O punho
    # não chega ao sovaco: nas pontas interiores pára 8 px antes do fim do PNG antigo (ali o
    # sombreado antigo tem a sombra do tronco cozida e o vetor é mais comprido)
    tira_png = tira.copy()
    for sl, ref in ((slice(0, 660), 'esq'), (slice(660, W), 'dir')):
        cols = np.where(man[:, sl].any(0))[0] + sl.start
        if ref == 'esq': tira_png[:, cols.max() - 8:660] = 0
        else: tira_png[:, 660:cols.min() + 8] = 0
    salvar('vestida-mangas-verso.png', sem_escuros(com_alfa(man0, tira_png)))
    salvar('vestida-gola-verso.png', com_rgb(sombra_gola, gola))
    print('punho e gola trocados')

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
    abaixo = np.clip(YY - fundo[None, :] + 0.5, 0, 1)   # 0 acima do fundo do punho, 1 abaixo

    def contorno_exterior(alfa, le):
        """x do bordo exterior de cada linha (NaN onde vazio)."""
        xs = np.full(H, np.nan)
        for y in range(H):
            c = np.where(alfa[y] > 0.5)[0]
            if len(c): xs[y] = c.min() if le == 'esq' else c.max()
        return xs

    def manga_rente_ao_punho(alfa, le):
        """Manga da silhueta, cortada rente ao fundo do punho e com o bordo exterior a
        fechar no extremo exterior do punho (sem cunha preta ao lado do branco)."""
        pol = poligono_manga[le]
        v = np.where(pol, alfa * (1 - abaixo), alfa)
        dirp = 1 if le == 'esq' else -1                    # sentido para DENTRO da manga
        alvo = contorno_exterior(np.where(pol, v, 0), le)
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
        dentro = np.clip((X - alvo[:, None]) * dirp + 0.5, 0, 1)
        return np.where(pol & ~np.isnan(alvo)[:, None], v * dentro, v)

    from PIL import ImageDraw
    poligono_manga = {}
    for le in ('esq', 'dir'):
        im = Image.new('1', (W, H), 0)
        ImageDraw.Draw(im).polygon([(x + CX, y + CY) for x, y in costuras.poligono_manga('verso', le)], fill=1)
        poligono_manga[le] = np.array(im)

    base = torso
    for le in ('esq', 'dir'):
        base = manga_rente_ao_punho(base, le)

    # corpo recortado onde a gola passa: por coluna, tira o que está acima do fundo da gola
    gfundo = np.full(W, -1.0)
    for x in range(W):
        ys = np.where(gola[:, x] > 0.5)[0]
        if len(ys): gfundo[x] = ys.max()
    gx = np.where(gfundo >= 0)[0]
    fora_gola = np.zeros((H, W), bool)
    for x in range(gx.min() - 4, gx.max() + 5):
        gb = gfundo[min(max(x, gx.min()), gx.max())]
        fora_gola[:int(gb) - 2, x] = True   # a camisola entra 3 px por baixo da gola: sem fresta clara entre as duas

    for nome in ['vestida-camisola-verso.png'] + [f'corpo-{e}-verso.png' for e in ESTILOS]:
        r = original(nome)
        if nome == 'vestida-camisola-verso.png':       # os corpo-<estilo> trazem o seu próprio decote
            novo = np.where(fora_gola, 0, base)
        else:                                          # a silhueta nova + as pontas do decote do estilo
            extra = (r[..., 3] > 128) & (cam0[..., 3] <= 128) & (YY < PESCOCO)
            novo = np.maximum(base, extra.astype(np.float32))
        r = com_rgb(sombra, novo)
        ys = np.where((r[..., 3] > 128).any(1))[0]
        r = curva_cintura(r, costuras.GEO['verso']['esq'][1] + CY + 30, min(ys.max(), 1273))
        salvar(nome, r)
        print('corpo:', nome)


if __name__ == '__main__':
    main()
