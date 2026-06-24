import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase. As credenciais vêm de variáveis de ambiente do Vite
 * (VITE_*). Se não estiverem configuradas, `supabase` é null e o app degrada
 * graciosamente para o modo 100% local (localStorage + dataURL).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false },
    })
  : null;
