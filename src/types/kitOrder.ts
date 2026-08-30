import type { KitDesign, PecaKit } from './kit';

/**
 * Artigo do carrinho do SIMULADOR DE CONJUNTOS.
 *
 * Guarda o `KitDesign` em vez de uma imagem: o conjunto é composto por
 * camadas em runtime, por isso a pré-visualização volta a ser renderizada
 * pelo mesmo motor (ver `KitPreview`) — sempre fiel, sem rasterizar nada
 * nem encher o localStorage com data-URLs.
 */

/**
 * Uma linha do orçamento — UMA peça do conjunto: cada conjunto abre em
 * três produtos que se podem tirar/pôr e quantificar. Tamanhos, nomes e
 * números ficam para a conversa (decisão do cliente: só quantidades).
 */
export interface LinhaOrcamento {
  /** Desmarcada = a peça sai do orçamento (mas fica na linha, remarcável). */
  incluida: boolean;
  quantidade: number;
}

export interface KitOrderItem {
  id: string;
  /** Rótulo curto do conjunto, dos temas escolhidos (ex.: "Milan · 003"). */
  nome: string;
  design: KitDesign;
  /** Quantidade do conjunto INTEIRO — formato antigo, mantido para os
      pedidos já registados e para o painel de administração. Nos novos, a
      verdade são as `linhas`. */
  quantidade: number;
  linhas?: Record<PecaKit, LinhaOrcamento>;
  createdAt: string; // ISO
}
