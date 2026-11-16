/**
 * Converte um molde SVG do cliente em camadas de cor, NO BROWSER.
 *
 * É o irmão de `scripts/converter-molde.py`: mesma leitura, mesmas regras,
 * mesmo resultado. Existe em duplicado de propósito — o script serve para
 * meter um tema no repositório, este serve para a KYPZL meter um tema pelo
 * painel de administração sem passar por nós. Se as regras mudarem num,
 * têm de mudar no outro.
 *
 * Formato de entrada (export do Figma/Illustrator):
 *
 *     <mask style="mask-type:alpha"> <path d="silhueta"/> </mask>
 *     <g mask="url(#...)">
 *         <rect fill="#1F2A44"/>          ← fundo
 *         <path stroke="#CB9863" .../>    ← arte
 *         <g>                             ← grupos que o Figma embrulha
 *           <mask style="mask-type:luminance"> <path fill="white"/> </mask>
 *           <g mask="url(#...)"> ...arte... </g>
 *         </g>
 *     </g>
 *
 * Devolve SEMPRE um diagnóstico em vez de rebentar: o painel mostra o que
 * encontrou (e o que não encontrou) antes de deixar guardar.
 */

import type { LadoKit } from '@/types/kit';
import { daManga, doFundo } from './costurasPadrao';

const FORMAS = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line'] as const;
type Forma = (typeof FORMAS)[number];

const ATRIBUTOS: Record<Forma, string[]> = {
  path: ['d'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  polygon: ['points'],
  polyline: ['points'],
  line: ['x1', 'y1', 'x2', 'y2'],
};

/** Atributos de traço que têm de sobreviver à conversão. */
const TRACO = [
  'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-miterlimit', 'opacity', 'fill-rule',
];

/* O Figma exporta algumas cores pelo NOME. O painel de cores usa um
   <input type="color">, que só aceita #rrggbb — um 'white' lá dentro cairia
   em preto sem dar erro. */
const NOMEADAS: Record<string, string> = {
  white: '#ffffff', black: '#000000', red: '#ff0000', lime: '#00ff00',
  blue: '#0000ff', yellow: '#ffff00', aqua: '#00ffff', cyan: '#00ffff',
  fuchsia: '#ff00ff', magenta: '#ff00ff', silver: '#c0c0c0', gray: '#808080',
  grey: '#808080', maroon: '#800000', olive: '#808000', green: '#008000',
  purple: '#800080', teal: '#008080', navy: '#000080', orange: '#ffa500',
};

export interface Quadro {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CamadaConvertida {
  /** Posicional (`cor1`, `cor2`…) — é o que liga a camada entre peças. */
  id: string;
  cor: string;
  svg: string;
}

/** O que o molde traz FORA do grupo da arte: a gola, as mangas e os punhos, desenhados
    como peças soltas à volta do corpo (é assim o template do designer, ver o 015). */
export interface PecasSoltas {
  gola?: string;
  punho?: string;
  mangaEsq?: string;
  mangaDir?: string;
}

export interface MoldeConvertido {
  quadro: Quadro;
  corFundo: string | null;
  camadas: CamadaConvertida[];
  /** Tudo o que a pessoa tem de saber antes de guardar. */
  avisos: string[];
  /** Cores por omissão das zonas (gola, punhos) — vão para `cores_zonas`. */
  coresZonas: Record<string, string> | null;
}

/** Um ficheiro, um modelo: a frente e o verso que lá estão, já alinhados entre si. */
export interface ModeloConvertido {
  frente: MoldeConvertido | null;
  verso: MoldeConvertido | null;
  /** Avisos do ficheiro como um todo (o que se perdeu, o que se assumiu). */
  avisos: string[];
}

/** O ficheiro não é um molde: nada a converter, e a razão explicada. */
export class ErroDeMolde extends Error {}

/** Reescreve as cores de um trecho (mesmas regras do motor `forcarCor`). */
function recolorir(svg: string, cor: string): string {
  return svg
    .replace(/fill="(?!none")[^"]*"/g, `fill="${cor}"`)
    .replace(/stroke="(?!none")[^"]*"/g, `stroke="${cor}"`);
}

/**
 * Retira as camadas que NÃO SE VEEM no resultado final.
 *
 * O caso real que obrigou a isto: o designer duplica um molde antigo e
 * desenha por cima — a faixa dourada do Dino ficou DEBAIXO do peitilho
 * branco do Aska, integralmente coberta. Entrava no painel como um swatch
 * que não muda nada no ecrã.
 *
 * A verificação é por PÍXEIS, não por geometria: cada camada é pintada de
 * vermelho com as camadas SEGUINTES por cima a preto, num canvas pequeno.
 * Se não sobra vermelho, a camada está coberta. É a única forma honesta de
 * o saber — por caixas geométricas, um "O" cobriria o que está no buraco.
 */
async function retirarCamadasEscondidas(
  quadro: Quadro,
  camadas: { cor: string; svg: string }[],
): Promise<{ visiveis: { cor: string; svg: string }[]; avisos: string[] }> {
  const LARG = 220;
  const alt = Math.max(8, Math.round((quadro.h / quadro.w) * LARG));
  const canvas = document.createElement('canvas');
  canvas.width = LARG;
  canvas.height = alt;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { visiveis: camadas, avisos: [] };

  const pintar = async (corpo: string) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${quadro.x} ${quadro.y} ` +
      `${quadro.w} ${quadro.h}" width="${LARG}" height="${alt}">${corpo}</svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    ctx.clearRect(0, 0, LARG, alt);
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, LARG, alt).data;
    let vermelhos = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] > 180 && px[i + 1] < 90 && px[i + 3] > 120) vermelhos++;
    }
    return vermelhos;
  };

  const visiveis: { cor: string; svg: string }[] = [];
  const avisos: string[] = [];
  for (let k = 0; k < camadas.length; k++) {
    try {
      const sozinha = await pintar(recolorir(camadas[k].svg, '#ff0000'));
      const tapada = await pintar(
        recolorir(camadas[k].svg, '#ff0000') +
          camadas.slice(k + 1).map((c) => recolorir(c.svg, '#000000')).join(''),
      );
      if (sozinha < 4) {
        avisos.push(`A camada ${camadas[k].cor} não desenha nada visível e foi retirada.`);
        continue;
      }
      if (tapada < Math.max(4, sozinha * 0.02)) {
        avisos.push(
          `A camada ${camadas[k].cor} fica totalmente coberta pelas camadas ` +
            'seguintes e foi retirada — mudar-lhe a cor não mudava nada no ecrã.',
        );
        continue;
      }
      visiveis.push(camadas[k]);
    } catch {
      // não conseguir medir não é razão para deitar arte fora
      visiveis.push(camadas[k]);
    }
  }
  return { visiveis, avisos };
}


