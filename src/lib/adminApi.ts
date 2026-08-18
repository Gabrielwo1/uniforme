import { supabase, isSupabaseConfigured } from './supabase';
import type { KitTemplateRow, LeadRow, NovoKitTemplate } from './api';

/**
 * Ponte para a Edge Function `admin`.
 *
 * Tudo o que o painel lê ou escreve passa por aqui, com o código no corpo do
 * pedido. O código é comparado NO SERVIDOR: a tabela `orders` continua
 * fechada ao público e o browser nunca vê mais do que o resultado da ação
 * que pediu. Ver o cabeçalho de supabase/functions/admin/index.ts para o
 * porquê de não ser um `if` no browser.
 */

export class ErroDeAdmin extends Error {}

async function chamar<T>(codigo: string, acao: string, dados?: unknown): Promise<T> {
  if (!isSupabaseConfigured || !supabase) {
    throw new ErroDeAdmin('Supabase não está configurado neste ambiente.');
  }

  const { data, error } = await supabase.functions.invoke('admin', {
    body: { codigo, acao, dados },
  });

  if (error) {
    // o invoke devolve o mesmo erro para 401 e para 500; o corpo é que
    // distingue, e é ele que interessa mostrar
    const corpo = await lerErro(error);
    throw new ErroDeAdmin(corpo ?? 'Não foi possível falar com o servidor.');
  }
  if (data?.erro) throw new ErroDeAdmin(data.erro);
  return data as T;
}

/** A mensagem útil vem no corpo da resposta, não na do `Error`. */
async function lerErro(error: unknown): Promise<string | null> {
  const contexto = (error as { context?: Response }).context;
  if (!contexto || typeof contexto.json !== 'function') return null;
  try {
    return (await contexto.json())?.erro ?? null;
  } catch {
    return null;
  }
}

export const admin = {
  entrar: (codigo: string) => chamar<{ ok: true }>(codigo, 'entrar'),

  leads: (codigo: string) =>
    chamar<{ leads: LeadRow[] }>(codigo, 'leads').then((r) => r.leads),

  /** Inclui os desativados — o painel precisa deles para os voltar a ligar. */
  modelos: (codigo: string) =>
    chamar<{ modelos: KitTemplateRow[] }>(codigo, 'modelos').then((r) => r.modelos),

  guardarModelo: (codigo: string, modelo: NovoKitTemplate) =>
    chamar<{ ok: true }>(codigo, 'guardar-modelo', modelo),

  alternarModelo: (codigo: string, id: string, enabled: boolean) =>
    chamar<{ ok: true }>(codigo, 'alternar-modelo', { id, enabled }),

  apagarModelo: (codigo: string, id: string) =>
    chamar<{ ok: true }>(codigo, 'apagar-modelo', { id }),
};
