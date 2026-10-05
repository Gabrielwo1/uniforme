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

# Estilos com peças extra (2026-09-30, envios "GOLA 2 PARTE V" e "gola v
# Linha"):
#  - `partes`: gola PINTADA pelo designer (cores fixas, p.ex. o bico
#    bicolor do Canarinho) — vai composta no png da PELE e o estilo fica
#    SEM zona de gola (flag semGola no kitDemo): recolorir por multiply
#    corromperia as cores pintadas;
#  - `linha`: segunda zona recolorível da gola (debrum fino por cima da
#    banda) — sai como linha-<estilo>-<lado>.png;
#  - `neutralizar`: as peças recoloríveis vieram PINTADAS (verde/preto) —
#    dessatura-se e realça-se a p98≈245 (regra antiga do multiply), senão
#    o recolor tinge tudo com a cor de fábrica.
FONTE2 = '/Users/syntax/Downloads/GOLA 2 PARTE V'
FONTE3 = '/Users/syntax/Downloads/gola v Linha'
# Reenvio 2026-10-04 ("SIMULADOR DINO TESTE 0210"): bandas NEUTRAS
# (recoloríveis), PESCOÇO dedicado só-pele (recorte do próprio avatar —
# correlaciona a 0,999 e dá a âncora exata) e costas de ambos os estilos.
# O 2 CORES deixou de ser pintado: são DUAS zonas de cor (gola + linha).
F0210 = '/Users/syntax/Downloads/SIMULADOR DINO TESTE 0210'
# Reenvio 0210-2 (2026-10-05): GOLA JUNTA COMPLETA — as duas partes
# compostas PELO DESIGNER (o encaixe do V vem cozido no ficheiro), com
# laranja/claro como cores de identificação; separar_junta divide em
# zonas (claro=gola, laranja=linha) e neutraliza cada uma.
F02102 = '/Users/syntax/Downloads/SIMULADOR DINO TESTE 0210-2'

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
    ('bico2', 'frente'): dict(
        junta=(f'{F02102}/GOLA 2 CORES  V/FRENTE/GOLA JUNTA COMPLETA COM CORES DIFERENTES FRENTE.webp', 0.300, None),
        cabeca=(f'{F0210}/GOLA 2 CORES  V/FRENTE/PELE PESCOÇO FRENTE.webp', (601, 386)),
        esc_cabeca=0.295,
        fundo_banda=True,
    ),
    ('bico2', 'verso'): dict(
        junta=(f'{F02102}/GOLA 2 CORES  V/COSTAS/GOLA JUNTA COMPLETA COM CORES DIFERENTES COSTAS.webp', 0.300, None),
        cabeca=(f'{F0210}/GOLA V COM LINHA ENCIMA/COSTAS/PARTE PESCOÇO COSTAS PELE.webp', (573, 344)),
        esc_cabeca=0.275,
    ),
    ('vlinha', 'frente'): dict(
        # a junta da FRENTE veio guardada na pasta COSTAS (nome sem sufixo)
        junta=(f'{F02102}/GOLA V COM LINHA ENCIMA/COSTAS/GOLA JUNTA COMPLETA COM CORES DIFERENTES.webp', 0.300, None),
        cabeca=(f'{F0210}/GOLA 2 CORES  V/FRENTE/PELE PESCOÇO FRENTE.webp', (601, 386)),
        esc_cabeca=0.295,
    ),
    ('vlinha', 'verso'): dict(
        junta=(f'{F02102}/GOLA V COM LINHA ENCIMA/COSTAS/GOLA JUNTA COMPLETA COM CORES DIFERENTES COSTA.webp', 0.300, None),
        cabeca=(f'{F0210}/GOLA V COM LINHA ENCIMA/COSTAS/PARTE PESCOÇO COSTAS PELE.webp', (573, 344)),
        esc_cabeca=0.275,
    ),
}




def na_tela(caminho: str, escala: float, canto: tuple[int, int], rot: float = 0) -> Image.Image:
    p = caminho if caminho.startswith('/') else f'{FONTE}/{caminho}'
    im = Image.open(p).convert('RGBA')
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    if rot:
        im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    tela = Image.new('RGBA', TELA, (0, 0, 0, 0))
    tela.alpha_composite(im, canto)
    return tela