/** Que fração da silhueta fica SEM cor depois de pintadas todas as camadas, e
    qual a camada que mais área pinta. Mede por píxeis, como a verificação das
    camadas escondidas. */
async function porCobrir(
  quadro: Quadro,
  contorno: string,
  camadas: { cor: string; svg: string }[],
): Promise<{ fracao: number; dominante: string } | null> {
  const LARG = 240;
  const alt = Math.max(8, Math.round((quadro.h / quadro.w) * LARG));
  const canvas = document.createElement('canvas');
  canvas.width = LARG;
  canvas.height = alt;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const contar = async (camadasPintadas: string): Promise<number> => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${quadro.x} ${quadro.y} ${quadro.w} ${quadro.h}" ` +
      `width="${LARG}" height="${alt}"><defs><clipPath id="sil"><path d="${contorno}"/></clipPath></defs>` +
      `<g clip-path="url(#sil)"><rect x="${quadro.x - 9999}" y="${quadro.y - 9999}" width="30000" height="30000" fill="#ff0000"/>` +
      `${camadasPintadas}</g></svg>`;
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    ctx.clearRect(0, 0, LARG, alt);
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, LARG, alt).data;
    let vermelhos = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] > 180 && px[i + 1] < 90 && px[i + 3] > 120) vermelhos++;
    return vermelhos;
  };
  try {
    const total = await contar('');
    if (total < 50) return null;
    const preto = (c: { svg: string }) => recolorir(c.svg, '#000000');
    const resto = await contar(camadas.map(preto).join(''));
    let dominante = camadas[0].cor;
    let melhor = -1;
    for (const c of camadas) {
      const pintado = total - (await contar(preto(c)));
      if (pintado > melhor) { melhor = pintado; dominante = c.cor; }
    }
    return { fracao: resto / total, dominante };
  } catch {
    return null;
  }
}

function normalizarCor(v: string): string {
  const c = v.trim().toLowerCase();
  if (NOMEADAS[c]) return NOMEADAS[c];
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + [...c.slice(1)].map((d) => d + d).join('');
  return c;
}

const NUMERO = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

/**
 * Números com 1 decimal — por TOKENS, não por substituição solta: nos paths
 * comprimidos um número pode começar onde o anterior acaba ("-.94.03"), e
 * uma regex que exija dígitos antes do ponto salta o primeiro e casa
 * "94.03" A MEIO dele — dois números fundidos num, um token a menos, e o
 * browser rejeita o path a partir daí (foi o que partiu o Milan).
 */
function arredondar(texto: string): string {
  const saida: string[] = [];
  let aposNumero = false;
  let i = 0;
  while (i < texto.length) {
    NUMERO.lastIndex = i;
    const m = NUMERO.exec(texto);
    if (m) {
      const v = String(Math.round(Number(m[0]) * 10) / 10);
      if (aposNumero && !v.startsWith('-')) saida.push(',');
      saida.push(v);
      aposNumero = true;
      i = NUMERO.lastIndex;
      continue;
    }
    const ch = texto[i];
    if (ch !== ' ' && ch !== ',' && ch !== '\t' && ch !== '\n') {
      saida.push(ch);
      aposNumero = false;
    }
    i++;
  }
  return saida.join('');
}

