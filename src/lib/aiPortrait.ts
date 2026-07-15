import { getProduct } from './products';
import { nameColor } from './colors';
import { supabase } from './supabase';
import type { OrderItem } from '@/types/order';
import type {
  AIColorInput,
  AILogoInput,
  AIPortraitInput,
  AIPortraitResult,
  AITextInput,
} from '@/types/aiPortrait';
import type { ImageElement, TextElement } from '@/types/design';

const CATEGORY_LABEL: Record<string, string> = {
  jogo: 'equipamento de jogo',
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

/** Monta o texto do prompt a partir dos dados já estruturados. */
function buildPrompt(input: Omit<AIPortraitInput, 'prompt'>): string {
  const parts: string[] = [];

  parts.push(
    `Fotografia profissional de estúdio de um atleta masculino vestindo ${CATEGORY_LABEL[input.product.category] ?? 'equipamento desportivo'} de ${input.product.modality}, modelo "${input.product.name}" da marca KYPZL.`,
  );

  if (input.colors.length > 0) {
    const coresTxt = input.colors
      .map((c) => `${c.regionLabel.toLowerCase()} em ${c.colorName.toLowerCase()}`)
      .join(', ');
    parts.push(`Cores: ${coresTxt}.`);
  }

  const name = input.texts.find((t) => t.kind === 'name');
  const number = input.texts.find((t) => t.kind === 'number');
  if (name || number) {
    const bits: string[] = [];
    if (name) bits.push(`nome "${name.value}"`);
    if (number) bits.push(`número "${number.value}"`);
    parts.push(`Personalização impressa nas costas: ${bits.join(' e ')}.`);
  }

  if (input.logos.length > 0) {
    parts.push(
      `Logótipos aplicados: ${input.logos.map((l) => l.placement).join(', ')}.`,
    );
  }

  parts.push(
    `A peça deve seguir EXATAMENTE o design de referência fornecido (imagem plana anexada) — cores, texto e posição dos logótipos idênticos, sem alterações.`,
  );
  parts.push(
    `Estilo fotográfico: ${input.style.background}, ${input.style.pose}, ${input.style.framing}. Iluminação de estúdio, alta definição, sem texto ou marca d'água adicionais.`,
  );

  return parts.join(' ');
}

/**
 * Monta o input estruturado (sem chamar nenhuma API) a partir de um item já
 * finalizado no pedido. Puro/determinístico — útil também para depurar o
 * prompt antes de gastar uma chamada de geração de imagem.
 */
export function buildAIPortraitInput(item: OrderItem): AIPortraitInput {
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

  const base: Omit<AIPortraitInput, 'prompt'> = {
    orderItemId: item.id,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      modality: 'futebol',
    },
    images: {
      flatDesign: item.preview ?? product.itemImage,
      itemPhoto: product.itemImage,
    },
    colors,
    texts,
    logos,
    side: design.side,
    style: {
      preset: 'kypzl-studio',
      background: 'fundo escuro em estúdio com leve gradiente vermelho',
      pose: 'em pé, de frente para a câmara, postura atlética',
      framing: 'enquadramento da cintura para cima, centrado',
    },
  };

  return { ...base, prompt: buildPrompt(base) };
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
