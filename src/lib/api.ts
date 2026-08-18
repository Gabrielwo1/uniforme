import type {
  BaseImages,
  ColorRegion,
  DesignState,
  ProductCategory,
} from '@/types/design';
import type { OrderCustomer, OrderItem } from '@/types/order';
import { supabase } from './supabase';
import { uid } from './id';

/* ------------------------------------------------------------- PRODUTOS -- */

export interface ProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  template: string; // 'shirt' | 'shorts' (SVG recolorível) | 'image' (render fixo)
  regions: ColorRegion[];
  /** Para template 'image': caminhos/URLs dos renders frente/verso. */
  base_images: BaseImages | null;
  sort_order: number;
  /** false = oculto das telas de seleção. */
  enabled: boolean;
}

/** Busca o catálogo no Supabase. Retorna [] se não configurado/falhar. */
export async function fetchProducts(): Promise<ProductRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, template, regions, base_images, sort_order, enabled')
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

/* --------------------------------------------------------------- PEDIDOS -- */

/**
 * Envia o pedido (sem preço/cobrança). A tabela `orders` só permite INSERT
 * para o anon — os pedidos são lidos pela KYPZL no dashboard do Supabase.
 */
export async function submitOrder(
  customer: OrderCustomer,
  items: OrderItem[],
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('orders').insert({ customer, items });
  if (error) throw new Error(error.message);
}

/**
 * Pedido do SIMULADOR DE CONJUNTOS. Vai para a mesma tabela `orders`: a
 * coluna `items` é JSON, por isso aceita as duas formas de artigo (design
 * do editor antigo ou conjunto do simulador).
 */
export async function submitKitOrder(
  customer: OrderCustomer,
  items: unknown[],
): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('orders').insert({ customer, items });
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

/* ------------------------------------------------------ ADMINISTRAÇÃO -- */

/**
 * Os pedidos são a lista de LEADS. A tabela está FECHADA — nem sequer à
 * chave anónima, que vai dentro do JavaScript. Quem os lê é a Edge Function
 * `admin`, com a chave de serviço, depois de conferir o código de acesso
 * (ver src/lib/adminApi.ts). Aqui fica só o tipo, que é partilhado.
 */
export interface LeadRow {
  id: string;
  customer: OrderCustomer;
  /** Pode ser KitOrderItem[] (simulador) ou OrderItem[] (editor antigo). */
  items: unknown[];
  created_at: string;
}

/* ------------------------------------------------------------ MODELOS -- */

export interface KitTemplateRow {
  id: string;
  cod_modelo: string;
  nome: string;
  peca: 'camisola' | 'calcao' | 'meiao';
  lado: 'frente' | 'verso';
  quadro: { x: number; y: number; w: number; h: number };
  cor_fundo: string | null;
  camadas: { id: string; cor: string; svg: string }[];
  enabled: boolean;
  created_at: string;
}

/** Modelos ATIVOS, para o simulador. A leitura é pública de propósito — a
    arte de um tema não é segredo, e é preciso desenhá-la a quem visita. Os
    desativados só o painel vê, pela Edge Function. */
export async function fetchKitTemplates(): Promise<KitTemplateRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('kit_templates')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('[api] fetchKitTemplates:', error.message);
    return [];
  }
  return (data ?? []) as KitTemplateRow[];
}

export type NovoKitTemplate = Omit<KitTemplateRow, 'id' | 'created_at' | 'enabled'>;
