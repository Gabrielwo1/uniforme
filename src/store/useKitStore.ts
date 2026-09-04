import { create } from 'zustand';
import logoKypzl from '@/assets/kypzl-logo-branca.png';
import type { Aplicacao, KitDesign, PecaConfig, PecaKit, TipoAplicacao } from '@/types/kit';
import { PECAS_KIT } from '@/types/kit';
import { estampaDemoPorId, estampasDemo } from '@/lib/kitDemo';
import { locaisPara } from '@/lib/kitLocais';

/**
 * Estado do conjunto (camisola + calção + meião) no simulador por template.
 *
 * O CADEADO é um só e manda em tudo: fechado, o que se mexe numa peça
 * mexe nas três; aberto, cada peça anda por si. É por isso que as ações
 * recebem a peça de ORIGEM e depois propagam — quem mexeu manda.
 */

function configInicial(peca: PecaKit): PecaConfig {
  const estampa = estampasDemo(peca)[0];
  return { estampaId: estampa.id, coresZonas: {}, cores: {} };
}

function designInicial(): KitDesign {
  return {
    pecas: {
      camisola: configInicial('camisola'),
      calcao: configInicial('calcao'),
      meiao: configInicial('meiao'),
    },
    sincronizado: true,
    // o simulador ABRE como a referência do concorrente (pedido do
    // cliente, 2026-09-04): escudo KYPZL ao peito E número 10 nas costas,
    // sem ninguém clicar — o painel permite trocar/tirar os dois
    aplicacoes: [
      {
        ...aplicacaoInicial('logo', 'peito-esq'),
        imagem: logoKypzl,
        nomeFicheiro: 'Logo KYPZL (padrão)',
      },
      aplicacaoInicial('numero', 'numero-costas'),
    ],
  };
}

/** Sítio por omissão de cada tipo — o que a produção espera se ninguém
    mexer: o nome em arco nas costas, o número por baixo, o escudo ao peito. */
const LOCAL_PADRAO: Record<TipoAplicacao, string> = {
  texto: 'nome-costas',
  numero: 'numero-costas',
  logo: 'peito-esq',
};

