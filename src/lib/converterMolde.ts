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

export interface MoldeConvertido {
  quadro: Quadro;
  corFundo: string | null;
  camadas: CamadaConvertida[];
  /** Tudo o que a pessoa tem de saber antes de guardar. */
  avisos: string[];
}

/** O ficheiro não é um molde: nada a converter, e a razão explicada. */
export class ErroDeMolde extends Error {}

function normalizarCor(v: string): string {
  const c = v.trim().toLowerCase();
  if (NOMEADAS[c]) return NOMEADAS[c];
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + [...c.slice(1)].map((d) => d + d).join('');
  return c;
}

function arredondar(texto: string): string {
  return texto.replace(/-?\d+\.\d+(?:e-?\d+)?/g, (n) => String(Math.round(Number(n) * 10) / 10));
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
    if (filho.localName === 'mask') continue;
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

export function converterMolde(textoSvg: string): MoldeConvertido {
  const doc = new DOMParser().parseFromString(textoSvg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) {
    throw new ErroDeMolde('O ficheiro não é um SVG válido.');
  }

  const mascaras = new Map<string, Element>();
  for (const m of Array.from(doc.querySelectorAll('mask'))) {
    if (m.id) mascaras.set(m.id, m);
  }
  if (mascaras.size === 0) {
    throw new ErroDeMolde(
      'SVG sem <mask>. O molde tem de ser a arte desenhada DENTRO da silhueta ' +
        'da peça — exporte com a máscara, não só o desenho.',
    );
  }

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

  /** O retângulo que cobre o molde inteiro é o fundo, não uma camada. */
  const eFundo = (el: Element) => {
    if (el.localName !== 'rect') return false;
    const n = (a: string) => Number(el.getAttribute(a) ?? 0);
    const [x, y, w, h] = [n('x'), n('y'), n('width'), n('height')];
    return x <= quadro.x && y <= quadro.y
      && x + w >= quadro.x + quadro.w && y + h >= quadro.y + quadro.h;
  };

  const porCor = new Map<string, string[]>();
  const avisos: string[] = [];
  let corFundo: string | null = null;
  let semCor = 0;
  let naoRecoloriveis = 0;

  for (const el of desenhaveis(grupo)) {
    if (!FORMAS.includes(el.localName as Forma)) continue;
    const c = corDe(el);
    if (!c) {
      semCor++;
      continue;
    }
    // gradientes e padrões não se recolorem: entram como estão e ficam
    // fora do painel de cores
    if (c.cor.startsWith('url(')) {
      naoRecoloriveis++;
      continue;
    }
    if (eFundo(el)) {
      corFundo = c.cor;
      continue;
    }
    const lista = porCor.get(c.cor) ?? [];
    lista.push(emitir(el, c.cor, c.atr));
    porCor.set(c.cor, lista);
  }

  const camadas: CamadaConvertida[] = [...porCor.entries()].map(([cor, trechos], i) => ({
    id: `cor${i + 1}`,
    cor,
    svg: trechos.join(''),
  }));

  if (camadas.length === 0) {
    throw new ErroDeMolde(
      'Não foi encontrada nenhuma cor recolorível dentro do molde. ' +
        'Verifique se a arte tem preenchimento ou traço com cor sólida.',
    );
  }
  if (!corFundo) {
    avisos.push(
      'O molde não tem retângulo de fundo — a peça vai usar a cor base do '
        + 'simulador por baixo da arte.',
    );
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
  if (camadas.length > 8) {
    avisos.push(
      `${camadas.length} camadas de cor — o painel fica longo. Se algumas `
        + 'forem a mesma cor no desenho, junte-as no ficheiro de origem.',
    );
  }

  return { quadro, corFundo, camadas, avisos };
}

/** Peso do que vai para a base de dados, para o painel avisar a tempo. */
export function pesoAproximado(molde: MoldeConvertido): number {
  return molde.camadas.reduce((n, c) => n + c.svg.length, 0);
}
