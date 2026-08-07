"""
Gera o guia de exportação em PDF para o designer do cliente.

Duas páginas, uma por ferramenta (Illustrator e Photoshop), com os passos
numerados e as opções críticas de exportação em destaque — é onde os erros
acontecem e onde o texto corrido não chega.
"""
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, PageBreak,
)

VERMELHO = colors.HexColor('#B62126')
ESCURO = colors.HexColor('#1a1a1a')
CINZA = colors.HexColor('#6b6b6b')
CINZA_CLARO = colors.HexColor('#f2f2f2')
AMARELO = colors.HexColor('#fff8e1')

SAIDA = '/Users/syntax/esportes/docs/KYPZL-guia-exportacao.pdf'

st_titulo = ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=19,
                           textColor=ESCURO, leading=22, spaceAfter=2)
st_sub = ParagraphStyle('s', fontName='Helvetica', fontSize=10,
                        textColor=CINZA, leading=13, spaceAfter=10)
st_seccao = ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=13,
                           textColor=VERMELHO, leading=15, spaceBefore=8,
                           spaceAfter=5)
st_passo_n = ParagraphStyle('pn', fontName='Helvetica-Bold', fontSize=10.5,
                            textColor=ESCURO, leading=14)
st_corpo = ParagraphStyle('c', fontName='Helvetica', fontSize=9.5,
                          textColor=ESCURO, leading=13.5, alignment=TA_LEFT)
st_nota = ParagraphStyle('n', fontName='Helvetica-Oblique', fontSize=8.8,
                         textColor=CINZA, leading=12)
st_cab = ParagraphStyle('cab', fontName='Helvetica-Bold', fontSize=8.5,
                        textColor=colors.white, leading=11)
st_cel = ParagraphStyle('cel', fontName='Helvetica', fontSize=8.8,
                        textColor=ESCURO, leading=11.5)
st_cel_b = ParagraphStyle('celb', fontName='Helvetica-Bold', fontSize=8.8,
                          textColor=ESCURO, leading=11.5)


def passo(numero, titulo, linhas):
    """Um passo numerado: bolinha vermelha + título + descrição."""
    corpo = [Paragraph(f'<b>{titulo}</b>', st_passo_n)]
    for linha in linhas:
        corpo.append(Spacer(1, 2))
        corpo.append(Paragraph(linha, st_corpo))
    t = Table([[Paragraph(f'<font color="white"><b>{numero}</b></font>', st_passo_n), corpo]],
              colWidths=[9 * mm, 158 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), VERMELHO),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (0, 0), 3),
        ('LEFTPADDING', (1, 0), (1, 0), 7),
        ('TOPPADDING', (1, 0), (1, 0), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return KeepTogether([t, Spacer(1, 2)])


def caixa(titulo, texto, cor=AMARELO, borda=colors.HexColor('#e8c766')):
    t = Table([[Paragraph(f'<b>{titulo}</b><br/>{texto}', st_corpo)]], colWidths=[167 * mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), cor),
        ('BOX', (0, 0), (-1, -1), 0.8, borda),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return KeepTogether([t, Spacer(1, 7)])


def tabela(cabecalhos, linhas, larguras):
    dados = [[Paragraph(c, st_cab) for c in cabecalhos]]
    for linha in linhas:
        dados.append([Paragraph(linha[0], st_cel_b)] +
                     [Paragraph(c, st_cel) for c in linha[1:]])
    t = Table(dados, colWidths=larguras)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ESCURO),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, CINZA_CLARO]),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#d5d5d5')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return KeepTogether([t, Spacer(1, 7)])


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(VERMELHO)
    canvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, fill=1, stroke=0)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(CINZA)
    canvas.drawString(21 * mm, 12 * mm, 'KYPZL · Guia de exportação para o simulador')
    canvas.drawRightString(A4[0] - 21 * mm, 12 * mm, f'Página {doc.page}')
    canvas.restoreState()


hist = []

