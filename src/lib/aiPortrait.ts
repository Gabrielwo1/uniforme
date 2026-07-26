import { getProduct } from './products';
import { nameColor } from './colors';
import { supabase } from './supabase';
import type { OrderItem } from '@/types/order';
import type {
  AIColorInput,
  AILogoInput,
  AIPortraitInput,
  AIPortraitPiece,
  AIPortraitResult,
  AITextInput,
} from '@/types/aiPortrait';
import type { ImageElement, TextElement } from '@/types/design';

const CATEGORY_LABEL: Record<string, string> = {
  jogo: 'camisola de jogo',
  treino: 'equipamento de treino',
  saida: 'vestuário de saída',
  camisa: 'camisola',
  calcao: 'calção',
};

/** Descreve a posição relativa (0–1) de um elemento em linguagem simples. */
function describePlacement(x: number, y: number): string {
  const vertical = y < 0.4 ? 'peito' : y < 0.65 ? 'centro do tronco' : 'barra';
  const horizontal = x < 0.4 ? 'esquerdo' : x > 0.6 ? 'direito' : 'centrado';
  return horizontal === 'centrado' ? vertical : `${vertical} ${horizontal}`;
}

/** Monta os dados estruturados de UMA peça (sem chamar nenhuma API). */
function buildPiece(item: OrderItem): AIPortraitPiece {
  const product = getProduct(item.productId);
  const design = item.design;

  const colors: AIColorInput[] = product.regions.map((region) => {
    const hex = design.colors[region.key] ?? region.defaultColor;
    return {
      region: region.key,
      regionLabel: region.label,
      hex,
      colorName: nameColor(hex),
    };
  });

  const texts: AITextInput[] = design.elements
    .filter((el): el is TextElement => el.type === 'text')
    .map((el) => ({
      kind: el.kind,
      value: el.value,
      fillHex: el.fill,
      fillColorName: nameColor(el.fill),
      strokeHex: el.stroke,
      side: el.side,
    }));

  const logos: AILogoInput[] = design.elements
    .filter((el): el is ImageElement => el.type === 'image')
    .map((el) => ({
      src: el.src,
      side: el.side,
      placement: describePlacement(el.x, el.y),
    }));

  return {
    orderItemId: item.id,
    productId: product.id,
    productName: product.name,
    pieceLabel: CATEGORY_LABEL[product.category] ?? 'peça',
    flatDesign: item.preview ?? product.itemImage,
    colors,
    texts,
    logos,
  };
}

/** Monta o prompt final descrevendo TODAS as peças juntas, num só jogador. */
function buildPrompt(pieces: AIPortraitPiece[], style: AIPortraitInput['style']): string {
  const parts: string[] = [];

  const nomesPecas = pieces.map((p) => p.productName).join(', ');
  parts.push(
    `Fotografia profissional de estúdio de um atleta masculino vestindo o equipamento completo da marca KYPZL, composto por: ${nomesPecas}. Todas as peças pertencem ao mesmo jogador, na mesma fotografia.`,
  );

  for (const piece of pieces) {
    if (piece.colors.length > 0) {
      const coresTxt = piece.colors
        .map((c) => `${c.regionLabel.toLowerCase()} em ${c.colorName.toLowerCase()}`)
        .join(', ');
      parts.push(`${capitalize(piece.pieceLabel)}: ${coresTxt}.`);
    }

    const name = piece.texts.find((t) => t.kind === 'name');
    const number = piece.texts.find((t) => t.kind === 'number');
    if (name || number) {
      const bits: string[] = [];
      if (name) bits.push(`nome "${name.value}"`);
      if (number) bits.push(`número "${number.value}"`);
      parts.push(`${capitalize(piece.pieceLabel)} com personalização impressa: ${bits.join(' e ')}.`);
    }

    if (piece.logos.length > 0) {
      parts.push(
        `Logótipos em ${piece.pieceLabel.toLowerCase()}: ${piece.logos.map((l) => l.placement).join(', ')}.`,
      );
    }
  }

  parts.push(
    `Cada peça deve seguir EXATAMENTE o design de referência fornecido (uma imagem anexada por peça) — cores, texto e posição dos logótipos idênticos aos anexos, sem alterações e sem inventar texto adicional.`,
  );
  parts.push(
    `Estilo fotográfico: ${style.background}, ${style.pose}, enquadramento de ${style.framing} para que todas as peças do equipamento fiquem visíveis na imagem. Iluminação de estúdio, alta definição, sem texto ou marca d'água adicionais.`,
  );

  return parts.join(' ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Monta o input estruturado (sem chamar nenhuma API) a partir de TODOS os
 * artigos do pedido — a foto final mostra um único jogador vestindo o
 * conjunto completo (camisola + calção + meia, o que estiver no carrinho),
 * não uma foto por peça. Puro/determinístico — útil também para depurar o
 * prompt antes de gastar uma chamada de geração de imagem.
 */
export function buildAIPortraitInput(items: OrderItem[]): AIPortraitInput {
  const pieces = items.map(buildPiece);
  const cacheKey = items
    .map((i) => i.id)
    .slice()
    .sort()
    .join('+');

  const style: AIPortraitInput['style'] = {
    preset: 'kypzl-studio',
    background: 'fundo escuro em estúdio com leve gradiente vermelho',
    pose: 'em pé, de frente para a câmara, postura atlética',
    framing: 'corpo inteiro, da cabeça aos pés',
  };

  return {
    cacheKey,
    pieces,
    style,
    prompt: buildPrompt(pieces, style),
  };
}

/**
 * Envia o input para a Edge Function de geração (Supabase) e devolve a URL
 * da foto gerada. REQUER que a function `generate-model-photo` esteja
 * implantada e uma chave de API (ex.: OPENAI_API_KEY) configurada como
 * secret do projeto Supabase — ver supabase/functions/generate-model-photo.
 *
 * Lança erro claro se o Supabase não estiver configurado ou a function não
 * existir ainda (não há fallback local: gerar imagem por IA não dá pra fazer
 * só no navegador, precisa da chave protegida no servidor).
 */
export async function requestAIPortrait(
  input: AIPortraitInput,
): Promise<AIPortraitResult> {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado — a geração por IA precisa de uma Edge Function no backend.',
    );
  }
  const { data, error } = await supabase.functions.invoke<AIPortraitResult>(
    'generate-model-photo',
    { body: input },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Resposta vazia da geração de imagem.');
  return data;
}