def so_pele(cabeca: Image.Image, solidificar: bool = True) -> Image.Image:
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
    if len(ys) and not solidificar:
        # estilo sobre_camisa: o desvanecimento do peito DESCARTA-SE em vez
        # de solidificar — fica só cabeça+pescoço opacos com a borda curva
        # natural, que é quem oculta as pontas do colar
        baixo = np.zeros(a.shape[:2], bool)
        baixo[ys.min() + (ys.max() - ys.min()) * 55 // 100 :] = True
        a[..., 3][baixo & (a[..., 3] < 230)] = 0
    if len(ys) and solidificar:
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


def preencher_vazios(pele: Image.Image, gola: Image.Image, lado: str, fundo_banda: bool = False) -> Image.Image:
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
    # OCLUSÃO por coluna (cliente, 2026-09-29: a ponta direita da banda
    # ficava tapada): a peça da cabeça traz um pouco de OMBRO, e a pele
    # compõe por cima da gola — certo no PESCOÇO (a banda passa por trás),
    # errado nos OMBROS (a banda passa à frente). Nas colunas fora do
    # pescoço (medido no jogador à altura do topo da banda), a pele sai
    # de cima da banda.
    banda = np.array(gola)[..., 3] > 180
    if banda.any():
        topo = int(np.where(banda.any(axis=1))[0].min())
        ja = np.array(jog)[..., 3]
        xs_pescoco = np.where(ja[topo + 8] > 128)[0]
        if len(xs_pescoco):
            fora = np.ones(banda.shape[1], bool)
            fora[max(0, xs_pescoco.min() - 2) : xs_pescoco.max() + 3] = False
            # fora do pescoço, a peça da cabeça só DUPLICA (às vezes mal) a
            # pele que o avatar já tem por baixo: sai toda na metade de
            # baixo, e o jogador original aparece — sempre certo
            baixo = np.zeros(banda.shape, bool)
            baixo[max(0, topo - 40) :] = True
            tapa = (p[..., 3] > 0) & fora[None, :] & baixo
            p[..., 3][tapa] = 0
            print(f'    pele dos ombros removida (fica o avatar): {int(tapa.sum())}px')

    # gola/pele contam como "tapar" só quando quase opacas: debaixo do
    # antisserrilhado das pontas da banda também tem de haver tecido,
    # senão o fundo do palco espreita numa cunha clara (cliente, 2026-09-29)
    from scipy.ndimage import binary_closing, binary_fill_holes
    ga_n = np.array(gola)[..., 3]
    uniao = (cam[..., 3] > 40) | (np.array(jog)[..., 3] > 40) | (ga_n > 200) | (p[..., 3] > 200)
    # fecha bolsos semi-abertos junto aos ombros antes de procurar buracos
    interno = binary_fill_holes(binary_closing(uniao, iterations=8)) & ~uniao
    # buracos internos da união (a banda liga o anel e fecha a topologia)
    # OU a pegada da gola antiga — o que apanhar mais
    vazio = (
        (interno | (velha > 40)) & (p[..., 3] <= 200) & (ga_n <= 200)
        & (cam[..., 3] <= 40) & (np.array(jog)[..., 3] <= 40)
    )
    if fundo_banda:
        # com o fundo de banda cosido no corpo, a área dele já é tecido:
        # fora do cálculo de vazios (senão a pele enche por cima)
        vazio &= ~(velha > 20)
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

    # FUNDO DE BANDA (lição cgsports, flag fundo_banda): a gola redonda
    # antiga entra no CORPO-do-estilo como tecido — por baixo das partes,
    # recolore com a camisola e fecha todos os vãos do anel de uma vez
    if fundo_banda:
        vg = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))
        m = vg[..., 3] > 20
        corpo[..., :3][m] = vg[..., :3][m]
        corpo[..., 3][m] = np.maximum(corpo[..., 3][m], vg[..., 3][m])
        print(f'    fundo de banda cosido no corpo: {int(m.sum())}px')

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


def neutralizar(im: Image.Image) -> Image.Image:
    """Peças recoloríveis que vieram PINTADAS (verde/preto) viram neutro
    claro: só a luminância, realçada a p98≈245 (regra do multiply — uma
    camada escura devolve fração da cor escolhida e um branco sai cinza)."""
    a = np.array(im).astype(float)
    L = a[..., :3] @ np.array([0.2126, 0.7152, 0.0722])
    op = a[..., 3] > 128
    p98 = np.percentile(L[op], 98) if op.any() else 255
    L = (L * (245.0 / max(p98, 1))).clip(0, 255)
    a[..., 0] = a[..., 1] = a[..., 2] = L
    return Image.fromarray(a.astype(np.uint8))


