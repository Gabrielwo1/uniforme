import type { LadoKit, PecaKit, TipoAplicacao } from '@/types/kit';
import { CAIXAS, PERNAS, type Caixa } from './kitCaixas';

/**
 * Catálogo de POSIÇÕES de aplicação (nome, número, escudo e logos).
 *
 * Uma aplicação não se arrasta livremente: escolhe-se um LOCAL do catálogo.
 * É assim que a produção funciona — o peito esquerdo, o número das costas e
 * a coxa são sítios com regras de tamanho e de bordado — e é também o que
 * evita que o utilizador ponha o escudo fora da peça.
 *
 * Cada local é definido em FRAÇÕES da caixa da peça (ver `kitCaixas`), não em
 * pixéis: a mesma definição serve os dois ambientes (peças soltas e jogador),
 * cujas caixas são diferentes. O deslocamento fino (`dx`/`dy` da aplicação)
 * fica a cargo do utilizador, dentro de limites apertados.
 */

export interface LocalAplicacao {
  id: string;
  nome: string;
  peca: PecaKit;
  lado: LadoKit;
  /** Caixa da aplicação na tela comum 1080×2460. */
  caixa: Caixa;
  /** Tipos que fazem sentido aqui — o painel só oferece estes. */
  aceita: TipoAplicacao[];
}

/** Definição em frações: centro (cx, cy) e tamanho (w, h) da caixa da peça. */
interface Def {
  id: string;
  nome: string;
  peca: PecaKit;
  lado: LadoKit;
  cx: number | 'perna-esq' | 'perna-dir';
  cy: number;
  w: number;
  h: number;
  aceita: TipoAplicacao[];
}

const TUDO: TipoAplicacao[] = ['texto', 'numero', 'logo'];

/* Esquerda e direita são SEMPRE como se vê no ecrã — não a mão do jogador.
   É a leitura que o utilizador faz do que tem à frente, e o verso é um
   local à parte, por isso não há ambiguidade a resolver. */
const DEFS: Def[] = [
  // ------------------------------------------------------------ camisola --
  /* cy medido na referência do concorrente (2026-09-04): o escudo assenta
     EM CIMA DO PEITO (~26% da altura da camisola), não no colarinho — a
     0.19 ficava alto de mais, palavra do cliente. */
  { id: 'peito-esq', nome: 'Peito esquerdo', peca: 'camisola', lado: 'frente',
    cx: 0.28, cy: 0.26, w: 0.2, h: 0.09, aceita: TUDO },
  { id: 'peito-dir', nome: 'Peito direito', peca: 'camisola', lado: 'frente',
    cx: 0.72, cy: 0.26, w: 0.2, h: 0.09, aceita: TUDO },
  { id: 'peito-centro', nome: 'Peito ao centro', peca: 'camisola', lado: 'frente',
    cx: 0.5, cy: 0.34, w: 0.6, h: 0.13, aceita: TUDO },
  { id: 'barriga', nome: 'Barriga', peca: 'camisola', lado: 'frente',
    cx: 0.5, cy: 0.66, w: 0.5, h: 0.11, aceita: TUDO },

  /* posições de PATROCÍNIO (2026-09-04, espelho do concorrente): topo do
     peito e mangas andam aos PARES — o painel cria as duas de uma vez */
  { id: 'ombro-esq', nome: 'Peito topo esquerdo', peca: 'camisola', lado: 'frente',
    cx: 0.28, cy: 0.1, w: 0.17, h: 0.05, aceita: ['logo'] },
  { id: 'ombro-dir', nome: 'Peito topo direito', peca: 'camisola', lado: 'frente',
    cx: 0.72, cy: 0.1, w: 0.17, h: 0.05, aceita: ['logo'] },
  { id: 'manga-esq', nome: 'Manga esquerda', peca: 'camisola', lado: 'frente',
    cx: 0.08, cy: 0.24, w: 0.12, h: 0.055, aceita: ['logo'] },
  { id: 'manga-dir', nome: 'Manga direita', peca: 'camisola', lado: 'frente',
    cx: 0.92, cy: 0.24, w: 0.12, h: 0.055, aceita: ['logo'] },
  { id: 'costas-topo', nome: 'Costas no topo', peca: 'camisola', lado: 'verso',
    cx: 0.5, cy: 0.06, w: 0.5, h: 0.05, aceita: ['logo'] },

  { id: 'nome-costas', nome: 'Nome (costas)', peca: 'camisola', lado: 'verso',
    cx: 0.5, cy: 0.13, w: 0.72, h: 0.08, aceita: ['texto'] },
  { id: 'numero-costas', nome: 'Número (costas)', peca: 'camisola', lado: 'verso',
    cx: 0.5, cy: 0.37, w: 0.46, h: 0.28, aceita: ['numero', 'texto'] },
  { id: 'costas-baixo', nome: 'Costas em baixo', peca: 'camisola', lado: 'verso',
    cx: 0.5, cy: 0.74, w: 0.54, h: 0.09, aceita: TUDO },

  // -------------------------------------------------------------- calção --
  { id: 'coxa-esq', nome: 'Coxa esquerda', peca: 'calcao', lado: 'frente',
    cx: 'perna-esq', cy: 0.4, w: 0.19, h: 0.17, aceita: TUDO },
  { id: 'coxa-dir', nome: 'Coxa direita', peca: 'calcao', lado: 'frente',
    cx: 'perna-dir', cy: 0.4, w: 0.19, h: 0.17, aceita: TUDO },
  { id: 'coxa-verso-esq', nome: 'Coxa esquerda (verso)', peca: 'calcao', lado: 'verso',
    cx: 'perna-esq', cy: 0.4, w: 0.19, h: 0.17, aceita: TUDO },
  { id: 'coxa-verso-dir', nome: 'Coxa direita (verso)', peca: 'calcao', lado: 'verso',
    cx: 'perna-dir', cy: 0.4, w: 0.19, h: 0.17, aceita: TUDO },

  // -------------------------------------------------------------- meião --
  { id: 'meia-esq', nome: 'Meia esquerda', peca: 'meiao', lado: 'frente',
    cx: 'perna-esq', cy: 0.16, w: 0.15, h: 0.08, aceita: TUDO },
  { id: 'meia-dir', nome: 'Meia direita', peca: 'meiao', lado: 'frente',
    cx: 'perna-dir', cy: 0.16, w: 0.15, h: 0.08, aceita: TUDO },
  { id: 'meia-verso-esq', nome: 'Meia esquerda (verso)', peca: 'meiao', lado: 'verso',
    cx: 'perna-esq', cy: 0.16, w: 0.15, h: 0.08, aceita: TUDO },
  { id: 'meia-verso-dir', nome: 'Meia direita (verso)', peca: 'meiao', lado: 'verso',
    cx: 'perna-dir', cy: 0.16, w: 0.15, h: 0.08, aceita: TUDO },
];

