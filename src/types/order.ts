import type { DesignState } from './design';

/** Item do pedido: um design finalizado (sem preço — orçamento a combinar). */
export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  /** Miniatura PNG (dataURL) capturada ao finalizar. */
  preview: string | null;
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