def colocar(caminho: str, escala: float, lado: str) -> tuple[int, int]:
    """Canto ótimo de uma peça de gola SEM gabarito do designer: cobre a
    pegada da gola antiga, com peso 8× nos píxeis que ficariam em VAZIO
    (a receita que acertou a cruzada/social antes do gabarito chegar)."""
    p = caminho if caminho.startswith('/') else f'{FONTE}/{caminho}'
    im = Image.open(p).convert('RGBA')
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    ga = np.array(im)[..., 3]
    velha = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))[..., 3] > 40
    jog = np.array(Image.open(f'{SAIDA}/jogador-{lado}.png').convert('RGBA'))[..., 3] > 40
    cam = np.array(Image.open(f'{SAIDA}/vestida-camisola-{lado}.png').convert('RGBA'))[..., 3] > 40
    vazio = velha & ~cam & ~jog
    resto = velha & ~vazio
    cyx = np.where(velha)
    cx0, cy0 = int(cyx[1].mean()) - im.width // 2, int(cyx[0].mean()) - im.height // 2

    def alfa_em(canto):
        a = np.zeros(velha.shape, bool)
        x, y = canto
        a[max(0, y) : y + im.height, max(0, x) : x + im.width] = (
            ga[max(0, y) - y :, max(0, x) - x :] > 40
        )
        return a

    melhor = (1e18, (cx0, cy0))
    for dy in range(-16, 26, 2):
        for dx in range(-16, 18, 2):
            at = alfa_em((cx0 + dx, cy0 + dy))
            custo = int((vazio & ~at).sum()) * 8 + int((resto & ~at).sum())
            if custo < melhor[0]:
                melhor = (custo, (cx0 + dx, cy0 + dy))
    return melhor[1]


