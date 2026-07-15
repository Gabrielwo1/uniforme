/**
 * Paleta de cores padrão do catálogo KYPZL (nomes/aproximações de cor).
 * Compartilhada entre o seletor de cores da UI e o construtor de prompt de
 * IA (para descrever cores em português, não em hex).
 */
export interface NamedColor {
  hex: string;
  name: string;
}

export const KYPZL_SWATCHES: NamedColor[] = [
  { hex: '#2B2A29', name: 'Preto' },
  { hex: '#FFFFFF', name: 'Branco' },
  { hex: '#383E42', name: 'Cinza Antracite' },
  { hex: '#C0C5C9', name: 'Cinza Prata' },
  { hex: '#1B2A4A', name: 'Azul Marinho' },
  { hex: '#1E50A2', name: 'Azul Royal' },
  { hex: '#7EC8E3', name: 'Azul Celeste' },
  { hex: '#1AA7A0', name: 'Azul Turquesa' },
  { hex: '#1E8E3E', name: 'Verde' },
  { hex: '#14532D', name: 'Verde Garrafa' },
  { hex: '#9CCC2E', name: 'Verde Lima' },
  { hex: '#B62126', name: 'Vermelho' },
  { hex: '#6E1423', name: 'Grená' },
  { hex: '#F57C00', name: 'Laranja' },
  { hex: '#FFD400', name: 'Amarelo' },
  { hex: '#E1A100', name: 'Amarelo Dourado' },
  { hex: '#E91E63', name: 'Rosa' },
  { hex: '#C19A6B', name: 'Camel' },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Nome em português da cor conhecida mais próxima de um hex arbitrário. */
export function nameColor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  let best = KYPZL_SWATCHES[0];
  let bestDist = Infinity;
  for (const sw of KYPZL_SWATCHES) {
    const [sr, sg, sb] = hexToRgb(sw.hex);
    const dist = (r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = sw;
    }
  }
  return best.name;
}
