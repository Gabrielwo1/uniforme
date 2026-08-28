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
from PIL import Image

M = 4
W, H = 380 * M, 615 * M            # tela comum nova (wrapper 380×615)
SAIDA = 'public/moldes/jog'

ALTURA_AVATAR = 596                # altura do avatar na tela (wrapper px)
TOPO_AVATAR = 6

D = '/Users/syntax/Downloads/uniforme dino correto ultimo feito-2'

# O CorelDRAW trocou as pastas: o SVG da FRENTE aponta para a pasta COSTA
# e vice-versa. A verdade é a IMAGEM, confirmada à vista.
VESTIDO = {
    'frente': f'{D}/COSTA SVG AVATAR_Images/COSTA SVG AVATAR_ImgID1.png',
    'verso': f'{D}/FRENTE SVG AVATAR_Images/FRENTE SVG AVATAR_ImgID1.png',
}
BASE = {
    'frente': f'{D}/peças que faltou/PEÇAS WEBP/FRENTE/AVATAR WEBP.webp',
    'verso': f'{D}/peças que faltou/PEÇAS WEBP/COSTAS/AVATAR COSTA WEBP.webp',
}
PECAS = {
    'frente': {
        'camisola': 'FRENTE/FRENTE CAMISETA',
        'calcao': 'FRENTE/BERMUDA FRENTE',
        'meiao': 'FRENTE/MEIAO FRENTE',
        'gola': 'FRENTE/GOLA FRENTE',
        'mangas': 'FRENTE/MANGAS FRENTE',
    },
    'verso': {
        'camisola': 'COSTAS/CAMISETA COSTAS',
        'calcao': 'COSTAS/BERMUDA COSTAS',
        'meiao': 'COSTAS/MEIAO COSTAS',
        'gola': 'COSTAS/GOLA COSTAS',
        'mangas': 'COSTAS/COSTAS MANGAS',
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
    """Canto e escala da peça, pelo encaixe do seu alfa nos buracos.

    `escala_base` é a razão vestido/base (as peças vêm à escala do avatar
    base); a procura varre uma vizinhança dela porque o designer nem sempre
    exporta tudo do mesmo documento.
    """
    alvo = buracos.astype(np.float32)
    melhor = (None, escala_base, -1.0)
    for esc in np.arange(escala_base * 0.9, escala_base * 1.12, 0.01):
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


def montar(lado):
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

    # buracos = transparente DENTRO do corpo do vestido (fora, transparente
    # é só fundo). A base sobe para a escala do vestido primeiro.
    base_grande = base.resize(
        (round(base.width * escala_base), round(base.height * escala_base)),
        Image.LANCZOS)
    corpo = np.array(vestido.getchannel('A')) > 60
    alfa_base = np.zeros(corpo.shape, dtype=np.uint8)
    bg = np.array(base_grande.getchannel('A'))
    alfa_base[:bg.shape[0], :bg.shape[1]] = bg
    buracos = (corpo & (alfa_base < 60)).astype(np.float32)

    # Fundo: o avatar vestido SEM o kit. O kit dele é branco e a escala do
    # encaixe das peças tem desvio residual (~0,5%), por isso a borda branca
    # espreitava 1–3 px à volta de camisa, calção e meião. Onde a base diz
    # que há tecido (buracos), o fundo fica transparente — dilatado 2 px
    # para levar também o rebordo anti-serrilhado branco. Um desencaixe
    # passa a mostrar o FUNDO DA PÁGINA, que nunca grita como o branco.
    kit = cv2.dilate(buracos.astype(np.uint8),
                     np.ones((5, 5), np.uint8)).astype(bool)
    sem_kit = np.array(vestido)
    sem_kit[kit, 3] = 0
    tela, *_ = para_tela(Image.fromarray(sem_kit), (0, 0))
    tela.save(f'{SAIDA}/jogador-{lado}.png')

    caixa_meiao = None
    pecas_nativas = {z: Image.open(f'{D}/peças que faltou/PEÇAS WEBP/{n}.webp').convert('RGBA')
                     for z, n in PECAS[lado].items()}
    guardadas = {}
    residuo = buracos.copy()

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
        # o que esta peça cobre sai do resíduo — é nele que a gola se acha
        af = np.array(grande.getchannel('A')) > 60
        y0, x0 = int(canto[1]), int(canto[0])
        rec = residuo[y0:y0 + af.shape[0], x0:x0 + af.shape[1]]
        rec[af[:rec.shape[0], :rec.shape[1]]] = 0
        print(f'  {zona:9s} buraco {score:.3f} escala {escolhida:.2f} → '
              f'caixa x={x}, y={y}, w={larg}, h={alt}')
        if zona == 'meiao':
            caixa_meiao = (canto[1] + grande.height, grande)

    # 2) MANGAS: fatia da própria camisa (SQDIFF exato dá o desvio
    # relativo — os dois lados confirmaram-se um ao outro nos testes)
    (canto_cam, esc_cam) = guardadas['camisola']
    im = pecas_nativas['mangas']
    rel, dif = localizar_dentro(pecas_nativas['camisola'], im)
    canto = (canto_cam[0] + rel[0] * esc_cam, canto_cam[1] + rel[1] * esc_cam)
    grande = im.resize((round(im.width * esc_cam), round(im.height * esc_cam)),
                       Image.LANCZOS)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-mangas-{lado}.png')
    print(f'  mangas    camisa dif/px {dif:.1f} rel {rel} → '
          f'caixa x={x}, y={y}, w={larg}, h={alt}')

    # 3) GOLA: depois de colocada a camisa, o único buraco que resta no
    # terço de cima É a gola — o resíduo aponta-a sem ambiguidade
    im = pecas_nativas['gola']
    recorte = residuo.copy()
    recorte[int(recorte.shape[0] * 0.30):] = 0
    canto, e, score = localizar_no_buraco(recorte, im, escala_base)
    grande = im.resize((round(im.width * e), round(im.height * e)), Image.LANCZOS)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-gola-{lado}.png')
    print(f'  gola      resíduo {score:.3f} escala {e:.2f} → '
          f'caixa x={x}, y={y}, w={larg}, h={alt}')

    # chuteiras: os píxeis opacos da BASE abaixo do fim do buraco do meião.
    # Ficam numa camada PRÓPRIA, por cima do meião (z15 > z10 no viewer):
    # é o que impede o meião recolorido de pintar por cima do couro.
    fim_meiao = caixa_meiao[0]
    botas = np.array(base_grande)
    corte = int(fim_meiao - botas.shape[0] * 0.01)
    botas[:corte, :, 3] = 0
    tela, x, y, larg, alt = para_tela(Image.fromarray(botas), (0, 0))
    tela.save(f'{SAIDA}/botas-{lado}.png')
    print(f'  botas     corte y={corte} → camada própria')


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    os.makedirs(SAIDA, exist_ok=True)
    for lado in ('frente', 'verso'):
        montar(lado)
