/**
 * A paleta FECHADA do simulador — blocos com nome, como no concorrente,
 * em vez do RGB livre (pedido do cliente): a produção só garante as
 * cores que tem em tecido, e um seletor livre convida a pedir o que não
 * existe.
 *
 * Inclui de propósito as cores da marca (vermelho KYPZL, antracite) e as
 * cores por omissão dos temas do designer (marinho #1F2A44, vermelho
 * #E52424), para o bloco "selecionado" acender quando o tema abre.
 * Designs antigos com cores fora da paleta continuam válidos — o bloco
 * do gatilho mostra a cor guardada na mesma; só as escolhas NOVAS ficam
 * limitadas aos blocos.
 */

export interface CorDaPaleta {
  nome: string;
  hex: string;
}

export const PALETA: CorDaPaleta[] = [
  { nome: 'Branco', hex: '#FFFFFF' },
  { nome: 'Cinza-claro', hex: '#C9C9C9' },
  { nome: 'Cinza', hex: '#8C8C8C' },
  { nome: 'Antracite', hex: '#2B2A29' },
  { nome: 'Preto', hex: '#000000' },
  { nome: 'Verde-água', hex: '#40E0D0' },
  { nome: 'Azul-celeste', hex: '#87CEEB' },
  { nome: 'Azul-claro', hex: '#4DA3E8' },

  { nome: 'Azul', hex: '#2563EB' },
  { nome: 'Azul-royal', hex: '#1E40AF' },
  { nome: 'Azul-marinho', hex: '#1F2A44' },
  { nome: 'Azul-noite', hex: '#101733' },
  { nome: 'Amarelo', hex: '#FFE14D' },
  { nome: 'Amarelo-torrado', hex: '#FBBF24' },
  { nome: 'Dourado', hex: '#D4A017' },
  { nome: 'Mostarda', hex: '#A16207' },

  { nome: 'Verde-lima', hex: '#84E64C' },
  { nome: 'Verde-claro', hex: '#6FCF7C' },
  { nome: 'Verde', hex: '#22C55E' },
  { nome: 'Verde-escuro', hex: '#166534' },
  { nome: 'Laranja', hex: '#F97316' },
  { nome: 'Laranja-vivo', hex: '#F4502E' },
  { nome: 'Vermelho KYPZL', hex: '#B62126' },
  { nome: 'Vermelho', hex: '#E52424' },

  { nome: 'Bordô', hex: '#6E1414' },
  { nome: 'Castanho', hex: '#5D4037' },
  { nome: 'Rosa-choque', hex: '#EC4899' },
  { nome: 'Rosa', hex: '#E4A0B7' },
  { nome: 'Magenta', hex: '#D946EF' },
  { nome: 'Roxo', hex: '#7C3AED' },
  { nome: 'Roxo-escuro', hex: '#4C1D95' },
  { nome: 'Violeta-noite', hex: '#2E1065' },
];

/** Nome da cor na paleta, se lá estiver — para rótulos e resumos. */
export function nomeDaCor(hex: string): string | null {
  const alvo = hex.toLowerCase();
  return PALETA.find((c) => c.hex.toLowerCase() === alvo)?.nome ?? null;
}
