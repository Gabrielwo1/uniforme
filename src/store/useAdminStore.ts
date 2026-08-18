import { create } from 'zustand';
import { admin, ErroDeAdmin } from '@/lib/adminApi';

/**
 * Entrada na administração por CÓDIGO.
 *
 * O código não é verificado aqui — é enviado à Edge Function `admin`, que o
 * compara no servidor e só então lê ou escreve. Este store guarda-o para as
 * chamadas seguintes não voltarem a pedi-lo, e é tudo o que faz.
 *
 * Fica em `sessionStorage`, não em `localStorage`: num computador partilhado
 * do escritório, fechar o separador tira a sessão. São quatro dígitos, custa
 * pouco escrever outra vez.
 */

const CHAVE = 'kypzl:admin-codigo';

interface AdminStore {
  codigo: string | null;
  erro: string | null;
  aEntrar: boolean;

  /** Revalida o código guardado no arranque — se o tiverem mudado no
      servidor, mais vale o painel pedir de novo do que falhar a cada ecrã. */
  retomar: () => Promise<void>;
  aVerificar: boolean;

  entrar: (codigo: string) => Promise<void>;
  sair: () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  codigo: null,
  erro: null,
  aEntrar: false,
  aVerificar: true,

  retomar: async () => {
    const guardado = sessionStorage.getItem(CHAVE);
    if (!guardado) {
      set({ aVerificar: false });
      return;
    }
    try {
      await admin.entrar(guardado);
      set({ codigo: guardado, aVerificar: false });
    } catch {
      sessionStorage.removeItem(CHAVE);
      set({ aVerificar: false });
    }
  },

  entrar: async (codigo) => {
    set({ aEntrar: true, erro: null });
    try {
      await admin.entrar(codigo);
      sessionStorage.setItem(CHAVE, codigo);
      set({ codigo, aEntrar: false });
    } catch (e) {
      set({
        aEntrar: false,
        erro: e instanceof ErroDeAdmin ? e.message : 'Não foi possível entrar.',
      });
    }
  },

  sair: () => {
    sessionStorage.removeItem(CHAVE);
    set({ codigo: null, erro: null });
  },
}));
