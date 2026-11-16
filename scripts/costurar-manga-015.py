#!/usr/bin/env python3
"""Costura REAL do designer na arte do 015 "Teste Corel" (o vermelho das mangas é um
polígono da camada cor4, na arte guardada em kit_templates).

Porquê (2026-11-16): a fronteira de cor da manga vive na ARTE do modelo, não nas máscaras
PNG. Ela tinha a reta ombro→sovaco de costuras.poligono_manga; a manga do designer tem
curva (barriga no sovaco). Aqui o polígono vermelho passa a seguir a costura dele
(costuras.poligono_manga_real).

Uso: python3 scripts/costurar-manga-015.py <saida_dir>
  lê a linha atual de cada lado (REST público), grava <saida>/antes-015-<lado>.json
  (cópia de segurança) e <saida>/depois-015-<lado>.json com a cor4 nova.
  Para repor: voltar a gravar o antes-… (acao guardar-modelo da Edge Function admin).
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
import costuras as C
import palco_local as P


def d_art(pts, q, lado):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in C.para_arte(pts, q, lado)) + ' Z'


def nova_cor4(r, lado):
    q = r['quadro']
    d = ' '.join(d_art(C.poligono_manga_real(lado, le), q, lado) for le in ('esq', 'dir'))
    out = []
    for c in r['camadas']:
        if c['id'] == 'cor4':
            c = {**c, 'svg': re.sub(r' d="[^"]*"', f' d="{d}"', c['svg'], count=1)}
        out.append(c)
    return out


def main():
    saida = sys.argv[1]; os.makedirs(saida, exist_ok=True)
    for lado in ('frente', 'verso'):
        r = P.linha('015', lado)
        json.dump(r, open(f'{saida}/antes-015-{lado}.json', 'w'), separators=(',', ':'))
        novo = {**r, 'camadas': nova_cor4(r, lado)}
        json.dump(novo, open(f'{saida}/depois-015-{lado}.json', 'w'), separators=(',', ':'))
        print(lado, [len(c['svg']) for c in novo['camadas']])


if __name__ == '__main__':
    main()
