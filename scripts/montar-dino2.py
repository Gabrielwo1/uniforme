"""
Monta o ambiente do jogador a partir do SEGUNDO mockup do designer
("uniforme dino correto ultimo feito-2"). Substitui o montar-dino.py.

O que muda em relação ao envio anterior:

  · O AVATAR VESTIDO vem num PNG grande (~1024 px) embutido nos SVG do
    CorelDRAW — cuidado: os nomes frente/costas estão TROCADOS entre o SVG
    e a pasta de imagens, e a tabela abaixo corrige isso.
  · O AVATAR BASE (webp) vem com BURACOS transparentes onde as peças
    assentam — cabeça, braços e chuteiras opacos, tecido ausente. A posição
    de cada peça é o próprio buraco: a correspondência é feita entre o alfa
    da peça e a máscara dos buracos, um sinal muito mais limpo do que
    branco-sobre-branco.
  · As chuteiras não vêm em ficheiro próprio: são recortadas do avatar
    base (os píxeis opacos abaixo do buraco do meião).

O avatar novo é mais LARGO que o antigo (braços afastados), por isso a
tela comum cresce de 1080×2460 para 1520×2460 (wrapper 380×615 × 4) — os
consumidores (kitDemo/kitCaixas/KitViewer/KitPreview) acompanham.

    python3 scripts/montar-dino2.py
"""
import os

import cv2
import numpy as np
from PIL import Image, ImageFilter

M = 4
W, H = 380 * M, 615 * M            # tela comum nova (wrapper 380×615)
SAIDA = 'public/moldes/jog'

ALTURA_AVATAR = 596                # altura do avatar na tela (wrapper px)
TOPO_AVATAR = 6

# Envio CONSOLIDADO (2026-08-29, "UNIFORME FUTEBOL SIMULADOR DINO"):
# tudo numa pasta, nomes certos (a troca frente/costas do CorelDRAW
# desapareceu), mangas e calção corrigidos. A camisa continua INTEIRA e a
# TIRA do punho é a zona colorível à parte.
D4 = '/Users/syntax/Downloads/UNIFORME FUTEBOL SIMULADOR DINO'
SVG4 = f'{D4}/ARQUIVOS SVG'
WEBP4 = f'{D4}/ARQUIVOS WEBP'
# única peça em falta no envio: o webp do meião de costas — fica o do envio
# anterior ("uniforme dino correto ultimo feito-2")
D_ANTIGO = '/Users/syntax/Downloads/uniforme dino correto ultimo feito-2'

VESTIDO = {
    'frente': f'{SVG4}/FRENTE/AVATAR FRENTE_Images/AVATAR FRENTE_ImgID1.png',
    'verso': f'{SVG4}/COSTAS/AVATAR COSTAS_Images/AVATAR COSTAS_ImgID1.png',
}
BASE = {
    'frente': f'{WEBP4}/FRENTE/AVATAR FRENTE.webp',
    'verso': f'{WEBP4}/COSTAS/AVATAR COSTAS.webp',
}
PECAS = {
    'frente': {
        'camisola': f'{WEBP4}/FRENTE/CAMISETA FRENTE.webp',
        'calcao': f'{WEBP4}/FRENTE/BERMUDA FRENTE.webp',
        'meiao': f'{WEBP4}/FRENTE/MEIÃO FRENTE.webp',
        'gola': f'{WEBP4}/FRENTE/GOLA FRENTE.webp',
        'mangas': f'{WEBP4}/FRENTE/TIRAS MANGAS FRENTE.webp',
    },
    'verso': {
        'camisola': f'{WEBP4}/COSTAS/CAMISETA COSTA.webp',
        'calcao': f'{WEBP4}/COSTAS/BERMUDA COSTAS.webp',
        'meiao': f'{D_ANTIGO}/peças que faltou/PEÇAS WEBP/COSTAS/MEIAO COSTAS.webp',
        'gola': f'{WEBP4}/COSTAS/GOLAS COSTA.webp',
        'mangas': f'{WEBP4}/COSTAS/TIRAS MANGAS COSTA.webp',
    },
}

