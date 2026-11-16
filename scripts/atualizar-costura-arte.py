#!/usr/bin/env python3
"""Passa a arte dos modelos com costura (010, 013, 014, 015) da costura ANTIGA para a NOVA
quando costuras-designer.json muda (por ex. a manga esticada até à borda do sombreado).

A arte foi gravada com os polígonos gerados por costuras.poligono_tronco_real /
poligono_manga_real a partir do json anterior. Gera-se o texto desses polígonos com o json
ANTIGO e com o NOVO, e troca-se um pelo outro (replace) na arte actual — só dados.

Uso: python3 scripts/atualizar-costura-arte.py <json-antigo> <saida_dir> [lado ...]
  grava <saida>/antes-<cod>-<lado>.json (cópia) e <saida>/update-<cod>-<lado>.sql.
  Não aplica nada: as .sql correm-se à parte (execute_sql). Se um polígono não for
  encontrado diz-se (ocorrências: 0) — não é erro, o modelo pode não o ter.
"""
import json, os, shutil, sys

sys.path.insert(0, os.path.dirname(__file__))
import costuras as C
import palco_local as P

NOVO_JSON = os.path.join(os.path.dirname(__file__), 'costuras-designer.json')


def d_art(pts, q, lado):
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in C.para_arte(pts, q, lado)) + ' Z'


def poligonos(q, lado):
    """{nome: d} com a costura que está em costuras-designer.json neste momento."""
    out = {'tronco': d_art(C.poligono_tronco_real(lado), q, lado)}
    for le in ('esq', 'dir'):
        out[f'manga-{le}'] = d_art(C.poligono_manga_real(lado, le), q, lado)
    return out


def main():
    antigo, saida = sys.argv[1], sys.argv[2]
    lados = sys.argv[3:] or ['frente', 'verso']
    os.makedirs(saida, exist_ok=True)
    novo = json.load(open(NOVO_JSON))
    shutil.copy(NOVO_JSON, f'{saida}/costuras-novo.json')
    for cod in ('010', '013', '014', '015'):
        for lado in lados:
            r = P.linha(cod, lado)
            q = r['quadro']
            json.dump(r, open(f'{saida}/antes-{cod}-{lado}.json', 'w'), separators=(',', ':'))
            txt = json.dumps(r['camadas'], ensure_ascii=False, separators=(',', ':'))
            shutil.copy(antigo, NOVO_JSON); velhos = poligonos(q, lado)
            shutil.copy(f'{saida}/costuras-novo.json', NOVO_JSON); novos = poligonos(q, lado)
            sql = 'camadas::text'
            for nome in velhos:
                v, n = velhos[nome], novos[nome]
                c = txt.count(v)
                print(cod, lado, nome, 'ocorrências:', c, '(igual)' if v == n else '')
                if c and v != n:
                    sql = f"replace({sql}, '{v}', '{n}')"
            if sql != 'camadas::text':
                open(f'{saida}/update-{cod}-{lado}.sql', 'w').write(
                    f"update public.kit_templates set camadas = ({sql})::jsonb where cod_modelo='{cod}' and peca='camisola' and lado='{lado}';")


if __name__ == '__main__':
    main()
