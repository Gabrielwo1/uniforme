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

/** Monta o prompt final descrevendo TODAS as peças juntas, num só jogador, de frente e de costas. */
function buildPrompt(pieces: AIPortraitPiece[], style: AIPortraitInput['style']): string {
  const parts: string[] = [];

  const nomesPecas = pieces.map((p) => p.productName).join(', ');
  parts.push(
    `Fotografia profissional desportiva de um atleta masculino vestindo o equipamento completo da marca KYPZL, composto por: ${nomesPecas}. Todas as peças pertencem ao mesmo jogador, na mesma fotografia.`,
  );
  parts.push(
    `A imagem é uma fotografia LARGA (formato paisagem) com DUAS poses do MESMO jogador, lado a lado: a figura da ESQUERDA está de frente para a câmara (mostra o peito); a figura da DIREITA está de costas para a câmara (mostra as costas). Mesma iluminação, mesmo fundo, mesma pessoa e mesmo equipamento nas duas poses — como um spread de catálogo frente/verso.`,
  );

  for (const piece of pieces) {
    if (piece.colors.length > 0) {
      const coresTxt = piece.colors
        .map((c) => `${c.regionLabel.toLowerCase()} em ${c.colorName.toLowerCase()}`)
        .join(', ');
      parts.push(`${capitalize(piece.pieceLabel)}: ${coresTxt}.`);
    }

    const front = piece.texts.filter((t) => t.side === 'front');
    const back = piece.texts.filter((t) => t.side === 'back');
    const describeTexts = (texts: AITextInput[]) =>
      texts
        .map((t) => (t.kind === 'name' ? `nome "${t.value}"` : t.kind === 'number' ? `número "${t.value}"` : `texto "${t.value}"`))
        .join(' e ');
    const profile = piece.texts.filter((t) => t.side === 'side');
    if (front.length > 0) {
      parts.push(`${capitalize(piece.pieceLabel)}, impresso na FRENTE (pose da esquerda): ${describeTexts(front)}.`);
    }
    if (back.length > 0) {
      parts.push(`${capitalize(piece.pieceLabel)}, impresso nas COSTAS (pose da direita): ${describeTexts(back)}.`);
    }
    if (profile.length > 0) {
      parts.push(
        `${capitalize(piece.pieceLabel)}, impresso na LATERAL/MANGA (visível de perfil em ambas as poses): ${describeTexts(profile)}.`,
      );
    }

    const logosFront = piece.logos.filter((l) => l.side === 'front');
    const logosBack = piece.logos.filter((l) => l.side === 'back');
    const logosSide = piece.logos.filter((l) => l.side === 'side');
    if (logosFront.length > 0) {
      parts.push(`Logótipos na frente de ${piece.pieceLabel.toLowerCase()}: ${logosFront.map((l) => l.placement).join(', ')}.`);
    }
    if (logosBack.length > 0) {
      parts.push(`Logótipos nas costas de ${piece.pieceLabel.toLowerCase()}: ${logosBack.map((l) => l.placement).join(', ')}.`);
    }
    if (logosSide.length > 0) {
      parts.push(`Logótipos na lateral/manga de ${piece.pieceLabel.toLowerCase()}: ${logosSide.map((l) => l.placement).join(', ')}.`);
    }
  }

  parts.push(
    `Cada peça deve seguir EXATAMENTE o design de referência fornecido (uma imagem anexada por peça) — cores, texto e posição dos logótipos idênticos aos anexos, sem alterações e sem inventar texto adicional. Se o texto/logótipo de referência está apenas na frente ou apenas nas costas, mostre-o só na pose correspondente.`,
  );
  parts.push(
    `Estilo fotográfico: ${style.background}, ${style.pose}, enquadramento de ${style.framing} para que todas as peças do equipamento fiquem visíveis em ambas as poses. Iluminação natural de fim de tarde, alta definição, sem texto ou marca d'água adicionais.`,
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
    preset: 'kypzl-pitch',
    background: 'campo de futebol relvado, gramado verde nítido em primeiro plano, arquibancadas e luzes de estádio desfocadas ao fundo, luz quente de fim de tarde',
    pose: 'em pé, postura atlética; duas poses lado a lado da mesma pessoa — esquerda de frente, direita de costas',
    framing: 'corpo inteiro, da cabeça aos pés, as duas poses enquadradas juntas numa única fotografia larga',
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
