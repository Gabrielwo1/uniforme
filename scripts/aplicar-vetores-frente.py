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
# mangas e tiras com as costuras certas (envio 2026-11-16, pasta "ARQUIIVO MANGAS DINO")
MANGAS = sys.argv[2] if len(sys.argv) > 2 else '/Users/syntax/Downloads/ARQUIIVO MANGAS DINO/FRENTE'
W, H = 1520, 2460
CX, CY = costuras.CAIXA['frente'][:2]
ESTILOS = ['cruzada', 'social', 'bico2', 'vlinha']
PISO_SOVACO = 118  # luminosidade mínima do sombreado no sovaco
INTERIOR = 24  # px do punho, junto ao sovaco, onde se limpa a sombra do braço
MEIO = 740     # entre os dois punhos
PESCOCO = 520  # acima desta linha os corpo-<estilo> trazem o decote do estilo
OMBRO = 90     # px, ao longo do ombro, que levam a descida junto à gola
TOPO_GOLA = 2  # o ombro começa 2 px abaixo do topo da ponta da gola
EXTRAPOLA = 50  # linhas acima da ponta da manga em que o ombro da camisola se junta ao bordo dela
VINCO = 0.30   # força do vinco da costura da manga (0 = sem)
PONTA = 0      # px que o punho pára antes do fim do PNG antigo, nas pontas interiores


def original(nome):
    b = subprocess.run(['git', '-C', RAIZ, 'show', f'{ORIGEM}:public/moldes/jog/{nome}'],
                       capture_output=True, check=True).stdout
    return np.array(Image.open(io.BytesIO(b)).convert('RGBA')).astype(np.float32)


def vet(arq, alvo, folga=24, pasta=None):
    """Alfa (0..1, tela inteira) do vetor encaixado em `alvo` (bool)."""
    vb, subs = vetor.carregar(f'{pasta or DES}/{arq}')
    ys, xs = np.where(alvo)
    b = (max(xs.min() - 40, 0), max(ys.min() - 40, 0), xs.max() + 40, ys.max() + 40)
    iou, (sx, sy, tx, ty) = vetor.encaixar(subs, vb, alvo[b[1]:b[3], b[0]:b[2]], folga=folga)
    print(f'  {os.path.basename(arq)}: IoU {iou:.3f}')
    return vetor.rasterizar(subs, sx, sy, tx + b[0], ty + b[1], (W, H), ss=4)


def vet_manga(arq, alvo, torso, le, folga=40, pasta=None):
    """Como `vet`, mas depois do encaixe grosso afina escala/posição para o bordo EXTERIOR da
    manga coincidir com o bordo exterior da camisola em vetor (são o mesmo desenho do
    designer): o IoU contra o polígono aproximado deixava 2-6 px de diferença."""
    vb, subs = vetor.carregar(f'{pasta or DES}/{arq}')
    ys, xs = np.where(alvo)
    b = (max(xs.min() - 40, 0), max(ys.min() - 40, 0), xs.max() + 40, ys.max() + 40)
    iou, (sx, sy, tx, ty) = vetor.encaixar(subs, vb, alvo[b[1]:b[3], b[0]:b[2]], folga=folga)
    tx, ty = tx + b[0], ty + b[1]
    ref = torso > 0.5

    def borda(m):
        c = (m > 0.5)
        sub = c[:, :MEIO] if le == 'esq' else c[:, MEIO:]
        tem = sub.any(1)
        x = np.where(tem, sub.argmax(1) if le == 'esq' else sub.shape[1] - 1 - sub[:, ::-1].argmax(1), -1)
        return x, tem

    def custo(sx_, sy_, tx_, ty_):
        m = vetor.rasterizar(subs, sx_, sy_, tx_, ty_, (W, H), ss=1)
        xm, tm = borda(m); xr, tr = borda(ref.astype(float))
        yy = np.where(tm)[0]
        yy = yy[10:-25]                                   # fora a ponta e o fundo (punho)
        yy = yy[tr[yy]]
        return np.abs(xm[yy] - xr[yy]).mean() if len(yy) else 1e9

    melhor = (custo(sx, sy, tx, ty), sx, sy, tx, ty)
    for passo, rng in ((2.0, 6), (1.0, 2)):
        c0 = melhor
        for ds in (-0.015, -0.0075, 0, 0.0075, 0.015) if passo > 1 else (-0.003, 0, 0.003):
            for dx in range(-rng, rng + 1):
                for dy in range(-rng, rng + 1):
                    sx2, sy2 = c0[1] * (1 + ds), c0[2] * (1 + ds)
                    r = (custo(sx2, sy2, c0[3] + dx * passo / 2, c0[4] + dy * passo / 2), sx2, sy2, c0[3] + dx * passo / 2, c0[4] + dy * passo / 2)
                    if r[0] < melhor[0]: melhor = r
    print(f'  {os.path.basename(arq)}: IoU {iou:.3f}, desvio do bordo {custo(sx, sy, tx, ty):.2f} -> {melhor[0]:.2f} px')
    return vetor.rasterizar(subs, melhor[1], melhor[2], melhor[3], melhor[4], (W, H), ss=4)


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
    # pontas exteriores (`ponta` px) e interiores (junto ao sovaco, INTERIOR px): em ambas o PNG antigo traz sombra do braço
    interior = np.zeros((1, W), bool)
    for lado in (cols[cols < MEIO], cols[cols >= MEIO]):
        if len(lado): interior[0, (lado.max() - INTERIOR if lado.max() < MEIO else lado.min()):(lado.max() + 1 if lado.max() < MEIO else lado.min() + INTERIOR + 1)] = True
    mau = solido & ~bom & ((X < cols.min() + ponta) | (X > cols.max() - ponta) | interior)
    idx = ndi.distance_transform_edt(~bom, return_distances=False, return_indices=True)
    out = rgba.copy()
    for c in range(3):
        out[..., c] = np.where(mau, rgba[..., c][idx[0], idx[1]], rgba[..., c])
    return out


