import type { LadoKit, PecaKit } from '@/types/kit';
import { registarEstampas, VARIANTE_JOGADOR } from './kitDemo';
import * as milan from './estampas/milanDados';
import * as dinoCamisola from './estampas/dinoCamisolaDados';
import * as dinoCalcao from './estampas/dinoCalcaoDados';

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
  /** Arte única, esticada às três peças (temas planos, tipo riscas). */
  dados?: DadosTema;
  /** Arte DESENHADA POR PEÇA, dentro do molde de cada uma — o formato que
      o cliente usa (ver scripts/converter-molde.py). Uma peça sem arte
      própria fica com a cor base. */
  porPeca?: Partial<Record<PecaKit, DadosTema>>;
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
  {
    id: 'dino',
    nome: 'Dino',
    codModelo: '004',
    porPeca: { camisola: dinoCamisola, calcao: dinoCalcao },
    nomes: { '#cb9863': 'Faixa' },
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

/** Ambiente do JOGADOR: mockup do designer ("UNIFORME DINO"). As caixas
    são a posição real de cada peça no avatar, encontrada por correspondência
    de padrão — ver scripts/montar-dino.py. */
const CAIXAS_JOGADOR: Record<PecaKit, Record<LadoKit, Caixa>> = {
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

const CAIXAS = VARIANTE_JOGADOR ? CAIXAS_JOGADOR : CAIXAS_PADRAO;

/** Janela da miniatura quadrada, por peça (sobre a caixa da frente). */
const AMOSTRAS: Record<PecaKit, string> = VARIANTE_JOGADOR
  ? { camisola: '290 430 500 660', calcao: '255 1250 570 425', meiao: '180 1750 740 640' }
  : { camisola: '340 200 400 700', calcao: '260 990 400 450', meiao: '300 1650 400 550' };

function naCaixa(dados: DadosTema, svg: string, c: Caixa, lado: LadoKit, peca: PecaKit): string {
  const q = dados.QUADRO;
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
      (['camisola', 'calcao', 'meiao'] as PecaKit[]).map((peca) => {
        // arte por peça quando o tema a tem; senão a arte única do tema
        const dados = tema.porPeca ? tema.porPeca[peca] : tema.dados;
        return {
          id: `${tema.id}-${peca}`,
          codModelo: tema.codModelo,
          nome: tema.nome,
          peca,
          corBasePadrao: (dados ?? tema.dados)?.COR_FUNDO ?? '#221f20',
          amostraViewBox: AMOSTRAS[peca],
          camadas: (dados?.CAMADAS ?? []).map((c, i) => ({
            id: c.id,
            nome: tema.nomes?.[c.cor] ?? `Cor ${i + 1}`,
            corPadrao: c.cor,
            desenho: {
              frente: naCaixa(dados!, c.svg, CAIXAS[peca].frente, 'frente', peca),
              verso: naCaixa(dados!, c.svg, CAIXAS[peca].verso, 'verso', peca),
            },
          })),
        };
      }),
    );
  }
}
