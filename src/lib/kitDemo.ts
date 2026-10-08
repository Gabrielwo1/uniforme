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

/**
 * Estilos FÍSICOS de gola no palco, além da redonda do mockup do designer.
 *
 * Cada estilo são peças DO PRÓPRIO DESIGNER (envio "DINO SIMULADOR GOLAS
 * NOVAS", 2026-09-27), assadas na tela por scripts/montar_golas.py:
 * `gola-<estilo>-<lado>.png` substitui a zona da gola (recolorível como
 * sempre), e `gola-<estilo>-pele-<lado>.png` é a cabeça/pescoço própria
 * desse estilo (cada decote abre diferente) — vai em `detalhes` para NUNCA
 * ser recolorida, e por cima da gola de propósito: esconde a parte de trás
 * da banda atrás do pescoço, e o recorte dela acaba onde a banda da frente
 * começa.
 */
const GOLA_ESTILOS: Record<
  string,
  { pele?: boolean; verso?: boolean; corpo?: boolean; golaPadrao?: boolean; linha?: boolean; linhaSegueGola?: boolean; peleSob?: boolean }
> = {
  // `corpo`: o estilo traz um corpo-<estilo>-<lado>.png — a camisola do
  // designer MAIS o clone de tecido que fecha o anel que a gola antiga
  // (larga) cobria e a nova (fina) deixa à vista. Recolore com o corpo.
  cruzada: { pele: true, verso: true, corpo: true },
  social: { pele: true, verso: true, corpo: true },
  // 2 CORES V (reenvio 2026-10-04): colar cruzado em DUAS zonas
  // recoloríveis (parte direita = gola, parte esquerda = linha); o colar
  // pendura À FRENTE do pescoço → a pele compõe SOB as zonas (peleSob)
  bico2: { pele: true, verso: true, corpo: true, linha: true, peleSob: true },
  // bico em V: a banda grossa (zona gola) e o debrum `linha` por cima
  // (linha-<estilo>-<lado>.png). O debrum é SEMPRE da cor da gola — sem
  // seletor próprio (pedido do cliente, 2026-10-08).
  vlinha: { pele: true, verso: true, corpo: true, linha: true, linhaSegueGola: true },
};

function zonasDe(peca: PecaKit, lado: LadoKit, golaEstilo?: string): ZonaPeca[] {
  const defEstilo = peca === 'camisola' && golaEstilo ? GOLA_ESTILOS[golaEstilo] : undefined;
  const corpo: ZonaPeca = {
    id: 'corpo', nome: 'Cor base',
    imagem: defEstilo?.corpo
      ? `${RAIZ_MOLDES}/corpo-${golaEstilo}-${lado}.png`
      : `${RAIZ_MOLDES}/vestida-${peca}-${lado}.png`,
    corPadrao: peca === 'camisola' ? '#221f20' : '#ffffff', recebeEstampa: true,
  };
  if (peca !== 'camisola') return [corpo];

  // Gola e PUNHOS são zonas próprias, desenhadas DEPOIS do corpo. Desde o
  // terceiro envio a camisa vem inteira (a estampa corre pela manga) e a
  // camada "mangas" é só a TIRA do punho — o id mantém-se pelo nome dos
  // ficheiros, o rótulo é que diz a verdade.
  const def = golaEstilo ? GOLA_ESTILOS[golaEstilo] : undefined;
  const estilo = def && !def.golaPadrao && (lado === 'frente' || def.verso) ? golaEstilo : null;
  const zonas: ZonaPeca[] = [
    corpo,
    { id: 'gola', nome: 'Gola',
      imagem: estilo
        ? `${RAIZ_MOLDES}/gola-${estilo}-${lado}.png`
        : `${RAIZ_MOLDES}/vestida-gola-${lado}.png`,
      corPadrao: '#151515' },
  ];
  if (estilo && def?.linha) {
    zonas.push({
      id: 'linha', nome: 'Linha da gola',
      imagem: `${RAIZ_MOLDES}/linha-${estilo}-${lado}.png`,
      corPadrao: '#1F2A44',
      ...(def.linhaSegueGola && { segue: 'gola' }),
    });
  }
  zonas.push({
    id: 'mangas', nome: 'Punhos', imagem: `${RAIZ_MOLDES}/vestida-mangas-${lado}.png`,
    corPadrao: '#151515' });
  return zonas;
}

export function moldeDemo(peca: PecaKit, lado: LadoKit, golaEstilo?: string): MoldePeca {
  const tela = TELAS[peca];
  const def = golaEstilo ? GOLA_ESTILOS[golaEstilo] : undefined;
  const comPele =
    peca === 'camisola' && def?.pele && (lado === 'frente' || def.verso);
  return {
    peca,
    lado,
    viewBox: `0 0 ${tela.w} ${tela.h}`,
    zonas: zonasDe(peca, lado, golaEstilo),
    // a pele clonada do vão da gola vai nos detalhes: composta por cima,
    // mas NUNCA recolorida — pele não é tecido
    detalhes: comPele
      ? `<image href="${RAIZ_MOLDES}/gola-${golaEstilo}-pele-${lado}.png" x="0" y="0" width="${tela.w}" height="${tela.h}"/>`
      : undefined,
    detalhesSob: comPele ? def?.peleSob : undefined,
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
