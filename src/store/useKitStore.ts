import { create } from 'zustand';
import type { KitDesign, PecaConfig, PecaKit } from '@/types/kit';
import { PECAS_KIT } from '@/types/kit';
import { estampaDemoPorId, estampasDemo } from '@/lib/kitDemo';

/**
 * Estado do conjunto (camisola + calção + meião) no simulador por template.
 *
 * O "sincronizar" da referência: peças presas ao cadeado acompanham as
 * mudanças de estampa e de cor umas das outras. É por isso que as ações
 * recebem a peça de origem e depois propagam — a peça que o utilizador
 * mexeu manda nas restantes presas, e as soltas ficam como estão.
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
    sincronizadas: ['camisola', 'calcao', 'meiao'],
  };
}

export interface KitStore {
  design: KitDesign;

  /** Peças que recebem a alteração feita em `origem` (ela própria incluída). */
  alvos: (origem: PecaKit) => PecaKit[];

  setEstampa: (origem: PecaKit, estampaId: string) => void;
  setCorZona: (origem: PecaKit, zonaId: string, cor: string) => void;
  setCorCamada: (origem: PecaKit, camadaId: string, cor: string) => void;
  cicloEstampa: (origem: PecaKit, direcao: 1 | -1) => void;
  toggleSincronizar: (peca: PecaKit) => void;
  reset: () => void;
}

export const useKitStore = create<KitStore>((set, get) => ({
  design: designInicial(),

  alvos: (origem) => {
    const { sincronizadas } = get().design;
    // peça solta só muda a si própria, mesmo que as outras estejam presas
    if (!sincronizadas.includes(origem)) return [origem];
    return PECAS_KIT.filter((p) => sincronizadas.includes(p));
  },

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
          // troca de estampa reinicia as cores das camadas (ids mudam);
          // as cores das zonas ficam, porque a gola não depende da estampa
          cores: {},
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

  toggleSincronizar: (peca) =>
    set((s) => {
      const presas = s.design.sincronizadas;
      return {
        design: {
          ...s.design,
          sincronizadas: presas.includes(peca)
            ? presas.filter((p) => p !== peca)
            : [...presas, peca],
        },
      };
    }),

  reset: () => set({ design: designInicial() }),
}));
