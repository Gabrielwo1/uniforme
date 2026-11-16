#!/usr/bin/env python3
"""Costura REAL do designer na arte dos modelos traçados (013, 014; o 015 tem o seu script).

A arte destes modelos foi cortada pela reta ombro→sovaco com um <clipPath> (o desenho por
baixo está inteiro) e, no 014, com um polígono de cor para cada manga. Como o recorte é um
clipPath, basta trocar o `d` do polígono: não é preciso a arte original.

Uso: python3 scripts/refazer-costura-arte.py <saida_dir> [cod ...]
  para cada cod/lado: grava <saida>/antes-<cod>-<lado>.json (cópia de segurança) e
  <saida>/update-<cod>-<lado>.sql — um UPDATE com replace() dos polígonos, pronto a correr.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import costuras as C
import palco_local as P


def d_art(pts, q, lado):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in C.para_arte(pts, q, lado)) + ' Z'


def trocas(r, lado):
    """[(d_velho, d_novo, nome)] procurando os polígonos NA ARTE (a geometria de costuras.py
    mudou desde que foram gravados — a máscara do tronco é lida do PNG da camisola — por isso
    não se compara com o que seria gerado hoje, reconhece-se pela forma)."""
    q = r['quadro']; cw = C.CAIXA[lado][2]
    meio = q['x'] + q['w'] / 2
    novo_t = d_art(C.poligono_tronco_real(lado), q, lado)
    novo_m = {le: d_art(C.poligono_manga_real(lado, le), q, lado) for le in ('esq', 'dir')}
    achados = {}
    for c in r['camadas']:
        svg = c['svg']
        # polígonos só com M/L: 12 pontos = tronco (clipPath ou preenchimento), 6 = cor de uma manga
        for m in re.finditer(r'd="(M[^"CcZzHhVv]*Z)"', svg):
            d = m.group(1)
            n = len(re.findall(r'[ML]', d))
            if n == 12:
                achados[d] = (novo_t, 'tronco')
            elif n == 6 and re.search(r'fill="#[0-9a-fA-F]{6}" d="' + re.escape(d), svg):
                x0 = float(d[1:].split()[0])
                achados[d] = (novo_m['esq' if x0 < meio else 'dir'], 'manga')
    return [(v, n, nome) for v, (n, nome) in achados.items()]


def main():
    saida = sys.argv[1]; os.makedirs(saida, exist_ok=True)
    cods = sys.argv[2:] or ['013', '014']
    for cod in cods:
        for lado in ('frente', 'verso'):
            r = P.linha(cod, lado)
            json.dump(r, open(f'{saida}/antes-{cod}-{lado}.json', 'w'), separators=(',', ':'))
            txt = json.dumps(r['camadas'], ensure_ascii=False, separators=(',', ':'))
            sql = 'camadas::text'
            for velho, novo, nome in trocas(r, lado):
                n = txt.count(velho)
                print(cod, lado, nome, 'ocorrências:', n)
                if n:
                    sql = f"replace({sql}, '{velho}', '{novo}')"
            open(f'{saida}/update-{cod}-{lado}.sql', 'w').write(
                f"update public.kit_templates set camadas = ({sql})::jsonb where cod_modelo='{cod}' and peca='camisola' and lado='{lado}';")


if __name__ == '__main__':
    main()
