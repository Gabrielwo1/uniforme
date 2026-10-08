#!/usr/bin/env python3
"""Dá costura real (ombro→sovaco) aos temas TRAÇADOS: 009 Canarinho,
013 Hexágonos, 014 Canarinho Gola em Bico. Só mexe nos DADOS (camadas SVG).

Cliente, 2026-10-08: "pontos amarelos que devem ser só da faixa da manga",
"vão no sovaco entre a lateral do peito e o braço". Causa: a arte traçada
escorre para a manga/sovaco (lixo do trace, padrões a atravessar a costura).
Remédio (receita única, ver scripts/costuras.py):
  1. TODAS as camadas de padrão são cortadas pelo polígono do TRONCO
     (clipPath com a costura ombro→sovaco; a lateral abaixo do sovaco sai para
     fora e a máscara da peça faz o resto);
  2. a MANGA recebe cor própria por polígono, na camada certa — a manga é uma
     cor lisa (+ a faixa do punho, que é a zona `mangas` por cima):
       013 → nada a acrescentar (a base preta full-bleed já é a manga);
       009/014 → como nas fotos 143853 (frente) e 143910 (costas): a manga é
                 de cor lisa, em lados opostos nas duas vistas (ver MANGAS).

Uso: python3 scripts/costurar_mangas.py <saida_dir> [--base <dir>] [cod ...]
     (lê a base por REST; a arte já recortada não se recorta outra vez — para
     refazer, passe --base com a arte original: <dir>/<cod>-<lado>.json do palco_local.py)
     → pedido-<cod>-<lado>.json pronto para a Edge Function `admin`.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import costuras as C
import palco_local as P

# Qual camada (posicional) pinta cada manga — e de que lado do ecrã.
#   foto frente (143853): manga ESQ amarela, DIR verde; costas (143910): ESQ verde, DIR amarela.
#   camada do verde-escuro = cor1, do amarelo = cor2 (nos 009/014).
MANGAS = {
    '009': {'frente': {'esq': 'cor2', 'dir': 'cor1'}, 'verso': {'esq': 'cor1', 'dir': 'cor2'}},
    '014': {'frente': {'esq': 'cor2', 'dir': 'cor1'}, 'verso': {'esq': 'cor1', 'dir': 'cor2'}},
    '013': {},
}


def f(v): return f'{v:.1f}'


def d_art(pts, q, lado):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in C.para_arte(pts, q, lado)) + ' Z'


def costurar(cod, lado, base=None):
    r = P.linha(cod, lado)
    if base:  # arte ORIGINAL (antes de qualquer recorte), guardada por palco_local.py
        o = json.load(open(f'{base}/{cod}-{lado}.json'))['dados']
        r['quadro'], r['camadas'] = o['quadro'], o['camadas']
    q = r['quadro']; tronco = d_art(C.poligono_tronco(lado), q, lado)
    novas = []
    for i, c in enumerate(r['camadas']):
        svg = c['svg']
        # (re)corre: tira um recorte anterior desta receita, se existir
        if 'id="m' in svg and 'clip-path' in svg:
            raise SystemExit(f'{cod}-{lado}/{c["id"]} já tem recorte — parta da base original')
        cid = f'm{cod}{lado[0]}{i}__U__'
        cor_do_fundo_full = (cod == '013' and c['id'] == 'cor1')
        corpo = svg
        if not cor_do_fundo_full:
            corpo = (f'<defs><clipPath id="{cid}"><path d="{tronco}"/></clipPath></defs>'
                     f'<g clip-path="url(#{cid})">{svg}</g>')
        for ecra, camada in MANGAS.get(cod, {}).get(lado, {}).items():
            if camada == c['id']:
                corpo += f'<path fill="{c["cor"]}" d="{d_art(C.poligono_manga(lado, ecra), q, lado)}"/>'
        novas.append({**c, 'svg': corpo})
    dados = {k: r[k] for k in ('cod_modelo', 'nome', 'peca', 'lado', 'quadro', 'cor_fundo', 'gola_estilo', 'cores_zonas')}
    dados['camadas'] = novas
    return dados


def main():
    args = sys.argv[1:]
    base = args[args.index('--base') + 1] if '--base' in args else None
    if base:
        i = args.index('--base'); args = args[:i] + args[i + 2:]
    saida = args[0]; os.makedirs(saida, exist_ok=True)
    cods = args[1:] or ['009', '013', '014']
    for cod in cods:
        for lado in ('frente', 'verso'):
            dados = costurar(cod, lado, base)
            json.dump({'codigo': '4554', 'acao': 'guardar-modelo', 'dados': dados},
                      open(f'{saida}/pedido-{cod}-{lado}.json', 'w'), separators=(',', ':'))
            print(cod, lado, sum(len(c['svg']) for c in dados['camadas']))


if __name__ == '__main__':
    main()
