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

export async function converterMolde(textoSvg: string): Promise<MoldeConvertido> {
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
  let guias = 0;

  for (const el of desenhaveis(grupo)) {
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
      if (largura < quadro.w * 0.004) {
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
      continue;
    }
    const lista = porCor.get(c.cor) ?? [];
    lista.push(emitir(el, c.cor, c.atr));
    porCor.set(c.cor, lista);
  }

  const brutas = [...porCor.entries()].map(([cor, trechos]) => ({
    cor,
    svg: trechos.join(''),
  }));
  // a numeração (cor1, cor2…) acontece DEPOIS do filtro: uma camada
  // retirada não pode deixar um buraco na sequência das letras
  const filtro = await retirarCamadasEscondidas(quadro, brutas);
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
  if (guias > 0) {
    avisos.push(
      `${guias} traço(s) finos demais para se verem (guias do molde) foram ignorados.`,
    );
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