# ─────────────────────────────────────────── capa + Illustrator
hist.append(Paragraph('Guia de exportação', st_titulo))
hist.append(Paragraph(
    'O que o simulador KYPZL precisa receber, e como exportar sem quebrar o alinhamento.',
    st_sub))

hist.append(caixa(
    'Comece por um conjunto de teste',
    'Antes de exportar as 10 estampas, envie <b>a camisola</b> (os dois PNG, frente e verso) e '
    '<b>1 estampa</b> completa. Validamos o encaixe e, se algo precisar de mudar, muda numa peça '
    'em vez de dez.'))

hist.append(caixa(
    'A regra que não pode falhar',
    'O PNG da peça (Photoshop) e o SVG da estampa (Illustrator) têm de estar no <b>mesmo '
    'enquadramento</b>: <b>2000 × 2000 px</b>, peça centrada, mesma escala e posição. É assim '
    'que o sistema sabe onde a estampa assenta sobre a peça.',
    cor=colors.HexColor('#fdecec'), borda=colors.HexColor('#e8a0a0')))

hist.append(Paragraph('Photoshop — o modelo da peça', st_seccao))
hist.append(passo(1, 'Abrir o mockup da peça', [
    'Use o PSD que já existe — por exemplo <font face="Courier">KYPZL Jersey.psd</font> '
    'para a camisola, os <font face="Courier">.tif</font> para calção e meião.']))
hist.append(passo(2, 'Desligar a cor, manter a luz', [
    'Desligue todas as camadas de <b>cor</b> e de <b>estampa</b>. Ficam visíveis apenas as '
    'camadas de <b>sombra, luz e dobras</b> do tecido.',
    '<font color="#6b6b6b">Imagem › Ajustes › Preto e branco</font> para tirar qualquer tom '
    'de cor que reste.',
    'Quanto mais neutra (cinzenta) ficar, melhor: esta imagem é multiplicada sobre a cor que o '
    'cliente escolher. Se ficar azulada, <b>todas</b> as camisolas saem azuladas.']))
hist.append(passo(3, 'Exportar recortado, com transparência', [
    'O <b>fundo tem de ficar transparente</b>. É do recorte da peça que extraímos '
    'automaticamente o contorno que recebe a cor base — não precisa de desenhar nada.',
    'Ficheiro › Exportar › <b>Exportar como…</b> › <b>PNG</b> com <b>Transparência ligada</b>.',
    'Tamanho <b>2000 × 2000 px</b>, peça centrada. Frente e verso no <b>mesmo enquadramento</b>: '
    'a peça não pode mudar de posição nem de tamanho entre os dois.',
    'Nomes: <font face="Courier">camisola-frente.png</font> e '
    '<font face="Courier">camisola-verso.png</font>']))

hist.append(PageBreak())
hist.append(Paragraph('Illustrator — as estampas', st_titulo))
hist.append(Paragraph(
    'A arte que dá a cor à peça. Cada cor numa camada, para o cliente poder trocá-las uma a uma.',
    st_sub))
hist.append(passo(4, 'Uma camada por cor', [
    'No painel <i>Camadas</i>, cada cor da estampa numa camada de topo separada. '
    'O <b>nome da camada é o que o cliente vê</b> no painel de cores do simulador.',
    'Use nomes claros e sem acentos nem espaços: <font face="Courier">LISTRAS</font>, '
    '<font face="Courier">OMBROS</font>, <font face="Courier">FAIXA-PEITO</font>.',
    'Não misture duas cores na mesma camada. A cor com que está desenhado é indiferente — '
    'o sistema substitui — pode deixar tudo preto.']))
hist.append(passo(5, 'Limpar o ficheiro', [
    'Traços › <font color="#6b6b6b">Objeto › Expandir</font>. '
    'Texto › <font color="#6b6b6b">Texto › Criar contornos</font>.',
    'Sem efeitos raster (sombras, desfoques, transparências do Illustrator) — refaça em vetor.',
    'A arte tem de estar <b>já na forma da peça</b> (como se vê a camisola de frente) e não '
    'plana para deformar no Photoshop. O que sair fora do contorno é recortado.']))
