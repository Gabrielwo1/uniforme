import type { Estampa, LadoKit, MoldePeca, PecaKit } from '@/types/kit';

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

const VIEWBOX = '0 0 1000 1000';

/* ------------------------------------------------------------- silhuetas -- */

const SILHUETA_CAMISOLA = `
  M 320 230 C 360 150, 640 150, 680 230 L 820 300 L 770 460 L 700 430 L 700 850
  C 700 880, 670 900, 640 900 L 360 900 C 330 900, 300 880, 300 850 L 300 430
  L 230 460 L 180 300 Z`;

const SILHUETA_CALCAO = `
  M 280 320 L 720 320 L 705 470 C 700 520, 640 540, 560 540 L 540 560 L 510 560
  L 500 430 L 490 560 L 460 560 L 440 540 C 360 540, 300 520, 295 470 Z`;

const SILHUETA_MEIAO = `
  M 430 200 L 570 200 L 585 520 C 590 620, 585 700, 570 780 L 560 860
  C 555 890, 520 900, 500 900 C 480 900, 445 890, 440 860 L 430 780
  C 415 700, 410 620, 415 520 Z`;

const SILHUETAS: Record<PecaKit, string> = {
  camisola: SILHUETA_CAMISOLA,
  calcao: SILHUETA_CALCAO,
  meiao: SILHUETA_MEIAO,
};

/** Gola/costuras — só a camisola tem, nesta demonstração. */
const DETALHES_CAMISOLA: Record<LadoKit, string> = {
  frente: `
    <path d="M 400 215 C 450 270, 550 270, 600 215 L 580 195 C 540 235, 460 235, 420 195 Z"
          fill="#00000018"/>
    <path d="M 320 230 L 300 430 M 680 230 L 700 430" stroke="#00000022" stroke-width="3" fill="none"/>`,
  verso: `
    <path d="M 400 210 C 460 245, 540 245, 600 210 L 588 188 C 540 212, 460 212, 412 188 Z"
          fill="#00000018"/>`,
};

export function moldeDemo(peca: PecaKit, lado: LadoKit): MoldePeca {
  return {
    peca,
    lado,
    viewBox: VIEWBOX,
    silhueta: SILHUETAS[peca],
    detalhes: peca === 'camisola' ? DETALHES_CAMISOLA[lado] : undefined,
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

function estampaListras(peca: PecaKit): Estampa {
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
        desenho: { frente: listrasA, verso: listrasA },
      },
      {
        id: 'secundaria',
        nome: 'Listras finas',
        corPadrao: '#b62126',
        desenho: { frente: listrasB, verso: listrasB },
      },
    ],
  };
}

function estampaFaixa(peca: PecaKit): Estampa {
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
        desenho: { frente: faixaA, verso: faixaA },
      },
      {
        id: 'ombros',
        nome: 'Ombros',
        corPadrao: '#d4a942',
        desenho: { frente: faixaB, verso: faixaB },
      },
    ],
  };
}

/** Estampas disponíveis por peça (todas as peças partilham os templates). */
export function estampasDemo(peca: PecaKit): Estampa[] {
  return [estampaListras(peca), estampaFaixa(peca)];
}

export function estampaDemoPorId(peca: PecaKit, id: string): Estampa {
  const lista = estampasDemo(peca);
  return lista.find((e) => e.id === id) ?? lista[0];
}
