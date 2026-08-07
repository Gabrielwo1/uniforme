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

/* Zonas coloríveis por peça. Nos ficheiros reais cada uma será um PNG
   recortado do PSD (o mockup já traz gola e punhos em camadas próprias);
   aqui são paths para a demonstração poder correr sem esses assets. */

const GOLA_FRENTE = `
  M 400 215 C 450 272, 550 272, 600 215 L 578 190 C 540 232, 460 232, 422 190 Z`;
const GOLA_VERSO = `
  M 400 210 C 460 247, 540 247, 600 210 L 588 186 C 540 212, 460 212, 412 186 Z`;

/* Bainhas das mangas: faixas coladas à aresta exterior da silhueta
   (820 300 → 770 460 do lado direito), deslocadas para dentro. */
const PUNHOS = `
  M 820 300 L 770 460 L 718 444 L 768 284 Z
  M 180 300 L 230 460 L 282 444 L 232 284 Z`;

const BARRA_CALCAO = `M 295 470 C 300 520, 360 540, 440 540 L 460 560 L 510 560
  L 500 500 L 490 560 L 540 560 L 560 540 C 640 540, 700 520, 705 470
  L 700 500 C 690 545, 630 562, 556 562 L 540 582 L 460 582 L 444 562
  C 370 562, 310 545, 300 500 Z`;

const PUNHO_MEIAO = `M 430 200 L 570 200 L 573 268 L 427 268 Z`;

/** Costuras que não mudam de cor. */
const COSTURAS: Partial<Record<PecaKit, string>> = {
  camisola: `<path d="M 320 230 L 300 430 M 680 230 L 700 430"
                   stroke="#00000022" stroke-width="3" fill="none"/>`,
};

function zonasDe(peca: PecaKit, lado: LadoKit): ZonaPeca[] {
  const corpo: ZonaPeca = {
    id: 'corpo',
    nome: 'Corpo',
    silhueta: SILHUETAS[peca],
    corPadrao: '#f5a800',
    recebeEstampa: true,
  };

  if (peca === 'camisola') {
    return [
      corpo,
      { id: 'gola', nome: 'Gola', silhueta: lado === 'frente' ? GOLA_FRENTE : GOLA_VERSO,
        corPadrao: '#151515' },
      { id: 'punhos', nome: 'Punhos', silhueta: PUNHOS, corPadrao: '#151515' },
    ];
  }
  if (peca === 'calcao') {
    return [corpo, { id: 'barra', nome: 'Barra', silhueta: BARRA_CALCAO, corPadrao: '#151515' }];
  }
  return [corpo, { id: 'punho', nome: 'Punho', silhueta: PUNHO_MEIAO, corPadrao: '#151515' }];
}

export function moldeDemo(peca: PecaKit, lado: LadoKit): MoldePeca {
  return {
    peca,
    lado,
    viewBox: VIEWBOX,
    zonas: zonasDe(peca, lado),
    detalhes: COSTURAS[peca],
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
