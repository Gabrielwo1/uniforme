/**
 * Modelo de dados — a "fonte única de verdade" do design.
 *
 * Decisão de arquitetura importante: posições são RELATIVAS (0–1) ao canvas,
 * nunca pixels absolutos. Isso torna o design resiliente a resize do canvas e
 * permite exportar em alta resolução sem reposicionar elementos.
 */

export type Side = 'front' | 'back';

/** Lados visíveis de um produto. */
export interface BaseImages {
  front: string; // URL/dataURL da imagem-base (frente)
  back: string; // URL/dataURL da imagem-base (verso)
}

/** Acabamentos selecionados (camadas adicionais sobre a base). */
export interface Finishes {
  collar?: string; // tipo de gola
  cuff?: string; // tipo de punho
}

/** Campos comuns a todo elemento manipulável no canvas. */
export interface BaseElement {
  id: string;
  side: Side;
  /** Posição relativa (0–1) do CENTRO do objeto em relação ao canvas. */
  x: number;
  y: number;
  /** Escala aplicada sobre o tamanho natural/base do objeto. */
  scale: number;
  /** Rotação em graus. */
  rotation: number;
  locked?: boolean;
  zIndex: number;
}

export type TextKind = 'name' | 'number' | 'text';

export interface TextElement extends BaseElement {
  type: 'text';
  kind: TextKind;
  value: string;
  fontFamily: string;
  fontSize: number; // tamanho relativo à largura do canvas (px lógicos na base 1000)
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // objectURL ou dataURL
  naturalW: number;
  naturalH: number;
}

export type DesignElement = TextElement | ImageElement;

/** Definição estática de um produto disponível na galeria. */
export interface ProductDef {
  id: string;
  name: string;
  category: 'camisa' | 'calcao';
  baseImages: BaseImages;
  thumbnail: string;
  /** Regiões coloríveis deste produto. */
  regions: ColorRegion[];
}

export interface ColorRegion {
  key: string; // ex.: 'body', 'collar', 'sleeves'
  label: string; // ex.: 'Corpo', 'Gola', 'Mangas'
  defaultColor: string;
}

export interface DesignState {
  productId: string;
  side: Side;
  baseImages: BaseImages;
  finishes: Finishes;
  /** { body: '#fff', collar: '#000', ... } */
  colors: Record<string, string>;
  syncColors: boolean;
  elements: DesignElement[];
}
