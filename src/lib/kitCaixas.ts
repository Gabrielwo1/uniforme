import type { LadoKit, PecaKit } from '@/types/kit';

/**
 * Geometria das peças na tela comum (1080×2460).
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
    avatar do mockup do designer, medida por scripts/montar-dino.py.
    Na camisola é só o TRONCO: a estampa não passa às mangas nem à gola,
    que são zonas com cor própria. */
export const CAIXAS: Record<PecaKit, Record<LadoKit, Caixa>> = {
  camisola: {
    // só o TRONCO: as mangas são camada à parte no mockup do designer
    frente: { x: 283, y: 386, w: 517, h: 873 },
    verso: { x: 280, y: 365, w: 519, h: 905 },
  },
  calcao: {
    frente: { x: 251, y: 1245, w: 581, h: 440 },
    verso: { x: 244, y: 1236, w: 593, h: 435 },
  },
  meiao: {
    frente: { x: 173, y: 1744, w: 753, h: 665 },
    verso: { x: 205, y: 1756, w: 669, h: 652 },
  },
};

/** Janela da miniatura quadrada, por peça (sobre a caixa da frente). */
export const AMOSTRAS: Record<PecaKit, string> = {
  camisola: '290 430 500 660',
  calcao: '255 1250 570 425',
  meiao: '180 1750 740 640',
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
  calcao: { frente: [0.269, 0.726], verso: [0.272, 0.725] },
  meiao: { frente: [0.212, 0.772], verso: [0.191, 0.804] },
};
