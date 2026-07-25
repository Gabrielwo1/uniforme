/** Dados estáticos do funil (páginas 1–2 do briefing), partilhados entre
 * StartFlow (cards) e SimulatorHeader (breadcrumb). */

export interface Modality {
  key: string;
  label: string;
  /** Foto de fundo opcional (escurecida na apresentação). */
  image?: string;
}

export const MODALITIES: Modality[] = [
  { key: 'futebol', label: 'Futebol / Futsal', image: '/modalities/futebol.jpg' },
  { key: 'basquetebol', label: 'Basquetebol', image: '/modalities/basquetebol.jpg' },
  { key: 'andebol', label: 'Andebol', image: '/modalities/andebol.jpg' },
  { key: 'voleibol', label: 'Voleibol', image: '/modalities/voleibol.jpg' },
  { key: 'hoquei', label: 'Hóquei', image: '/modalities/hoquei.jpg' },
  { key: 'atletismo', label: 'Atletismo', image: '/modalities/atletismo.jpg' },
  { key: 'padel', label: 'Padel / Ténis', image: '/modalities/padel.jpg' },
  { key: 'motocross', label: 'Motocross', image: '/modalities/motocross.jpg' },
];

/** Por enquanto o catálogo digitalizado cobre futebol/futsal. */
export const ACTIVE_MODALITIES = new Set(['futebol']);

/** Fotos reais do catálogo (estúdio escuro) — dão o mesmo aspecto premium da etapa de modalidade. */
export const CATEGORIES: { key: string; label: string; image?: string }[] = [
  { key: 'jogo', label: 'Jogo', image: '/products/kit-champions.jpg' },
  { key: 'treino', label: 'Treino', image: '/products/kit-titan.jpg' },
  { key: 'saida', label: 'Saída', image: '/products/kit-galatico.jpg' },
  { key: 'acessorios', label: 'Acessórios', image: '/products/kit-guarda-redes.jpg' },
];
