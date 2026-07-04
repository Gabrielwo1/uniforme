import type {
  BaseImages,
  ColorRegion,
  ProductCategory,
  ProductDef,
  Side,
} from '@/types/design';
import { renderShirt, renderShorts } from './jerseyTemplates';
import { fetchProducts, type ProductRow } from './api';

/**
 * Catálogo de produtos. Dois tipos de template:
 *
 *  - SVG paramétrico ('shirt' | 'shorts'): renderizado no client por cor de
 *    região — produto RECOLORÍVEL.
 *  - 'image': render real do catálogo (PNG em /products/*.png ou URL). A
 *    estampa é fixa; a personalização é por camadas (nome/número/logos).
 *
 * O banco (Supabase) guarda os metadados; há um catálogo embutido de fallback
 * para o app funcionar offline / sem backend.
 */

export const TEMPLATES: Record<string, (side: Side, colors: Record<string, string>) => string> = {
  shirt: renderShirt,
  shorts: renderShorts,
};

export interface ProductCatalogEntry extends ProductDef {
  template: string;
  /** true quando o produto tem regiões recoloríveis (SVG paramétrico). */
  recolorable: boolean;
  render: (side: Side, colors: Record<string, string>) => string;
}

const SHIRT_REGIONS: ColorRegion[] = [
  { key: 'body', label: 'Corpo', defaultColor: '#1e88e5' },
  { key: 'sleeves', label: 'Mangas', defaultColor: '#1565c0' },
  { key: 'collar', label: 'Gola', defaultColor: '#ffffff' },
];

interface EntrySource {
  id: string;
  name: string;
  category: ProductCategory;
  template: string;
  regions: ColorRegion[];
  baseImages?: BaseImages | null;
}

/** Monta uma entrada de catálogo (render + thumbnail + imagens-base). */
function makeEntry(src: EntrySource): ProductCatalogEntry {
  if (src.template === 'image' && src.baseImages) {
    const images = src.baseImages;
    return {
      id: src.id,
      name: src.name,
      category: src.category,
      template: 'image',
      regions: [],
      recolorable: false,
      render: (side) => images[side],
      thumbnail: images.front,
      baseImages: images,
    };
  }
  const render = TEMPLATES[src.template] ?? TEMPLATES.shirt;
  const colors = defaultsOf(src.regions);
  return {
    id: src.id,
    name: src.name,
    category: src.category,
    template: src.template,
    regions: src.regions,
    recolorable: src.regions.length > 0,
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

/** Imagens-base (frente/verso) do produto com as cores atuais. */
export function renderBaseImages(productId: string, colors: Record<string, string>) {
  const product = getProduct(productId);
  if (!product.recolorable) return { ...product.baseImages };
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
      baseImages: r.base_images,
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
