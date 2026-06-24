import type { ColorRegion, ProductDef, Side } from '@/types/design';
import { renderShirt, renderShorts } from './jerseyTemplates';
import { fetchProducts, type ProductRow } from './api';

/**
 * Catálogo de produtos.
 *
 * O RENDER (SVG parametrizado por cor) vive no client, indexado por `template`.
 * O banco (Supabase) guarda apenas metadados (id, nome, categoria, template,
 * regiões), então adicionar um produto = inserir uma linha + reusar um template.
 *
 * Há um catálogo embutido (fallback) para o app funcionar offline / sem backend.
 */

/** template -> função de render. Para um produto novo, escolha um template. */
export const TEMPLATES: Record<string, (side: Side, colors: Record<string, string>) => string> = {
  shirt: renderShirt,
  shorts: renderShorts,
};

const FALLBACK_TEMPLATE = 'shirt';

export interface ProductCatalogEntry extends ProductDef {
  template: string;
  render: (side: Side, colors: Record<string, string>) => string;
}

const SHIRT_REGIONS: ColorRegion[] = [
  { key: 'body', label: 'Corpo', defaultColor: '#1e88e5' },
  { key: 'sleeves', label: 'Mangas', defaultColor: '#1565c0' },
  { key: 'collar', label: 'Gola', defaultColor: '#ffffff' },
];

const SHORTS_REGIONS: ColorRegion[] = [
  { key: 'body', label: 'Corpo', defaultColor: '#222831' },
  { key: 'waist', label: 'Cós', defaultColor: '#e0e0e0' },
  { key: 'stripe', label: 'Faixa lateral', defaultColor: '#ff5722' },
];

/** Monta uma entrada de catálogo (anexa render + thumbnail + imagens-base). */
function makeEntry(
  base: { id: string; name: string; category: 'camisa' | 'calcao'; template: string; regions: ColorRegion[] },
): ProductCatalogEntry {
  const render = TEMPLATES[base.template] ?? TEMPLATES[FALLBACK_TEMPLATE];
  const colors = defaultsOf(base.regions);
  return {
    ...base,
    render,
    thumbnail: render('front', colors),
    baseImages: { front: render('front', colors), back: render('back', colors) },
  };
}

/**
 * Catálogo mutável (mesma referência de array sempre) para que componentes que
 * o importam vejam as atualizações vindas do banco após o boot.
 */
export const PRODUCTS: ProductCatalogEntry[] = [
  makeEntry({ id: 'shirt-classic', name: 'Camisa Clássica', category: 'camisa', template: 'shirt', regions: SHIRT_REGIONS }),
  makeEntry({ id: 'shorts-pro', name: 'Calção Pro', category: 'calcao', template: 'shorts', regions: SHORTS_REGIONS }),
];

export function defaultsOf(regions: ColorRegion[]): Record<string, string> {
  return regions.reduce<Record<string, string>>((acc, r) => {
    acc[r.key] = r.defaultColor;
    return acc;
  }, {});
}

export function getProduct(id: string): ProductCatalogEntry {
  return PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
}

/** Recalcula as imagens-base (frente/verso) de um produto com as cores atuais. */
export function renderBaseImages(productId: string, colors: Record<string, string>) {
  const product = getProduct(productId);
  return {
    front: product.render('front', colors),
    back: product.render('back', colors),
  };
}

/** Substitui o conteúdo do catálogo por linhas do banco (mantém a referência). */
function applyRows(rows: ProductRow[]) {
  if (rows.length === 0) return;
  const entries = rows.map((r) =>
    makeEntry({
      id: r.id,
      name: r.name,
      category: r.category,
      template: r.template,
      regions: r.regions ?? [],
    }),
  );
  PRODUCTS.splice(0, PRODUCTS.length, ...entries);
}

/** Carrega o catálogo do Supabase (best-effort) no boot. */
export async function loadCatalog(): Promise<void> {
  try {
    const rows = await fetchProducts();
    applyRows(rows);
  } catch (e) {
    console.warn('[catalog] usando produtos embutidos:', e);
  }
}
