/**
 * Composição fotorrealista do design (frente do produto já com nome, número,
 * logos) sobre a foto de um modelo real ("Ver no modelo").
 *
 * Técnica de mockup por deslocamento (a mesma usada por geradores de mockup
 * profissionais): para cada template de modelo, pré-computamos offline
 * (Python) três mapas por pixel — deslocamento (dx,dy) que segue as dobras
 * do tecido, sombreamento (shading) extraído da própria foto, e uma máscara
 * da área da peça — empacotados num único PNG RGBA (`warpmap.png`):
 *   R = dx   G = dy   B = shading   A = máscara
 *
 * Em tempo real, no navegador: recorta o design (remove o fundo cinza-claro
 * uniforme dos renders do catálogo via flood-fill a partir dos cantos),
 * posiciona-o na região da peça (`destRect`) e aplica o warpmap pixel a
 * pixel — o design "veste" o modelo, com dobras e sombras reais.
 *
 * Isto é 2D puro (sem 3D): o mesmo truque de "smart object" usado em mockups
 * do Photoshop, portado para Canvas 2D.
 */

export interface ModelTemplateMeta {
  width: number;
  height: number;
  destRect: { x: number; y: number; w: number; h: number };
}

interface DecodedTemplate extends ModelTemplateMeta {
  photo: HTMLImageElement;
  dx: Float32Array;
  dy: Float32Array;
  shading: Float32Array;
  mask: Float32Array; // 0..1
}

const TEMPLATE_BASE = '/models';
const templateCache = new Map<string, Promise<DecodedTemplate>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

async function loadModelTemplate(name: string): Promise<DecodedTemplate> {
  const cached = templateCache.get(name);
  if (cached) return cached;

  const promise = (async () => {
    const base = `${TEMPLATE_BASE}/${name}`;
    const [photo, warpImg, meta] = await Promise.all([
      loadImage(`${base}/photo.jpg`),
      loadImage(`${base}/warpmap.png`),
      fetch(`${base}/template.json`).then((r) => r.json() as Promise<ModelTemplateMeta>),
    ]);

    const { width, height } = meta;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(warpImg, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    const n = width * height;
    const dx = new Float32Array(n);
    const dy = new Float32Array(n);
    const shading = new Float32Array(n);
    const mask = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      dx[i] = (data[o] - 128) / 2;
      dy[i] = (data[o + 1] - 128) / 2;
      shading[i] = 0.3 + (data[o + 2] / 255) * 1.5;
      mask[i] = data[o + 3] / 255;
    }

    return { width, height, destRect: meta.destRect, photo, dx, dy, shading, mask };
  })();

  templateCache.set(name, promise);
  return promise;
}

/** Recorta o design removendo o fundo uniforme (flood-fill a partir dos 4 cantos). */
function cropForeground(img: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
} {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d')!;
  sctx.drawImage(img, 0, 0);
  const imgData = sctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const idx = (x: number, y: number) => (y * w + x) * 4;
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];
  const [rr, rg, rb] = [data[0], data[1], data[2]];
  const TOL = 12;
  const isBg = (o: number) =>
    Math.abs(data[o] - rr) + Math.abs(data[o + 1] - rg) + Math.abs(data[o + 2] - rb) < TOL;

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const [cx, cy] of corners) {
    const p = cy * w + cx;
    const o = idx(cx, cy);
    if (!visited[p] && isBg(o)) {
      visited[p] = 1;
      stack.push(cx, cy);
    }
  }
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const neighbors: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (visited[np]) continue;
      if (isBg(idx(nx, ny))) {
        visited[np] = 1;
        stack.push(nx, ny);
      }
    }
  }

  // Fundo -> transparente; encontra o bounding box do conteúdo restante.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (visited[p]) {
        data[p * 4 + 3] = 0;
      } else {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) {
    minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
  }
  sctx.putImageData(imgData, 0, 0);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(src, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas: out, w: cw, h: ch };
}

/**
 * Gera o preview "no modelo" a partir de uma imagem de design (dataURL ou
 * URL) — tipicamente a frente do produto já com as personalizações.
 * Retorna um dataURL PNG do composite final.
 */
export async function renderOnModel(
  designSrc: string,
  templateName = 'camisola',
): Promise<string> {
  const [template, designImg] = await Promise.all([
    loadModelTemplate(templateName),
    loadImage(designSrc),
  ]);
  const { width: W, height: H, destRect, photo, dx, dy, shading, mask } = template;

  const { canvas: cropped, w: cw, h: ch } = cropForeground(designImg);

  // Posiciona o design recortado no destRect (canvas do tamanho da foto, transparente).
  const placed = document.createElement('canvas');
  placed.width = W;
  placed.height = H;
  const pctx = placed.getContext('2d')!;
  const scale = Math.min(destRect.w / cw, destRect.h / ch);
  const nw = Math.max(1, Math.round(cw * scale));
  const nh = Math.max(1, Math.round(ch * scale));
  const px = destRect.x + (destRect.w - nw) / 2;
  const py = destRect.y + (destRect.h - nh) / 2;
  pctx.drawImage(cropped, px, py, nw, nh);
  const placedData = pctx.getImageData(0, 0, W, H).data;

  // Foto base.
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = W;
  photoCanvas.height = H;
  const phctx = photoCanvas.getContext('2d')!;
  phctx.drawImage(photo, 0, 0, W, H);
  const outImageData = phctx.getImageData(0, 0, W, H);
  const out = outImageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const m = mask[i];
      if (m <= 0.02) continue;

      const sx = Math.min(W - 1, Math.max(0, Math.round(x + dx[i])));
      const sy = Math.min(H - 1, Math.max(0, Math.round(y + dy[i])));
      const so = (sy * W + sx) * 4;
      const sa = (placedData[so + 3] / 255) * m;
      if (sa <= 0.01) continue;

      const sh = shading[i];
      const o = i * 4;
      out[o] = out[o] * (1 - sa) + Math.min(255, placedData[so] * sh) * sa;
      out[o + 1] = out[o + 1] * (1 - sa) + Math.min(255, placedData[so + 1] * sh) * sa;
      out[o + 2] = out[o + 2] * (1 - sa) + Math.min(255, placedData[so + 2] * sh) * sa;
    }
  }

  phctx.putImageData(outImageData, 0, 0);
  return photoCanvas.toDataURL('image/png');
}