/** Cor efetiva do elemento: preenchimento ou, se não houver, traço. */
function corDe(el: Element): { cor: string; atr: 'fill' | 'stroke' } | null {
  for (const atr of ['fill', 'stroke'] as const) {
    const v = el.getAttribute(atr);
    if (v && !['none', 'transparent'].includes(v.toLowerCase())) {
      return { cor: normalizarCor(v), atr };
    }
  }
  return null;
}

/**
 * Elementos que DESENHAM, saltando o conteúdo das <mask> encaixadas.
 *
 * Uma máscara é um estêncil: as suas formas dizem onde se vê o que está por
 * baixo, não o que se pinta. Contá-las dava uma camada branca fantasma em
 * cada grupo que o Figma embrulha.
 */
function* desenhaveis(el: Element): Generator<Element> {
  for (const filho of Array.from(el.children)) {
    if (['mask', 'defs', 'clipPath', 'style', 'metadata'].includes(filho.localName)) continue;
    yield filho;
    yield* desenhaveis(filho);
  }
}

/** Caixa do molde: os atributos que o Figma declara são exatos. Sem eles,
    estima-se pelos números do path — o que engorda a caixa, porque os
    pontos de controlo das bézier caem fora do traço. */
function caixaDaMascara(mascara: Element): Quadro | null {
  const attrs = ['x', 'y', 'width', 'height'].map((a) => mascara.getAttribute(a));
  if (attrs.every((v) => v !== null)) {
    const [x, y, w, h] = attrs.map(Number);
    if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) return { x, y, w, h };
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const el of Array.from(mascara.querySelectorAll('[d]'))) {
    const nums = (el.getAttribute('d') ?? '').match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
    nums.forEach((n, i) => (i % 2 === 0 ? xs : ys).push(n));
  }
  if (xs.length === 0) return null;
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function emitir(el: Element, cor: string, atr: 'fill' | 'stroke'): string {
  const tag = el.localName as Forma;
  const partes = [`<${tag}`];
  for (const a of [...ATRIBUTOS[tag], ...TRACO]) {
    const v = el.getAttribute(a);
    if (v !== null) partes.push(` ${a}="${a === 'd' || a === 'points' ? arredondar(v) : v}"`);
  }
  // o motor reescreve `fill` e `stroke`; marcar o que este elemento usa
  partes.push(` ${atr}="${cor}"`);
  if (atr === 'stroke') partes.push(' fill="none"');
  return partes.join('') + '/>';
}


/* ---------------------------------------------------------------- Corel --
 * O CorelDRAW exporta de outra maneira: sem <mask> (o recorte vem como
 * `clip-path`), cores em CLASSES de um <style> (`.fil4 {fill:#0563C9}`),
 * retângulos como <path>, `fill-rule:evenodd` no <svg> e sombreados como
 * <image> externas. Tudo isto é tratado aqui para o painel aceitar o export
 * do Corel como aceita o do Figma. */

const PROPRIEDADES = [
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-miterlimit', 'opacity', 'fill-rule',
];

