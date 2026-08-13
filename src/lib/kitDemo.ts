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
    (wrapper 270×615 × 4 — ver scripts/vestir-conjunto.py). Todas as peças
    partilham a tela, por isso todos os slots são idênticos. */
const TELAS: Record<PecaKit, { w: number; h: number }> = {
  camisola: { w: 1080, h: 2460 },
  calcao: { w: 1080, h: 2460 },
  meiao: { w: 1080, h: 2460 },
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

/* Peças no estilo "vestido" (forma 3D de corpo invisível), geradas por IA
   na pose do jogador-modelo — é o que faz o conjunto encaixar nele. Uma
   zona por peça, por agora: quando o designer separar gola/mangas destes
   mockups em camadas, as zonas extra voltam a entrar aqui. */

function zonasDe(peca: PecaKit, lado: LadoKit): ZonaPeca[] {
  return [
    { id: 'corpo', nome: 'Cor base', imagem: `/moldes/vestida-${peca}-${lado}.png`,
      corPadrao: peca === 'camisola' ? '#221f20' : '#ffffff', recebeEstampa: true },
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

/** Faixas verticais — camada 1 do template "listras". */
const listrasA = `
  <path d="M 340 150 h 70 v 780 h -70 Z M 480 150 h 70 v 780 h -70 Z M 620 150 h 70 v 780 h -70 Z" fill="black"/>`;
/** Faixas finas intercaladas — camada 2, para provar duas cores independentes. */
const listrasB = `
  <path d="M 420 150 h 24 v 780 h -24 Z M 560 150 h 24 v 780 h -24 Z" fill="black"/>`;

/** Faixa horizontal no peito + ombros — template "faixa". */
const faixaA = `<path d="M 150 380 h 700 v 120 h -700 Z" fill="black"/>`;
const faixaB = `
  <path d="M 320 230 C 360 150, 640 150, 680 230 L 820 300 L 780 360 L 660 300
           C 620 250, 380 250, 340 300 L 220 360 L 180 300 Z" fill="black"/>`;

/** Os desenhos demo estão no espaço 1000; cada peça compõe na sua tela. */
function noEspacoDa(peca: PecaKit, svg: string): string {
  const tela = TELAS[peca];
  return `<g transform="scale(${tela.w / 1000} ${tela.h / 1000})">${svg}</g>`;
}

function estampaListras(peca: PecaKit): Estampa {
  const a = noEspacoDa(peca, listrasA);
  const b = noEspacoDa(peca, listrasB);
  return {
    id: `listras-${peca}`,
    codModelo: '001',
    nome: 'Listras',
    peca,
    corBasePadrao: '#f5a800',
    camadas: [
      {
        id: 'principal',
        nome: 'Listras largas',
        corPadrao: '#151515',
        desenho: { frente: a, verso: a },
      },
      {
        id: 'secundaria',
        nome: 'Listras finas',
        corPadrao: '#b62126',
        desenho: { frente: b, verso: b },
      },
    ],
  };
}

function estampaFaixa(peca: PecaKit): Estampa {
  const a = noEspacoDa(peca, faixaA);
  const b = noEspacoDa(peca, faixaB);
  return {
    id: `faixa-${peca}`,
    codModelo: '002',
    nome: 'Faixa',
    peca,
    corBasePadrao: '#123c7a',
    camadas: [
      {
        id: 'faixa',
        nome: 'Faixa peito',
        corPadrao: '#ffffff',
        desenho: { frente: a, verso: a },
      },
      {
        id: 'ombros',
        nome: 'Ombros',
        corPadrao: '#d4a942',
        desenho: { frente: b, verso: b },
      },
    ],
  };
}

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
 * Estampas disponíveis por peça: primeiro as reais, depois "Liso", depois as
 * demo. A primeira é a seleção por omissão — na camisola é o tema real; no
 * calção e meião (sem arte real ainda) é o liso, para o tema da camisola não
 * aparecer "esticado" nas outras peças sem ser pedido.
 */
export function estampasDemo(peca: PecaKit): Estampa[] {
  return [
    ...REGISTADAS.filter((e) => e.peca === peca),
    estampaLisa(peca),
    estampaListras(peca),
    estampaFaixa(peca),
  ];
}

export function estampaDemoPorId(peca: PecaKit, id: string): Estampa {
  const lista = estampasDemo(peca);
  return lista.find((e) => e.id === id) ?? lista[0];
}
