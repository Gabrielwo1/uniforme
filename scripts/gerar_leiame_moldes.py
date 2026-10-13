#!/usr/bin/env python3
"""LEIA-ME em PDF da pasta de moldes (scripts/gerar_moldes_cliente.py).
Uso: python3 scripts/gerar_leiame_moldes.py <pasta_entrega>   (espera <pasta>/moldes/*.png)"""
import sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

VERMELHO = colors.HexColor('#B62126'); ESCURO = colors.HexColor('#1a1a1a'); CINZA = colors.HexColor('#6b6b6b')
pasta = sys.argv[1]
H1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, leading=23, textColor=ESCURO)
SUB = ParagraphStyle('sub', fontName='Helvetica', fontSize=10.5, leading=14, textColor=CINZA, spaceAfter=8)
H2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12.5, leading=15, textColor=VERMELHO, spaceBefore=9, spaceAfter=4)
P = ParagraphStyle('p', fontName='Helvetica', fontSize=9.8, leading=13.6, textColor=ESCURO)
B = ParagraphStyle('b', parent=P, leftIndent=11, bulletIndent=0, spaceAfter=2)


def lista(itens): return [Paragraph(t, B, bulletText='•') for t in itens]


def passo(n, t):
    tb = Table([[Paragraph(f'<font color="white"><b>{n}</b></font>', P), Paragraph(t, P)]], colWidths=[7 * mm, 160 * mm])
    tb.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), VERMELHO), ('ALIGN', (0, 0), (0, 0), 'CENTER'),
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (1, 0), (1, 0), 7),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return tb


def linha_legenda(cor, texto):
    sw = Table([['']], colWidths=[12 * mm], rowHeights=[2.2 * mm]); sw.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), cor)]))
    t = Table([[sw, Paragraph(texto, P)]], colWidths=[16 * mm, 150 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2)]))
    return t


def img(nome, h):
    from PIL import Image as PI
    w0, h0 = PI.open(f'{pasta}/moldes/{nome}').size
    return Image(f'{pasta}/moldes/{nome}', width=h * w0 / h0, height=h)


doc = SimpleDocTemplate(f'{pasta}/LEIA-ME-moldes.pdf', pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                        topMargin=16 * mm, bottomMargin=14 * mm, title='KYPZL — Moldes camisola e calção')
S = [Paragraph('Moldes KYPZL — camisola e calção', H1),
     Paragraph('Para montar a arte no seu editor e subir o modelo no painel de administração.', SUB),
     Paragraph('O que vem na pasta', H2)]
S += lista(['<b>camisola-frente.svg</b> e <b>camisola-verso.svg</b>', '<b>calcao-frente.svg</b> e <b>calcao-verso.svg</b>',
            'os <b>…-guia.png</b> são só para ver como o molde fica com as linhas — não se enviam.'])
S += [Paragraph('As linhas do molde', H2),
      linha_legenda(colors.HexColor('#E5004F'), '<b>Vermelha</b> — linha de corte: é a forma da peça no simulador.'),
      linha_legenda(colors.HexColor('#00A3E0'), '<b>Azul tracejada</b> — sangria: a arte deve chegar <b>até aqui</b> (passando a linha de corte) para não ficar fio branco na borda.'),
      linha_legenda(colors.HexColor('#F59E0B'), '<b>Laranja pontilhada</b> — gola e punhos: são zonas à parte do simulador. <b>Não pintar.</b>'),
      Spacer(1, 4),
      Table([[img('camisola-frente-guia.png', 62 * mm), img('camisola-verso-guia.png', 62 * mm),
              img('calcao-frente-guia.png', 36 * mm)]], colWidths=[52 * mm, 56 * mm, 58 * mm]),
      Paragraph('Passo a passo', H2),
      passo(1, '<b>Abra o SVG</b> no Figma (arraste o ficheiro para a tela). É o formato que o painel conhece.'),
      passo(2, 'Desenhe a arte <b>dentro do grupo “ARTE”</b> — a forma da peça já recorta tudo. Não mude o tamanho nem a posição do molde.'),
      passo(3, 'A cor do retângulo <b>“FUNDO-cor-base”</b> é a cor base da peça. Mude-lhe a cor se quiser outra.'),
      passo(4, 'Exporte como <b>SVG</b>. As linhas guia podem ficar: o painel ignora-as.'),
      passo(5, 'No painel: <b>Modelos › Novo modelo</b>. Escreva o nome do tema e o <b>Cód. Modelo</b> (o mesmo para camisola e calção), '
               'largue o SVG da camisola e o do calção, confira o que o painel mostrou (caixa, fundo, cores) e carregue em <b>Guardar modelo</b>.'),
      Paragraph('Regras para a arte entrar bem', H2)]
S += lista(['<b>Uma cor = uma camada.</b> O painel junta tudo o que tem a mesma cor; no simulador o cliente muda a cor de cada camada (A, B, C…). Use cores sólidas.',
            '<b>Sem degradês, padrões nem transparências</b> — não se recolorem e são ignorados.',
            '<b>Traços convertidos em formas</b> e <b>texto em curvas</b>. (Traços muito finos são tratados como guia e ignorados.)',
            '<b>Camisola e calção do mesmo modelo:</b> use as mesmas cores, <b>pela mesma ordem de aparição</b>. A 1.ª cor da camisola e a 1.ª do calção são a mesma camada (A) — é assim que o simulador repete a cor entre peças.',
            '<b>Não desenhe</b> nome, número, escudos, patrocínios, gola nem punhos: são aplicações e zonas do simulador.',
            'No máximo cerca de <b>8 cores</b> por peça; mais do que isso o painel de cores fica comprido.',
            'Nunca redimensione o molde: o encaixe no jogador depende de o tamanho ser exatamente o do ficheiro.'])
doc.build(S)
print('ok')
