/**
 * Templates de produto desenhados como SVG parametrizado por cor de região.
 *
 * Por que SVG gerado em runtime em vez de PNG estático?
 *  - "Cores por região" funciona de forma perfeita e nítida (cada região é um
 *    path com `fill` controlado), sem precisar de tint/filtro sobre raster.
 *  - As imagens-base ficam leves e escalam para qualquer resolução de export.
 *
 * Em produção, estas funções seriam substituídas por URLs de imagens reais
 * (PNG/WebP com transparência) do catálogo do cliente — a interface
 * `ProductDef.render` permanece a mesma.
 */

/** Tamanho lógico do template (o canvas trabalha nessa base e escala). */
export const TEMPLATE_SIZE = 1000;

type Colors = Record<string, string>;

const c = (colors: Colors, key: string, fallback: string) =>
  colors[key] ?? fallback;

/** Sombra/realce sutil reutilizável para dar volume às peças. */
const SHADING = `
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.16"/>
    </linearGradient>
    <linearGradient id="sideShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000000" stop-opacity="0.14"/>
      <stop offset="0.15" stop-color="#000000" stop-opacity="0"/>
      <stop offset="0.85" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.14"/>
    </linearGradient>
  </defs>
`;

function svgWrap(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TEMPLATE_SIZE} ${TEMPLATE_SIZE}" width="${TEMPLATE_SIZE}" height="${TEMPLATE_SIZE}">${SHADING}${inner}</svg>`;
  // encodeURIComponent é mais robusto que btoa para conteúdo com acentos/#.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ---------------------------------------------------------------- CAMISA -- */

function shirtBody(side: 'front' | 'back', colors: Colors): string {
  const body = c(colors, 'body', '#1e88e5');
  const sleeves = c(colors, 'sleeves', '#1565c0');
  const collar = c(colors, 'collar', '#ffffff');

  // Silhueta de camisa (ombros, mangas, tronco).
  const torso = `
    M 320 230
    C 360 150, 640 150, 680 230
    L 820 300
    L 770 460
    L 700 430
    L 700 850
    C 700 880, 670 900, 640 900
    L 360 900
    C 330 900, 300 880, 300 850
    L 300 430
    L 230 460
    L 180 300
    Z
  `;
  const leftSleeve = `M 320 230 L 180 300 L 230 460 L 300 430 L 300 300 Z`;
  const rightSleeve = `M 680 230 L 820 300 L 770 460 L 700 430 L 700 300 Z`;

  const collarShape =
    side === 'front'
      ? `M 400 215 C 450 270, 550 270, 600 215 L 580 195 C 540 235, 460 235, 420 195 Z`
      : `M 400 210 C 460 245, 540 245, 600 210 L 588 188 C 540 212, 460 212, 412 188 Z`;

  return `
    <path d="${torso}" fill="${body}" stroke="#00000022" stroke-width="3"/>
    <path d="${leftSleeve}" fill="${sleeves}" stroke="#00000022" stroke-width="3"/>
    <path d="${rightSleeve}" fill="${sleeves}" stroke="#00000022" stroke-width="3"/>
    <path d="${collarShape}" fill="${collar}" stroke="#00000022" stroke-width="3"/>
    <path d="${torso}" fill="url(#shade)"/>
    <path d="${torso}" fill="url(#sideShade)"/>
  `;
}

/* --------------------------------------------------------------- CALÇÃO -- */

function shortsBody(_side: 'front' | 'back', colors: Colors): string {
  const body = c(colors, 'body', '#222831');
  const waist = c(colors, 'waist', '#e0e0e0');
  const stripe = c(colors, 'stripe', '#ff5722');

  const left = `
    M 280 320 L 720 320 L 705 470
    C 700 520, 640 540, 560 540
    L 540 560 L 510 560 L 500 430 L 490 560 L 460 560 L 440 540
    C 360 540, 300 520, 295 470 Z
  `;
  const waistband = `M 280 320 L 720 320 L 716 372 L 284 372 Z`;
  const leftStripe = `M 296 380 L 320 380 L 312 535 L 290 520 Z`;
  const rightStripe = `M 704 380 L 680 380 L 688 535 L 710 520 Z`;

  return `
    <path d="${left}" fill="${body}" stroke="#00000022" stroke-width="3"/>
    <path d="${leftStripe}" fill="${stripe}"/>
    <path d="${rightStripe}" fill="${stripe}"/>
    <path d="${waistband}" fill="${waist}" stroke="#00000022" stroke-width="3"/>
    <path d="${left}" fill="url(#shade)"/>
    <path d="${left}" fill="url(#sideShade)"/>
  `;
}

export function renderShirt(side: 'front' | 'back', colors: Colors): string {
  return svgWrap(shirtBody(side, colors));
}

export function renderShorts(side: 'front' | 'back', colors: Colors): string {
  return svgWrap(shortsBody(side, colors));
}
