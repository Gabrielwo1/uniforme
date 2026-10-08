#!/usr/bin/env python3
"""Pré-visualização FIEL do palco, offline, para um modelo da base de dados.

Replica o motor: zona CORPO (cor base) + arte (recortada pela silhueta) +
sombreado multiply por cima + zonas gola/mangas (cores_zonas). Serve para ver
mangas, axilas e bainhas ao píxel — o painel do browser reduz demasiado.

Uso: python3 scripts/palco_local.py <cod_modelo> <saida_dir> [--ponto-de-vista corpo|tudo]
  lê a linha de cada lado da tabela kit_templates (REST, chave pública) e grava
  <saida_dir>/<cod>-<lado>.json, .svg e palco-<cod>-<lado>.png (recorte da camisola)
Também aceita --json frente.json verso.json para testar uma arte ANTES de a
enviar para a base.
"""
import json, os, re, subprocess, sys, urllib.request
import numpy as np
from PIL import Image

RAIZ = __file__.rsplit('/scripts/', 1)[0]
J = f'{RAIZ}/public/moldes/jog'
CAIXA = {'frente': (384, 410, 710, 824), 'verso': (292, 396, 733, 878)}
URL = 'https://xxbnlruwszhipfqfvnns.supabase.co/rest/v1/kit_templates'


def chave():
    for l in open(f'{RAIZ}/.env.local'):
        if l.startswith('VITE_SUPABASE_ANON_KEY='):
            return l.split('=', 1)[1].strip()


def linha(cod, lado):
    rq = urllib.request.Request(f'{URL}?cod_modelo=eq.{cod}&peca=eq.camisola&lado=eq.{lado}&select=*',
                                headers={'apikey': chave(), 'Authorization': f'Bearer {chave()}'})
    r = json.load(urllib.request.urlopen(rq))
    return r[0] if r else None


def hex_rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _ql(svg, out):
    open(f'{out}.svg', 'w').write(svg)
    subprocess.run(['qlmanage', '-t', '-s', '2460', '-o', os.path.dirname(out), f'{out}.svg'], capture_output=True)
    a = Image.open(f'{out}.svg.png').convert('RGB')
    return np.array(a.crop(((a.width - 1520) // 2, 0, (a.width - 1520) // 2 + 1520, 2460))).astype(float)


def arte_png(lado, d, out):
    """Rasteriza a arte COM transparência. O qlmanage devolve sempre fundo
    branco opaco — por isso renderiza-se duas vezes (fundo preto e branco) e
    desmistura-se o alfa. (Com fundo branco os buracos da arte pareciam
    manchas brancas por cima da cor base — falso alarme de pré-visualização.)"""
    cx, cy, cw, ch = CAIXA[lado]; q = d['quadro']
    sx, sy = cw / q['w'], ch / q['h']
    corpo = (f'<g transform="translate({cx - q["x"] * sx:.3f} {cy - q["y"] * sy:.3f}) scale({sx:.5f} {sy:.5f})">'
             + ''.join(re.sub(r'fill="(?!none)[^"]*"', f'fill="{c["cor"]}"', c['svg']) for c in d['camadas'])
             + '</g>')
    cab = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1520 2460">'
    pre = _ql(cab + '<rect width="1520" height="2460" fill="#000"/>' + corpo + '</svg>', out + '-k')
    bra = _ql(cab + '<rect width="1520" height="2460" fill="#fff"/>' + corpo + '</svg>', out + '-w')
    alfa = (1 - (bra - pre).mean(axis=2) / 255.0).clip(0, 1)
    rgb = pre / np.maximum(alfa[..., None], 1e-3)
    res = np.dstack([rgb.clip(0, 255), alfa * 255]).astype(np.uint8)
    im = Image.fromarray(res); im.save(f'{out}.png')
    return im


def zona(png, cor):
    im = np.array(Image.open(f'{J}/{png}').convert('RGBA')).astype(float)
    m = im.copy(); m[..., :3] = np.array(cor) * (im[..., :3] / 255)
    return Image.fromarray(m.clip(0, 255).astype(np.uint8))


def compor(lado, arte, base, cz):
    a = np.array(arte); corpo = Image.open(f'{J}/vestida-camisola-{lado}.png').convert('RGBA')
    a[..., 3] = np.minimum(a[..., 3], np.array(corpo)[..., 3])
    t = Image.new('RGBA', (1520, 2460), (150, 153, 158, 255))
    t.alpha_composite(Image.open(f'{J}/jogador-{lado}.png').convert('RGBA'))
    t.alpha_composite(zona(f'vestida-camisola-{lado}.png', base))
    t.alpha_composite(Image.fromarray(a))
    sh = np.array(corpo).astype(float)
    b = np.array(t).astype(float); m = sh[..., 3:4] / 255.0
    b[..., :3] = b[..., :3] * (1 - m) + (b[..., :3] * sh[..., :3] / 255.0) * m
    t = Image.fromarray(b.clip(0, 255).astype(np.uint8))
    t.alpha_composite(zona(f'vestida-gola-{lado}.png', cz.get('gola', (255, 255, 255))))
    t.alpha_composite(zona(f'vestida-mangas-{lado}.png', cz.get('mangas', (255, 255, 255))))
    return t.convert('RGB')


def main():
    cod, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    fontes = {}
    if '--json' in sys.argv:
        i = sys.argv.index('--json'); fontes = {'frente': sys.argv[i + 1], 'verso': sys.argv[i + 2]}
    for lado in ('frente', 'verso'):
        if lado in fontes:
            row = json.load(open(fontes[lado]))['dados']; row = {**row}
            ref = linha(cod, lado) or {}
            cf = row.get('cor_fundo') or ref.get('cor_fundo'); cz = row.get('cores_zonas') or ref.get('cores_zonas')
            d = row
        else:
            r = linha(cod, lado)
            if not r:
                print(lado, 'sem linha'); continue
            d = {'quadro': r['quadro'], 'camadas': r['camadas']}; cf = r['cor_fundo']; cz = r['cores_zonas']
        cz = {k: hex_rgb(v) for k, v in (cz or {}).items()}
        if lado == 'verso' and not cz:
            f = linha(cod, 'frente'); cz = {k: hex_rgb(v) for k, v in ((f or {}).get('cores_zonas') or {}).items()}
        json.dump({'dados': d}, open(f'{out}/{cod}-{lado}.json', 'w'))
        im = compor(lado, arte_png(lado, d, f'{out}/{cod}-{lado}'), hex_rgb(cf or '#ffffff'), cz)
        cx, cy, cw, ch = CAIXA[lado]
        im.crop((cx - 30, cy - 10, cx + cw + 30, cy + ch + 20)).save(f'{out}/palco-{cod}-{lado}.png')
        print(lado, 'ok')


if __name__ == '__main__':
    main()
