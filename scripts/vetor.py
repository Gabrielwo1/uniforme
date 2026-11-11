#!/usr/bin/env python3
"""Rasteriza paths SVG simples (os exports do CorelDRAW: M m L l C c Z z) para
uma máscara alfa com antialiasing, e encaixa-os numa máscara PNG existente.

Porquê: o designer passou a mandar manga / punho / gola das costas em VETOR
(2026-11-11). O vetor vem cortado à medida do próprio desenho — sem posição na
tela — por isso é preciso registá-lo na máscara que já está no palco antes de o
poder trocar. `encaixar` procura escala + translação que maximizam a
sobreposição (IoU) com a máscara atual; como o vetor é a versão CORRIGIDA da
mesma peça, a procura parte da caixa da máscara e só afina uns píxeis.
"""
import re
import numpy as np
from PIL import Image, ImageDraw

_NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')


def carregar(caminho):
    """→ (viewBox (x, y, w, h), [subpaths]) com cada subpath uma lista de pontos."""
    s = open(caminho, encoding='utf-8').read()
    vb = tuple(float(v) for v in re.search(r'viewBox="([^"]*)"', s).group(1).split())
    d = re.search(r'\sd="([^"]*)"', s).group(1)
    return vb, _subpaths(d)


def _subpaths(d, passo=24):
    subs, atual, pos, ini = [], [], (0.0, 0.0), (0.0, 0.0)
    for cmd, args in re.findall(r'([MmLlCcZz])([^MmLlCcZz]*)', d):
        n = [float(v) for v in _NUM.findall(args)]
        rel = cmd.islower(); c = cmd.upper()
        if c == 'Z':
            if atual: subs.append(atual)
            atual, pos = [], ini
            continue
        if c == 'M':
            if atual: subs.append(atual)
            atual = []
            pares = [(n[i], n[i + 1]) for i in range(0, len(n) - 1, 2)]
            for k, (x, y) in enumerate(pares):
                if rel: x, y = pos[0] + x, pos[1] + y
                pos = (x, y)
                if k == 0: ini = pos
                atual.append(pos)
        elif c == 'L':
            for i in range(0, len(n) - 1, 2):
                x, y = n[i], n[i + 1]
                if rel: x, y = pos[0] + x, pos[1] + y
                pos = (x, y); atual.append(pos)
        elif c == 'C':
            for i in range(0, len(n) - 5, 6):
                p = [pos] + [(n[i + j], n[i + j + 1]) for j in (0, 2, 4)]
                if rel: p = [pos] + [(pos[0] + q[0], pos[1] + q[1]) for q in p[1:]]
                for t in np.linspace(0, 1, passo)[1:]:
                    u = 1 - t
                    atual.append((u**3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t**3 * p[3][0],
                                  u**3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t**3 * p[3][1]))
                pos = p[3]
    if atual: subs.append(atual)
    return subs


def rasterizar(subs, sx, sy, tx, ty, tam, ss=4):
    """Alfa (float 0..1) de tamanho `tam`=(w, h): ponto → (x*sx+tx, y*sy+ty).
    Even-odd por XOR dos subpaths; supersampling ss× para o antialiasing."""
    w, h = tam
    acc = np.zeros((h * ss, w * ss), bool)
    for sub in subs:
        if len(sub) < 3: continue
        im = Image.new('1', (w * ss, h * ss), 0)
        ImageDraw.Draw(im).polygon([((x * sx + tx) * ss, (y * sy + ty) * ss) for x, y in sub], fill=1)
        acc ^= np.array(im)
    return acc.reshape(h, ss, w, ss).mean(axis=(1, 3))


def encaixar(subs, vb, alvo, folga=24):
    """Melhor (iou, (sx, sy, tx, ty)) que põe o vetor sobre a máscara booleana
    `alvo`: parte do encaixe das caixas e procura escala + translação por IoU,
    grosso (passo 3 px) e depois fino (passo 1 px)."""
    ys, xs = np.where(alvo)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    H, W = alvo.shape
    px = np.array([p for s in subs for p in s]); vx0, vy0 = px.min(0); vx1, vy1 = px.max(0)
    bx, by = (x1 - x0) / (vx1 - vx0), (y1 - y0) / (vy1 - vy0)

    def iou(ds, dt, du):
        sx, sy = bx * ds, by * ds
        tx, ty = x0 - vx0 * sx + dt, y0 - vy0 * sy + du
        a = rasterizar(subs, sx, sy, tx, ty, (W, H), ss=1) > 0.5
        return (a & alvo).sum() / max((a | alvo).sum(), 1), (sx, sy, tx, ty)

    melhor = (-1, None, None)
    for ds in (0.96, 0.98, 1.0, 1.02, 1.04):
        for dt in range(-folga, folga + 1, 3):
            for du in range(-folga, folga + 1, 3):
                r = iou(ds, dt, du)
                if r[0] > melhor[0]: melhor = (r[0], r[1], (ds, dt, du))
    ds0, dt0, du0 = melhor[2]
    for ds in (ds0 - .01, ds0, ds0 + .01):
        for dt in range(dt0 - 2, dt0 + 3):
            for du in range(du0 - 2, du0 + 3):
                r = iou(ds, dt, du)
                if r[0] > melhor[0]: melhor = (r[0], r[1], (ds, dt, du))
    return melhor[0], melhor[1]
