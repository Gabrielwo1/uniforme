import { create } from 'zustand';
import { buildAIPortraitInput, requestAIPortrait } from '@/lib/aiPortrait';
import type { OrderItem } from '@/types/order';

/**
 * Cache partilhado das fotos do jogador geradas por IA (uma chamada por
 * artigo, nunca repetida). Usado por dois fluxos:
 *
 *  - CartDrawer chama `generateWithModal` ao finalizar o pedido — bloqueia
 *    com um modal de progresso até a foto do artigo "herói" ficar pronta.
 *  - CheckoutPage chama `fetchOne` ao trocar o artigo em destaque — sem
 *    modal, só um badge discreto sobre o preview sintético.
 *
 * Ambos leem/escrevem o mesmo `cache`, então nunca há uma segunda chamada
 * paga para o mesmo artigo.
 */
interface AiPortraitStore {
  cache: Record<string, string>;
  failed: Record<string, boolean>;
  pending: Record<string, boolean>;
  /** Artigo em geração ativa para o modal bloqueante (null = modal fechado). */
  activeItemId: string | null;
  progress: number;

  fetchOne: (item: OrderItem) => Promise<string | null>;
  generateWithModal: (item: OrderItem) => Promise<string | null>;
  clearFailed: (itemId: string) => void;
}

export const useAiPortraitStore = create<AiPortraitStore>((set, get) => ({
  cache: {},
  failed: {},
  pending: {},
  activeItemId: null,
  progress: 0,

  fetchOne: async (item) => {
    const cached = get().cache[item.id];
    if (cached) return cached;
    if (get().pending[item.id]) return null;

    set((s) => ({
      pending: { ...s.pending, [item.id]: true },
      failed: { ...s.failed, [item.id]: false },
    }));
    try {
      const result = await requestAIPortrait(buildAIPortraitInput(item));
      set((s) => ({ cache: { ...s.cache, [item.id]: result.imageUrl } }));
      return result.imageUrl;
    } catch (e) {
      console.warn('[ai-portrait] falha ao gerar:', e);
      set((s) => ({ failed: { ...s.failed, [item.id]: true } }));
      return null;
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[item.id];
        return { pending };
      });
    }
  },

  generateWithModal: async (item) => {
    const cached = get().cache[item.id];
    if (cached) return cached;

    set({ activeItemId: item.id, progress: 4 });
    // Progresso simulado — a API não expõe percentagem real; avança até
    // ~90% enquanto espera e só fecha a barra quando a foto chega mesmo.
    const interval = window.setInterval(() => {
      set((s) => ({ progress: s.progress < 90 ? s.progress + 2 + Math.random() * 3 : s.progress }));
    }, 400);

    try {
      const url = await get().fetchOne(item);
      set({ progress: 100 });
      await new Promise((r) => setTimeout(r, 350));
      return url;
    } finally {
      window.clearInterval(interval);
      set({ activeItemId: null, progress: 0 });
    }
  },

  clearFailed: (itemId) =>
    set((s) => {
      const failed = { ...s.failed };
      delete failed[itemId];
      return { failed };
    }),
}));
