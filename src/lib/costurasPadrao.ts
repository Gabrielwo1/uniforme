import costuras from '../../scripts/costuras-designer.json';
import type { LadoKit } from '@/types/kit';
import type { Quadro } from './converterMolde';

/**
 * PADRÃO DE MODELAGEM da camisola — a costura REAL do designer, em TypeScript.
 *
 * É o irmão de `scripts/costuras.py` (`poligono_manga_real`, `para_arte`): mesma
 * geometria, mesmo formato de texto, para que `scripts/atualizar-costura-arte.py`
 * reconheça por `replace` os polígonos que o painel grava e os atualize quando o
 * designer mudar a manga. A costura vem do MESMO ficheiro que o script usa
 * (`scripts/costuras-designer.json`); se as regras mudarem aqui, mudam lá.
 *
 * Coordenadas da CAIXA da peça no palco (origem no canto da caixa); a arte do
 * modelo vive noutro referencial (o `quadro` do Corel) e `paraArte` faz a ponte.
 */

type Ponto = [number, number];
type LadoEcra = 'esq' | 'dir';

/** Caixa da camisola no palco e y do sovaco — de scripts/costuras.py (CAIXA, GEO). */
const CAIXA: Record<LadoKit, { w: number; h: number; sovacoY: number }> = {
  frente: { w: 710, h: 824, sovacoY: 384 },
  verso: { w: 733, h: 878, sovacoY: 409 },
};

/** Sangria do fundo, em px da caixa: a arte abraça o molde TODO e passa-lhe por fora. */
const SANGRIA = 80;
const LARGO = 240;
const FOLGA = 16;
const TOPO = -120;

const SEAM = costuras as Record<LadoKit, Record<LadoEcra, Ponto[]>>;

/** A manga com a costura do designer (a barriga no sovaco incluída). */
function poligonoManga(lado: LadoKit, le: LadoEcra): Ponto[] {
  const { w, sovacoY } = CAIXA[lado];
  const seam = SEAM[lado][le];
  const fundo = sovacoY + FOLGA;
  const [x0] = seam[0];
  const [, yl] = seam[seam.length - 1];
  const yf = Math.max(fundo, yl);
  const pts: Ponto[] = [...seam, [seam[seam.length - 1][0], yf]];
  return le === 'esq'
    ? [[-LARGO, TOPO], [x0, TOPO], ...pts, [-LARGO, yf]]
    : [[w + LARGO, TOPO], [x0, TOPO], ...pts, [w + LARGO, yf]];
}

function paraArte(pts: Ponto[], q: Quadro, lado: LadoKit): Ponto[] {
  const sx = CAIXA[lado].w / q.w;
  const sy = CAIXA[lado].h / q.h;
  return pts.map(([x, y]) => [q.x + x / sx, q.y + y / sy]);
}

const d = (pts: Ponto[]) =>
  'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z';

/** O polígono de uma manga (esq./dir. do ECRÃ), na arte do modelo, como `d` de um path. */
export function daManga(lado: LadoKit, q: Quadro, le: LadoEcra): string {
  return d(paraArte(poligonoManga(lado, le), q, lado));
}

/** Retângulo de fundo com sangria, na arte do modelo. */
export function doFundo(lado: LadoKit, q: Quadro): string {
  const { w, h } = CAIXA[lado];
  return d(paraArte([[-SANGRIA, -SANGRIA], [w + SANGRIA, -SANGRIA], [w + SANGRIA, h + SANGRIA], [-SANGRIA, h + SANGRIA]], q, lado));
}
