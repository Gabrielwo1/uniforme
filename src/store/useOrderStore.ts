import { create } from 'zustand';
import type { OrderItem } from '@/types/order';

/**
 * Pedido em montagem (carrinho sem preço).
 *
 * "Finalizar" no editor e o botão de carrinho abrem o CartDrawer (painel
 * lateral estilo e-commerce) — lá o utilizador escolhe "Finalizar pedido"
 * (segue para o checkout, com o modal de geração da foto por IA) ou
 * "Continuar a editar" (só fecha o painel).
 */

const KEY = 'esportes:order:v1';

function loadItems(): OrderItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function persist(items: OrderItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota cheia — segue sem persistir (previews são grandes) */
  }
}

export interface OrderStore {
  items: OrderItem[];
  /** Painel lateral do carrinho (CartDrawer) aberto? */
  drawerOpen: boolean;
  /** Incrementa para pedir ao LeftPanel que volte à aba Produtos. */
  gotoProductsSignal: number;

  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  requestProductsTab: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  items: loadItems(),
  drawerOpen: false,
  gotoProductsSignal: 0,

  addItem: (item) => {
    const items = [...get().items, item];
    set({ items });
    persist(items);
  },

  removeItem: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    set({ items });
    persist(items);
  },

  clearItems: () => {
    set({ items: [] });
    persist([]);
  },

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),

  requestProductsTab: () =>
    set((s) => ({ gotoProductsSignal: s.gotoProductsSignal + 1 })),
}));
