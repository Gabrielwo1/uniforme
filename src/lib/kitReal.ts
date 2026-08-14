import type { LadoKit } from '@/types/kit';
import { registarEstampas } from './kitDemo';
import { CAMADAS, COR_FUNDO, QUADRO } from './estampas/milanDados';

/**
 * Regista os assets REAIS convertidos dos ficheiros do cliente.
 *
 * Este módulo é importado dinamicamente (ver `KitLab`): os dados da estampa
 * são ~3 MB de vetores e não podem pesar no arranque do app.
 *
 * O desenho convertido vive no espaço do quadro da arte do Illustrator; aqui
 * ele é levado para a caixa do corpo em cada lado do PNG (medida do canal
 * alfa). A estampa é plana — um retângulo de riscas — e é o corpo que a
 * recorta, por isso esticar o quadro à caixa é o encaixe certo.
 */

/** Caixa do TRONCO da camisola vestida (tela comum 1080×2460), medida no
    alfa — exclui as mangas (senão a estampa estica até às pontas delas) e
    a GOLA (senão o tema sobe pelo pescoço e parece gola alta; a gola fica
    com a cor base). */
const CAIXA_CORPO: Record<LadoKit, { x: number; y: number; w: number; h: number }> = {
  frente: { x: 321, y: 126, w: 437, h: 872 },
  verso: { x: 317, y: 128, w: 450, h: 896 },
};

function noLado(svg: string, lado: LadoKit): string {
  const c = CAIXA_CORPO[lado];
  const sx = c.w / QUADRO.w;
  const sy = c.h / QUADRO.h;
  const t = `translate(${(c.x - QUADRO.x * sx).toFixed(2)} ${(c.y - QUADRO.y * sy).toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`;
  // __L__ diferencia os ids dos recortes: frente e verso montam em simultâneo
  return `<g transform="${t}">${svg.split('__L__').join(lado)}</g>`;
}

/** Nomes mostrados no painel de cores, por cor de origem. */
const NOMES: Record<string, string> = {
  '#808081': 'Textura',
  '#c21633': 'Listras',
  '#c83a3e': 'Vivos',
};

export function registarReais() {
  registarEstampas([
    {
      id: 'milan-camisola',
      codModelo: '003',
      nome: 'Milan',
      peca: 'camisola',
      corBasePadrao: COR_FUNDO ?? '#221f20',
      camadas: CAMADAS.map((c) => ({
        id: c.id,
        nome: NOMES[c.cor] ?? c.cor,
        corPadrao: c.cor,
        desenho: { frente: noLado(c.svg, 'frente'), verso: noLado(c.svg, 'verso') },
      })),
    },
  ]);
}
