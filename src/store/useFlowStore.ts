import { create } from 'zustand';

/**
 * Navegação de tela cheia do app (briefing KYPZL):
 *
 *   site → modalidade → categoria → modelo → editor → checkout
 *
 * - "site" é a landing page institucional (entrada real do app) — o
 *   simulador só começa quando o utilizador clica "Entrar no simulador".
 * - "Nova" e o fecho do pedido voltam à modalidade (página 1 do funil).
 * - "Sim, continuar" (mais artigos) volta à categoria (página 2), mantendo a
 *   modalidade escolhida.
 * - "checkout" é a página real de finalização (não um popup) — resumo do
 *   pedido + formulário de dados.
 */

export type FlowScreen = 'site' | 'modalidade' | 'categoria' | 'modelo' | 'editor' | 'checkout';

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

  enterSimulator: () => set({ screen: 'modalidade' }),
  goToSite: () => set({ screen: 'site', modality: null, category: null }),
  chooseModality: (m) => set({ modality: m, screen: 'categoria' }),
  chooseCategory: (c) => set({ category: c, screen: 'modelo' }),
  openEditor: () => set({ screen: 'editor' }),
  goToCheckout: () => set({ screen: 'checkout' }),

  back: () => {
    const { screen } = get();
    if (screen === 'checkout') set({ screen: 'editor' });
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
