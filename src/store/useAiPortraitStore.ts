import { create } from 'zustand';
import { buildAIPortraitInput, requestAIPortrait } from '@/lib/aiPortrait';
import type { OrderItem } from '@/types/order';

/**
 * Cache partilhado da foto do jogador gerada por IA — UMA foto por
 * combinação de artigos do pedido (não uma por peça isolada; camisola +
 * calção + meia aparecem juntas no mesmo jogador). A chave do cache é o
 * `cacheKey` de `buildAIPortraitInput` (ids dos artigos ordenados).
 *
 * Usado por dois fluxos:
 *  - CartDrawer chama `generateWithModal` ao finalizar o pedido — bloqueia
 *    com um modal de progresso até a foto do conjunto completo ficar pronta.
 *  - CheckoutPage chama `fetchCombined` quando o carrinho muda — sem modal,
 *    só um badge discreto sobre o preview sintético.
 *
 * Ambos leem/escrevem o mesmo `cache`, então nunca há uma segunda chamada
 * paga para o mesmo conjunto de artigos.
 */
interface AiPortraitStore {
  cache: Record<string, string>;
  failed: Record<string, boolean>;
  pending: Record<string, boolean>;
  /** Chave em geração ativa para o modal bloqueante (null = modal fechado). */
  activeKey: string | null;
  progress: number;

  fetchCombined: (items: OrderItem[]) => Promise<string | null>;
  generateWithModal: (items: OrderItem[]) => Promise<string | null>;
  clearFailed: (cacheKey: string) => void;
}

export const useAiPortraitStore = create<AiPortraitStore>((set, get) => ({
  cache: {},
  failed: {},
  pending: {},
  activeKey: null,
  progress: 0,

  fetchCombined: async (items) => {
    if (items.length === 0) return null;
    const input = buildAIPortraitInput(items);
    const key = input.cacheKey;

    const cached = get().cache[key];
    if (cached) return cached;
    if (get().pending[key]) return null;

    set((s) => ({
      pending: { ...s.pending, [key]: true },
      failed: { ...s.failed, [key]: false },
    }));
    try {
      const result = await requestAIPortrait(input);
      set((s) => ({ cache: { ...s.cache, [key]: result.imageUrl } }));
      return result.imageUrl;
    } catch (e) {
      console.warn('[ai-portrait] falha ao gerar:', e);
      set((s) => ({ failed: { ...s.failed, [key]: true } }));
      return null;
    } finally {
      set((s) => {
        const pending = { ...s.pending };
        delete pending[key];
        return { pending };
      });
    }
  },

  generateWithModal: async (items) => {
    if (items.length === 0) return null;
    const key = buildAIPortraitInput(items).cacheKey;
    const cached = get().cache[key];
    if (cached) return cached;

    set({ activeKey: key, progress: 4 });
    // Progresso simulado — a API não expõe percentagem real; avança até
    // ~90% enquanto espera e só fecha a barra quando a foto chega mesmo.
    const interval = window.setInterval(() => {
      set((s) => ({ progress: s.progress < 90 ? s.progress + 2 + Math.random() * 3 : s.progress }));
    }, 400);

    try {
      const url = await get().fetchCombined(items);
      set({ progress: 100 });
      await new Promise((r) => setTimeout(r, 350));
      return url;
    } finally {
      window.clearInterval(interval);
      set({ activeKey: null, progress: 0 });
    }
  },

  clearFailed: (cacheKey) =>
    set((s) => {
      const failed = { ...s.failed };
      delete failed[cacheKey];
      return { failed };
    }),
}));
