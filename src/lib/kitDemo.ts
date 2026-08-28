import type { Estampa, LadoKit, MoldePeca, PecaKit, ZonaPeca } from '@/types/kit';

/**
 * Catálogo de DEMONSTRAÇÃO do motor de templates.
 *
 * Serve para desenvolver e validar a composição enquanto os assets reais da
 * KYPZL não estão convertidos: os ficheiros do cliente são PSD/TIF/AI de
 * produção (ver memória do projeto) e ainda têm de ser exportados para
 * silhueta SVG + uma camada SVG por cor.
 *
 * Assim que chegarem, este ficheiro é substituído por dados do Supabase —
 * o motor (`PecaMockup`) não muda, porque só depende de `MoldePeca`/`Estampa`.
 */

/** Tela COMUM das peças vestidas: a coluna inteira do visualizador
    (wrapper 380×615 × 4 — ver scripts/montar-dino2.py). Todas as peças
    partilham a tela, por isso todos os slots são idênticos. */
const TELAS: Record<PecaKit, { w: number; h: number }> = {
  camisola: { w: 1520, h: 2460 },
  calcao: { w: 1520, h: 2460 },
  meiao: { w: 1520, h: 2460 },
};

/* --------------------------------------------------- estampas registadas -- */

/** Estampas convertidas de ficheiros reais (ver `kitReal.ts`). Entram à
    frente das de demonstração para serem a escolha por omissão. */
const REGISTADAS: Estampa[] = [];

export function registarEstampas(lista: Estampa[]) {
  for (const e of lista) {
    if (!REGISTADAS.some((x) => x.id === e.id)) REGISTADAS.push(e);
  }
}

/* ---------------------------------------------------------------- moldes -- */

/* As peças são as camadas do SEGUNDO mockup do designer ("uniforme dino
   correto ultimo feito-2"), cozidas na tela comum por
   scripts/montar-dino2.py. Cada uma é uma zona colorível à parte — o que
   separa a gola e as mangas do corpo. */

const RAIZ_MOLDES = '/moldes/jog';

function zonasDe(peca: PecaKit, lado: LadoKit): ZonaPeca[] {
  const corpo: ZonaPeca = {
    id: 'corpo', nome: 'Cor base', imagem: `${RAIZ_MOLDES}/vestida-${peca}-${lado}.png`,
    corPadrao: peca === 'camisola' ? '#221f20' : '#ffffff', recebeEstampa: true,
  };
  if (peca !== 'camisola') return [corpo];

  // Gola e PUNHOS são zonas próprias, desenhadas DEPOIS do corpo. Desde o
  // terceiro envio a camisa vem inteira (a estampa corre pela manga) e a
  // camada "mangas" é só a TIRA do punho — o id mantém-se pelo nome dos
  // ficheiros, o rótulo é que diz a verdade.
  return [
    corpo,
    { id: 'gola', nome: 'Gola', imagem: `${RAIZ_MOLDES}/vestida-gola-${lado}.png`,
      corPadrao: '#151515' },
    { id: 'mangas', nome: 'Punhos', imagem: `${RAIZ_MOLDES}/vestida-mangas-${lado}.png`,
      corPadrao: '#151515' },
  ];
}

export function moldeDemo(peca: PecaKit, lado: LadoKit): MoldePeca {
  const tela = TELAS[peca];
  return {
    peca,
    lado,
    viewBox: `0 0 ${tela.w} ${tela.h}`,
    zonas: zonasDe(peca, lado),
  };
}

/* -------------------------------------------------------------- estampas -- */

/** Peça sem estampa — só as cores das zonas. */
function estampaLisa(peca: PecaKit): Estampa {
  return {
    id: `liso-${peca}`,
    codModelo: '000',
    nome: 'Liso',
    peca,
    corBasePadrao: '#ffffff',
    camadas: [],
  };
}

/**
 * Estampas disponíveis por peça: os temas REAIS registados (ver kitReal),
 * mais o "Liso" (sem estampa). A primeira é a seleção por omissão.
 */
export function estampasDemo(peca: PecaKit): Estampa[] {
  return [...REGISTADAS.filter((e) => e.peca === peca), estampaLisa(peca)];
}

export function estampaDemoPorId(peca: PecaKit, id: string): Estampa {
  const lista = estampasDemo(peca);
  return lista.find((e) => e.id === id) ?? lista[0];
}
