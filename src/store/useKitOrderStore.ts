import { create } from 'zustand';
import type { KitDesign } from '@/types/kit';
import type { KitOrderItem } from '@/types/kitOrder';
import type { OrderCustomer } from '@/types/order';

/**
 * Carrinho do SIMULADOR DE CONJUNTOS — sem IA.
 *
 * Fluxo: "Adicionar ao carrinho" no simulador → painel lateral em dois
 * passos (lista → dados do cliente) → página de checkout. É o mesmo
 * desenho do fluxo antigo, mas sem a geração de foto pelo caminho: o
 * conjunto já é a imagem final, composta pelo motor.
 */

const KEY = 'kypzl:kit-order:v1';
const CLIENTE_KEY = 'esportes:order:customer:v1'; // partilhado com o fluxo antigo

export type PassoPainel = 'carrinho' | 'dados';

const CLIENTE_VAZIO: OrderCustomer = { name: '', email: '', phone: '', club: '', notes: '' };

function ler<T>(chave: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function gravar(chave: string, valor: unknown) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem persistência — o pedido em curso continua a funcionar */
  }
}

export interface KitOrderStore {
  itens: KitOrderItem[];
  cliente: OrderCustomer;
  painelAberto: boolean;
  passo: PassoPainel;

  adicionar: (design: KitDesign, nome: string) => void;
  remover: (id: string) => void;
  setQuantidade: (id: string, quantidade: number) => void;
  limpar: () => void;
  setCliente: (cliente: OrderCustomer) => void;
  abrirPainel: () => void;
  fecharPainel: () => void;
  setPasso: (passo: PassoPainel) => void;
}

export const useKitOrderStore = create<KitOrderStore>((set, get) => ({
  itens: ler<KitOrderItem[]>(KEY, []),
  cliente: { ...CLIENTE_VAZIO, ...ler<Partial<OrderCustomer>>(CLIENTE_KEY, {}) },
  painelAberto: false,
  passo: 'carrinho',

  adicionar: (design, nome) => {
    const item: KitOrderItem = {
      // o design é clonado: editar o simulador a seguir não pode mexer
      // no que já está no carrinho
      id: `kit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome,
      design: JSON.parse(JSON.stringify(design)) as KitDesign,
      quantidade: 1,
      createdAt: new Date().toISOString(),
    };
    const itens = [...get().itens, item];
    // NÃO abre o painel: quem carrega em "Adicionar outro" quer continuar a
    // personalizar, e ver o carrinho saltar à frente a cada conjunto é uma
    // interrupção. A confirmação é a notificação que o simulador mostra.
    set({ itens, passo: 'carrinho' });
    gravar(KEY, itens);
  },

  remover: (id) => {
    const itens = get().itens.filter((i) => i.id !== id);
    set({ itens });
    gravar(KEY, itens);
  },

  setQuantidade: (id, quantidade) => {
    const itens = get().itens.map((i) =>
      i.id === id ? { ...i, quantidade: Math.max(1, quantidade) } : i,
    );
    set({ itens });
    gravar(KEY, itens);
  },

  limpar: () => {
    set({ itens: [] });
    gravar(KEY, []);
  },

  setCliente: (cliente) => {
    set({ cliente });
    gravar(CLIENTE_KEY, cliente);
  },

  /** Abre sempre na lista — os dados são o passo seguinte. */
  abrirPainel: () => set({ painelAberto: true, passo: 'carrinho' }),
  fecharPainel: () => set({ painelAberto: false }),
  setPasso: (passo) => set({ passo }),
}));
