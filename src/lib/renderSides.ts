import { FabricImage, IText, StaticCanvas } from 'fabric';
import type { DesignState, ImageElement, Side, TextElement } from '@/types/design';
import { ensureFontLoaded } from './fonts';
import { containFit, DEFAULT_IMG_WIDTH, STAGE, STAGE_BG } from './stageGeometry';

/**
 * Renderiza uma prancha FORA do ecrã, para qualquer lado do produto.
 *
 * Porquê: o canvas do editor só desenha o lado que está aberto, portanto
 * `exportPNG` capturava apenas esse. Ao finalizar, isso fazia com que a
 * frente e as mangas personalizadas se perdessem — tanto na miniatura do
 * pedido como (pior) na referência enviada à IA, que assim só via um lado.
 *
 * Usa a mesma geometria do canvas interativo (ver stageGeometry) para o
 * resultado bater certo com o que o utilizador vê.
 */

async function addBackground(canvas: StaticCanvas, url: string) {
  const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
  const { scale, left, top } = containFit(img.width || STAGE, img.height || STAGE);
  img.set({ originX: 'left', originY: 'top', left, top, scaleX: scale, scaleY: scale });
  canvas.backgroundImage = img;
}

function makeText(el: TextElement): IText {
  return new IText(el.value, {
    originX: 'center',
    originY: 'center',
    left: el.x * STAGE,
    top: el.y * STAGE,
    angle: el.rotation,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth ?? 0,
    paintFirst: 'stroke',
    fontWeight: 700,
    textAlign: 'center',
    scaleX: el.scale,
    scaleY: el.scale,
  });
}

async function makeImage(el: ImageElement): Promise<FabricImage> {
  const img = await FabricImage.fromURL(el.src, { crossOrigin: 'anonymous' });
  const baseScale = DEFAULT_IMG_WIDTH / (el.naturalW || DEFAULT_IMG_WIDTH);
  img.set({
    originX: 'center',
    originY: 'center',
    left: el.x * STAGE,
    top: el.y * STAGE,
    angle: el.rotation,
    scaleX: baseScale * el.scale,
    scaleY: baseScale * el.scale,
  });
  return img;
}

/** PNG (dataURL) de um lado do design. `null` se a imagem-base falhar. */
export async function renderSidePNG(
  design: DesignState,
  side: Side,
  multiplier = 0.5,
): Promise<string | null> {
  const url = design.baseImages[side] ?? design.baseImages.front;
  if (!url) return null;

  const canvas = new StaticCanvas(undefined, {
    width: STAGE,
    height: STAGE,
    backgroundColor: STAGE_BG,
  });
  try {
    await addBackground(canvas, url);

    const elements = design.elements
      .filter((e) => e.side === side)
      .slice()
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const el of elements) {
      if (el.type === 'text') {
        await ensureFontLoaded(el.fontFamily); // senão sai com a fonte errada
        canvas.add(makeText(el));
      } else {
        canvas.add(await makeImage(el));
      }
    }

    canvas.renderAll();
    return canvas.toDataURL({ format: 'png', multiplier });
  } catch (e) {
    console.warn('[renderSides] falha a renderizar', side, e);
    return null;
  } finally {
    canvas.dispose();
  }
}

/**
 * Renderiza TODOS os lados que o produto tem (frente, verso e — quando
 * existe — o perfil), para o pedido levar o design completo.
 */
export async function renderAllSides(
  design: DesignState,
  multiplier = 0.5,
): Promise<Partial<Record<Side, string>>> {
  const sides: Side[] = design.baseImages.side
    ? ['front', 'back', 'side']
    : ['front', 'back'];

  const out: Partial<Record<Side, string>> = {};
  for (const side of sides) {
    const png = await renderSidePNG(design, side, multiplier);
    if (png) out[side] = png;
  }
  return out;
}
