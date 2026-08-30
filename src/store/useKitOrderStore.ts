import { create } from 'zustand';
import { PECAS_KIT, type KitDesign, type PecaKit } from '@/types/kit';
import type { KitOrderItem, LinhaOrcamento } from '@/types/kitOrder';
import type { OrderCustomer } from '@/types/order';

/**
 * Orçamento do SIMULADOR DE CONJUNTOS — sem IA.
 *
 * Fluxo: "Adicionar outro" guarda o conjunto e continua; "Orçamento" abre a
 * página do orçamento (estilo do concorrente), onde cada conjunto se
 * desdobra em três linhas — camisola, calção, meião — com quantidade,
 * tamanhos e personalização por linha.
 */

const KEY = 'kypzl:kit-order:v1';
const CLIENTE_KEY = 'esportes:order:customer:v1'; // partilhado com o fluxo antigo

/** Quantidade com que cada linha nasce — o mínimo habitual de produção
    (o concorrente usa o mesmo valor). */
export const QUANTIDADE_INICIAL = 10;

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

function linhasNovas(quantidade = QUANTIDADE_INICIAL): Record<PecaKit, LinhaOrcamento> {
  return Object.fromEntries(
    PECAS_KIT.map((p) => [p, { incluida: true, quantidade }]),
  ) as Record<PecaKit, LinhaOrcamento>;
}

/** Carrinhos gravados antes das linhas existirem ganham-nas ao carregar,
    herdando a quantidade do conjunto (se era 1, era só o valor por
    omissão de então — sobe para o mínimo). */
function migrar(itens: KitOrderItem[]): KitOrderItem[] {
  return itens.map((i) =>
    i.linhas ? i : { ...i, linhas: linhasNovas(i.quantidade > 1 ? i.quantidade : QUANTIDADE_INICIAL) },
  );
}

export interface KitOrderStore {
  itens: KitOrderItem[];
  cliente: OrderCustomer;

  adicionar: (design: KitDesign, nome: string) => void;
  remover: (id: string) => void;
  setLinha: (id: string, peca: PecaKit, mudanca: Partial<LinhaOrcamento>) => void;
  limpar: () => void;
  setCliente: (cliente: OrderCustomer) => void;
}

export const useKitOrderStore = create<KitOrderStore>((set, get) => ({
  itens: migrar(ler<KitOrderItem[]>(KEY, [])),
  cliente: { ...CLIENTE_VAZIO, ...ler<Partial<OrderCustomer>>(CLIENTE_KEY, {}) },

  adicionar: (design, nome) => {
    const item: KitOrderItem = {
      // o design é clonado: editar o simulador a seguir não pode mexer
      // no que já está no orçamento
      id: `kit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome,
      design: JSON.parse(JSON.stringify(design)) as KitDesign,
      quantidade: 1,
      linhas: linhasNovas(),
      createdAt: new Date().toISOString(),
    };
    const itens = [...get().itens, item];
    set({ itens });
    gravar(KEY, itens);
  },

  remover: (id) => {
    const itens = get().itens.filter((i) => i.id !== id);
    set({ itens });
    gravar(KEY, itens);
  },

  setLinha: (id, peca, mudanca) => {
    const itens = get().itens.map((i) => {
      if (i.id !== id) return i;
      const atual = i.linhas?.[peca] ?? { incluida: true, quantidade: QUANTIDADE_INICIAL };
      const linha: LinhaOrcamento = { ...atual, ...mudanca };
      linha.quantidade = Math.max(1, linha.quantidade);
      return { ...i, linhas: { ...(i.linhas ?? linhasNovas()), [peca]: linha } };
    });
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
}));
