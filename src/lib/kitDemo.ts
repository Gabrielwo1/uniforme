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

/** Ambiente de teste `?lab=jogador`: peças cozidas para vestir o jogador
    recortado, numa pasta própria — a versão principal não muda. */
export const VARIANTE_JOGADOR =
  new URLSearchParams(window.location.search).get('lab') === 'jogador';
const RAIZ_MOLDES = VARIANTE_JOGADOR ? '/moldes/jog' : '/moldes';

function zonasDe(peca: PecaKit, lado: LadoKit): ZonaPeca[] {
  const corpo: ZonaPeca = {
    id: 'corpo', nome: 'Cor base', imagem: `${RAIZ_MOLDES}/vestida-${peca}-${lado}.png`,
    corPadrao: peca === 'camisola' ? '#221f20' : '#ffffff', recebeEstampa: true,
  };
  if (peca !== 'camisola') return [corpo];

  // Gola e punhos são zonas próprias, desenhadas DEPOIS do corpo: é o que
  // impede a estampa de lhes passar por cima (só o corpo a recebe).
  const gola: ZonaPeca = {
    id: 'gola', nome: 'Gola', imagem: `${RAIZ_MOLDES}/vestida-gola-${lado}.png`,
    corPadrao: '#151515',
  };
  // os punhos só vieram no mockup do designer (ambiente do jogador)
  // a camada MANGA do designer cobre a manga inteira (não só o punho):
  // é o que tira a estampa das mangas e as torna coloríveis à parte
  return VARIANTE_JOGADOR
    ? [corpo, gola, { id: 'mangas', nome: 'Mangas',
        imagem: `${RAIZ_MOLDES}/vestida-mangas-${lado}.png`, corPadrao: '#151515' }]
    : [corpo, { ...gola, corPadrao: '#e9e9e9' }];
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
