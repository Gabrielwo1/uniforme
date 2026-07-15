/**
 * Estrutura de input para gerar, via API de imagem por IA (ex.: OpenAI
 * gpt-image), a foto de um jogador vestindo um item PERSONALIZADO.
 *
 * Cada `OrderItem` finalizado (design pronto: cores, nome, número, logos)
 * vira UM `AIPortraitInput`. O builder (`src/lib/aiPortrait.ts`) monta este
 * objeto a partir do `OrderItem` + do catálogo — nenhuma chamada de rede
 * acontece aqui, é só estrutura de dados + o texto do prompt.
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

export interface AIPortraitInput {
  /** Id do item do pedido (rastreabilidade). */
  orderItemId: string;

  product: {
    id: string;
    name: string;
    /** 'jogo' | 'treino' | 'saida' | 'camisa' | 'calcao'. */
    category: string;
    /** Modalidade (hoje só 'futebol'; preparado para expandir). */
    modality: string;
  };

  /**
   * Imagens de referência (nessa ordem de prioridade para a API):
   *  1. `flatDesign` — o design final exportado do editor (cores + nome/
   *     número/logos já aplicados) — é A referência mais importante, mostra
   *     exatamente o que o cliente personalizou.
   *  2. `itemPhoto` — foto/render "só peça" do produto-base (sem jogador),
   *     usada como referência adicional de caimento/tecido quando o produto
   *     tem foto de modelo em vez de estampa plana.
   */
  images: {
    flatDesign: string; // dataURL PNG do preview do item (OrderItem.preview)
    itemPhoto: string; // ProductDef.itemImage
  };

  /** Cores aplicadas por região (vazio se o produto não é recolorível). */
  colors: AIColorInput[];

  /** Nome, número e textos livres aplicados. */
  texts: AITextInput[];

  /** Logos/patrocínios aplicados. */
  logos: AILogoInput[];

  /** Lado predominante do design a mostrar na foto (geralmente 'front'). */
  side: 'front' | 'back';

  /**
   * Preset de estilo fotográfico — mantém consistência com a identidade
   * visual da KYPZL (estúdio escuro, chevron vermelho, pose de estúdio).
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
  orderItemId: string;
  /** URL pública da imagem gerada (Supabase Storage) ou dataURL. */
  imageUrl: string;
  provider: 'openai';
  model: string;
  generatedAt: string; // ISO
}