hist.append(passo(6, 'Exportar com estas opções', [
    'Ficheiro › Exportar › <b>Exportar como…</b> › <b>SVG</b> › ligar <b>«Usar pranchetas»</b>.',
    '<b>Não precisa de separar as camadas à mão:</b> um único SVG por peça e lado, com as '
    'camadas nomeadas, é suficiente — a separação das cores é feita do nosso lado por código.']))

hist.append(tabela(
    ['Opção nas definições de SVG', 'Valor', ''],
    [['Estilo', 'Atributos de apresentação', ''],
     ['IDs de objeto', 'Nomes de camada', '← sem isto não conseguimos separar as cores'],
     ['Fontes', 'Converter em contornos', ''],
     ['Imagens', 'Incorporar', ''],
     ['Minificar', 'desligado', '']],
    [58 * mm, 48 * mm, 61 * mm]))

hist.append(PageBreak())

# ─────────────────────────────────────────── Photoshop
hist.append(Paragraph('O que enviar', st_titulo))
hist.append(Paragraph(
    'Do Photoshop sai o modelo da peça; do Illustrator saem as estampas.', st_sub))

hist.append(tabela(
    ['Ficheiro', 'Quantos', 'Onde se faz'],
    [['Peça .png', '2 por peça — recortada, dessaturada, fundo transparente', 'Photoshop'],
     ['Detalhes .svg <font color="#6b6b6b">(opcional)</font>',
      'costuras ou vivos que não mudam de cor com a estampa', 'Illustrator'],
     ['Estampa .svg', '1 por peça e lado, camadas nomeadas por cor', 'Illustrator']],
    [46 * mm, 78 * mm, 43 * mm]))

hist.append(Paragraph('Organização da entrega', st_seccao))
est = Table([[Paragraph(
    '<font face="Courier" size="8.5">'
    'SIMULADOR/<br/>'
    '&nbsp;&nbsp;moldes/<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;camisola-frente.png&nbsp;&nbsp;/&nbsp;&nbsp;camisola-verso.png<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;calcao-frente.png&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;calcao-verso.png<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;meiao-frente.png&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;meiao-verso.png<br/>'
    '&nbsp;&nbsp;estampas/<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;001-nome-da-estampa/<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;camisola-frente.svg<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;camisola-verso.svg<br/>'
    '&nbsp;&nbsp;&nbsp;&nbsp;002-outra-estampa/'
    '</font>', st_corpo)]], colWidths=[167 * mm])
est.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), CINZA_CLARO),
    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#d5d5d5')),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
]))
hist.append(est)
hist.append(Spacer(1, 4))
hist.append(Paragraph(
    'O número da pasta (001, 002…) é o código do modelo mostrado ao cliente. Se já há numeração interna, use essa.', st_nota))

hist.append(Paragraph('Erros que quebram o encaixe', st_seccao))
for e in ['Enquadramento diferente entre o PNG da peça e o SVG da estampa',
          'Peça movida ou redimensionada entre a frente e o verso',
          'Duas cores na mesma camada',
          'PNG exportado sem transparência — sem recorte não há contorno',
          'Exportar sem «IDs de objeto: Nomes de camada» — perdem-se as cores']:
    hist.append(Paragraph(f'<font color="#B62126">✕</font>&nbsp;&nbsp;{e}', st_corpo))
    hist.append(Spacer(1, 1))

doc = BaseDocTemplate(SAIDA, pagesize=A4,
                      leftMargin=21 * mm, rightMargin=21 * mm,
                      topMargin=18 * mm, bottomMargin=18 * mm,
                      title='KYPZL — Guia de exportação para o simulador',
                      author='KYPZL')
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='n')
doc.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=rodape)])
doc.build(hist)
print('gerado:', SAIDA)
