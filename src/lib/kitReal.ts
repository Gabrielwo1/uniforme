import type { LadoKit, PecaKit } from '@/types/kit';
import { registarEstampas } from './kitDemo';
import { AMOSTRAS, CAIXAS, type Caixa } from './kitCaixas';
import * as milan from './estampas/milanDados';
import * as dinoCamisola from './estampas/dinoCamisolaDados';
import * as dinoCalcao from './estampas/dinoCalcaoDados';
import * as askaCamisola from './estampas/askaCamisolaDados';
import * as astonCamisola from './estampas/astonCamisolaDados';

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
  /** Cor da peça por baixo da arte, quando o molde não traz fundo próprio
      (o Aston Vila desenha o corpo em vez de o preencher). */
  corBase?: string;
}

/**
 * Rótulo de uma camada da estampa: "Camada A", "Camada B", ...
 *
 * De propósito SEM significado. Tentei nomes descritivos ("Faixa",
 * "Mangas") e chocaram com as ZONAS da peça, que já se chamam Gola e
 * Mangas: o painel mostrava dois "Mangas" e não se percebia qual era o
 * tecido e qual era o desenho. As letras separam os dois mundos de vez —
 * zonas têm nome de peça, camadas têm letra — e servem qualquer tema que
 * o cliente mande, sem tabela para manter.
 *
 * A letra é POSICIONAL, como o id (`cor1`): é o que faz a camada A da
 * camisola ser a mesma do calção e o cadeado repetir-lhe a cor.
 */
function letraDaCamada(i: number): string {
  let n = i;
  let letra = '';
  do {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letra;
}

/** Cor de fundo de uma peça: a do seu molde; senão a de outra peça do mesmo
    tema, para o conjunto ler como um só quando só a camisola tem arte. */
function fundoDe(tema: Tema, dados?: DadosTema): string {
  const doTema =
    tema.dados?.COR_FUNDO ??
    Object.values(tema.porPeca ?? {}).find((d) => d?.COR_FUNDO)?.COR_FUNDO;
  return dados?.COR_FUNDO ?? doTema ?? tema.corBase ?? '#221f20';
}

const TEMAS: Tema[] = [
  {
    id: 'milan',
    nome: 'Milan',
    codModelo: '003',
    dados: milan,
  },
  {
    id: 'dino',
    nome: 'Dino',
    codModelo: '004',
    porPeca: { camisola: dinoCamisola, calcao: dinoCalcao },
  },
  {
    id: 'aska',
    nome: 'Aska',
    codModelo: '005',
    porPeca: { camisola: askaCamisola },
  },
  {
    id: 'aston',
    nome: 'Aston Vila',
    codModelo: '006',
    porPeca: { camisola: astonCamisola },
    corBase: '#8d1f38',
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
          corBasePadrao: fundoDe(tema, dados),
          amostraViewBox: AMOSTRAS[peca],
          camadas: (dados?.CAMADAS ?? []).map((c, i) => ({
            id: c.id,
            nome: `Camada ${letraDaCamada(i)}`,
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
