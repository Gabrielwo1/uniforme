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

D = '/Users/syntax/Downloads/uniforme dino correto ultimo feito-2'
# terceiro envio (2026-08-28): a camisa fica INTEIRA (mangas incluídas — a
# estampa passa a cobri-las) e só a TIRA do punho é zona colorível à parte
D2 = '/Users/syntax/Downloads/wetransfer_camiseta-costa-webp-inteira-webp_2026-08-28_1337'
# bermuda da frente refeita (envio avulso de 2026-08-29)
D3 = '/Users/syntax/Downloads'

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
W2 = f'{D}/peças que faltou/PEÇAS WEBP'
PECAS = {
    'frente': {
        'camisola': f'{D2}/camiseta inteira frente webp.webp',
        'calcao': f'{D3}/bermuda frente.webp',
        'meiao': f'{W2}/FRENTE/MEIAO FRENTE.webp',
        'gola': f'{W2}/FRENTE/GOLA FRENTE.webp',
        # a tira do punho é a única parte da manga com cor própria
        'mangas': f'{D2}/TIRAS MANGAS FRENTE.webp',
    },
    'verso': {
        'camisola': f'{D2}/camiseta costa webp inteira.webp',
        'calcao': f'{W2}/COSTAS/BERMUDA COSTAS.webp',
        'meiao': f'{W2}/COSTAS/MEIAO COSTAS.webp',
        'gola': f'{W2}/COSTAS/GOLA COSTAS.webp',
        'mangas': f'{D2}/TIRAS MANGAS COSTA.webp',
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
    # a fronteira pele↔fundo é uma penugem com alfa 1..90 — e entre a
    # bainha e o joelho há até linhas de alfa ZERO (vazio do próprio
    # render). A máscara da sangria é o corpo dilatado 3 px: cobre a
    # penugem e esses vazios interiores, e continua a cortar o rebordo
    # na silhueta exterior (o fundo da página fica a >3 px do corpo).
    corpo_folgado = cv2.dilate(
        (np.array(vestido.getchannel('A')) > 0).astype(np.uint8),
        np.ones((13, 13), np.uint8)).astype(bool)
    alfa_base = np.zeros(corpo.shape, dtype=np.uint8)
    bg = np.array(base_grande.getchannel('A'))
    alfa_base[:bg.shape[0], :bg.shape[1]] = bg
    buracos = (corpo & (alfa_base < 60)).astype(np.float32)
    # A PELE (e tudo o que na base é opaco: mãos, chuteiras, cabeça) fica
    # SEMPRE à frente das peças — é a regra de encaixe da referência: o
    # polegar pende por cima do calção. Erodida 1 px para a peça ainda
    # entrar um fio por baixo da pele e não abrir vão.
    pele = cv2.erode((alfa_base > 200).astype(np.uint8),
                     np.ones((3, 3), np.uint8)).astype(bool)

    caixa_meiao = None
    pecas_nativas = {z: Image.open(n).convert('RGBA')
                     for z, n in PECAS[lado].items()}
    guardadas = {}
    residuo = buracos.copy()
    # cobertura das peças colocadas, no espaço do vestido — é a âncora da
    # limpeza do fundo (os remates brancos abraçam o contorno das peças)
    uniao = np.zeros(corpo.shape, dtype=bool)

    def sangrar(grande, canto, forca=11):
        """Estica a peça ~2 px para fora, só onde o novo rebordo cai SOBRE
        O CORPO do avatar.

        O encaixe tem desvio residual e ficava um VÃO de 1–4 px entre a
        peça e a pele (bainha, punho, cano da meia) — em fundo claro, o
        vão lê-se como linha branca. Limpar o fundo não resolve um vão;
        fechar a peça sobre ele resolve. Para o lado de FORA da silhueta
        o rebordo é cortado, senão a peça ganhava um halo contra o fundo
        da página.
        """
        # margem transparente ANTES de esticar: o conteúdo da peça toca a
        # borda do próprio recorte (a bainha É a última linha do ficheiro)
        # e o MaxFilter não cresce para fora da tela da imagem — sem a
        # margem, a sangria no rebordo de baixo não acontecia de todo
        pad = 8
        com_margem = Image.new('RGBA', (grande.width + 2 * pad, grande.height + 2 * pad))
        com_margem.alpha_composite(grande, (pad, pad))
        canto = (canto[0] - pad, canto[1] - pad)
        grande = com_margem
        est = grande.filter(ImageFilter.MaxFilter(forca))
        est_a = np.array(est)
        orig = np.array(grande)
        rebordo = (est_a[..., 3] > 0) & (orig[..., 3] == 0)
        # recorte do corpo alinhado à posição da peça
        y0, x0 = int(canto[1]), int(canto[0])
        dentro = np.zeros(rebordo.shape, dtype=bool)
        cy0, cx0 = max(0, y0), max(0, x0)
        cy1 = min(corpo.shape[0], y0 + rebordo.shape[0])
        cx1 = min(corpo.shape[1], x0 + rebordo.shape[1])
        if cy1 > cy0 and cx1 > cx0:
            dentro[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] = corpo_folgado[cy0:cy1, cx0:cx1]
        est_a[rebordo & ~dentro, 3] = 0
        fora = Image.fromarray(est_a)
        fora.alpha_composite(grande)   # o interior fica intacto
        return fora, canto

    def tirar_pele(grande, canto):
        """Zera o alfa da peça onde a base diz que há pele/mão/chuteira.

        É o que devolve o entalhe do polegar que a sangria encolhia: a
        sangria fecha vãos, e esta subtração garante que nunca fecha POR
        CIMA do corpo — as duas juntas dão o encaixe da referência.
        """
        arr = np.array(grande)
        y0, x0 = int(canto[1]), int(canto[0])
        cy0, cx0 = max(0, y0), max(0, x0)
        cy1 = min(pele.shape[0], y0 + arr.shape[0])
        cx1 = min(pele.shape[1], x0 + arr.shape[1])
        if cy1 > cy0 and cx1 > cx0:
            rec = pele[cy0:cy1, cx0:cx1]
            arr[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0][rec, 3] = 0
        return Image.fromarray(arr)

    def cobrir(grande, canto):
        af = np.array(grande.getchannel('A')) > 60
        y0, x0 = max(0, int(canto[1])), max(0, int(canto[0]))
        rec = uniao[y0:y0 + af.shape[0], x0:x0 + af.shape[1]]
        rec |= af[:rec.shape[0], :rec.shape[1]]

    # 1) as peças GRANDES encaixam nos buracos, cada uma na sua banda
    for zona in ('camisola', 'calcao', 'meiao'):
        im = pecas_nativas[zona]
        b0, b1 = BANDAS[zona]
        recorte = buracos.copy()
        recorte[: int(recorte.shape[0] * b0)] = 0
        recorte[int(recorte.shape[0] * b1):] = 0
        canto, escolhida, score = localizar_no_buraco(recorte, im, escala_base)
        grande, canto = sangrar(
            im.resize((round(im.width * escolhida), round(im.height * escolhida)),
                      Image.LANCZOS), canto)
        grande = tirar_pele(grande, canto)
        tela, x, y, larg, alt = para_tela(realcar(grande), canto)
        tela.save(f'{SAIDA}/vestida-{zona}-{lado}.png')
        guardadas[zona] = (canto, escolhida)
        cobrir(grande, canto)
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
    # sangria curta: a tira é estreita e a versão forte espetava um nariz
    # preto para fora da manga
    grande, canto = sangrar(
        im.resize((round(im.width * esc_cam), round(im.height * esc_cam)),
                  Image.LANCZOS), canto, forca=5)
    grande = tirar_pele(grande, canto)
    cobrir(grande, canto)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-mangas-{lado}.png')
    print(f'  mangas    camisa dif/px {dif:.1f} rel {rel} → '
          f'caixa x={x}, y={y}, w={larg}, h={alt}')

    # 3) GOLA, por duas vias com preferência clara:
    #    · fatia-da-camisa (SQDIFF): exata quando a gola é recorte da
    #      camiseta — é o caso do VERSO (dif/px ~80);
    #    · resíduo dos buracos: quando a gola traz píxeis que a camiseta
    #      não tem (a da FRENTE inclui a sombra do pescoço, dif/px ~750).
    #    O limiar de 300 separa os dois regimes com margem para os lados.
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
    grande, canto = sangrar(
        im.resize((round(im.width * e), round(im.height * e)),
                  Image.LANCZOS), canto, forca=5)
    grande = tirar_pele(grande, canto)
    cobrir(grande, canto)
    tela, x, y, larg, alt = para_tela(realcar(grande), canto)
    tela.save(f'{SAIDA}/vestida-gola-{lado}.png')
    print(f'  gola      {via} → caixa x={x}, y={y}, w={larg}, h={alt}')

    # FUNDO: o avatar vestido SEM o kit branco. Duas limpezas:
    #  · onde a base diz que há tecido (buracos, dilatados 2 px);
    #  · numa BANDA de ~10 px à volta do contorno das peças colocadas, tudo
    #    o que for claro e sem saturação (mistura com o branco do render:
    #    remates enrolados de bainha, punho e cano da meia) ou tiver alfa
    #    baixo (penugem do recorte). A banda é ancorada às PEÇAS e não aos
    #    buracos porque os remates ficam FORA dos buracos — foi por isso
    #    que a primeira tentativa não lhes tocou. A pele sobrevive por ser
    #    saturada; os dentes e o rosto ficam a dezenas de px da banda.
    kit = cv2.dilate(buracos.astype(np.uint8),
                     np.ones((5, 5), np.uint8)).astype(bool)
    sem_kit = np.array(vestido)
    sem_kit[kit, 3] = 0

    banda = cv2.dilate(uniao.astype(np.uint8),
                       np.ones((21, 21), np.uint8)).astype(bool)
    rgb = sem_kit[..., :3].astype(np.int16)
    claro = rgb.min(axis=-1) > 150
    sem_cor = (rgb.max(axis=-1) - rgb.min(axis=-1)) < 50
    penugem = sem_kit[..., 3] < 90
    rasto = banda & (penugem | (claro & sem_cor)) & (sem_kit[..., 3] > 0)
    # a ORLA da silhueta também: os degraus da pele têm salpicos de mistura
    # clara que se leem como pontos brancos contra tecido escuro. Os dentes
    # e os olhos ficam no interior do rosto, longe da orla de 3 px.
    orla = cv2.dilate((sem_kit[..., 3] < 10).astype(np.uint8),
                      np.ones((7, 7), np.uint8)).astype(bool)
    rasto |= orla & claro & sem_cor & (sem_kit[..., 3] > 0)
    sem_kit[rasto, 3] = 0
    print(f'  rasto branco removido: {int(rasto.sum())} px')
    tela, *_ = para_tela(Image.fromarray(sem_kit), (0, 0))
    tela.save(f'{SAIDA}/jogador-{lado}.png')

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