function centroX(def: Def, c: Caixa): number {
  if (typeof def.cx === 'number') return c.x + def.cx * c.w;
  // as pernas não são simétricas na caixa: a fração vem da medição do alfa
  const par = PERNAS[def.peca as 'calcao' | 'meiao'][def.lado];
  return c.x + par[def.cx === 'perna-esq' ? 0 : 1] * c.w;
}

export const LOCAIS: LocalAplicacao[] = DEFS.map((def) => {
  const c = CAIXAS[def.peca][def.lado];
  const w = def.w * c.w;
  const h = def.h * c.h;
  return {
    id: def.id,
    nome: def.nome,
    peca: def.peca,
    lado: def.lado,
    caixa: { x: centroX(def, c) - w / 2, y: c.y + def.cy * c.h - h / 2, w, h },
    aceita: def.aceita,
  };
});

export function localPorId(id: string): LocalAplicacao | undefined {
  return LOCAIS.find((l) => l.id === id);
}

/** Locais onde este tipo de aplicação pode assentar. */
export function locaisPara(tipo: TipoAplicacao): LocalAplicacao[] {
  return LOCAIS.filter((l) => l.aceita.includes(tipo));
}

/* ---------------------------------------------------------------- fontes -- */

export interface FonteAplicacao {
  id: string;
  nome: string;
  css: string;
}

/** Famílias já carregadas no `index.html` — tipos de desporto, mais o Inter
    para quando o cliente quer um patrocinador em texto normal. */
export const FONTES: FonteAplicacao[] = [
  { id: 'anton', nome: 'Anton', css: "'Anton', sans-serif" },
  { id: 'bebas', nome: 'Bebas Neue', css: "'Bebas Neue', sans-serif" },
  { id: 'teko', nome: 'Teko', css: "'Teko', sans-serif" },
  { id: 'oswald', nome: 'Oswald', css: "'Oswald', sans-serif" },
  { id: 'inter', nome: 'Inter', css: "'Inter', sans-serif" },
];

export function fontePorId(id: string): FonteAplicacao {
  return FONTES.find((f) => f.id === id) ?? FONTES[0];
}