def suavizar_sovaco(rgba, janelas):
    """O sombreado antigo traz no sovaco um vinco quase preto e recortado (degraus do
    recorte da foto). Levanta os escuros nessas janelas (x0, x1, y0, y1) e suaviza, com
    transição suave para fora da janela."""
    out = rgba.copy()
    for x0, x1, y0, y1 in janelas:
        peso = np.zeros((H, W), np.float32)
        peso[y0:y1, x0:x1] = 1
        peso = ndi.gaussian_filter(peso, 4)
        for c in range(3):
            v = ndi.gaussian_filter(np.maximum(out[..., c], PISO_SOVACO), 1.6)
            out[..., c] = out[..., c] * (1 - peso) + v * peso
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
    tira = np.maximum(vet('TIRA MANGA ESQUERDA VETOR FRENTE.svg', man & (X < MEIO), pasta=MANGAS),
                      vet('TIRA MANGA DIREITA FRENTE.svg', man & (X >= MEIO), pasta=MANGAS))
    gola = vet('GOLA SVG.svg', gol)

    # ---- punho e gola
    tira_png = tira.copy()    # o vetor é mais comprido que o PNG antigo: pára PONTA px antes do sovaco
    for sl, ref in ((slice(0, MEIO), 'esq'), (slice(MEIO, W), 'dir')):
        cols = np.where(man[:, sl].any(0))[0] + sl.start
        if ref == 'esq': tira_png[:, cols.max() - PONTA:MEIO] = 0
        else: tira_png[:, MEIO:cols.min() + PONTA] = 0
    salvar('vestida-mangas-frente.png', sem_escuros(com_alfa(man0, tira_png)))
    salvar('vestida-gola-frente.png', com_alfa(gol0, gola))

    janelas = []                       # sovaco de cada lado, junto ao fim interior do punho
    for esq in (True, False):
        cols = np.where(tira_png.max(0) > 0.5)[0]
        cols = cols[cols < MEIO] if esq else cols[cols >= MEIO]
        xi = cols.max() if esq else cols.min()
        ys = np.where(tira_png[:, xi - 3 if esq else xi + 3] > 0.5)[0]
        janelas.append((xi - 25 if esq else xi - 30, xi + 30 if esq else xi + 25, ys.min() - 110, ys.max() + 20))
    print('punho e gola trocados; janelas do sovaco:', janelas)

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

    # ---- mangas À FRENTE da camisola (pedido do cliente, 2026-11-13): a manga do designer
    # (MANGA ESQUERDA/DIREITA SVG) é uma camada própria por cima do corpo e é ELA que manda
    # no recorte do ombro; a silhueta da camisola que passava para fora dela ("a camiseta
    # subiu") é cortada rente ao bordo exterior da manga.
    manga = np.zeros((H, W), np.float32)
    for le, arq in (('esq', 'MANGA ESQUERDA VETOR FRENTE.svg'), ('dir', 'MANGA DIREITA FRENTE.svg')):
        m = manga_rente_ao_punho(vet_manga(arq, poligono_manga[le] & cam, torso, le, pasta=MANGAS), le)
        m = np.where(poligono_manga[le], m, 0)
        manga = np.maximum(manga, m)
        sol = m > 0.5
        ys = np.where(sol.any(1))[0]
        xo = np.full(H, np.nan)                                 # bordo exterior da manga, linha a linha
        for y in range(ys.min(), H):
            c = np.where(sol[y])[0]
            if len(c): xo[y] = (c.min() - 0.5) if le == 'esq' else (c.max() + 0.5)
        y0 = ys.min()
        sl = slice(0, MEIO) if le == 'esq' else slice(MEIO, W)
        for y in range(y0 - EXTRAPOLA, y0):                    # acima da ponta: o bordo da camisola vai-se
            c = np.where(base[y, sl] > 0.5)[0]                 # juntando ao da manga numa curva suave; sem
            if not len(c): continue                            # isto sobra um bico vertical da camisola
            xt = (c.min() if le == 'esq' else c.max() + 1) + sl.start
            f = (y - (y0 - EXTRAPOLA)) / EXTRAPOLA
            xo[y] = xt + (xo[y0] - xt) * f * f * (3 - 2 * f)
        for y in range(y0 - EXTRAPOLA, H):
            if np.isnan(xo[y]): continue
            if le == 'esq': base[y] *= np.clip(X[0] - xo[y] + 0.5, 0, 1)
            else: base[y] *= np.clip(xo[y] - X[0] + 0.5, 0, 1)
    # linha da costura: o bordo interior (junto ao corpo) de cada manga leva um vinco escuro
    # e fino no sombreado — é o que mostra a manga assente POR CIMA da camisola. Os
    # SOMBREAMENTO MANGA * do designer chegaram sem as imagens, por isso desenha-se aqui.
    vinco = np.ones((H, W), np.float32)
    for le in ('esq', 'dir'):
        sl = slice(0, MEIO) if le == 'esq' else slice(MEIO, W)
        sol = manga[:, sl] > 0.5
        for y in np.where(sol.any(1))[0]:
            c = np.where(sol[y])[0] + sl.start
            xi = c.max() if le == 'esq' else c.min()             # bordo para o corpo
            d = (xi - X[0]) if le == 'esq' else (X[0] - xi)       # >= 0 do lado da manga
            vinco[y] = np.minimum(vinco[y], np.where(d >= -0.5, 1 - VINCO * np.exp(-(np.maximum(d, 0) / 2.4) ** 2), 1))
    sm = com_alfa(cam0, manga)
    sm[..., :3] *= vinco[..., None]
    salvar('vestida-manga-frente.png', suavizar_sovaco(sm, janelas))
    print('manga (camada à frente da camisola) gravada')

    # ombro rente à gola: o vetor da camisola sobe ~10 px acima das pontas da gola e
    # forma um degrau/bico junto ao pescoço. Desce o ombro até ao topo da ponta da gola
    # e deixa-o voltar suavemente à linha original ao longo de OMBRO px.
    gcol = np.where((gola > 0.5).any(0))[0]
    for lado in (-1, 1):
        xe = gcol.min() if lado < 0 else gcol.max()
        gtop = np.where(gola[:, max(xe - 3, 0):xe + 4].max(1) > 0.5)[0].min()
        t0 = np.where(base[:, xe + lado * 3] > 0.5)[0].min()
        desce = max(0.0, gtop + TOPO_GOLA - t0)
        for d in range(-2, OMBRO + 1):          # inclui as colunas da própria ponta da gola
            x = xe + lado * (d + 2)
            t = np.where(base[:, x] > 0.5)[0].min()
            f = 1 - max(d, 0) / OMBRO
            corte = t + desce * f * f * (3 - 2 * f)
            base[:int(corte), x] = 0
            base[int(corte), x] *= 1 - (corte - int(corte))
        print(f'ombro {"esq" if lado < 0 else "dir"}: desce {desce:.0f}px junto à gola')

    topo_ombro = np.zeros(W)       # por coluna da gola: topo do ombro (da coluna vizinha, fora da gola)
    for x in range(gcol.min(), gcol.max() + 1):
        xv = gcol.min() - 3 if x < (gcol.min() + gcol.max()) // 2 else gcol.max() + 3
        topo_ombro[x] = np.where(base[:, xv] > 0.5)[0].min()
        base[:int(topo_ombro[x]), x] = 0   # a gola fica por cima, mas o corpo por baixo não pode espreitar acima do ombro

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
            extra &= (X >= gcol.min() - 1) & (X <= gcol.max() + 1)    # fora da gola só ficavam bicos do ombro antigo
            extra &= YY >= topo_ombro[None, :]                         # e nas pontas da gola não passa o ombro já descido
            novo = np.maximum(base, extra.astype(np.float32))
        salvar(nome, suavizar_sovaco(com_alfa(r, novo), janelas))
        print('corpo:', nome)


if __name__ == '__main__':
    main()
