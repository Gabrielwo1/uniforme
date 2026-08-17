import type { LadoKit, PecaKit } from '@/types/kit';
import { registarEstampas } from './kitDemo';
import { AMOSTRAS, CAIXAS, type Caixa } from './kitCaixas';
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
