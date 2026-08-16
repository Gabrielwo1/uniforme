import { create } from 'zustand';

/**
 * Navegação de tela cheia do app (briefing KYPZL):
 *
 *   site → kit (simulador de conjuntos)
 *   site → modalidade → categoria → modelo → editor → checkout   (?antigo)
 *
 * - "site" é a landing page institucional (entrada real do app).
 * - "kit" é o simulador por templates (o que o cliente pediu depois de
 *   rejeitar a via de IA); o funil antigo continua no código atrás de
 *   `?antigo`, para comparação e demos.
 * - "Nova" e o fecho do pedido voltam à modalidade (página 1 do funil).
 * - "Sim, continuar" (mais artigos) volta à categoria (página 2), mantendo a
 *   modalidade escolhida.
 * - "checkout" é a página real de finalização (não um popup) — resumo do
 *   pedido + formulário de dados.
 */

export type FlowScreen =
  | 'site'
  | 'kit'
  | 'kitCheckout'
  | 'modalidade'
  | 'categoria'
  | 'modelo'
  | 'editor'
  | 'checkout';

/** `?antigo` mantém o funil com o editor anterior acessível para demos. */
const FLUXO_ANTIGO = new URLSearchParams(window.location.search).has('antigo');

export interface FlowStore {
  screen: FlowScreen;
  modality: string | null; // ex.: 'futebol'
  category: string | null; // ex.: 'jogo'

  /** Sai da landing page e entra no funil do simulador. */
  enterSimulator: () => void;
  /** Volta à landing page institucional. */
  goToSite: () => void;
  chooseModality: (m: string) => void;
  chooseCategory: (c: string) => void;
  openEditor: () => void;
  /** Abre a página de checkout (resumo do pedido + formulário). */
  goToCheckout: () => void;
  /** Checkout do simulador de conjuntos (sem IA). */
  goToKitCheckout: () => void;
  /** Volta uma etapa no funil (ou do checkout para o editor). */
  back: () => void;
  /** Recomeça do zero (página 1). */
  restart: () => void;
  /** Volta à escolha de categoria (página 2), mantendo a modalidade. */
  gotoCategory: () => void;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  screen: 'site',
  modality: null,
  category: null,

  enterSimulator: () => set({ screen: FLUXO_ANTIGO ? 'modalidade' : 'kit' }),
  goToSite: () => set({ screen: 'site', modality: null, category: null }),
  chooseModality: (m) => set({ modality: m, screen: 'categoria' }),
  chooseCategory: (c) => set({ category: c, screen: 'modelo' }),
  openEditor: () => set({ screen: 'editor' }),
  goToCheckout: () => set({ screen: 'checkout' }),
  goToKitCheckout: () => set({ screen: 'kitCheckout' }),

  back: () => {
    const { screen } = get();
    if (screen === 'kitCheckout') set({ screen: 'kit' });
    else if (screen === 'kit') set({ screen: 'site' });
    else if (screen === 'checkout') set({ screen: 'editor' });
    else if (screen === 'editor') set({ screen: 'modelo' });
    else if (screen === 'modelo') set({ screen: 'categoria' });
    else if (screen === 'categoria') set({ screen: 'modalidade', modality: null });
    else if (screen === 'modalidade') set({ screen: 'site' });
  },

  restart: () => set({ screen: 'modalidade', modality: null, category: null }),

  gotoCategory: () =>
    set((s) => ({
      screen: s.modality ? 'categoria' : 'modalidade',
      category: null,
    })),
}));
