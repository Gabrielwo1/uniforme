#!/usr/bin/env python3
"""Assa as GOLAS do designer ("DINO SIMULADOR GOLAS NOVAS") na tela comum.

Envio do designer (2026-09-27, WeTransfer): por estilo e lado, a gola COM
EFEITO (sombreada — o formato do palco) e a CABEÇA/PESCOÇO própria dessa
gola (o decote de cada estilo abre diferente, e o pescoço vem já cortado a
condizer). Tudo recortado à caixa de cada peça, MAS na mesma prancheta e
mesma geração de render do conjunto: as quatro cabeças casam com o nosso
`jogador-*.png` por correlação com score 0,995 à escala exata 0,300.

Como se chegou à colocação (não redescobrir):
  - CABEÇAS: template matching (miolo da cabeça, sem pescoço) contra o
    jogador da tela — dá escala e canto exatos, porque os píxeis são os
    mesmos render.
  - GOLAS: as caixas recortadas não guardam a posição na prancheta, por
    isso a colocação é OTIMIZADA: cobrir primeiro os VAZIOS do palco (a
    pegada da gola redonda antiga que ficaria sem nada por baixo — peso
    8×), depois o debrum do decote da camisola, preferindo a escala do
    designer (0,300). A cruzada precisou de 0,34 para tapar o vão sob o
    cruzamento; o resíduo final é um fio de 1 px + 8×3 px — invisível no
    palco (fator 0,25).

A COLOCAÇÃO das golas vem dos COMPOSTOS DE TESTE do próprio designer
(2026-09-28, "coube perfeitamente"): mediu-se por correlação onde ELE pôs
cada gola em relação à cabeça nos testes dele (preto/social e azul/cruzada)
e replicou-se na tela — escala nativa ~0,29–0,30, nada de inflacionar. Com
a banda à escala dele sobram uns arcos de VAZIO do palco dentro da abertura
(no composto dele essa zona mostra o interior escuro da camisola; na nossa
tela não há nada): esses arcos são preenchidos com PELE CLONADA (vizinho de
cima, jogador+cabeça), assada DENTRO do png da pele, por baixo das peças.

Saída (public/moldes/jog/): gola-<estilo>-<lado>.png (zona da gola,
recolorível) e gola-<estilo>-pele-<lado>.png (cabeça/pescoço desse estilo
+ o preenchimento dos arcos, composta por `molde.detalhes`, NUNCA
recolorida). Ligação: coluna kit_templates.gola_estilo + GOLA_ESTILOS.
"""

import numpy as np
from PIL import Image

FONTE = '/Users/syntax/Downloads/DINO SIMULADOR GOLAS NOVAS'
SAIDA = 'public/moldes/jog'
TELA = (1520, 2460)
ESC_CABECA = 0.300  # escala da prancheta do designer, confirmada por correlação

PECAS = {
    ('cruzada', 'frente'): dict(
        gola=('GOLA REDONDA CRUZADA/FRENTE GOLA REDONDA CRUZADA/GOLA COM EFEITO REDONDA CRUZADA PNG.png', 0.300, (615, 386)),
        cabeca=('GOLA REDONDA CRUZADA/FRENTE GOLA REDONDA CRUZADA/AVATAR CABEÇA FRENTE GOLA REDONDA CRUZADA.png', (506, 25)),
    ),
    ('cruzada', 'verso'): dict(
        gola=('GOLA REDONDA CRUZADA/COSTAS GOLA REDONDA CRUZADA/GOLA COM EFEITO REDONDA CRUZADA PNG.png', 0.305, (548, 388)),
        cabeca=('GOLA REDONDA CRUZADA/COSTAS GOLA REDONDA CRUZADA/CABEÇA E PESCOÇO COSTAS GOLA REDONDA CRUZADA.png', (484, 24)),
    ),
    ('social', 'frente'): dict(
        gola=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLA FRENTE SOCIAL/GOLA SOCIALCOM EFEITO PNG.png', 0.290, (589, 386)),
        cabeca=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLA FRENTE SOCIAL/PESCOÇO E CABEÇA FRENTE PNG.png', (501, 25)),
    ),
    ('social', 'verso'): dict(
        gola=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLAS COSTAS SOCIAL/GOLA COM EFEITO COSTA PNG.png', 0.281, (547, 365)),
        cabeca=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLAS COSTAS SOCIAL/CABEÇA COSTA PNG.png', (394, 24)),
    ),
}


