#!/usr/bin/env python3
"""Foto do cliente → modelo `kit_templates`, a receita "Canarinho" (Cod. 009).

O caminho todo (as partes com IA correm FORA daqui, via MCP do Magnific):
  1. foto real → mockup fantasma (ghost mannequin) SEM logos/números — os
     logos e números são APLICAÇÕES do simulador, nunca parte da arte;
  2. mockup → recorte com fundo transparente (remove background);
  3. recorte → SVG traçado (images_to_svg);
  4. ESTE SCRIPT: SVG(s) → camadas por família de cor → pedido JSON pronto
     para o Edge Function `admin` (acao guardar-modelo).

Regras que custaram a descobrir (não redescobrir — ver memória do projeto):
  - todo o path leva `fill` EXPLÍCITO: o motor (`forcarCor`) só reescreve
    atributos que existem; sem fill, o SVG pinta preto por omissão;
  - a silhueta ESCURA de base (dos primeiros paths do documento) é uma
    camada PRÓPRIA e PRIMEIRA — misturada numa família ia parar por cima
    de tudo quando as famílias reordenam;
  - o quadro leva SANGRIA (encolhe para dentro da caixa da arte): a arte
    transborda a caixa da peça e o alfa do recorte apara — é o que cola a
    estampa ao recorte por completo, sem rebordo da cor base à vista;
  - frente e verso partilham os CENTROS do k-means: a camada i é a MESMA
    família de cor nos dois lados, e o mesmo controlo pinta ambos;
  - gradientes viram a média das suas stops;
  - coordenadas arredondam a inteiro (o payload cai para ~metade).

Uso:
  python3 scripts/estampa_de_foto.py --cod 010 --nome Riscas \
      --frente frente.svg --verso costas.svg --codigo XXXX --out DIR \
      [--k 5] [--fora-frente x0,y0,x1,y1]... [--fora-verso ...]... \
      [--cores-zonas '{"gola":"#1F2A44","mangas":"#1F2A44"}']

Escreve DIR/pedido-<cod>-<lado>.json (+ pilha-<cod>.html para validar a
olho ANTES de gastar upload) e imprime o MD5 do svg de cada camada — depois
de inserir, conferir contra `md5(camadas->i->>'svg')` no Postgres. O envio
é sempre `curl --data-binary @ficheiro` (transcrever SQL à mão pelo chat
corrompe: provado a 2026-09-22).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

NUM = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
CMD = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]")


# ------------------------------------------------------------------ cores --


def hex_de(cor: str, gradientes: dict[str, tuple[int, int, int]]) -> tuple[int, int, int] | None:
    cor = (cor or "").strip()
    if not cor or cor == "none":
        return None
    m = re.match(r"url\(#([^)]+)\)", cor)
    if m:
        return gradientes.get(m.group(1))
    if cor.startswith("#"):
        h = cor[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        try:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
        except ValueError:
            return None
    m = re.match(r"rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)", cor)
    if m:
        return tuple(int(x) for x in m.groups())  # type: ignore[return-value]
    return None


def a_hex(rgb: tuple[float, float, float]) -> str:
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c))) for c in rgb)


def luminancia(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


# ------------------------------------------------------------------ paths --


@dataclass
class Trilho:
    """Um <path> do traçado: geometria normalizada + cor + medidas."""

    d: str
    cor: tuple[int, int, int]
    indice: int
    bbox: tuple[float, float, float, float]  # x0 y0 x1 y1

    @property
    def area(self) -> float:
        x0, y0, x1, y1 = self.bbox
        return max(1.0, (x1 - x0) * (y1 - y0))


def normalizar_d(d: str) -> tuple[str, tuple[float, float, float, float]]:
    """Reescreve o `d` com inteiros e devolve a caixa dos pontos tocados.

    Percorre os comandos a sério (H/V e relativos incluídos) — emparelhar
    números às cegas descarrilava nos H/V e nos flags dos arcos.
    """
    fora: list[str] = []
    xs: list[float] = []
    ys: list[float] = []
    pos = 0
    cx = cy = 0.0
    inicio = (0.0, 0.0)
    d = d.strip()
    while pos < len(d):
        m = CMD.search(d, pos)
        if not m:
            break
        cmd = m.group(0)
        fim = CMD.search(d, m.end())
        bruto = d[m.end() : fim.start() if fim else len(d)]
        nums = [float(x) for x in NUM.findall(bruto)]
        pos = fim.start() if fim else len(d)
        rel = cmd.islower()
        C = cmd.upper()
        saida: list[float] = []

        def ponto(x: float, y: float) -> tuple[float, float]:
            nonlocal cx, cy
            if rel:
                x, y = cx + x, cy + y
            cx, cy = x, y
            xs.append(x)
            ys.append(y)
            return x, y

        if C == "Z":
            cx, cy = inicio
            fora.append("Z")
            continue
        if C == "H":
            for x in nums:
                cx = (cx + x) if rel else x
                xs.append(cx)
                ys.append(cy)
                saida.append(cx)
        elif C == "V":
            for y in nums:
                py = (cy + y) if rel else y
                cy = py
                xs.append(cx)
                ys.append(py)
                saida.append(py)
        elif C == "A":
            # rx ry rot flag flag x y — só o par final é ponto
            for i in range(0, len(nums) - 6, 7):
                grupo = nums[i : i + 7]
                x, y = ponto(grupo[5], grupo[6])
                saida.extend(grupo[:5] + [x, y])
        else:
            passo = {"M": 2, "L": 2, "T": 2, "S": 4, "Q": 4, "C": 6}[C]
            for i in range(0, len(nums) - passo + 1, passo):
                grupo = nums[i : i + passo]
                pares = []
                for j in range(0, passo, 2):
                    x, y = ponto(grupo[j], grupo[j + 1])
                    pares.extend([x, y])
                saida.extend(pares)
                if C == "M":
                    inicio = (cx, cy)
                    # M com pares extra = L implícitos
        fora.append(C + " ".join(str(round(v)) for v in saida))

    if not xs:
        return "", (0, 0, 0, 0)
    return " ".join(fora), (min(xs), min(ys), max(xs), max(ys))


def ler_svg(caminho: str) -> list[Trilho]:
    arvore = ET.parse(caminho)
    raiz = arvore.getroot()
    ns = {"s": "http://www.w3.org/2000/svg"}

    gradientes: dict[str, tuple[int, int, int]] = {}
    for g in raiz.iter():
        tag = g.tag.split("}")[-1]
        if tag in ("linearGradient", "radialGradient") and g.get("id"):
            stops = []
            for st in g:
                cor = st.get("stop-color")
                if not cor and st.get("style"):
                    m = re.search(r"stop-color:\s*([^;]+)", st.get("style", ""))
                    cor = m.group(1) if m else None
                rgb = hex_de(cor or "", {})
                if rgb:
                    stops.append(rgb)
            if stops:
                gradientes[g.get("id")] = tuple(
                    sum(c[i] for c in stops) / len(stops) for i in range(3)
                )  # type: ignore[assignment]

    trilhos: list[Trilho] = []
    for i, p in enumerate(raiz.iter()):
        if p.tag.split("}")[-1] != "path":
            continue
        d = p.get("d")
        if not d:
            continue
        cor = p.get("fill")
        if cor is None and p.get("style"):
            m = re.search(r"fill:\s*([^;]+)", p.get("style", ""))
            cor = m.group(1) if m else None
        rgb = hex_de(cor or "#000000", gradientes)
        if rgb is None:  # fill="none": traço sem tinta, não interessa
            continue
        d_norm, bbox = normalizar_d(d)
        if not d_norm:
            continue
        trilhos.append(Trilho(d=d_norm, cor=rgb, indice=len(trilhos), bbox=bbox))
    return trilhos


# ---------------------------------------------------------------- k-means --


def kmeans(pontos: list[tuple[float, float, float]], pesos: list[float], k: int) -> list[tuple[float, float, float]]:
    random.seed(7)  # determinista: correr duas vezes dá o mesmo modelo
    unicos = sorted(set(pontos))
    k = min(k, len(unicos))
    centros = [unicos[i * (len(unicos) - 1) // max(1, k - 1)] for i in range(k)]
    for _ in range(30):
        soma = [[0.0, 0.0, 0.0, 0.0] for _ in range(k)]
        for p, w in zip(pontos, pesos):
            j = min(range(k), key=lambda c: sum((p[i] - centros[c][i]) ** 2 for i in range(3)))
            for i in range(3):
                soma[j][i] += p[i] * w
            soma[j][3] += w
        novos = [
            tuple(s[i] / s[3] for i in range(3)) if s[3] else centros[j]
            for j, s in enumerate(soma)
        ]
        if novos == centros:
            break
        centros = novos  # type: ignore[assignment]
    return centros


def familia(rgb: tuple[int, int, int], centros: list[tuple[float, float, float]]) -> int:
    return min(range(len(centros)), key=lambda c: sum((rgb[i] - centros[c][i]) ** 2 for i in range(3)))


# ------------------------------------------------------------------- main --


def caixa_arg(txt: str) -> tuple[float, float, float, float]:
    x0, y0, x1, y1 = (float(v) for v in txt.split(","))
    return x0, y0, x1, y1


def dentro(b: tuple[float, float, float, float], caixa: tuple[float, float, float, float]) -> bool:
    return b[0] >= caixa[0] and b[1] >= caixa[1] and b[2] <= caixa[2] and b[3] <= caixa[3]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cod", required=True)
    ap.add_argument("--nome", required=True)
    ap.add_argument("--frente", help="SVG traçado da frente")
    ap.add_argument("--verso", help="SVG traçado das costas (opcional)")
    ap.add_argument("--so-verso", help="SÓ as costas — para acrescentar o verso a um modelo já publicado")
    ap.add_argument("--centros", help="famílias FIXAS '#hex,#hex,...' (ordem = cor2, cor3, ...) — "
                    "obrigatório com --so-verso: o verso tem de casar com as famílias da frente publicada")
    ap.add_argument("--peca", default="camisola", choices=["camisola", "calcao", "meiao"])
    ap.add_argument("--k", type=int, default=5, help="famílias de cor além da base")
    ap.add_argument("--codigo", required=True, help="código do painel de administração")
    ap.add_argument("--fora-frente", action="append", type=caixa_arg, default=[],
                    help="x0,y0,x1,y1 (coords da arte) a REMOVER da frente — logos/números que o mockup não tirou")
    ap.add_argument("--fora-verso", action="append", type=caixa_arg, default=[])
    ap.add_argument("--cores-zonas", help='JSON, ex. {"gola":"#1F2A44"}')
    ap.add_argument("--sangria-x", type=float, default=0.09)
    ap.add_argument("--sangria-y", type=float, default=0.055)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    if bool(args.frente) == bool(args.so_verso):
        ap.error("ou --frente [--verso], ou --so-verso")
    lados: dict[str, list[Trilho]] = {}
    if args.frente:
        lados["frente"] = ler_svg(args.frente)
        if args.verso:
            lados["verso"] = ler_svg(args.verso)
    else:
        lados["verso"] = ler_svg(args.so_verso)

    for lado, caixas in (("frente", args.fora_frente), ("verso", args.fora_verso)):
        if lado in lados and caixas:
            antes = len(lados[lado])
            lados[lado] = [t for t in lados[lado] if not any(dentro(t.bbox, c) for c in caixas)]
            print(f"[{lado}] removidos {antes - len(lados[lado])} paths dentro das caixas --fora")

    # ---- base: a silhueta escura dos PRIMEIROS paths do documento ----------
    bases: dict[str, list[Trilho]] = {}
    for lado, ts in lados.items():
        arte = (
            min(t.bbox[0] for t in ts), min(t.bbox[1] for t in ts),
            max(t.bbox[2] for t in ts), max(t.bbox[3] for t in ts),
        )
        area_arte = (arte[2] - arte[0]) * (arte[3] - arte[1])
        base = [t for t in ts[:6] if luminancia(t.cor) < 90 and t.area >= 0.4 * area_arte]
        bases[lado] = base
        lados[lado] = [t for t in ts if t not in base]
        print(f"[{lado}] {len(ts)} paths, base escura: {len(base)}, arte bbox {tuple(round(v) for v in arte)}")

    # ---- famílias partilhadas entre os lados --------------------------------
    todos = [t for ts in lados.values() for t in ts]
    if args.centros:
        # centros impostos (modelo já publicado): só ATRIBUIÇÃO, sem re-ajuste,
        # e a ordem dada É a ordem das camadas — cor2, cor3, ...
        centros = [tuple(float(c) for c in hex_de(h.strip(), {}))  # type: ignore[misc]
                   for h in args.centros.split(",")]
        ordem = list(range(len(centros)))
    else:
        centros = kmeans([tuple(float(c) for c in t.cor) for t in todos], [t.area for t in todos], args.k)
        # ordem das famílias: posição média (ponderada) no documento do primeiro
        # lado — aproxima a ordem de empilhamento original
        primeiro = next(iter(lados.values()))
        ordem_chave = []
        for j in range(len(centros)):
            meus = [t for t in primeiro if familia(t.cor, centros) == j] or \
                   [t for t in todos if familia(t.cor, centros) == j]
            ordem_chave.append(sum(t.indice * t.area for t in meus) / sum(t.area for t in meus) if meus else 1e9)
        ordem = sorted(range(len(centros)), key=lambda j: ordem_chave[j])

    maior = max(range(len(centros)), key=lambda j: sum(t.area for t in todos if familia(t.cor, centros) == j))
    cor_fundo = a_hex(centros[maior])

    cores_zonas = json.loads(args.cores_zonas) if args.cores_zonas else None

    def cor_media(ts: list[Trilho]):
        if not ts:
            return None
        return tuple(sum(t.cor[i] * t.area for t in ts) / sum(t.area for t in ts) for i in range(3))

    mf = cor_media(bases.get("frente", []))
    mv = cor_media(bases.get("verso", []))
    if mf and mv and math.dist(mf, mv) > 60:
        bases_camada = [("frente", {"cor": a_hex(mf)}), ("verso", {"cor": a_hex(mv)})]
        print(f"bases divergentes ({a_hex(mf)} vs {a_hex(mv)}): uma camada de base por lado")
    else:
        m = mf or mv
        bases_camada = [(None, {"cor": a_hex(m) if m else "#222222"})]

    import os

    os.makedirs(args.out, exist_ok=True)
    paineis = []
    for lado, ts in lados.items():
        base = bases[lado]
        tudo = base + ts
        arte = (
            min(t.bbox[0] for t in tudo), min(t.bbox[1] for t in tudo),
            max(t.bbox[2] for t in tudo), max(t.bbox[3] for t in tudo),
        )
        w, h = arte[2] - arte[0], arte[3] - arte[1]
        quadro = {
            "x": round(arte[0] + args.sangria_x * w),
            "y": round(arte[1] + args.sangria_y * h),
            "w": round(w * (1 - 2 * args.sangria_x)),
            "h": round(h * (1 - 2 * args.sangria_y)),
        }

        camadas = []
        # A(s) camada(s) de BASE vêm primeiro. Se a base da frente e a das
        # costas tiverem cores parecidas, é UMA camada partilhada (cor1);
        # se divergirem (riscas: frente vermelha, costas marinho), cada lado
        # ganha a SUA camada de base — partilhar pintava as costas com a cor
        # da frente, porque o corPadrao da camada é um só.
        for outro_lado, minha in bases_camada:
            minha_svg = (
                "".join(f'<path fill="{minha["cor"]}" d="{t.d}"/>' for t in bases[lado])
                if outro_lado in (lado, None) else "<g/>"
            )
            camadas.append({"id": f"cor{len(camadas) + 1}", "cor": minha["cor"], "svg": minha_svg or "<g/>"})
        for n, j in enumerate(ordem, start=len(camadas) + 1):
            meus = sorted((t for t in ts if familia(t.cor, centros) == j), key=lambda t: t.indice)
            cor = a_hex(centros[j])
            camadas.append({
                "id": f"cor{n}",
                "cor": cor,
                # família vazia neste lado fica com um marcador: as POSIÇÕES
                # têm de bater certo entre frente e verso (camada i = família i)
                "svg": "".join(f'<path fill="{cor}" d="{t.d}"/>' for t in meus) or "<g/>",
            })

        dados = {
            "cod_modelo": args.cod,
            "nome": args.nome,
            "peca": args.peca,
            "lado": lado,
            "quadro": quadro,
            "cor_fundo": cor_fundo,
            "camadas": camadas,
        }
        if cores_zonas:
            dados["cores_zonas"] = cores_zonas
        pedido = {"codigo": args.codigo, "acao": "guardar-modelo", "dados": dados}
        destino = os.path.join(args.out, f"pedido-{args.cod}-{lado}.json")
        with open(destino, "w") as f:
            json.dump(pedido, f, separators=(",", ":"))
        print(f"[{lado}] {destino}  {os.path.getsize(destino)//1024} KB  quadro={quadro}")
        for c in camadas:
            print(f"    {c['id']} {c['cor']} md5={hashlib.md5(c['svg'].encode()).hexdigest()} ({len(c['svg'])//1024} KB)")

        paineis.append(
            f'<div><h3>{lado}</h3><svg viewBox="{arte[0]} {arte[1]} {w} {h}" width="380">'
            + "".join(f'<g>{c["svg"]}</g>' for c in camadas)
            + f'<rect x="{quadro["x"]}" y="{quadro["y"]}" width="{quadro["w"]}" height="{quadro["h"]}" fill="none" stroke="magenta" stroke-width="4"/></svg></div>'
        )

    pilha = os.path.join(args.out, f"pilha-{args.cod}.html")
    with open(pilha, "w") as f:
        f.write(
            '<meta charset="utf-8"><body style="background:#888;display:flex;gap:20px">'
            + "".join(paineis)
        )
    print(f"pré-visualização: {pilha} (o retângulo magenta é o quadro com sangria)")


if __name__ == "__main__":
    main()
