import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

/**
 * Sessão da área de administração.
 *
 * Não há registo aberto: a conta é criada pela KYPZL no painel do Supabase
 * (Authentication → Users). É isso que mantém a lista de leads fechada —
 * a política de leitura da tabela `orders` exige sessão iniciada, e sem
 * utilizador criado à mão não há quem inicie.
 *
 * A sessão é gerida pelo próprio cliente Supabase (guarda e renova o token);
 * este store só espelha o estado para a interface.
 */

interface AdminStore {
  email: string | null;
  /** null enquanto ainda não se sabe — evita piscar o ecrã de entrada a
      quem já tem sessão guardada. */
  aVerificar: boolean;
  erro: string | null;
  aEntrar: boolean;

  iniciar: () => () => void;
  entrar: (email: string, palavra: string) => Promise<void>;
  sair: () => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  email: null,
  aVerificar: true,
  erro: null,
  aEntrar: false,

  /** Liga o store ao cliente Supabase. Devolve a função de desligar. */
  iniciar: () => {
    if (!supabase) {
      set({ aVerificar: false });
      return () => {};
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ email: data.session?.user.email ?? null, aVerificar: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, sessao) => {
      set({ email: sessao?.user.email ?? null, aVerificar: false });
    });
    return () => data.subscription.unsubscribe();
  },

  entrar: async (email, palavra) => {
    if (!supabase) {
      set({ erro: 'Supabase não configurado neste ambiente.' });
      return;
    }
    set({ aEntrar: true, erro: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password: palavra });
    set({
      aEntrar: false,
      // a mensagem da API vem em inglês e é sempre a mesma para utilizador
      // errado ou palavra errada (de propósito, para não revelar contas)
      erro: error ? 'E-mail ou palavra-passe incorretos.' : null,
    });
  },

  sair: async () => {
    await supabase?.auth.signOut();
    set({ email: null });
  },
}));
