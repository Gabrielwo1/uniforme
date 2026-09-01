import type { LadoKit, PecaKit } from '@/types/kit';

/**
 * Geometria das peças na tela comum (1520×2460 — wrapper 380×615 × 4; o
 * avatar do segundo mockup é mais largo que o primeiro).
 *
 * Vive à parte porque é partilhada por dois consumidores muito diferentes:
 * o `kitReal` (que pesa megabytes de vetores e entra por import dinâmico) e
 * o `kitLocais` (que tem de estar disponível de imediato, para o painel de
 * personalização). São só números — não faz sentido arrastar um por causa
 * do outro.
 */

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Caixa da estampa por peça e lado — a posição real de cada peça no
    avatar do mockup do designer, medida por scripts/montar-dino2.py.
    Na camisola é a CAMISA INTEIRA, mangas incluídas (terceiro envio,
    2026-08-28: o cliente quer a estampa a correr pela manga); só a TIRA do
    punho e a gola ficam de fora, como zonas com cor própria por cima. */
export const CAIXAS: Record<PecaKit, Record<LadoKit, Caixa>> = {
  camisola: {
    frente: { x: 384, y: 410, w: 710, h: 824 },
    verso: { x: 292, y: 396, w: 733, h: 878 },
  },
  calcao: {
    frente: { x: 447, y: 1195, w: 587, h: 386 },
    verso: { x: 376, y: 1230, w: 589, h: 356 },
  },
  meiao: {
    frente: { x: 454, y: 1689, w: 573, h: 535 },
    verso: { x: 364, y: 1712, w: 598, h: 547 },
  },
};

/** Janela da miniatura quadrada, por peça (sobre a caixa da frente). */
export const AMOSTRAS: Record<PecaKit, string> = {
  camisola: '400 430 680 700',
  calcao: '450 1195 590 390',
  meiao: '455 1690 570 535',
};

/**
 * Centro horizontal de cada perna, em fração da caixa da peça.
 *
 * Não se pode assumir simetria nem repetir o mesmo par entre peças: as
 * caixas são o envolvente do alfa, e a pose põe as pernas em sítios
 * diferentes de lado para lado. Estes valores foram MEDIDOS no canal alfa
 * — e medidos À ALTURA DA ÂNCORA, não a uma altura
 * qualquer: as pernas afastam-se à medida que se desce, por isso um valor
 * tirado ao tornozelo põe a aplicação fora da peça à altura do joelho.
 *
 * Se o `cy` de uma âncora de perna mudar em `kitLocais`, estes números têm
 * de ser medidos de novo. O script está em scripts/medir-pernas.py.
 */
export const PERNAS: Record<'calcao' | 'meiao', Record<LadoKit, [number, number]>> = {
  calcao: { frente: [0.269, 0.719], verso: [0.273, 0.731] },
  meiao: { frente: [0.166, 0.838], verso: [0.164, 0.839] },
};
