import type { LadoKit, PecaKit } from '@/types/kit';
import { registarEstampas, VARIANTE_JOGADOR } from './kitDemo';
import * as milan from './estampas/milanDados';

/**
 * Regista os TEMAS REAIS convertidos dos ficheiros do cliente.
 *
 * Para acrescentar um tema novo:
 *   1. python3 scripts/converter-estampa.py "<ficheiro>.svg" \
 *        src/lib/estampas/<nome>Dados.ts <prefixo-curto>
 *   2. acrescentar uma linha à tabela TEMAS abaixo.
 *
 * O desenho convertido é plano e serve as TRÊS peças com o mesmo
 * Cod. Modelo (vincula no sincronizar, como na referência): só muda a
 * caixa onde estica — tronco na camisola, peça inteira nas outras.
 *
 * Este módulo é importado dinamicamente (ver `KitLab`): cada tema pesa
 * megabytes de vetores e não pode carregar com o app.
 */

interface DadosTema {
  QUADRO: { x: number; y: number; w: number; h: number };
  COR_FUNDO: string | null;
  CAMADAS: { id: string; cor: string; svg: string }[];
}

interface Tema {
  id: string;
  nome: string;
  codModelo: string;
  dados: DadosTema;
  /** Nomes das camadas no painel de cores, por cor de origem (opcional). */
  nomes?: Record<string, string>;
}

const TEMAS: Tema[] = [
  {
    id: 'milan',
    nome: 'Milan',
    codModelo: '003',
    dados: milan,
    nomes: { '#808081': 'Textura', '#c21633': 'Listras', '#c83a3e': 'Vivos' },
  },
];

interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Caixas da estampa por peça e lado (tela comum 1080×2460).
    Na camisola é o TRONCO: exclui as mangas (senão a estampa estica até às
    pontas delas) e a gola (que fica com a cor base). No calção e meião é o
    conteúdo inteiro da peça. Medidas pelo scripts/montar-originais.py. */
const CAIXAS_PADRAO: Record<PecaKit, Record<LadoKit, Caixa>> = {
  camisola: {
    frente: { x: 323, y: 108, w: 440, h: 880 },
    verso: { x: 319, y: 109, w: 441, h: 889 },
  },
  calcao: {
    frente: { x: 247, y: 976, w: 586, h: 483 },
    verso: { x: 236, y: 976, w: 609, h: 476 },
  },
  meiao: {
    frente: { x: 281, y: 1620, w: 518, h: 609 },
    verso: { x: 194, y: 1680, w: 693, h: 590 },
  },
};

/** Ambiente de teste com o jogador: as peças vivem noutras caixas
    (cozedura de moldes/jog — perfil "jogador" do montar-originais.py). */
const CAIXAS_JOGADOR: Record<PecaKit, Record<LadoKit, Caixa>> = {
  camisola: {
    frente: { x: 372, y: 434, w: 341, h: 674 },
    verso: { x: 368, y: 435, w: 343, h: 680 },
  },
  calcao: {
    frente: { x: 301, y: 1200, w: 478, h: 393 },
    verso: { x: 292, y: 1200, w: 496, h: 388 },
  },
  meiao: {
    frente: { x: 329, y: 1736, w: 422, h: 496 },
    verso: { x: 258, y: 1796, w: 565, h: 480 },
  },
};

const CAIXAS = VARIANTE_JOGADOR ? CAIXAS_JOGADOR : CAIXAS_PADRAO;

/** Janela da miniatura quadrada, por peça (sobre a caixa da frente). */
const AMOSTRAS: Record<PecaKit, string> = VARIANTE_JOGADOR
  ? { camisola: '395 460 290 500', calcao: '330 1240 340 350', meiao: '345 1750 320 400' }
  : { camisola: '340 200 400 700', calcao: '260 990 400 450', meiao: '300 1650 400 550' };

function naCaixa(tema: Tema, svg: string, c: Caixa, lado: LadoKit, peca: PecaKit): string {
  const q = tema.dados.QUADRO;
  const sx = c.w / q.w;
  const sy = c.h / q.h;
  const t = `translate(${(c.x - q.x * sx).toFixed(2)} ${(c.y - q.y * sy).toFixed(2)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)})`;
  // os ids dos recortes levam peça e lado no nome: as seis composições
  // (3 peças × frente/verso) montam no DOM em simultâneo
  return `<g transform="${t}">${svg.split('__L__').join(`${peca}-${lado}`)}</g>`;
}

export function registarReais() {
  for (const tema of TEMAS) {
    registarEstampas(
      (['camisola', 'calcao', 'meiao'] as PecaKit[]).map((peca) => ({
        id: `${tema.id}-${peca}`,
        codModelo: tema.codModelo,
        nome: tema.nome,
        peca,
        corBasePadrao: tema.dados.COR_FUNDO ?? '#221f20',
        amostraViewBox: AMOSTRAS[peca],
        camadas: tema.dados.CAMADAS.map((c, i) => ({
          id: c.id,
          nome: tema.nomes?.[c.cor] ?? `Cor ${i + 1}`,
          corPadrao: c.cor,
          desenho: {
            frente: naCaixa(tema, c.svg, CAIXAS[peca].frente, 'frente', peca),
            verso: naCaixa(tema, c.svg, CAIXAS[peca].verso, 'verso', peca),
          },
        })),
      })),
    );
  }
}
