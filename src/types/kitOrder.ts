import type { KitDesign } from './kit';

/**
 * Artigo do carrinho do SIMULADOR DE CONJUNTOS.
 *
 * Guarda o `KitDesign` em vez de uma imagem: o conjunto é composto por
 * camadas em runtime, por isso a pré-visualização volta a ser renderizada
 * pelo mesmo motor (ver `KitPreview`) — sempre fiel, sem rasterizar nada
 * nem encher o localStorage com data-URLs.
 */
export interface KitOrderItem {
  id: string;
  /** Rótulo curto do conjunto, dos temas escolhidos (ex.: "Milan · 003"). */
  nome: string;
  design: KitDesign;
  quantidade: number;
  createdAt: string; // ISO
}
