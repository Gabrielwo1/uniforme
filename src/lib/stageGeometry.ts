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
