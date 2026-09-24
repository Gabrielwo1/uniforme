#!/usr/bin/env python3
"""Gera o estilo de gola "bico" (V cruzado) a partir da gola do designer.

REGRA DO CLIENTE: nunca deformar/recriar os mockups. Por isso o V não é
desenhado nem gerado por IA — é a PRÓPRIA banda da gola do designer
deslocada coluna a coluna (textura intacta, encaixe ao píxel garantido por
construção). Tentou-se antes a via IA (retoque/edição por referência,
2026-09-24): o modelo redesenha o boneco com proporções diferentes e a
peça extraída nunca alinha — beco sem saída, não repetir.

O V abre um vão onde o mockup não tem nada (debaixo da banda antiga há
buraco): o vão é preenchido com PELE DO PESCOÇO do próprio avatar, clonada
das linhas logo acima do decote e esticada, com sombra a descer. Essa pele
vai num PNG separado (`gola-bico-pele-frente.png`) que o motor compõe via
`molde.detalhes` — por cima, mas NUNCA recolorida (pele não é tecido). O
remendo começa 9 px acima da banda antiga para enterrar a orla escura
antisserrilhada do recorte de pele do avatar, com o topo esbatido.

Só a FRENTE muda; o verso fica com a banda redonda (como nas fotos de
costas do cliente). Escreve em public/moldes/jog/:
  gola-bico-frente.png       (zona da gola, recolorível como sempre)
  gola-bico-pele-frente.png  (pele do vão, via detalhes)
Ligação no motor: kitDemo.GOLA_ESTILOS + coluna kit_templates.gola_estilo.
"""

import numpy as np
from PIL import Image, ImageFilter

RAIZ = 'public/moldes/jog'
CX, MEIA, PROF = 728, 96, 68  # centro/meia-largura do mergulho frontal, profundidade do V


def main() -> None:
    gola = np.array(Image.open(f'{RAIZ}/vestida-gola-frente.png').convert('RGBA'))
    jog = np.array(Image.open(f'{RAIZ}/jogador-frente.png').convert('RGBA'))

    novo = gola.copy()
    pele = np.zeros_like(gola)
    for x in range(CX - MEIA, CX + MEIA):
        ys = np.where(gola[:, x, 3] > 8)[0]
        if len(ys) == 0:
            continue
        # o troço FRONTAL da banda nesta coluna é o aglomerado mais baixo
        saltos = np.where(np.diff(ys) > 4)[0]
        ini = ys[saltos[-1] + 1] if len(saltos) else ys[0]
        seg = ys[ys >= ini]
        yT, yB = seg[0], seg[-1]
        d = int(PROF * (1 - abs(x - CX) / MEIA))
        if d <= 0:
            continue
        novo[:, x, :][yT : yB + 1 + d] = 0
        novo[yT + d : yB + 1 + d, x, :] = gola[yT : yB + 1, x, :]

        a0 = yT - 9
        fonte = jog[yT - 40 : yT - 12, x, :]
        op = fonte[:, 3] > 128
        if op.sum() >= 4:
            src = fonte[op][:, :3].astype(float)
            n = yT + d - a0
            idx = np.linspace(0, len(src) - 1, n).astype(int)
            sombra = np.linspace(1.0, 0.88, n)[:, None]
            pele[a0 : yT + d, x, :3] = (src[idx] * sombra).clip(0, 255).astype(np.uint8)
            alfa = np.full(n, 255)
            alfa[:5] = np.linspace(40, 255, 5)
            pele[a0 : yT + d, x, 3] = alfa

    Image.fromarray(novo).save(f'{RAIZ}/gola-bico-frente.png')
    suave = np.array(Image.fromarray(pele).filter(ImageFilter.GaussianBlur(0.8)))
    suave[..., 3] = np.minimum(
        suave[..., 3],
        np.array(Image.fromarray(pele).filter(ImageFilter.MaxFilter(3)))[..., 3],
    )
    Image.fromarray(suave).save(f'{RAIZ}/gola-bico-pele-frente.png')
    print('gola-bico gerada em', RAIZ)


if __name__ == '__main__':
    main()
