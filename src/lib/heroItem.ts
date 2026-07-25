import { getProduct } from './products';
import type { OrderItem } from '@/types/order';

/**
 * Artigo "herói" do pedido para a foto do jogador: prefere um artigo cuja
 * imagem já é uma foto real (isModelPhoto), senão um compatível com o
 * compositor sintético (modelTemplate), senão o primeiro artigo.
 * Partilhado entre CartDrawer (pré-geração) e CheckoutPage (passerelle).
 */
export function pickHeroItem(items: OrderItem[]): OrderItem | null {
  if (items.length === 0) return null;
  const realPhoto = items.find((it) => getProduct(it.productId).isModelPhoto);
  if (realPhoto) return realPhoto;
  const synthesizable = items.find((it) => getProduct(it.productId).modelTemplate && it.preview);
  return synthesizable ?? items[0];
}