# Banda vertical onde cada zona pode assentar (fração da altura do avatar).
# Sem isto a procura confunde formas parecidas: dois buracos de meia lado a
# lado pontuam como um par de mangas, e a gola fininha casa com qualquer
# risco horizontal.
BANDAS = {
    'camisola': (0.05, 0.60),
    'calcao': (0.40, 0.80),
    'meiao': (0.60, 1.00),
}

# multiply é um GANHO: uma camada a p98=170 devolve 67% da cor escolhida.
# Levar o topo a ~245 é o que faz o branco escolhido sair branco.
LUM_TOPO = 245


def realcar(im):
    a = np.array(im).astype(np.float32)
    op = a[..., 3] > 60
    if not op.any():
        return im
    p98 = float(np.percentile(a[..., :3][op], 98))
    if p98 < 60:
        a[..., :3] += 150 - p98
        p98 = 150
    a[..., :3] = np.clip(a[..., :3] * (LUM_TOPO / p98), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def localizar_no_buraco(buracos, peca, escala_base):
    """Canto da peça, pelo encaixe do seu alfa nos buracos — a ESCALA é
    fixa em `escala_base` (razão vestido/base): o envio consolidado vem
    todo do mesmo documento, e deixar a correlação escolher a escala fazia
    asneira — os buracos são um nadinha maiores que as peças (o kit do
    vestido rende com sombra, que alarga o alfa) e o melhor score caía a
    1,25 em vez de 1,261: 0,9% mais pequena, que na bainha do calção eram
    os ~3 px de vão que o cliente apanhou no zoom. Procurar POSIÇÃO sim,
    escala não.
    """
    alvo = buracos.astype(np.float32)

    def tenta(escalas, melhor):
        for esc in escalas:
            larg, alt = int(peca.width * esc), int(peca.height * esc)
            if larg < 4 or alt < 4 or larg > alvo.shape[1] or alt > alvo.shape[0]:
                continue
            modelo = np.array(
                peca.resize((larg, alt), Image.LANCZOS).getchannel('A'),
                dtype=np.float32) / 255.0
            r = cv2.matchTemplate(alvo, modelo, cv2.TM_CCORR_NORMED)
            _, score, _, canto = cv2.minMaxLoc(r)
            if score > melhor[2]:
                melhor = (canto, float(esc), score)
        return melhor

    return tenta([escala_base], (None, escala_base, -1.0))


FOLGA = 16


def localizar_dentro(mae, filha):
    """Canto da peça-filha DENTRO da peça-mãe, à escala nativa de ambas.

    A gola e as mangas são FATIAS dos mesmos píxeis da camisa (o designer
    fatia o mesmo render), por isso vale SQDIFF com máscara: no sítio certo
    a diferença é exatamente zero. Correlação normalizada não servia — em
    tecido branco liso quase tudo se parece com quase tudo, e a gola caía
    no meio do peito com 0.99 de confiança.

    A mãe leva uma FOLGA transparente à volta: as mangas do verso são 1 px
    mais largas que a camisa (recortes do designer, não geometria) e sem a
    folga o OpenCV recusa o template maior que a imagem.
    """
    cinza = lambda im: cv2.cvtColor(np.array(im.convert('RGBA')), cv2.COLOR_RGBA2GRAY)
    grande = Image.new('RGBA', (mae.width + 2 * FOLGA, mae.height + 2 * FOLGA))
    grande.alpha_composite(mae, (FOLGA, FOLGA))
    mascara = (np.array(filha.getchannel('A')) > 60).astype(np.uint8) * 255
    r = cv2.matchTemplate(cinza(grande), cinza(filha), cv2.TM_SQDIFF, mask=mascara)
    r = np.nan_to_num(r, nan=np.inf, posinf=np.inf)
    minimo, _, canto, _ = cv2.minMaxLoc(r)
    area = max(1, int((mascara > 0).sum()))
    return (canto[0] - FOLGA, canto[1] - FOLGA), minimo / area


def alinhar_tira(mae, filha):
    """Canto da TIRA do punho dentro da camisa, por GEOMETRIA.

    A tira partilha o QUADRO horizontal da camisa (o recorte do designer
    tem exatamente a mesma largura), mas perdeu o offset vertical ao ser
    cortada ao conteúdo. O SQDIFF não serve aqui: a tira é escura e a
    manga clara, o mínimo caía 2–3 px acima do sítio e o punho da camisa
    espreitava por baixo da tira — a falha que o cliente apanhou no zoom.

    O encaixe certo: alinhar o FUNDO da tira ao fundo da manga, coluna a
    coluna, e ficar com a mediana do aglomerado mais alto — as colunas do
    centro da camisa acabam na bainha, não na manga, e dariam offsets
    absurdos (~250) se entrassem na conta.
    """
    am = np.array(mae.getchannel('A'))
    at = np.array(filha.getchannel('A'))
    x = (mae.width - filha.width) // 2

    def fundos(a):
        out = []
        for c in range(a.shape[1]):
            ys = np.where(a[:, c] > 10)[0]
            out.append(int(ys.max()) if len(ys) else -1)
        return out

    fm, ft = fundos(am), fundos(at)
    offs = [fm[x + c] - ft[c] for c in range(filha.width)
            if ft[c] >= 0 and 0 <= x + c < mae.width and fm[x + c] >= 0]
    base = np.percentile(offs, 10)
    aglomerado = [o for o in offs if abs(o - base) <= 3]
    y = round(float(np.median(aglomerado)))
    return (x, y), len(aglomerado)


def montar(lado):
    """Montagem PURISTA, à imagem do concorrente: nenhuma peça é
    modificada — nem crescida, nem inundada, nem recortada. O designer já
    desenhou o encaixe: o avatar BASE traz os buracos com as bordas suaves
    dele, e as peças (da mesma geração de render) preenchem-nos. O nosso
    trabalho é só POSICIONAR ao píxel.

    O histórico desta decisão (para ninguém repetir o caminho): usar o
    avatar VESTIDO de fundo punha o kit branco dele à vista (silhueta
    duplicada); remover o kit e crescer/inundar as peças fechava os vãos
    mas endurecia as bordas — "recorte serrilhado", nas palavras do
    cliente. O purista aceita ±1 px de folga do encaixe em troca das
    bordas originais do designer, como no concorrente.
    """
    vestido = Image.open(VESTIDO[lado]).convert('RGBA')
    base = Image.open(BASE[lado]).convert('RGBA')
    escala_base = vestido.height / base.height

    esc = ALTURA_AVATAR * M / vestido.height

    def para_tela(im, canto):
        larg = max(1, round(im.width * esc))
        alt = max(1, round(im.height * esc))
        x = round(canto[0] * esc + (W - vestido.width * esc) / 2)
        y = round(canto[1] * esc + TOPO_AVATAR * M)
        tela = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        tela.alpha_composite(im.resize((larg, alt), Image.LANCZOS), (x, y))
        return tela, x, y, larg, alt

    print(f'--- {lado} (vestido {vestido.size}, base×{escala_base:.3f}, '
          f'tela×{esc:.4f}) ---')

    # o fundo é o avatar BASE (pele, cabeça, chuteiras, buracos do
    # designer) — o vestido só serve de referência de escala e para os
    # buracos, porque tem a mesma geometria a 1024 px
    base_grande = base.resize(
        (round(base.width * escala_base), round(base.height * escala_base)),
        Image.LANCZOS)
    corpo = np.array(vestido.getchannel('A')) > 60
    alfa_base = np.zeros(corpo.shape, dtype=np.uint8)
    bg = np.array(base_grande.getchannel('A'))
    alfa_base[:bg.shape[0], :bg.shape[1]] = bg
    buracos = (corpo & (alfa_base < 60)).astype(np.float32)

    tela, *_ = para_tela(base_grande, (0, 0))
    tela.save(f'{SAIDA}/jogador-{lado}.png')

    pecas_nativas = {z: Image.open(n).convert('RGBA')
                     for z, n in PECAS[lado].items()}
    guardadas = {}
    residuo = buracos.copy()
    fim_meiao = None

    # 1) as peças GRANDES encaixam nos buracos, cada uma na sua banda
    for zona in ('camisola', 'calcao', 'meiao'):
        im = pecas_nativas[zona]
        b0, b1 = BANDAS[zona]
        recorte = buracos.copy()
        recorte[: int(recorte.shape[0] * b0)] = 0
        recorte[int(recorte.shape[0] * b1):] = 0
        canto, escolhida, score = localizar_no_buraco(recorte, im, escala_base)
        grande = im.resize((round(im.width * escolhida), round(im.height * escolhida)),
                           Image.LANCZOS)
        tela, x, y, larg, alt = para_tela(realcar(grande), canto)
        tela.save(f'{SAIDA}/vestida-{zona}-{lado}.png')
        guardadas[zona] = (canto, escolhida)
        af = np.array(grande.getchannel('A')) > 60
        y0, x0 = int(canto[1]), int(canto[0])
        rec = residuo[y0:y0 + af.shape[0], x0:x0 + af.shape[1]]
        rec[af[:rec.shape[0], :rec.shape[1]]] = 0
        print(f'  {zona:9s} buraco {score:.3f} escala {escolhida:.2f} → '
              f'caixa x={x}, y={y}, w={larg}, h={alt}')
        if zona == 'meiao':
            fim_meiao = canto[1] + grande.height

    # 2) MANGAS (tiras do punho): geometria — fundo da tira alinhado ao
    # fundo da manga (ver alinhar_tira; SQDIFF fica proibido aqui)
    (canto_cam, esc_cam) = guardadas['camisola']
    im = pecas_nativas['mangas']
    rel, colunas = alinhar_tira(pecas_nativas['camisola'], im)
    canto = (canto_cam[0] + rel[0] * esc_cam, canto_cam[1] + rel[1] * esc_cam)
    grande = im.resize((round(im.width * esc_cam), round(im.height * esc_cam)),
                       Image.LANCZOS)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-mangas-{lado}.png')
    print(f'  mangas    fundo-alinhado ({colunas} colunas, rel y={rel[1]}) → '
          f'caixa x={x}, y={y}, w={larg}, h={alt}')

    # 3) GOLA, por duas vias com preferência clara (fatia exata, senão o
    # resíduo dos buracos no terço de cima)
    im = pecas_nativas['gola']
    rel, dif = localizar_dentro(pecas_nativas['camisola'], im)
    if dif < 300:
        canto = (canto_cam[0] + rel[0] * esc_cam, canto_cam[1] + rel[1] * esc_cam)
        e = esc_cam
        via = f'camisa dif/px {dif:.0f}'
    else:
        recorte = residuo.copy()
        recorte[int(recorte.shape[0] * 0.30):] = 0
        canto, e, score = localizar_no_buraco(recorte, im, escala_base)
        via = f'resíduo {score:.3f} (camisa dif/px {dif:.0f})'
    grande = im.resize((round(im.width * e), round(im.height * e)), Image.LANCZOS)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-gola-{lado}.png')
    print(f'  gola      {via} → caixa x={x}, y={y}, w={larg}, h={alt}')

    # chuteiras: recortadas da BASE abaixo do fim do meião, em camada
    # própria por cima dele (z15 > z10 no viewer)
    botas = np.array(base_grande)
    corte = int(fim_meiao - botas.shape[0] * 0.01)
    botas[:corte, :, 3] = 0
    tela, *_ = para_tela(Image.fromarray(botas), (0, 0))
    tela.save(f'{SAIDA}/botas-{lado}.png')
    print(f'  botas     corte y={corte} → camada própria')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(SAIDA, exist_ok=True)
    for lado in ('frente', 'verso'):
        montar(lado)