def na_tela(caminho: str, escala: float, canto: tuple[int, int]) -> Image.Image:
    im = Image.open(f'{FONTE}/{caminho}').convert('RGBA')
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    tela = Image.new('RGBA', TELA, (0, 0, 0, 0))
    tela.alpha_composite(im, canto)
    return tela


def preencher_vazios(pele: Image.Image, gola: Image.Image, lado: str) -> Image.Image:
    """Clona pele para os arcos do palco que sobram dentro da abertura.

    O vazio = pegada da gola redonda ANTIGA sem nada por baixo (nem gola
    nova, nem cabeça, nem camisola, nem jogador). O anel tem DUAS
    naturezas: para DENTRO da abertura é pele (vai no png da pele, nunca
    recolore), para FORA é tecido da camisola — e tecido tem de recolorir
    com o corpo, por isso vai num `corpo-<estilo>-<lado>.png` (camisola do
    designer + clone do tecido vizinho) que substitui a imagem da zona
    corpo quando o estilo está ativo. Cada píxel decide-se pelo vizinho
    não-vazio mais perto: pele ou camisola, quem estiver mais perto ganha.
    """
    from scipy.ndimage import distance_transform_edt

    jog = Image.open(f'{SAIDA}/jogador-{lado}.png').convert('RGBA')
    camisola = Image.open(f'{SAIDA}/vestida-camisola-{lado}.png').convert('RGBA')
    cam = np.array(camisola)
    velha = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))[..., 3]
    fonte = np.array(Image.alpha_composite(jog, pele))  # pele real: jogador + cabeça nova
    p = np.array(pele)
    corpo = cam.copy()
    vazio = (
        (velha > 40) & (p[..., 3] <= 40) & (np.array(gola)[..., 3] <= 40)
        & (cam[..., 3] <= 40) & (np.array(jog)[..., 3] <= 40)
    )
    if vazio.any():
        d_pele, (py, px) = distance_transform_edt(fonte[..., 3] <= 128, return_indices=True)
        d_cam, (cy, cx) = distance_transform_edt(cam[..., 3] <= 128, return_indices=True)
        ys, xs = np.where(vazio)
        e_pele = d_pele[ys, xs] <= d_cam[ys, xs]
        yp, xp = ys[e_pele], xs[e_pele]
        p[yp, xp, :3] = (fonte[py[yp, xp], px[yp, xp], :3] * 0.88).astype(np.uint8)
        p[yp, xp, 3] = 255
        yc, xc = ys[~e_pele], xs[~e_pele]
        corpo[yc, xc, :3] = cam[cy[yc, xc], cx[yc, xc], :3]
        corpo[yc, xc, 3] = 255
        print(f'    vazios: {int(vazio.sum())}px ({int(e_pele.sum())} pele, {len(yc)} tecido)')
    else:
        print('    vazios: 0px')
    return Image.fromarray(p), (Image.fromarray(corpo) if vazio.any() else None)


def main() -> None:
    for (estilo, lado), c in PECAS.items():
        gola_f, s, canto = c['gola']
        gola = na_tela(gola_f, s, canto)
        gola.save(f'{SAIDA}/gola-{estilo}-{lado}.png')
        cab_f, canto_c = c['cabeca']
        pele, corpo = preencher_vazios(na_tela(cab_f, ESC_CABECA, canto_c), gola, lado)
        pele.save(f'{SAIDA}/gola-{estilo}-pele-{lado}.png')
        if corpo is not None:
            corpo.save(f'{SAIDA}/corpo-{estilo}-{lado}.png')
        print(f'gola-{estilo}-{lado}.png + pele{" + corpo" if corpo is not None else ""}  ok')


if __name__ == '__main__':
    main()
