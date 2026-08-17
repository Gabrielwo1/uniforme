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
 * Uma zona da peça que se pode colorir à parte: corpo, gola, punhos.
 *
 * Cada zona é um recorte próprio (`forma`), o que permite dar-lhe uma cor
 * independente — sem isto a gola e os punhos ficariam presos à cor do corpo.
 * A `forma` pode vir de duas origens, e é por isso que há dois campos:
 *
 *  - `imagem`: PNG recortado e dessaturado da zona (o caminho normal, porque
 *    os mockups PSD já têm gola e punhos em camadas separadas). Dá a forma
 *    (canal alfa) **e** o sombreado do tecido de uma só vez.
 *  - `silhueta`: path SVG, para quando existe arte vetorial da zona.
 */
export interface ZonaPeca {
  id: string;
  nome: string;
  imagem?: string;
  silhueta?: string;
  corPadrao: string;
  /** Só a zona do corpo recebe a estampa; gola e punhos ficam de fora. */
  recebeEstampa?: boolean;
}

/**
 * Molde de uma peça — o conjunto das suas zonas coloríveis.
 *
 * O `viewBox` tem de ser partilhado com as estampas, senão o desenho não
 * encaixa na peça.
 */
export interface MoldePeca {
  peca: PecaKit;
  lado: LadoKit;
  viewBox: string;
  zonas: ZonaPeca[];
  /** Costuras e vivos que não mudam de cor — SVG interno, por cima de tudo. */
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
  /** Janela (viewBox) do desenho para a miniatura quadrada da galeria —
      mostra o padrão flat, como na referência, e não a peça vestida. */
  amostraViewBox?: string;
}

/* ---------------------------------------------------------- aplicações -- */

/** O que se aplica sobre a peça, já depois da estampa. */
export type TipoAplicacao = 'texto' | 'numero' | 'logo';

export const TIPO_APLICACAO_LABEL: Record<TipoAplicacao, string> = {
  texto: 'Nome / texto',
  numero: 'Número',
  logo: 'Escudo / logo',
};

/**
 * Um nome, número ou logo colocado num LOCAL do catálogo (`kitLocais`).
 *
 * A aplicação guarda a ESCOLHA, não a geometria: a caixa vem do local, e a
 * aplicação só lhe mexe dentro de limites (escala e um deslocamento fino em
 * fração da caixa). É o que impede o escudo de acabar fora da peça e o que
 * faz a mesma escolha servir os dois ambientes, cujas peças estão em sítios
 * diferentes da tela.
 */
export interface Aplicacao {
  id: string;
  tipo: TipoAplicacao;
  localId: string;
  /** Conteúdo dos tipos `texto` e `numero`. */
  texto?: string;
  /** Imagem dos logos — data URL (o ficheiro nunca sai do browser). */
  imagem?: string;
  /** Nome do ficheiro do logo, para a ficha de produção. */
  nomeFicheiro?: string;
  cor: string;
  /** Contorno do texto; vazio = sem contorno. */
  corContorno: string;
  fonteId: string;
  /** 0.5 a 1.5 da caixa do local. */
  escala: number;
  /** Deslocamento fino, em fração da caixa do local (−0.5 a 0.5). */
  dx: number;
  dy: number;
}

/** Escolhas do utilizador para UMA peça. */
export interface PecaConfig {
  estampaId: string;
  /** Cor por ZONA do molde (corpo, gola, punhos). Ausente = `corPadrao`. */
  coresZonas: Record<string, string>;
  /** Cor por CAMADA da estampa. Ausente = `corPadrao` da camada. */
  cores: Record<string, string>;
}

/** O conjunto completo em edição. */
export interface KitDesign {
  pecas: Record<PecaKit, PecaConfig>;
  /** Nomes, números e logos aplicados — ver `Aplicacao`. Pode faltar em
      conjuntos guardados antes desta funcionalidade. */
  aplicacoes?: Aplicacao[];
  /**
   * Peças "presas" ao cadeado: mudar a estampa/cor de uma delas propaga às
   * outras presas (o "Sincronizar Jersey e Calção" da referência).
   */
  sincronizadas: PecaKit[];
}
