#!/usr/bin/env python3
"""Troca as máscaras da FRENTE pelas peças em vetor do designer (2026-11-13,
pasta "PARTE CAMISETA FRENTE": CAMISETA FRENTE SVG, GOLA SVG, TIRA MANGA
ESQUERDA / DIREITA SVG). Mesmo método de aplicar-vetores-costas.py.

Porquê: as máscaras eram PNG com a orla em degraus e contaminada — daí os
"pontinhos" no punho e a linha vermelha ao lado do tronco direito (queixas do
cliente: era uma faixa de píxeis a mais na máscara antiga, que o vetor não tem).

O que faz (sempre a partir dos PNG da revisão ORIGEM, por isso é idempotente):
  1. vestida-camisola-frente e corpo-<estilo>-frente:
       · alfa = silhueta em vetor da camisola (já com as mangas); as mangas
         fecham rente ao fundo do punho e o corpo é recortado onde a gola passa;
       · nos corpo-<estilo> mantêm-se as pontas do decote do estilo (acima de PESCOCO);
  2. vestida-mangas-frente → alfa = as duas tiras do punho (vetor);
  3. vestida-gola-frente   → alfa = a gola (vetor).
O RGB (sombreado) fica o do PNG antigo: os SOMBREAMENTO *.svg do designer são só
a moldura que aponta para PNG externos (pastas *_Images) que não vieram. Onde o
alfa novo cobre píxeis que antes eram vazios, o RGB vem do vizinho mais próximo
do miolo. Quando chegarem os PNG, trocar o RGB como em aplicar-vetores-costas.py.

Uso: python3 scripts/aplicar-vetores-frente.py [pasta-do-designer]
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
DES = sys.argv[1] if len(sys.argv) > 1 else '/Users/syntax/Downloads/PARTE CAMISETA FRENTE'
W, H = 1520, 2460
CX, CY = costuras.CAIXA['frente'][:2]
ESTILOS = ['cruzada', 'social', 'bico2', 'vlinha']
MEIO = 740     # entre os dois punhos
PESCOCO = 520  # acima desta linha os corpo-<estilo> trazem o decote do estilo
PONTA = 8      # px que o punho pára antes do fim do PNG antigo, nas pontas interiores


def original(nome):
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/{nome}'],
                       capture_output=True, check=True).stdout
    return np.array(Image.open(io.BytesIO(b)).convert('RGBA')).astype(np.float32)


def vet(arq, alvo, folga=24):
    """Alfa (0..1, tela inteira) do vetor encaixado em `alvo` (bool)."""
    vb, subs = vetor.carregar(f'{DES}/{arq}')
    ys, xs = np.where(alvo)
    b = (max(xs.min() - 40, 0), max(ys.min() - 40, 0), xs.max() + 40, ys.max() + 40)
    iou, (sx, sy, tx, ty) = vetor.encaixar(subs, vb, alvo[b[1]:b[3], b[0]:b[2]], folga=folga)
    print(f'  {os.path.basename(arq)}: IoU {iou:.3f}')
    return vetor.rasterizar(subs, sx, sy, tx + b[0], ty + b[1], (W, H), ss=4)


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


def sem_escuros(rgba, limiar=95, ponta=60):
    """Punho: nas pontas o PNG traz sombra do braço cozida no sombreado (≈ preto)
    e, em multiply, vira uma mancha escura no branco. Esses píxeis levam o
    sombreado do vizinho claro mais próximo. Só nas pontas EXTERIORES (`ponta` px)."""
    lum = rgba[..., :3].mean(-1)
    solido = rgba[..., 3] > 128
    bom = solido & (lum >= limiar)
    cols = np.where(solido.any(0))[0]
    X = np.arange(W)[None, :]
    mau = solido & ~bom & ((X < cols.min() + ponta) | (X > cols.max() - ponta))
    idx = ndi.distance_transform_edt(~bom, return_distances=False, return_indices=True)
    out = rgba.copy()
    for c in range(3):
        out[..., c] = np.where(mau, rgba[..., c][idx[0], idx[1]], rgba[..., c])
    return out


def salvar(nome, rgba):
    Image.fromarray(np.clip(rgba + 0.5, 0, 255).astype(np.uint8)).save(f'{J}/{nome}')


def main():
    print('a ler as máscaras originais e a encaixar os vetores…')
    cam0 = original('vestida-camisola-frente.png')
    man0 = original('vestida-mangas-frente.png')
    gol0 = original('vestida-gola-frente.png')
    cam, man, gol = cam0[..., 3] > 128, man0[..., 3] > 128, gol0[..., 3] > 128
    X, YY = np.arange(W)[None, :], np.arange(H)[:, None]

    torso = vet('CAMISETA FRENTE SVG.svg', cam | man | gol, folga=40)
    tira = np.maximum(vet('TIRA MANGA ESQUERDA.svg', man & (X < MEIO)),
                      vet('TIRA MANGA DIREITA SVG.svg', man & (X >= MEIO)))
    gola = vet('GOLA SVG.svg', gol)

    # ---- punho e gola
    tira_png = tira.copy()    # o vetor é mais comprido que o PNG antigo: pára PONTA px antes do sovaco
    for sl, ref in ((slice(0, MEIO), 'esq'), (slice(MEIO, W), 'dir')):
        cols = np.where(man[:, sl].any(0))[0] + sl.start
        if ref == 'esq': tira_png[:, cols.max() - PONTA:MEIO] = 0
        else: tira_png[:, MEIO:cols.min() + PONTA] = 0
    salvar('vestida-mangas-frente.png', sem_escuros(com_alfa(man0, tira_png)))
    salvar('vestida-gola-frente.png', com_alfa(gol0, gola))
    print('punho e gola trocados')

    # fundo do punho por coluna (a manga acaba aí); fora das colunas do punho usa a mais próxima
    fundo = np.full(W, -1.0)
    for x in range(W):
        ys = np.where(tira[:, x] > 0.5)[0]
        if len(ys): fundo[x] = ys.max() + 1
    ok = np.where(fundo >= 0)[0]
    for x in range(W):
        if fundo[x] < 0:
            lado = ok[ok < MEIO] if x < MEIO else ok[ok >= MEIO]
            fundo[x] = fundo[lado[np.argmin(np.abs(lado - x))]]
    abaixo = np.clip(YY - fundo[None, :] + 0.5, 0, 1)   # 0 acima do fundo do punho, 1 abaixo

    poligono_manga = {}
    for le in ('esq', 'dir'):
        im = Image.new('1', (W, H), 0)
        ImageDraw.Draw(im).polygon([(x + CX, y + CY) for x, y in costuras.poligono_manga('frente', le)], fill=1)
        poligono_manga[le] = np.array(im)

    def contorno_exterior(alfa, le):
        """x do bordo exterior de cada linha (NaN onde vazio)."""
        xs = np.full(H, np.nan)
        for y in range(H):
            c = np.where(alfa[y] > 0.5)[0]
            if len(c): xs[y] = c.min() if le == 'esq' else c.max()
        return xs

    def manga_rente_ao_punho(alfa, le):
        """Manga da silhueta, cortada rente ao fundo do punho e com o bordo exterior a
        fechar no extremo exterior do punho (sem cunha ao lado do punho)."""
        pol = poligono_manga[le]
        v = np.where(pol, alfa * (1 - abaixo), alfa)
        dirp = 1 if le == 'esq' else -1                    # sentido para DENTRO da manga
        alvo = contorno_exterior(np.where(pol, v, 0), le)
        sl = slice(0, MEIO) if le == 'esq' else slice(MEIO, W)
        xe = np.full(H, np.nan)                            # extremo exterior do punho, linha a linha
        for y in range(H):
            c = np.where(tira[y, sl] > 0.5)[0]
            if len(c): xe[y] = (c.min() - 0.5) if le == 'esq' else (c.max() + MEIO + 0.5)
        ye = int(np.nanmin(np.where(np.isnan(xe), np.nan, np.arange(H))))
        for y in range(ye - 50, H):
            ref = xe[y] if not np.isnan(xe[y]) else xe[min(max(y, ye), ye + 1)]
            base = alvo[y] if not np.isnan(alvo[y]) else ref
            f = min(1.0, (y - (ye - 50)) / 50)
            if dirp * (ref - base) > 0:
                alvo[y] = base + (ref - base) * f
        dentro = np.clip((X - alvo[:, None]) * dirp + 0.5, 0, 1)
        return np.where(pol & ~np.isnan(alvo)[:, None], v * dentro, v)

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
    for x in range(gx.min(), gx.max() + 1):        # sem folga lateral: senão abre degrau no ombro
        gb = gfundo[x]
        if gb < 0: continue
        fora_gola[:int(gb) - 2, x] = True   # a camisola entra 3 px por baixo da gola

    for nome in ['vestida-camisola-frente.png'] + [f'corpo-{e}-frente.png' for e in ESTILOS]:
        r = original(nome)
        if nome == 'vestida-camisola-frente.png':       # os corpo-<estilo> trazem o seu próprio decote
            novo = np.where(fora_gola, 0, base)
        else:                                           # a silhueta nova + o decote do estilo
            extra = (r[..., 3] > 128) & (cam0[..., 3] <= 128) & (YY < PESCOCO)
            novo = np.maximum(base, extra.astype(np.float32))
        salvar(nome, com_alfa(r, novo))
        print('corpo:', nome)


if __name__ == '__main__':
    main()
