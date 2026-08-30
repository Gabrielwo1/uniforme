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
    """Canto e escala da peça, pelo encaixe do seu alfa nos buracos.

    `escala_base` é a razão vestido/base (as peças vêm à escala do avatar
    base); a procura varre uma vizinhança dela porque o designer nem sempre
    exporta tudo do mesmo documento.
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

    # grosso (passo 0,01) e depois FINO (0,002) à volta do melhor: o passo
    # grosso deixava até 0,5% de desvio, que ao tamanho da peça são 2–4 px
    # de folga nas bordas
    melhor = tenta(np.arange(escala_base * 0.9, escala_base * 1.12, 0.01),
                   (None, escala_base, -1.0))
    e0 = melhor[1]
    return tenta(np.arange(e0 - 0.008, e0 + 0.009, 0.002), melhor)


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


def aproximar(im, kx=9, ky=9):
    """Cresce a peça para ela CHEGAR à pele — kx/ky são o núcleo da
    dilatação (9 ≈ 4 px para cada lado). O crescimento pode ser DIRECIONAL:
    o calção precisa de mais alcance para baixo, onde a bainha do avatar
    vestido (render mais antigo) espreita por trás da bermuda corrigida.

    A margem transparente é do tamanho do alcance: o conteúdo toca a borda
    do próprio recorte e sem ela não há para onde crescer. Só é seguro
    porque a PELE é subtraída a seguir (tirar_pele) — sem isso, o
    crescimento comia o entalhe do polegar no verso.
    """
    margem = max(kx, ky) // 2 + 1
    com_margem = Image.new('RGBA', (im.width + 2 * margem, im.height + 2 * margem))
    com_margem.alpha_composite(im, (margem, margem))
    arr = np.array(com_margem)
    nucleo = np.ones((ky, kx), np.uint8)
    crescida = np.dstack([cv2.dilate(arr[..., c], nucleo) for c in range(4)])
    fora = Image.fromarray(crescida)
    fora.alpha_composite(com_margem)      # o interior fica intacto
    return fora, margem


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
    # corpo com 3 px de folga: baliza do crescimento das peças (não saem da
    # silhueta) e do prolongamento da pele nos micro-vãos
    corpo_folgado = cv2.dilate(
        (np.array(vestido.getchannel('A')) > 0).astype(np.uint8),
        np.ones((7, 7), np.uint8)).astype(bool)
    alfa_base = np.zeros(corpo.shape, dtype=np.uint8)
    bg = np.array(base_grande.getchannel('A'))
    alfa_base[:bg.shape[0], :bg.shape[1]] = bg
    buracos = (corpo & (alfa_base < 60)).astype(np.float32)
    # a PELE (e tudo o que na base é opaco: mãos, cabeça, chuteiras) fica à
    # frente das peças — regra da referência do designer. Erodida 1 px para
    # a peça entrar um fio por baixo e o encontro não abrir linha.
    #
    # Ressalva dos DOIS RENDERS: a base (nova) e o vestido (antigo) não
    # concordam ao píxel — na bainha direita a base diz "pele" onde o
    # vestido mostra claramente TECIDO BRANCO. Onde o vestido mostra
    # branco sem saturação não é pele, e a peça pode cobrir: sem isto o
    # crescimento era cortado ali e a bainha branca antiga ficava à vista.
    v_rgb = np.array(vestido)[..., :3].astype(np.int16)
    branco_vest = (v_rgb.min(axis=-1) > 150) & \
                  ((v_rgb.max(axis=-1) - v_rgb.min(axis=-1)) < 50)
    pele = cv2.erode((alfa_base > 200).astype(np.uint8),
                     np.ones((3, 3), np.uint8)).astype(bool) & ~branco_vest

    def tirar_pele(grande, canto):
        """Corta da peça o que cai sobre PELE (fica à frente) e o que o
        crescimento empurrou para FORA da silhueta (halo)."""
        arr = np.array(grande)
        dentro = np.zeros(arr.shape[:2], dtype=bool)
        y0, x0 = int(canto[1]), int(canto[0])
        cy0, cx0 = max(0, y0), max(0, x0)
        cy1 = min(pele.shape[0], y0 + arr.shape[0])
        cx1 = min(pele.shape[1], x0 + arr.shape[1])
        if cy1 > cy0 and cx1 > cx0:
            rec = pele[cy0:cy1, cx0:cx1]
            arr[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0][rec, 3] = 0
            dentro[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] = \
                corpo_folgado[cy0:cy1, cx0:cx1]
        arr[~dentro, 3] = 0
        return Image.fromarray(arr)

    # cobertura das peças colocadas — decide que parte do kit branco do
    # vestido pode ficar à vista (só a faixa junto ao contorno delas)
    uniao = np.zeros(corpo.shape, dtype=bool)
    colocadas = []

    def cobrir(grande, canto):
        af = np.array(grande.getchannel('A')) > 60
        y0, x0 = max(0, int(canto[1])), max(0, int(canto[0]))
        rec = uniao[y0:y0 + af.shape[0], x0:x0 + af.shape[1]]
        rec |= af[:rec.shape[0], :rec.shape[1]]

    caixa_meiao = None
    pecas_nativas = {z: Image.open(n).convert('RGBA')
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
        grande, margem = aproximar(
            im.resize((round(im.width * escolhida), round(im.height * escolhida)),
                      Image.LANCZOS),
            ky=21 if zona == 'calcao' else 9)
        canto0 = canto                      # posição do CONTEÚDO, sem a margem
        canto = (canto[0] - margem, canto[1] - margem)
        grande = tirar_pele(grande, canto)
        cobrir(grande, canto)
        colocadas.append((zona, grande, canto))
        x, y = round(canto[0] * esc + (W - vestido.width * esc) / 2), \
               round(canto[1] * esc + TOPO_AVATAR * M)
        larg, alt = round(grande.width * esc), round(grande.height * esc)
        guardadas[zona] = (canto0, escolhida)
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
    grande, margem = aproximar(
        im.resize((round(im.width * esc_cam), round(im.height * esc_cam)),
                  Image.LANCZOS))
    canto = (canto[0] - margem, canto[1] - margem)
    grande = tirar_pele(grande, canto)
    cobrir(grande, canto)
    colocadas.append(('mangas', grande, canto))
    print(f'  mangas    camisa dif/px {dif:.1f} rel {rel}')

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
    grande, margem = aproximar(
        im.resize((round(im.width * e), round(im.height * e)),
                  Image.LANCZOS))
    canto = (canto[0] - margem, canto[1] - margem)
    grande = tirar_pele(grande, canto)
    cobrir(grande, canto)
    colocadas.append(('gola', grande, canto))
    print(f'  gola      {via}')

    # A ideia ORIGINAL, com a técnica que faltava: o fundo fica SEM kit
    # nenhum (só pele, cabeça e chuteiras do vestido, à resolução máxima)
    # e cada píxel que era tecido é preenchido pela peça mais próxima, por
    # INUNDAÇÃO — a peça cresce iterativamente só para dentro da região do
    # kit, herdando as cores da própria borda. Não há linha branca (o kit
    # branco desaparece todo do fundo) nem espaço fantasma (todo o kit é
    # coberto por peça). Salvaguardas:
    #   · ~pele: mãos, braços e joelhos nunca são removidos nem pintados —
    #     os brilhos claros da pele ficavam na definição de "branco";
    #   · vizinhança dos buracos (31 px): o resto do corpo nem é olhado;
    #   · abaixo do topo da gola: dentes e rosto fora do alcance.
    kit = (cv2.dilate(buracos.astype(np.uint8), np.ones((5, 5), np.uint8))
               .astype(bool) | (branco_vest & corpo))
    kit &= cv2.dilate(buracos.astype(np.uint8),
                      np.ones((31, 31), np.uint8)).astype(bool)
    kit &= ~pele
    ys_buraco = np.nonzero(buracos.any(axis=1))[0]
    topo_kit = max(0, int(ys_buraco.min()) - 4) if len(ys_buraco) else 0
    kit[:topo_kit] = False
    kit_visivel = kit & ~uniao

    nucleo3 = np.ones((3, 3), np.uint8)

    def inundar(grande, canto):
        arr = np.array(grande)
        alvo = np.zeros(arr.shape[:2], dtype=bool)
        y0, x0 = int(canto[1]), int(canto[0])
        cy0, cx0 = max(0, y0), max(0, x0)
        cy1 = min(kit_visivel.shape[0], y0 + arr.shape[0])
        cx1 = min(kit_visivel.shape[1], x0 + arr.shape[1])
        if cy1 > cy0 and cx1 > cx0:
            alvo[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0] = kit_visivel[cy0:cy1, cx0:cx1]
        tem = arr[..., 3] > 60
        for _ in range(22):
            crescer = cv2.dilate(tem.astype(np.uint8), nucleo3).astype(bool) & alvo & ~tem
            if not crescer.any():
                break
            vizinho = np.dstack([cv2.dilate(arr[..., c], nucleo3) for c in range(4)])
            arr[crescer] = vizinho[crescer]
            arr[crescer, 3] = 255
            tem |= crescer
        return Image.fromarray(arr)

    for zona, grande, canto in colocadas:
        pronta = tirar_pele(inundar(grande, canto), canto)
        tela, x, y, larg, alt = para_tela(realcar(pronta), canto)
        tela.save(f'{SAIDA}/vestida-{zona}-{lado}.png')
        print(f'  {zona:9s} gravada → caixa x={x}, y={y}, w={larg}, h={alt}')

    # FUNDO: o vestido SEM O KIT TODO — não só o que estava à vista. As
    # peças inundadas cobrem a região; o que escapar mostra o fundo da
    # página, nunca tecido branco.
    sem = np.array(vestido)
    sem[kit, 3] = 0
    tela, *_ = para_tela(Image.fromarray(sem), (0, 0))
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
