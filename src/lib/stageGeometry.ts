/**
 * Geometria partilhada entre o canvas interativo (CanvasStage) e o
 * renderizador off-screen (renderSides). Viviam duplicadas; ficando aqui,
 * uma prancha exportada em segundo plano é pixel-a-pixel igual à que o
 * utilizador vê no editor.
 */

/** Tamanho lógico da prancha; as posições no store são relativas (0..1). */
export const STAGE = 1000;

/**
 * Fundo da prancha. As fotos de produto são recortadas sobre preto (medido
 * nas imagens: ~#040404), por isso o quadrado usa o mesmo tom — assim a área
 * à volta da peça não fica com barras claras e tudo lê como um plano só.
 */
export const STAGE_BG = '#040404';

/** Largura base de um logo recém-colocado, antes da escala do utilizador. */
export const DEFAULT_IMG_WIDTH = 300;

/** Ajuste "contain" centrado — os renders do catálogo não são quadrados. */
export function containFit(w: number, h: number) {
  const scale = Math.min(STAGE / w, STAGE / h);
  return {
    scale,
    left: (STAGE - w * scale) / 2,
    top: (STAGE - h * scale) / 2,
  };
}

const bgCache = new Map<string, string>();

/**
 * Cor de fundo da prancha para uma dada imagem de produto, lida do canto da
 * própria foto.
 *
 * Nem todo o catálogo usa o mesmo fundo: as fotos novas da Batistuta são
 * recortadas sobre preto, enquanto os renders antigos vêm sobre cinza-claro.
 * Com um valor fixo, um dos dois ficava como um retângulo a flutuar sobre o
 * outro; assim cada produto lê como um plano só. Cai em STAGE_BG se a leitura
 * falhar (ex.: imagem noutra origem sem CORS).
 */
export async function sampleStageBackground(url: string): Promise<string> {
  const cached = bgCache.get(url);
  if (cached) return cached;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    if (!ctx) return STAGE_BG;
    // reduz um bloco do canto a 1px = média, imune a ruído/compressão
    ctx.drawImage(img, 0, 0, 12, 12, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    bgCache.set(url, hex);
    return hex;
  } catch {
    return STAGE_BG;
  }
}
