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


def so_pele(cabeca: Image.Image) -> Image.Image:
    """Recorta o COLARINHO BRANCO que o designer deixou pintado na base das
    peças de cabeça/pescoço. A cabeça compõe por `detalhes` (nunca recolore):
    qualquer branco dela fica por cima da gola recolorida como um "segundo
    colarinho" — foi o defeito apontado pelo cliente a 2026-09-29. Branco =
    claro e dessaturado, e só na METADE DE BAIXO da peça (para não comer
    dentes, brilhos de pele ou olhos)."""
    a = np.array(cabeca)
    rgb = a[..., :3].astype(int)
    v = rgb.max(axis=2)
    s = v - rgb.min(axis=2)
    # apanha também o colarinho À SOMBRA (v desce até ~125 mas continua
    # dessaturado); a pele, mesmo à sombra, é quente (s alto) e escapa
    branco = (v > 125) & (s < 42)
    ys = np.where(a[..., 3] > 8)[0]
    if len(ys):
        branco[: ys.min() + (ys.max() - ys.min()) * 55 // 100] = False
    a[..., 3][branco] = 0
    # a peça DESVANECE em alfa na base do pescoço (fica pele a ~46% por
    # cima da estampa escura = faixa lamacenta). O RGB do desvanecido é
    # pele legítima: SOLIDIFICA-SE o alfa na metade de baixo — ou é pele
    # opaca, ou não é nada
    if len(ys):
        from scipy.ndimage import binary_closing, binary_opening, gaussian_filter

        baixo = np.zeros(a.shape[:2], bool)
        baixo[ys.min() + (ys.max() - ys.min()) * 55 // 100 :] = True
        # binariza, fecha os buracos do corte do branco e tira as ilhas
        solido = binary_opening(binary_closing((a[..., 3] >= 60) & baixo, iterations=2), iterations=2)
        novo = a[..., 3].astype(float)
        novo[baixo] = np.where(solido[baixo], 255.0, 0.0)
        # orla suave sem desfazer o interior
        novo = gaussian_filter(novo, 0.8)
        novo[~baixo] = a[..., 3][~baixo]
        a[..., 3] = novo.clip(0, 255).astype(np.uint8)
    print(f'    colarinho branco removido: {int(branco.sum())}px; alfa da base solidificado')
    return Image.fromarray(a)


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
    # gola/pele contam como "tapar" só quando quase opacas: debaixo do
    # antisserrilhado das pontas da banda também tem de haver tecido,
    # senão o fundo do palco espreita numa cunha clara (cliente, 2026-09-29)
    vazio = (
        (velha > 40) & (p[..., 3] <= 200) & (np.array(gola)[..., 3] <= 200)
        & (cam[..., 3] <= 40) & (np.array(jog)[..., 3] <= 40)
    )
    if vazio.any():
        d_pele, (py, px) = distance_transform_edt(fonte[..., 3] <= 128, return_indices=True)
        d_cam, (cy, cx) = distance_transform_edt(cam[..., 3] <= 128, return_indices=True)
        ys, xs = np.where(vazio)
        # regra POR COLUNA primeiro: acima da banda é abertura → PELE;
        # abaixo é camisola → TECIDO. Onde não há banda na coluna, decide a
        # distância, com o empate para tecido — pele em cima de estampa
        # escura grita, tecido não.
        ga = np.array(gola)[..., 3] > 40
        e_pele = np.zeros(len(ys), bool)
        for i, (y, x) in enumerate(zip(ys, xs)):
            col = np.where(ga[:, x])[0]
            if len(col):
                e_pele[i] = y < col.min()
            else:
                e_pele[i] = d_pele[y, x] * 1.8 <= d_cam[y, x]
        yp, xp = ys[e_pele], xs[e_pele]
        p[yp, xp, :3] = (fonte[py[yp, xp], px[yp, xp], :3] * 0.88).astype(np.uint8)
        p[yp, xp, 3] = 255
        yc, xc = ys[~e_pele], xs[~e_pele]
        corpo[yc, xc, :3] = cam[cy[yc, xc], cx[yc, xc], :3]
        corpo[yc, xc, 3] = 255
        print(f'    vazios: {int(vazio.sum())}px ({int(e_pele.sum())} pele, {len(yc)} tecido)')
    else:
        print('    vazios: 0px')

    # a orla ANTISSERRILHADA do decote da camisola (alfa 25..230) deixava o
    # fundo do palco espreitar num rebordo claro serrilhado quando a banda
    # fina não a tapa (a gola antiga larga tapava): dentro da pegada da gola
    # antiga, solidifica-se com o clone do tecido OPACO mais próximo. Onde
    # devia ser pele, o png da pele (que compõe por cima) tapa este clone.
    from scipy.ndimage import distance_transform_edt as _edt

    semi = (velha > 40) & (cam[..., 3] > 25) & (cam[..., 3] < 230)
    if semi.any():
        _, (oy, ox) = _edt(cam[..., 3] < 230, return_indices=True)
        ys2, xs2 = np.where(semi)
        corpo[ys2, xs2, :3] = cam[oy[ys2, xs2], ox[ys2, xs2], :3]
        corpo[ys2, xs2, 3] = 255
        print(f'    orla do decote solidificada: {int(semi.sum())}px')
    # o corpo sai SEMPRE (mesmo igual à camisola): o motor troca a imagem
    # da zona corpo nos dois lados quando o estilo está ativo
    return Image.fromarray(p), Image.fromarray(corpo)


def main() -> None:
    for (estilo, lado), c in PECAS.items():
        gola_f, s, canto = c['gola']
        gola = na_tela(gola_f, s, canto)
        gola.save(f'{SAIDA}/gola-{estilo}-{lado}.png')
        cab_f, canto_c = c['cabeca']
        pele, corpo = preencher_vazios(so_pele(na_tela(cab_f, ESC_CABECA, canto_c)), gola, lado)
        pele.save(f'{SAIDA}/gola-{estilo}-pele-{lado}.png')
        corpo.save(f'{SAIDA}/corpo-{estilo}-{lado}.png')
        print(f'gola-{estilo}-{lado}.png + pele + corpo  ok')


if __name__ == '__main__':
    main()