function aplicacaoInicial(tipo: TipoAplicacao, localId?: string): Aplicacao {
  const local = localId ?? LOCAL_PADRAO[tipo];
  return {
    id: `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    // se o local pedido não aceitar o tipo, cai no primeiro que aceite
    localId: locaisPara(tipo).some((l) => l.id === local)
      ? local
      : (locaisPara(tipo)[0]?.id ?? local),
    texto: tipo === 'numero' ? '10' : tipo === 'texto' ? 'JOGADOR' : undefined,
    cor: '#ffffff',
    corContorno: '#111111',
    fonteId: 'anton',
    escala: 1,
    dx: 0,
    dy: 0,
  };
}

export interface KitStore {
  design: KitDesign;
  /** Local assinalado com a guia tracejada no visualizador enquanto o
      utilizador mexe nele no painel. Não faz parte do design. */
  localEmFoco: string | null;
  setLocalEmFoco: (localId: string | null) => void;

  /** Peças que recebem a alteração feita em `origem` (ela própria incluída). */
  alvos: (origem: PecaKit) => PecaKit[];

  setEstampa: (origem: PecaKit, estampaId: string) => void;
  setCorZona: (origem: PecaKit, zonaId: string, cor: string) => void;
  setCorCamada: (origem: PecaKit, camadaId: string, cor: string) => void;
  cicloEstampa: (origem: PecaKit, direcao: 1 | -1) => void;
  toggleSincronizar: () => void;
  reset: () => void;

  /** Acrescenta um nome/número/logo e devolve-o, para o painel lhe acender
      a guia no visualizador. */
  addAplicacao: (tipo: TipoAplicacao, localId?: string) => Aplicacao;
  setAplicacao: (id: string, mudanca: Partial<Aplicacao>) => void;
  removerAplicacao: (id: string) => void;
}

export const useKitStore = create<KitStore>((set, get) => ({
  design: designInicial(),
  localEmFoco: null,

  setLocalEmFoco: (localId) => set({ localEmFoco: localId }),

  /* Um único cadeado manda em TUDO — cores das zonas, cores das camadas e
     escolha de estampa. Ter regras diferentes por tipo de alteração era o
     que fazia a cor base seguir sem ninguém perceber porquê. */
  alvos: (origem) => (get().design.sincronizado ? PECAS_KIT : [origem]),

  setEstampa: (origem, estampaId) => {
    const alvos = get().alvos(origem);
    set((s) => {
      const pecas = { ...s.design.pecas };
      for (const peca of alvos) {
        // as estampas são por peça: casa pelo código, não pelo id
        const cod = estampaDemoPorId(origem, estampaId).codModelo;
        const equivalente =
          estampasDemo(peca).find((e) => e.codModelo === cod) ?? estampasDemo(peca)[0];
        pecas[peca] = {
          ...pecas[peca],
          estampaId: equivalente.id,
          // troca de estampa reinicia as cores das camadas (os ids mudam) e
          // adota a cor de fundo do tema no corpo — senão a peça não fica
          // como a miniatura da galeria promete. Gola, mangas e restantes
          // zonas ficam como estavam: não dependem do tema.
          cores: {},
          coresZonas: {
            ...pecas[peca].coresZonas,
            corpo: equivalente.corBasePadrao,
          },
        };
      }
      return { design: { ...s.design, pecas } };
    });
  },

  setCorZona: (origem, zonaId, cor) => {
    const alvos = get().alvos(origem);
    set((s) => {
      const pecas = { ...s.design.pecas };
      for (const peca of alvos) {
        pecas[peca] = {
          ...pecas[peca],
          coresZonas: { ...pecas[peca].coresZonas, [zonaId]: cor },
        };
      }
      return { design: { ...s.design, pecas } };
    });
  },

  setCorCamada: (origem, camadaId, cor) => {
    const alvos = get().alvos(origem);
    set((s) => {
      const pecas = { ...s.design.pecas };
      for (const peca of alvos) {
        pecas[peca] = {
          ...pecas[peca],
          cores: { ...pecas[peca].cores, [camadaId]: cor },
        };
      }
      return { design: { ...s.design, pecas } };
    });
  },

  cicloEstampa: (origem, direcao) => {
    const lista = estampasDemo(origem);
    const atual = lista.findIndex((e) => e.id === get().design.pecas[origem].estampaId);
    const proxima = lista[(atual + direcao + lista.length) % lista.length];
    get().setEstampa(origem, proxima.id);
  },

  toggleSincronizar: () =>
    set((s) => ({ design: { ...s.design, sincronizado: !s.design.sincronizado } })),

  reset: () => set({ design: designInicial(), localEmFoco: null }),

  /* ------------------------------------------------------- aplicações -- */
  /* Ao contrário das cores, as aplicações NÃO seguem o cadeado: um número
     nas costas não tem equivalente no meião, e repetir um escudo por todas
     as peças nunca é o que se quer. Cada uma vive no seu local. */

  addAplicacao: (tipo, localId) => {
    const nova = aplicacaoInicial(tipo, localId);
    set((s) => ({
      design: { ...s.design, aplicacoes: [...(s.design.aplicacoes ?? []), nova] },
    }));
    return nova;
  },

  setAplicacao: (id, mudanca) =>
    set((s) => ({
      design: {
        ...s.design,
        aplicacoes: (s.design.aplicacoes ?? []).map((a) =>
          a.id === id ? { ...a, ...mudanca } : a,
        ),
      },
    })),

  removerAplicacao: (id) =>
    set((s) => ({
      design: {
        ...s.design,
        aplicacoes: (s.design.aplicacoes ?? []).filter((a) => a.id !== id),
      },
    })),
}));