function lerDeclaracoes(texto: string): Record<string, string> {
  const dec: Record<string, string> = {};
  for (const par of texto.split(';')) {
    const i = par.indexOf(':');
    if (i > 0) dec[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
  return dec;
}

/** Passa para ATRIBUTOS o que vem em classes, em `style` e herdado do <svg>. */
function aplicarEstilos(doc: Document) {
  const css = Array.from(doc.querySelectorAll('style')).map((e) => e.textContent ?? '').join('\n');
  const classes = new Map<string, Record<string, string>>();
  for (const m of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    classes.set(m[1], { ...(classes.get(m[1]) ?? {}), ...lerDeclaracoes(m[2]) });
  }
  const raiz = lerDeclaracoes(doc.documentElement.getAttribute('style') ?? '');
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (!FORMAS.includes(el.localName as Forma)) continue;
    const dec: Record<string, string> = {};
    for (const c of (el.getAttribute('class') ?? '').split(/\s+/)) Object.assign(dec, classes.get(c) ?? {});
    Object.assign(dec, lerDeclaracoes(el.getAttribute('style') ?? ''));
    if (!dec['fill-rule'] && raiz['fill-rule']) dec['fill-rule'] = raiz['fill-rule'];
    for (const p of PROPRIEDADES) {
      if (dec[p] !== undefined && !el.hasAttribute(p)) el.setAttribute(p, dec[p]);
    }
  }
}

/** Caixa de um path (absoluto/relativo; curvas amostradas, arcos pelos extremos). */
function caixaDoCaminho(d: string): Quadro | null {
  const t = d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!t) return null;
  const xs: number[] = [];
  const ys: number[] = [];
  const add = (x: number, y: number) => { xs.push(x); ys.push(y); };
  let i = 0;
  let cmd = '';
  let x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const n = () => parseFloat(t[i++]);
  const cubica = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let k = 1; k <= 8; k++) {
      const u = k / 8, v = 1 - u;
      add(v * v * v * x0 + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3,
          v * v * v * y0 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3);
    }
  };
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) {
      cmd = t[i++];
      if (cmd === 'z' || cmd === 'Z') { x = sx; y = sy; continue; }
    }
    const rel = cmd === cmd.toLowerCase();
    const k = cmd.toLowerCase();
    if (i >= t.length || /[a-zA-Z]/.test(t[i])) continue;
    if (k === 'm' || k === 'l' || k === 't') {
      const a = n(), b = n();
      x = rel ? x + a : a; y = rel ? y + b : b;
      if (k === 'm') { sx = x; sy = y; cmd = rel ? 'l' : 'L'; }
      add(x, y);
    } else if (k === 'h') { const a = n(); x = rel ? x + a : a; add(x, y); }
    else if (k === 'v') { const a = n(); y = rel ? y + a : a; add(x, y); }
    else if (k === 'c') {
      const [a, b, c, e, f, g] = [n(), n(), n(), n(), n(), n()];
      const X1 = rel ? x + a : a, Y1 = rel ? y + b : b, X2 = rel ? x + c : c, Y2 = rel ? y + e : e;
      const X3 = rel ? x + f : f, Y3 = rel ? y + g : g;
      cubica(x, y, X1, Y1, X2, Y2, X3, Y3); cx = X2; cy = Y2; x = X3; y = Y3;
    } else if (k === 's') {
      const [c, e, f, g] = [n(), n(), n(), n()];
      const X1 = 2 * x - cx, Y1 = 2 * y - cy;
      const X2 = rel ? x + c : c, Y2 = rel ? y + e : e, X3 = rel ? x + f : f, Y3 = rel ? y + g : g;
      cubica(x, y, X1, Y1, X2, Y2, X3, Y3); cx = X2; cy = Y2; x = X3; y = Y3;
    } else if (k === 'q') {
      const [a, b, f, g] = [n(), n(), n(), n()];
      const X1 = rel ? x + a : a, Y1 = rel ? y + b : b, X3 = rel ? x + f : f, Y3 = rel ? y + g : g;
      add(X1, Y1); add(X3, Y3); x = X3; y = Y3;
    } else if (k === 'a') {
      i += 5; const a = n(), b = n(); x = rel ? x + a : a; y = rel ? y + b : b; add(x, y);
    } else { i++; }
  }
  if (xs.length === 0) return null;
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

function caixaDoElemento(el: Element): Quadro | null {
  const n = (a: string) => Number(el.getAttribute(a) ?? 0);
  switch (el.localName) {
    case 'path': return caixaDoCaminho(el.getAttribute('d') ?? '');
    case 'rect': return { x: n('x'), y: n('y'), w: n('width'), h: n('height') };
    case 'polygon':
    case 'polyline': {
      const v = (el.getAttribute('points') ?? '').match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
      const px = v.filter((_, k) => k % 2 === 0), py = v.filter((_, k) => k % 2 === 1);
      if (px.length === 0) return null;
      return { x: Math.min(...px), y: Math.min(...py), w: Math.max(...px) - Math.min(...px), h: Math.max(...py) - Math.min(...py) };
    }
    default: return null;
  }
}

