import { create } from 'zustand';
import type { OrderItem } from '@/types/order';

/**
 * Pedido em montagem (carrinho sem preço) + máquina de estados do fluxo de
 * finalização:
 *
 *  idle → (Finalizar) → ask "Pretende mais alguma coisa?"
 *    SIM → idle (nova simulação, volta aos produtos)
 *    NÃO → checkout (formulário de dados) → done (modal "Pedido Realizado")
 *  view = visualização do pedido (aberta pela sacola do topo)
 */

export type OrderStep = 'idle' | 'ask' | 'view' | 'checkout' | 'done';

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
  step: OrderStep;
  /** Incrementa para pedir ao LeftPanel que volte à aba Produtos. */
  gotoProductsSignal: number;

  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setStep: (step: OrderStep) => void;
  requestProductsTab: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  items: loadItems(),
  step: 'idle',
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

  setStep: (step) => set({ step }),

  requestProductsTab: () =>
    set((s) => ({ gotoProductsSignal: s.gotoProductsSignal + 1 })),
}));
