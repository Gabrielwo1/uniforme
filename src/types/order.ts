import type { DesignState, Side } from './design';

/** Item do pedido: um design finalizado (sem preço — orçamento a combinar). */
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  /** Miniatura principal (frente) — usada nas listas do carrinho. */
  preview: string | null;
  /**
   * Prancha de CADA lado personalizado (frente, verso e perfil quando
   * existe). É o design completo: serve as miniaturas do checkout e, sobretudo,
   * as referências enviadas à IA — antes só ia o lado que estava aberto ao
   * finalizar, e a personalização dos outros lados perdia-se.
   */
  previews: Partial<Record<Side, string>>;
  design: DesignState;
  createdAt: string; // ISO
}

/** Dados do cliente preenchidos no fecho do pedido. */
export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  club?: string;
  notes?: string;
}
