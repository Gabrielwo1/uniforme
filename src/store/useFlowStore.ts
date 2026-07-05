import { create } from 'zustand';

/**
 * Funil de navegação do simulador (briefing KYPZL):
 *
 *   modalidade → categoria → modelo → editor
 *
 * - "Nova" e o fecho do pedido voltam à modalidade (página 1).
 * - "Sim, continuar" (mais artigos) volta à categoria (página 2), mantendo a
 *   modalidade escolhida.
 */

export type FlowScreen = 'modalidade' | 'categoria' | 'modelo' | 'editor';

export interface FlowStore {
  screen: FlowScreen;
  modality: string | null; // ex.: 'futebol'
  category: string | null; // ex.: 'jogo'

  chooseModality: (m: string) => void;
  chooseCategory: (c: string) => void;
  openEditor: () => void;
  /** Volta uma etapa no funil. */
  back: () => void;
  /** Recomeça do zero (página 1). */
  restart: () => void;
  /** Volta à escolha de categoria (página 2), mantendo a modalidade. */
  gotoCategory: () => void;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
  screen: 'modalidade',
  modality: null,
  category: null,

  chooseModality: (m) => set({ modality: m, screen: 'categoria' }),
  chooseCategory: (c) => set({ category: c, screen: 'modelo' }),
  openEditor: () => set({ screen: 'editor' }),

  back: () => {
    const { screen } = get();
    if (screen === 'editor') set({ screen: 'modelo' });
    else if (screen === 'modelo') set({ screen: 'categoria' });
    else if (screen === 'categoria') set({ screen: 'modalidade', modality: null });
  },

  restart: () => set({ screen: 'modalidade', modality: null, category: null }),

  gotoCategory: () =>
    set((s) => ({
      screen: s.modality ? 'categoria' : 'modalidade',
      category: null,
    })),
}));
