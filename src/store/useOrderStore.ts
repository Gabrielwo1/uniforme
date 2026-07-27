import { create } from 'zustand';
import type { OrderCustomer, OrderItem } from '@/types/order';

/**
 * Pedido em montagem (carrinho sem preço).
 *
 * "Adicionar ao carrinho" no editor e o botão de carrinho abrem o CartDrawer
 * (painel lateral estilo e-commerce), que tem dois passos:
 *   1. 'cart' — lista de artigos ("Finalizar pedido" avança, "Continuar a
 *      editar" fecha).
 *   2. 'form' — dados de contacto do cliente. Ao confirmar, dispara o modal
 *      de geração da foto por IA e abre o checkout já com tudo preenchido.
 */

const KEY = 'esportes:order:v1';
const CUSTOMER_KEY = 'esportes:order:customer:v1';

/** Passo do painel lateral: lista de artigos → dados do cliente. */
export type DrawerStep = 'cart' | 'form';

const EMPTY_CUSTOMER: OrderCustomer = {
  name: '',
  email: '',
  phone: '',
  club: '',
  notes: '',
};

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

/** Dados de contacto ficam guardados para não obrigar a reescrever tudo. */
function loadCustomer(): OrderCustomer {
  try {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw
      ? { ...EMPTY_CUSTOMER, ...(JSON.parse(raw) as OrderCustomer) }
      : { ...EMPTY_CUSTOMER };
  } catch {
    return { ...EMPTY_CUSTOMER };
  }
}

function persistCustomer(customer: OrderCustomer) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    /* sem persistência — o pedido em curso continua a funcionar */
  }
}

export interface OrderStore {
  items: OrderItem[];
  /** Dados de contacto preenchidos no passo 'form' do painel. */
  customer: OrderCustomer;
  /** Painel lateral do carrinho (CartDrawer) aberto? */
  drawerOpen: boolean;
  /** Passo atual do painel lateral. */
  drawerStep: DrawerStep;
  /** Incrementa para pedir ao LeftPanel que volte à aba Produtos. */
  gotoProductsSignal: number;

  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  setCustomer: (customer: OrderCustomer) => void;
  clearCustomer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setDrawerStep: (step: DrawerStep) => void;
  requestProductsTab: () => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  items: loadItems(),
  customer: loadCustomer(),
  drawerOpen: false,
  drawerStep: 'cart',
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

  setCustomer: (customer) => {
    set({ customer });
    persistCustomer(customer);
  },

  clearCustomer: () => {
    const customer = { ...EMPTY_CUSTOMER };
    set({ customer });
    persistCustomer(customer);
  },

  /** Abre sempre no passo da lista — o formulário é o passo seguinte. */
  openDrawer: () => set({ drawerOpen: true, drawerStep: 'cart' }),
  closeDrawer: () => set({ drawerOpen: false }),
  setDrawerStep: (drawerStep) => set({ drawerStep }),

  requestProductsTab: () =>
    set((s) => ({ gotoProductsSignal: s.gotoProductsSignal + 1 })),
}));