def separar_junta(im: Image.Image):
    """Separa a GOLA JUNTA do designer (reenvio 0210-2) nas duas zonas:
    LARANJA = zona linha (2.ª cor / debrum), CLARO = zona gola. As cores
    são de identificação — cada metade sai neutralizada para recolorir.
    A relação entre as partes (o encaixe do V) vem COZIDA no ficheiro."""
    a = np.array(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    v = np.maximum(np.maximum(r, g), b)
    sat = v - np.minimum(np.minimum(r, g), b)
    laranja = (a[..., 3] > 8) & (sat > 50) & (r > g) & (g > b)
    partes = []
    for mascara in (~laranja, laranja):  # [claro=gola, laranja=linha]
        p = a.copy()
        p[..., 3] = np.where(mascara, p[..., 3], 0)
        partes.append(neutralizar(Image.fromarray(p.astype(np.uint8))))
    return partes


def camada(c, chave, lado, neutro):
    if chave not in c:
        return None
    spec = c[chave]
    caminho, esc, canto = spec[:3]
    rot = spec[3] if len(spec) > 3 else 0
    if canto is None:
        canto = colocar(caminho, esc, lado)
        print(f'    {chave}: canto otimizado {canto}')
    im = na_tela(caminho, esc, canto, rot)
    return neutralizar(im) if neutro else im


def main() -> None:
    for (estilo, lado), c in PECAS.items():
        neutro = bool(c.get('neutralizar'))
        if 'junta' in c:
            spec = c['junta']
            caminho, esc, canto = spec[:3]
            if canto is None:
                canto = colocar(caminho, esc, lado)
                print(f'    junta: canto otimizado {canto}')
            gola, linha_j = separar_junta(na_tela(caminho, esc, canto))
            c = dict(c)
            c.pop('gola', None); c.pop('linha', None)
        else:
            linha_j = None
            gola = camada(c, 'gola', lado, neutro)
        partes = None
        if 'partes' in c:
            # gola PINTADA em partes: compõe-se (1.ª por baixo) e serve de
            # geometria de banda para as regras; vai para o png da PELE e
            # NÃO há zona de gola recolorível (semGola no kitDemo)
            partes = Image.new('RGBA', TELA, (0, 0, 0, 0))
            for caminho, esc, canto in c['partes']:
                if canto is None:
                    canto = colocar(caminho, esc, lado)
                    print(f'    parte: canto otimizado {canto}')
                partes.alpha_composite(na_tela(caminho, esc, canto))
        linha_im = linha_j if linha_j is not None else camada(c, 'linha', lado, neutro)
        geo = gola if gola is not None else partes
        if gola is not None and linha_im is not None:
            # as regras de cobertura/oclusão contam com a GOLA INTEIRA:
            # banda + linha (senão o anel enche por baixo da segunda cor)
            geo = Image.alpha_composite(gola, linha_im)
        if c.get('corredor') and lado == 'frente':
            # ENCAIXE NA COSTURA (cliente 2026-10-04): a banda vive no
            # corredor do decote — pegada da gola antiga dilatada; fora
            # dele é cortada, morrendo na costura como se cosida
            from scipy.ndimage import binary_dilation, gaussian_filter as _gf
            velha_c = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))[..., 3] > 40
            corredor = binary_dilation(velha_c, iterations=int(c['corredor']))
            borda = _gf(corredor.astype(float), 3)
            for im_ in (gola, linha_im):
                if im_ is None:
                    continue
                a_ = np.array(im_)
                a_[..., 3] = (a_[..., 3] * borda.clip(0, 1)).astype(np.uint8)
                im_.paste(Image.fromarray(a_))
        if c.get('pontas_atras') and lado == 'frente':
            # as pontas do colar enfiam-se ATRÁS do pescoço: apagam-se as
            # bandas onde há pescoço do avatar (colunas do pescoço, zona alta)
            velha_a = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))[..., 3]
            topo_g = int(np.where((velha_a > 40).any(axis=1))[0].min())
            ja_a = np.array(Image.open(f'{SAIDA}/jogador-{lado}.png').convert('RGBA'))[..., 3]
            xs_p = np.where(ja_a[topo_g + 8] > 128)[0]
            if len(xs_p):
                zona_p = np.zeros(ja_a.shape, bool)
                zona_p[: topo_g + 30, xs_p.min() - 4 : xs_p.max() + 5] = True
                for im_ in (gola, linha_im):
                    if im_ is None:
                        continue
                    a_ = np.array(im_)
                    a_[..., 3][zona_p & (ja_a > 128)] = 0
                    im_.paste(Image.fromarray(a_))
        if gola is not None:
            gola.save(f'{SAIDA}/gola-{estilo}-{lado}.png')
        if linha_im is not None:
            linha_im.save(f'{SAIDA}/linha-{estilo}-{lado}.png')
        cab_f, canto_c = c['cabeca']
        cabeca = so_pele(na_tela(cab_f, c.get('esc_cabeca', ESC_CABECA), canto_c),
                         solidificar=not c.get('sobre_camisa'))
        if c.get('sobre_camisa'):
            # colar de pendurar: prende na costura do decote e fica à
            # frente — SÓ as pontas se enfiam atrás do pescoço: apagam-se
            # as partes onde há pescoço do avatar (colunas do pescoço,
            # acima da linha do trapézio)
            velha = np.array(Image.open(f'{SAIDA}/vestida-gola-{lado}.png').convert('RGBA'))[..., 3]
            topo_g = int(np.where((velha > 40).any(axis=1))[0].min())
            ja = np.array(Image.open(f'{SAIDA}/jogador-{lado}.png').convert('RGBA'))[..., 3]
            xs_p = np.where(ja[topo_g + 8] > 128)[0]
            pa = np.array(partes)
            if len(xs_p):
                zona_pescoco = np.zeros(pa.shape[:2], bool)
                zona_pescoco[: topo_g + 30, xs_p.min() - 4 : xs_p.max() + 5] = True
                pa[..., 3][zona_pescoco & (ja > 128)] = 0
            pele = Image.fromarray(pa)
            corpo = Image.open(f'{SAIDA}/vestida-camisola-{lado}.png').convert('RGBA')
        else:
            pele, corpo = preencher_vazios(cabeca, geo, lado, fundo_banda=bool(c.get('fundo_banda')))
            if partes is not None:
                pele = Image.alpha_composite(pele, partes)
        pele.save(f'{SAIDA}/gola-{estilo}-pele-{lado}.png')
        corpo.save(f'{SAIDA}/corpo-{estilo}-{lado}.png')
        print(f'{estilo}-{lado}  ok')


if __name__ == '__main__':
    main()
