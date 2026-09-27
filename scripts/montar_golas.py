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

Saída (public/moldes/jog/): gola-<estilo>-<lado>.png (zona da gola,
recolorível) e gola-<estilo>-pele-<lado>.png (cabeça/pescoço desse estilo,
composta por `molde.detalhes`, NUNCA recolorida). Ligação: coluna
kit_templates.gola_estilo + GOLA_ESTILOS em kitDemo.
"""

from PIL import Image

FONTE = '/Users/syntax/Downloads/DINO SIMULADOR GOLAS NOVAS'
SAIDA = 'public/moldes/jog'
TELA = (1520, 2460)
ESC_CABECA = 0.300  # escala da prancheta do designer, confirmada por correlação

PECAS = {
    ('cruzada', 'frente'): dict(
        gola=('GOLA REDONDA CRUZADA/FRENTE GOLA REDONDA CRUZADA/GOLA COM EFEITO REDONDA CRUZADA PNG.png', 0.34, (596, 376)),
        cabeca=('GOLA REDONDA CRUZADA/FRENTE GOLA REDONDA CRUZADA/AVATAR CABEÇA FRENTE GOLA REDONDA CRUZADA.png', (506, 25)),
    ),
    ('cruzada', 'verso'): dict(
        gola=('GOLA REDONDA CRUZADA/COSTAS GOLA REDONDA CRUZADA/GOLA COM EFEITO REDONDA CRUZADA PNG.png', 0.30, (553, 390)),
        cabeca=('GOLA REDONDA CRUZADA/COSTAS GOLA REDONDA CRUZADA/CABEÇA E PESCOÇO COSTAS GOLA REDONDA CRUZADA.png', (484, 24)),
    ),
    ('social', 'frente'): dict(
        gola=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLA FRENTE SOCIAL/GOLA SOCIALCOM EFEITO PNG.png', 0.32, (572, 376)),
        cabeca=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLA FRENTE SOCIAL/PESCOÇO E CABEÇA FRENTE PNG.png', (501, 25)),
    ),
    ('social', 'verso'): dict(
        gola=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLAS COSTAS SOCIAL/GOLA COM EFEITO COSTA PNG.png', 0.31, (537, 378)),
        cabeca=('GOLA ESTILO SOCIAL/GOLA SOCIAL/GOLAS COSTAS SOCIAL/CABEÇA COSTA PNG.png', (394, 24)),
    ),
}


def na_tela(caminho: str, escala: float, canto: tuple[int, int]) -> Image.Image:
    im = Image.open(f'{FONTE}/{caminho}').convert('RGBA')
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    tela = Image.new('RGBA', TELA, (0, 0, 0, 0))
    tela.alpha_composite(im, canto)
    return tela


def main() -> None:
    for (estilo, lado), c in PECAS.items():
        gola_f, s, canto = c['gola']
        na_tela(gola_f, s, canto).save(f'{SAIDA}/gola-{estilo}-{lado}.png')
        cab_f, canto_c = c['cabeca']
        na_tela(cab_f, ESC_CABECA, canto_c).save(f'{SAIDA}/gola-{estilo}-pele-{lado}.png')
        print(f'gola-{estilo}-{lado}.png + pele  ok')


if __name__ == '__main__':
    main()
