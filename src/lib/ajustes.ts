import { createContext, useContext, type CSSProperties } from 'react';
import { create } from 'zustand';
import { supabase } from './supabase';
import type { LadoKit, PecaKit } from '@/types/kit';

/**
 * Ajustes finos da prancheta — o que o editor de camadas do admin grava.
 *
 * Cada camada da prancheta (jogador, botas, e as zonas de cada peça) pode ter
 * um deslocamento em píxeis da TELA COMUM (1520×2460), em décimas de píxel se
 * for preciso. O que o simulador aplica é o `publicado`; o admin edita um
 * rascunho e só depois publica.
 *
 * Chave de uma camada: `jogador`, `botas`, `<peca>.<zona>` (`camisola.gola`)
 * e `<peca>.pele` para os detalhes (a pele do decote dos estilos de gola).
 */

export const TELA = { w: 1520, h: 2460 };

export interface Ajuste {
  dx: number;
  dy: number;
  oculta?: boolean;
}

/** Camadas ajustadas de UM lado, por chave de camada. */
export type AjustesLado = Record<string, Ajuste>;
export type AjustesTodos = Record<LadoKit, AjustesLado>;

export const AJUSTES_VAZIOS: AjustesTodos = { frente: {}, verso: {} };

export const chaveZona = (peca: PecaKit, zona: string) => `${peca}.${zona}`;

/** Um ajuste que não muda nada não precisa de ficar guardado. */
export const ajusteNulo = (a?: Ajuste) => !a || (a.dx === 0 && a.dy === 0 && !a.oculta);

/** Remove os ajustes nulos antes de gravar. */
export function limparAjustes(a: AjustesLado): AjustesLado {
  return Object.fromEntries(Object.entries(a).filter(([, v]) => !ajusteNulo(v)));
}

interface AjustesStore {
  publicados: AjustesTodos;
  carregar: () => Promise<void>;
}

/** O que o simulador aplica. Falhar a ler não pode partir nada: sem rede, a
    prancheta fica como vem nos ficheiros. */
export const useAjustesStore = create<AjustesStore>((set) => ({
  publicados: AJUSTES_VAZIOS,
  carregar: async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('molde_ajustes').select('lado, publicado');
    if (error) {
      console.warn('[ajustes] leitura:', error.message);
      return;
    }
    const todos: AjustesTodos = { frente: {}, verso: {} };
    for (const l of (data ?? []) as { lado: string; publicado: AjustesLado | null }[]) {
      if (l.lado === 'frente' || l.lado === 'verso') todos[l.lado] = l.publicado ?? {};
    }
    set({ publicados: todos });
  },
}));

/** O editor do admin mostra o RASCUNHO por cima do que está publicado, sem
    tocar no simulador real: quem renderiza lê daqui antes de ler o store. */
export const AjustesRascunhoCtx = createContext<AjustesTodos | null>(null);

export function useAjuste(lado: LadoKit, chave: string): Ajuste | undefined {
  const rascunho = useContext(AjustesRascunhoCtx);
  const publicados = useAjustesStore((s) => s.publicados);
  return (rascunho ?? publicados)[lado]?.[chave];
}

/** Estilo CSS do ajuste. Em percentagem da própria camada — que enche a
    prancheta — por isso serve a qualquer tamanho a que o palco seja escalado. */
export function estiloAjuste(a?: Ajuste): CSSProperties | undefined {
  if (!a) return undefined;
  const estilo: CSSProperties = {};
  if (a.dx || a.dy) {
    estilo.transform = `translate(${(a.dx / TELA.w) * 100}%, ${(a.dy / TELA.h) * 100}%)`;
  }
  if (a.oculta) estilo.visibility = 'hidden';
  return estilo;
}
