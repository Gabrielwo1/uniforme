/**
 * Modelo de dados do simulador por TEMPLATE (estampas vetoriais), que
 * substitui o anterior baseado em fotos fixas.
 *
 * A ideia central: a peça não é uma imagem, é uma composição de camadas.
 * Cada estampa ("Cod. Modelo") traz um SVG por COR — o utilizador troca a cor
 * de cada camada e a peça recolore de verdade, em vez de trocar de foto.
 *
 * Ordem de composição (de trás para a frente), ver `PecaMockup`:
 *   1. cor base, preenchendo a silhueta do molde
 *   2. camadas da estampa, recortadas pela silhueta
 *   3. textura de sombreado (multiply) — o que dá o aspeto de tecido
 *   4. detalhes (costuras/gola), quando o molde os traz
 */

/** Peças que compõem um conjunto. */
export type PecaKit = 'camisola' | 'calcao' | 'meiao';

/** Lados renderizados de cada peça. */
export type LadoKit = 'frente' | 'verso';

export const PECAS_KIT: PecaKit[] = ['camisola', 'calcao', 'meiao'];
export const LADOS_KIT: LadoKit[] = ['frente', 'verso'];

export const PECA_LABEL: Record<PecaKit, string> = {
  camisola: 'Camisola',
  calcao: 'Calção',
  meiao: 'Meião',
};

export const LADO_LABEL: Record<LadoKit, string> = {
  frente: 'Frente',
  verso: 'Verso',
};

/**
 * Molde de uma peça: a silhueta que recebe a cor base e recorta as estampas.
 *
 * `silhueta` é o atributo `d` de um path — o mesmo artboard (`viewBox`) tem de
 * ser partilhado com as estampas, senão o desenho não encaixa na peça.
 */
export interface MoldePeca {
  peca: PecaKit;
  lado: LadoKit;
  viewBox: string;
  silhueta: string;
  /** Sombreado de tecido em multiply (URL). Sem ele a peça fica "chapada". */
  textura?: string;
  /** Costuras, gola, punhos — SVG interno desenhado por cima de tudo. */
  detalhes?: string;
}

/**
 * Uma camada de cor da estampa. Cada uma é um SVG exportado do Illustrator
 * cujo desenho é monocromático — a cor é aplicada em runtime.
 */
export interface CamadaEstampa {
  id: string;
  nome: string;
  /** SVG interno (sem o elemento <svg> exterior) por lado. */
  desenho: Partial<Record<LadoKit, string>>;
  corPadrao: string;
}

/** Um template de estampa aplicável a uma peça ("Cod. Modelo"). */
export interface Estampa {
  id: string;
  codModelo: string;
  nome: string;
  peca: PecaKit;
  corBasePadrao: string;
  camadas: CamadaEstampa[];
}

/** Escolhas do utilizador para UMA peça. */
export interface PecaConfig {
  estampaId: string;
  corBase: string;
  /** Cor por camada (id da camada → hex). Ausente = usa `corPadrao`. */
  cores: Record<string, string>;
}

/** O conjunto completo em edição. */
export interface KitDesign {
  pecas: Record<PecaKit, PecaConfig>;
  /**
   * Peças "presas" ao cadeado: mudar a estampa/cor de uma delas propaga às
   * outras presas (o "Sincronizar Jersey e Calção" da referência).
   */
  sincronizadas: PecaKit[];
}
