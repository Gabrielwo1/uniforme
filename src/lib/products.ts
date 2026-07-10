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

interface EntrySource {
  id: string;
  name: string;
  category: ProductCategory;
  template: string;
  regions: ColorRegion[];
  baseImages?: BaseImages | null;
  modelTemplate?: string;
}

/**
 * Produtos "vestíveis no torso" (camisas/polos) têm preview fotorrealista
 * "No Modelo". Calções e meias ainda não têm template compatível — mapeado
 * por id para funcionar tanto no catálogo embutido quanto em linhas do banco
 * (que ainda não guardam esta coluna).
 */
const MODEL_TEMPLATE_BY_ID: Record<string, string> = {
  maradona: 'camisola',
  garrincha: 'camisola',
  zenga: 'camisola',
  taffarel: 'camisola',
  socrates: 'camisola',
  bebeto: 'camisola',
};

/** Monta uma entrada de catálogo (render + thumbnail + imagens-base). */
function makeEntry(src: EntrySource): ProductCatalogEntry {
  const modelTemplate = src.modelTemplate ?? MODEL_TEMPLATE_BY_ID[src.id];
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
      modelTemplate,
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
    modelTemplate,
  };
}

/** Renders reais do Catálogo KYPZL 2023 (servidos por /public — funcionam sem Supabase). */
const CATALOG_IMAGE_PRODUCTS: EntrySource[] = [
  { id: 'maradona', name: 'Camisola Maradona', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/maradona.png', back: '/products/maradona.png' } },
  { id: 'garrincha', name: 'Camisola Garrincha', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/garrincha.png', back: '/products/garrincha.png' } },
  { id: 'zenga', name: 'Camisola Zenga', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/zenga.png', back: '/products/zenga.png' } },
  { id: 'taffarel', name: 'Camisola Taffarel', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/taffarel.png', back: '/products/taffarel.png' } },
  { id: 'nene', name: 'Calção Nené', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/nene.png', back: '/products/nene.png' } },
  { id: 'elite', name: 'Meia de Jogo Elite', category: 'jogo', template: 'image', regions: [], baseImages: { front: '/products/elite.png', back: '/products/elite.png' } },
  { id: 'socrates', name: 'T-shirt Sócrates', category: 'treino', template: 'image', regions: [], baseImages: { front: '/products/socrates.png', back: '/products/socrates.png' } },
  { id: 'zico', name: 'Calção Zico', category: 'treino', template: 'image', regions: [], baseImages: { front: '/products/zico.png', back: '/products/zico.png' } },
  { id: 'bebeto', name: 'Polo Técnico Bebeto', category: 'saida', template: 'image', regions: [], baseImages: { front: '/products/bebeto.png', back: '/products/bebeto.png' } },
];

/**
 * Catálogo mutável (mesma referência de array sempre) para que componentes que
 * o importam vejam as atualizações vindas do banco após o boot.
 *
 * Começa com o catálogo real embutido (imagens em /public, sempre disponíveis)
 * — o app funciona por completo sem Supabase. Se o banco responder no boot,
 * `applyRows` substitui por essas mesmas linhas (ou por edições feitas lá).
 */
export const PRODUCTS: ProductCatalogEntry[] = CATALOG_IMAGE_PRODUCTS.map(makeEntry);

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
