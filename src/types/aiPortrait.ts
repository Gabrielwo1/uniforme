/**
 * Estrutura de input para gerar, via API de imagem por IA (OpenAI
 * gpt-image-1), a foto de UM jogador vestindo TODAS as peças
 * personalizadas do pedido ao mesmo tempo — não uma foto por peça.
 *
 * `buildAIPortraitInput` (src/lib/aiPortrait.ts) recebe a lista completa de
 * `OrderItem` do carrinho e monta este objeto: cada peça vira um
 * `AIPortraitPiece` (com a sua própria imagem de referência + cores/textos/
 * logos), e o prompt final descreve o conjunto inteiro (camisola + calção +
 * meia, o que estiver no pedido) num único jogador, de corpo inteiro para
 * que todas as peças fiquem visíveis. Nenhuma chamada de rede acontece no
 * builder — é só estrutura de dados + o texto do prompt.
 */

/** Uma cor aplicada a uma região do produto, já com nome legível. */
export interface AIColorInput {
  /** Chave da região (ex.: 'body', 'sleeves', 'collar'). */
  region: string;
  /** Rótulo humano da região (ex.: 'Corpo', 'Mangas'). */
  regionLabel: string;
  hex: string;
  /** Nome em português da cor mais próxima na paleta KYPZL (ex.: 'Azul Royal'). */
  colorName: string;
}

/** Um elemento de texto (nome, número, texto livre) aplicado ao design. */
export interface AITextInput {
  kind: 'name' | 'number' | 'text';
  value: string;
  fillHex: string;
  fillColorName: string;
  strokeHex?: string;
  side: 'front' | 'back';
}

/** Um logo/patrocínio aplicado ao design (posição descrita em linguagem simples). */
export interface AILogoInput {
  /** URL/dataURL do logo (pode ser usado como imagem de referência adicional). */
  src: string;
  side: 'front' | 'back';
  /** Posição aproximada em linguagem natural (ex.: 'peito esquerdo'). */
  placement: string;
}

/** Uma peça do pedido (camisola, calção, meia…) com os seus dados de personalização. */
export interface AIPortraitPiece {
  orderItemId: string;
  productId: string;
  productName: string;
  /** Rótulo humano da categoria desta peça (ex.: "camisola", "calção", "meia"). */
  pieceLabel: string;
  /** Imagem de referência desta peça (dataURL do preview do artigo, ou o
   * render "só peça" do catálogo se o artigo ainda não tiver preview). */
  flatDesign: string;
  colors: AIColorInput[];
  texts: AITextInput[];
  logos: AILogoInput[];
}

export interface AIPortraitInput {
  /** Chave estável do conjunto de artigos — muda sempre que o carrinho
   * muda (ids ordenados e concatenados), usada para cache/deduplicação. */
  cacheKey: string;

  /** Todas as peças do pedido a aparecer juntas na mesma foto. */
  pieces: AIPortraitPiece[];

  /**
   * Preset de estilo fotográfico — mantém consistência com a identidade
   * visual da KYPZL (estúdio escuro, chevron vermelho, pose de estúdio).
   * Corpo inteiro (não só cintura para cima) para que todas as peças —
   * incluindo calção e meia — fiquem visíveis na mesma imagem.
   */
  style: {
    preset: 'kypzl-studio';
    background: string;
    pose: string;
    framing: string;
  };

  /** Prompt textual final, já montado (ver buildPrompt em aiPortrait.ts). */
  prompt: string;
}

/** Resposta esperada da Edge Function de geração. */
export interface AIPortraitResult {
  cacheKey: string;
  /** URL pública da imagem gerada (Supabase Storage). */
  imageUrl: string;
  provider: 'openai';
  model: string;
  generatedAt: string; // ISO
}
