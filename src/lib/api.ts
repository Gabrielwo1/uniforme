import type { ColorRegion, DesignState } from '@/types/design';
import { supabase } from './supabase';
import { uid } from './id';

/* ------------------------------------------------------------- PRODUTOS -- */

export interface ProductRow {
  id: string;
  name: string;
  category: 'camisa' | 'calcao';
  template: string; // 'shirt' | 'shorts' -> render no client
  regions: ColorRegion[];
  sort_order: number;
}

/** Busca o catálogo no Supabase. Retorna [] se não configurado/falhar. */
export async function fetchProducts(): Promise<ProductRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, template, regions, sort_order')
    .order('sort_order', { ascending: true });
  if (error) {
    console.warn('[api] fetchProducts:', error.message);
    return [];
  }
  return (data ?? []) as ProductRow[];
}

/* -------------------------------------------------------------- DESIGNS -- */

export interface DesignRow {
  id: string;
  name: string;
  state: DesignState;
  preview: string | null;
  updated_at: string;
}

export interface DesignListItem {
  id: string;
  name: string;
  preview: string | null;
  updated_at: string;
}

/** Cria ou atualiza um design. Retorna o id (cloud) salvo. */
export async function saveDesignCloud(params: {
  id?: string | null;
  name: string;
  state: DesignState;
  preview?: string | null;
}): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado');
  const payload = {
    name: params.name,
    state: params.state,
    preview: params.preview ?? null,
  };

  if (params.id) {
    const { error } = await supabase
      .from('designs')
      .update(payload)
      .eq('id', params.id);
    if (error) throw new Error(error.message);
    return params.id;
  }

  const { data, error } = await supabase
    .from('designs')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/** Lista designs salvos (sem o state pesado). */
export async function listDesigns(): Promise<DesignListItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('designs')
    .select('id, name, preview, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);
  if (error) {
    console.warn('[api] listDesigns:', error.message);
    return [];
  }
  return (data ?? []) as DesignListItem[];
}

/** Carrega um design completo pelo id. */
export async function getDesignCloud(id: string): Promise<DesignRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('designs')
    .select('id, name, state, preview, updated_at')
    .eq('id', id)
    .single();
  if (error) {
    console.warn('[api] getDesignCloud:', error.message);
    return null;
  }
  return data as DesignRow;
}

export async function deleteDesignCloud(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('designs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------- STORAGE -- */

const BUCKET = 'logos';

/** Sobe um arquivo de logo e devolve a URL pública. */
export async function uploadLogo(blob: Blob, ext = 'png'): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado');
  const path = `${uid('logo')}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: blob.type || `image/${ext}`,
      upsert: false,
      cacheControl: '31536000',
    });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