const uniao = (a: Quadro | null, b: Quadro | null): Quadro | null => {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** `clip-path` de um grupo (atributo ou dentro de `style`) → id do <clipPath>. */
function idDoRecorte(g: Element): string | null {
  const v = g.getAttribute('clip-path') ?? /clip-path:\s*(url\([^)]*\))/.exec(g.getAttribute('style') ?? '')?.[1] ?? '';
  return /url\(#([^)]+)\)/.exec(v)?.[1] ?? null;
}

const recorteDe = (doc: Document, id: string) =>
  Array.from(doc.querySelectorAll('clipPath')).find((c) => c.getAttribute('id') === id) ?? null;

function caixaDoRecorte(clip: Element): Quadro | null {
  let q: Quadro | null = null;
  for (const f of Array.from(clip.querySelectorAll('path,rect,polygon'))) q = uniao(q, caixaDoElemento(f));
  return q;
}

/** Procura o retângulo-guia `QUADRO` (sem preenchimento, traço finíssimo) que o
    molde traz à volta da caixa exata da peça. Se o Corel o exportou, é ele que
    manda no enquadramento — não o tamanho do fundo, que pode ter sangria. */
function guiaDoQuadro(doc: Document, recorte: Quadro): Quadro | null {
  for (const el of Array.from(doc.querySelectorAll('path,rect'))) {
    if (el.closest('defs,clipPath,mask')) continue;
    const fill = (el.getAttribute('fill') ?? '').toLowerCase();
    const stroke = (el.getAttribute('stroke') ?? '').toLowerCase();
    if ((fill && fill !== 'none') || !stroke || stroke === 'none') continue;
    if (el.localName === 'path' && (el.getAttribute('d') ?? '').length > 160) continue;
    if (Number(el.getAttribute('stroke-width') ?? 1) >= recorte.w * 0.004) continue;
    const b = caixaDoElemento(el);
    if (!b) continue;
    const tol = Math.max(2, recorte.w * 0.004);
    const contem = b.x <= recorte.x + tol && b.y <= recorte.y + tol
      && b.x + b.w >= recorte.x + recorte.w - tol && b.y + b.h >= recorte.y + recorte.h - tol;
    if (contem && b.w <= recorte.w * 1.12 && b.h <= recorte.h * 1.12) return b;
  }
  return null;
}

/** Um molde do tipo Corel: o grupo preso a um `clip-path` (PowerClip) com a silhueta e arte com
    cor lá dentro (os recortes que só prendem <image> não contam). */
interface Candidato {
  grupo: Element;
  quadro: Quadro;
  /** O quadro veio do retângulo-guia `QUADRO` do molde — esse manda, não se alarga. */
  comGuia: boolean;
  contorno: string;
  fundo: string | null;
}

/**
 * TODOS os moldes do ficheiro, da esquerda para a direita.
 *
 * O template do designer traz a frente e o verso lado a lado no mesmo desenho. Os moldes são os
 * grupos de topo: um grupo recortado DENTRO de outro é arte do molde, não outra peça. E só contam
 * os que têm tamanho de peça — a arte deixa recortes pequenos espalhados.
 */
function moldesPorRecorte(doc: Document): Candidato[] {
  const todos: { grupo: Element; caixa: Quadro }[] = [];
  for (const g of Array.from(doc.querySelectorAll('g'))) {
    const id = idDoRecorte(g);
    const clip = id ? recorteDe(doc, id) : null;
    if (!clip) continue;
    const caixa = caixaDoRecorte(clip);
    if (!caixa || caixa.w <= 0) continue;
    let temArte = false;
    for (const el of desenhaveis(g)) {
      if (FORMAS.includes(el.localName as Forma) && corDe(el)) { temArte = true; break; }
    }
    if (temArte) todos.push({ grupo: g, caixa });
  }
  const topo = todos.filter((a) => !todos.some((b) => b !== a && b.grupo.contains(a.grupo)));
  if (topo.length === 0) return [];
  const maior = Math.max(...topo.map((a) => a.caixa.w * a.caixa.h));
  return topo
    .filter((a) => a.caixa.w * a.caixa.h >= maior * 0.25)
    .sort((a, b) => a.caixa.x - b.caixa.x)
    .map(({ grupo, caixa }) => {
      const id = idDoRecorte(grupo)!;
      const contorno = Array.from(recorteDe(doc, id)!.querySelectorAll('path'))
        .map((p) => p.getAttribute('d') ?? '').join(' ');
      // no Corel o PowerClip tem um CONTENTOR: a forma que está logo antes do grupo,
      // com a silhueta e a cor da peça — essa cor é o fundo
      let fundo: string | null = null;
      for (let ir = grupo.previousElementSibling; ir && !fundo; ir = ir.previousElementSibling) {
        const b = FORMAS.includes(ir.localName as Forma) ? caixaDoElemento(ir) : null;
        const c = b ? corDe(ir) : null;
        if (b && c && c.atr === 'fill' && !c.cor.startsWith('url(')
          && Math.abs(b.w - caixa.w) < caixa.w * 0.02 && Math.abs(b.h - caixa.h) < caixa.h * 0.02) fundo = c.cor;
        if (ir.localName === 'g' && idDoRecorte(ir)) break;
      }
      const guia = guiaDoQuadro(doc, caixa);
      return { grupo, quadro: guia ?? caixa, comGuia: guia !== null, contorno, fundo };
    });
}

/**
 * Gola, mangas e punhos: as peças soltas à volta do corpo, lidas pela POSIÇÃO no molde.
 * Pela posição e não pela cor: o designer pinta-as como quiser, mas o template tem sempre a
 * gola no meio e no topo, as mangas nos lados (altas e compridas) e os punhos por baixo delas
 * (baixos e largos). Tudo o que tem tamanho de peça inteira (o contentor do corpo) fica de fora.
 */
function lerPecasSoltas(
  doc: Document,
  grupo: Element,
  q: Quadro,
): { soltas: PecasSoltas; extensao: Quadro } {
  const out: PecasSoltas = {};
  let extensao: Quadro = q;
  for (const el of Array.from(doc.querySelectorAll('path,rect,polygon'))) {
    if (el.closest('defs,clipPath,mask') || grupo.contains(el)) continue;
    const c = corDe(el);
    if (!c || c.atr !== 'fill' || c.cor.startsWith('url(')) continue;
    const b = caixaDoElemento(el);
    if (!b || b.w <= 0 || b.h <= 0) continue;
    const rx = (b.x + b.w / 2 - q.x) / q.w, ry = (b.y + b.h / 2 - q.y) / q.h;
    const rw = b.w / q.w, rh = b.h / q.h;
    if (rx < -0.05 || rx > 1.05 || ry < -0.05 || ry > 1.05 || rw > 0.6) continue;
    const lado = rx < 0.3 ? 'Esq' : rx > 0.7 ? 'Dir' : null;
    if (!lado && Math.abs(rx - 0.5) < 0.2 && ry < 0.22 && rh < 0.3) out.gola = c.cor;
    else if (lado && rw < 0.35 && rh >= 0.15 && ry > 0.08 && ry < 0.5) out[`manga${lado}`] = c.cor;
    else if (lado && rw < 0.35 && rh < 0.15 && ry >= 0.25) out.punho = c.cor;
    else continue;
    extensao = uniao(extensao, b)!;
  }
  return { soltas: out, extensao };
}

interface Bruto extends MoldeConvertido {
  /** O fundo é uma forma do desenho (o contentor do Corel), não uma cor inferida. */
  fundoReal: boolean;
  soltas: PecasSoltas;
}

/** Uma peça do ficheiro → as suas camadas de cor. */
async function converterGrupo(doc: Document, molde: Candidato): Promise<Bruto> {
  const { grupo: raizMolde, quadro: caixa, contorno } = molde;

  /** O elemento que cobre o molde inteiro é o fundo, não uma camada. */
  const eFundo = (el: Element) => {
    const b = caixaDoElemento(el);
    if (!b) return false;
    const tol = Math.max(1, caixa.w * 0.002);
    return b.x <= caixa.x + tol && b.y <= caixa.y + tol
      && b.x + b.w >= caixa.x + caixa.w - tol && b.y + b.h >= caixa.y + caixa.h - tol;
  };

  // recortes DENTRO do molde (a arte do Corel vem presa a eles): guardam-se e
  // reaplicam-se a cada forma, com ids únicos por instância (`__U__`)
  const recortesUsados = new Map<string, string>();
  const embrulhar = (el: Element, markup: string): string => {
    let out = markup;
    for (let p = el.parentElement; p && p !== raizMolde; p = p.parentElement) {
      const id = p.localName === 'g' ? idDoRecorte(p) : null;
      if (!id) continue;
      const clip = recorteDe(doc, id);
      if (!clip) continue;
      const formas = Array.from(clip.children)
        .filter((c) => FORMAS.includes(c.localName as Forma))
        .map((c) => emitir(c, '#000000', 'fill')).join('');
      recortesUsados.set(id, `<clipPath id="r${id}__U__">${formas}</clipPath>`);
      out = `<g clip-path="url(#r${id}__U__)">${out}</g>`;
    }
    return out;
  };

  const porCor = new Map<string, string[]>();
  const avisos: string[] = [];
  let corFundo: string | null = molde.fundo;
  let fundoReal = molde.fundo !== null;
  let semCor = 0;
  let naoRecoloriveis = 0;
  let guias = 0;

  for (const el of desenhaveis(raizMolde)) {
    if (!FORMAS.includes(el.localName as Forma)) continue;
    const c = corDe(el);
    if (!c) {
      semCor++;
      continue;
    }
    // traço fino demais para se ver não é arte, é uma GUIA do molde (o
    // contorno da silhueta vem muitas vezes com stroke de 0,16 px) — e se
    // entrasse dava um swatch que não muda nada no ecrã
    if (c.atr === 'stroke') {
      const largura = Number(el.getAttribute('stroke-width') ?? 1);
      if (largura < caixa.w * 0.004) {
        guias++;
        continue;
      }
    }
    // gradientes e padrões não se recolorem: entram como estão e ficam
    // fora do painel de cores
    if (c.cor.startsWith('url(')) {
      naoRecoloriveis++;
      continue;
    }
    if (eFundo(el)) {
      corFundo = c.cor;
      fundoReal = true;
      continue;
    }
    const lista = porCor.get(c.cor) ?? [];
    lista.push(embrulhar(el, emitir(el, c.cor, c.atr)));
    porCor.set(c.cor, lista);
  }

  const brutas = [...porCor.entries()].map(([cor, trechos]) => {
    const corpo = trechos.join('');
    // os recortes que esta camada usa, definidos dentro dela (cada camada é
    // um pedaço de SVG independente na base de dados)
    const defs = [...recortesUsados.entries()]
      .filter(([id]) => corpo.includes(`url(#r${id}__U__)`))
      .map(([, m]) => m).join('');
    return { cor, svg: (defs ? `<defs>${defs}</defs>` : '') + corpo };
  });
  // a numeração (cor1, cor2…) acontece DEPOIS do filtro: uma camada
  // retirada não pode deixar um buraco na sequência das letras
  const filtro = await retirarCamadasEscondidas(caixa, brutas);
  avisos.push(...filtro.avisos);
  const camadas: CamadaConvertida[] = filtro.visiveis.map((c, i) => ({
    id: `cor${i + 1}`,
    ...c,
  }));

  if (camadas.length === 0) {
    throw new ErroDeMolde(
      'Não foi encontrada nenhuma cor recolorível dentro do molde. ' +
        'Verifique se a arte tem preenchimento ou traço com cor sólida.',
    );
  }
  if (!corFundo) {
    // REGRA da casa: a arte abraça o molde TODO, sem espaços vazios. Sem
    // retângulo de fundo, mede-se o que fica por cobrir; se houver buracos, a
    // cor que mais pinta passa a ser a cor base — assim nada fica à mostra.
    const falta = contorno ? await porCobrir(caixa, contorno, camadas) : null;
    if (falta && falta.fracao > 0.005) {
      corFundo = falta.dominante;
      avisos.push(
        `${(falta.fracao * 100).toFixed(1)} % da peça ficava sem cor (espaços vazios entre as ` +
          `peças da arte). A cor base passou a ser ${falta.dominante}, a que mais pinta. ` +
          'Para controlar isto no Corel, mantenha o retângulo “FUNDO-cor-base” do molde.',
      );
    } else {
      avisos.push(
        'O molde não tem retângulo de fundo — a peça vai usar a cor base do '
          + 'simulador por baixo da arte.',
      );
    }
  }
  if (naoRecoloriveis > 0) {
    avisos.push(
      `${naoRecoloriveis} forma(s) com gradiente ou padrão foram ignoradas: `
        + 'não é possível trocar-lhes a cor.',
    );
  }
  if (semCor > 0) {
    avisos.push(`${semCor} forma(s) sem cor foram ignoradas.`);
  }
  if (guias > 0) {
    avisos.push(
      `${guias} traço(s) finos demais para se verem (guias do molde) foram ignorados.`,
    );
  }

  // sem retângulo-guia, o quadro é a PEÇA TODA: o corpo mais a gola e as mangas que o rodeiam
  // (o PowerClip do corpo acaba no ombro, a gola sobe acima dele). Foi assim que se mediu o 015.
  const { soltas, extensao } = lerPecasSoltas(doc, raizMolde, caixa);
  const um = (n: number) => Math.round(n * 10) / 10;
  return {
    quadro: molde.comGuia
      ? caixa
      : { x: um(extensao.x), y: um(extensao.y), w: um(extensao.w), h: um(extensao.h) },
    corFundo,
    camadas,
    avisos,
    coresZonas: null,
    fundoReal,
    soltas,
  };
}

const maiusculas = (c: string | undefined) => (c ? c.toUpperCase() : undefined);

/**
 * Põe a frente e o verso no PADRÃO da casa — o do 015 — e alinhados entre si.
 *
 *   camada 1       fundo com sangria (só se o molde tem fundo de verdade)
 *   camadas 2…n    a arte, uma por cor
 *   última(s)      as mangas, pela costura REAL do designer, POR CIMA da arte
 *
 * As camadas são POSICIONAIS: a camada i pinta a frente E o verso com o mesmo controlo de
 * cor, por isso uma cor que só existe num dos lados entra no outro como camada vazia em vez
 * de empurrar as seguintes. É o mesmo princípio de `kitReal.registar`.
 */
function montarLados(
  lados: Partial<Record<LadoKit, Bruto>>,
  camisola: boolean,
): Partial<Record<LadoKit, MoldeConvertido>> {
  const entradas = Object.entries(lados) as [LadoKit, Bruto][];
  const familias: { chave: string; cor: string }[] = [];
  const nova = (chave: string, cor: string) => {
    if (!familias.some((f) => f.chave === chave)) familias.push({ chave, cor });
  };

  const fundoCor = entradas.map(([, b]) => (b.fundoReal ? b.corFundo : null)).find(Boolean) ?? null;
  if (fundoCor) nova('fundo', fundoCor);
  for (const [, b] of entradas) for (const c of b.camadas) nova(`arte:${c.cor}`, c.cor);
  const mangas = (b: Bruto) => (camisola ? [b.soltas.mangaEsq, b.soltas.mangaDir] : []);
  for (const [, b] of entradas) for (const cor of mangas(b)) if (cor) nova(`manga:${cor}`, cor);

  const saida: Partial<Record<LadoKit, MoldeConvertido>> = {};
  for (const [lado, b] of entradas) {
    const q = b.quadro;
    const camadas = familias.map((f, i) => {
      let svg = '<g/>';
      if (f.chave === 'fundo' && b.fundoReal) {
        svg = `<path fill="${f.cor}" d="${doFundo(lado, q)}"/>`;
      } else if (f.chave.startsWith('arte:')) {
        svg = b.camadas.find((c) => c.cor === f.cor)?.svg ?? '<g/>';
      } else if (f.chave.startsWith('manga:')) {
        const d = (['Esq', 'Dir'] as const)
          .filter((le) => b.soltas[`manga${le}`] === f.cor)
          .map((le) => daManga(lado, q, le === 'Esq' ? 'esq' : 'dir')).join(' ');
        if (d) svg = `<path fill="${f.cor}" d="${d}"/>`;
      }
      return { id: `cor${i + 1}`, cor: f.cor, svg };
    });
    const zonas: Record<string, string> = {};
    const gola = maiusculas(b.soltas.gola), punho = maiusculas(b.soltas.punho);
    if (camisola && gola) zonas.gola = gola;
    if (camisola && punho) zonas.mangas = punho;
    saida[lado] = {
      quadro: q,
      corFundo: b.corFundo,
      camadas,
      avisos: b.avisos,
      coresZonas: Object.keys(zonas).length ? zonas : null,
    };
  }
  return saida;
}

export async function converterModelo(
  textoSvg: string,
  opcoes: { camisola?: boolean; trocar?: boolean } = {},
): Promise<ModeloConvertido> {
  const doc = new DOMParser().parseFromString(textoSvg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new ErroDeMolde('O ficheiro não é um SVG válido.');
  }

  aplicarEstilos(doc);
  const avisos: string[] = [];

  // 1) Figma/Illustrator: a silhueta é uma <mask> ALFA e o molde é o grupo preso a ela
  // 2) Corel: sem máscara — a silhueta é um `clip-path` (PowerClip), uma por lado
  const mascaras = new Map<string, Element>();
  for (const m of Array.from(doc.querySelectorAll('mask'))) {
    if (m.id) mascaras.set(m.id, m);
  }
  let moldes: Candidato[];

  if (mascaras.size > 0) {
    // o molde é a máscara ALFA; as de luminância que aparecem lá dentro são
    // efeitos do Figma e o grupo delas não é o molde
    const grupo = Array.from(doc.querySelectorAll('g[mask]')).find((g) => {
      const ref = /url\(#([^)]+)\)/.exec(g.getAttribute('mask') ?? '')?.[1];
      const m = ref ? mascaras.get(ref) : undefined;
      return m && !(m.getAttribute('style') ?? '').includes('luminance');
    });
    if (!grupo) throw new ErroDeMolde('SVG sem grupo preso a uma máscara alfa.');
    const ref = /url\(#([^)]+)\)/.exec(grupo.getAttribute('mask') ?? '')![1];
    const quadro = caixaDaMascara(mascaras.get(ref)!);
    if (!quadro) throw new ErroDeMolde('Não foi possível medir a caixa do molde.');
    moldes = [{ grupo, quadro, comGuia: true, contorno: '', fundo: null }];
  } else {
    moldes = moldesPorRecorte(doc);
    if (moldes.length === 0) {
      throw new ErroDeMolde(
        'Não encontrei o molde neste SVG: nem uma <mask> nem um grupo recortado (clip-path) ' +
          'com arte lá dentro. Desenhe a arte DENTRO do molde da KYPZL e exporte com o recorte.',
      );
    }
  }

  if (moldes.length > 2) {
    avisos.push(
      `Encontrei ${moldes.length} peças no ficheiro; só uso as duas maiores à esquerda (frente e verso).`,
    );
    moldes = moldes.slice(0, 2);
  }
  // a ordem do Corel é frente à esquerda, verso à direita; `trocar` desfaz-a quando vem ao contrário
  if (opcoes.trocar) moldes.reverse();
  const brutos: Partial<Record<LadoKit, Bruto>> = {};
  brutos.frente = await converterGrupo(doc, moldes[0]);
  if (moldes[1]) brutos.verso = await converterGrupo(doc, moldes[1]);

  const imagens = doc.querySelectorAll('image').length;
  if (imagens > 0) {
    avisos.push(
      `${imagens} imagem(ns) do ficheiro foram ignoradas (sombreados do Corel): o simulador `
        + 'tem o seu próprio sombreado de tecido.',
    );
  }
  if (moldes.length === 1) {
    avisos.push(
      'Só encontrei UMA peça no ficheiro — ficou como frente. O verso é a segunda peça, à '
        + 'direita da frente, com a arte desenhada dentro do molde.',
    );
  }

  const camisola = opcoes.camisola ?? false;
  const lados = montarLados(brutos, camisola);
  for (const l of Object.values(lados)) {
    if (l.camadas.length > 8) {
      avisos.push(
        `${l.camadas.length} camadas de cor — o painel fica longo. Se algumas `
          + 'forem a mesma cor no desenho, junte-as no ficheiro de origem.',
      );
      break;
    }
  }
  if (camisola && brutos.frente && !brutos.frente.soltas.gola && !brutos.frente.soltas.punho) {
    avisos.push(
      'Não encontrei a gola nem os punhos como peças soltas à volta do corpo — ficam com a cor '
        + 'por omissão do simulador.',
    );
  }
  return { frente: lados.frente ?? null, verso: lados.verso ?? null, avisos };
}

/** Peso do que vai para a base de dados, para o painel avisar a tempo. */
export function pesoAproximado(molde: MoldeConvertido): number {
  return molde.camadas.reduce((n, c) => n + c.svg.length, 0);
}
