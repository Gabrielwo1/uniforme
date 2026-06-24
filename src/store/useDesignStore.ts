import { create } from 'zustand';
import type {
  DesignElement,
  DesignState,
  ImageElement,
  Side,
  TextElement,
  TextKind,
} from '@/types/design';
import { uid } from '@/lib/id';
import {
  defaultsOf,
  getProduct,
  PRODUCTS,
  renderBaseImages,
} from '@/lib/products';
import { loadDesign as loadFromStorage, saveDesign } from '@/lib/storage';

/* -------------------------------------------------------------- constantes */

const HISTORY_LIMIT = 50;
const HISTORY_DEBOUNCE_MS = 350;
const SAVE_DEBOUNCE_MS = 500;

/* ---------------------------------------------------- estado não-reativo */
/**
 * `lastCommitted` é a base do segmento atual de undo. Timers de debounce.
 * Ficam fora do estado reativo para não causar re-render.
 */
let lastCommitted: DesignState | null = null;
let historyTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const eq = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/* ---------------------------------------------------------- estado inicial */

function makeInitialDesign(): DesignState {
  const product = PRODUCTS[0];
  const colors = defaultsOf(product.regions);
  return {
    productId: product.id,
    side: 'front',
    baseImages: renderBaseImages(product.id, colors),
    finishes: {},
    colors,
    syncColors: false,
    elements: [],
  };
}

/* ------------------------------------------------------------ tipo do store */

export interface DesignStore {
  design: DesignState;
  past: DesignState[];
  future: DesignState[];
  selectedId: string | null;
  zoom: number;

  /** Id/nome do design na nuvem (Supabase), quando salvo/carregado de lá. */
  cloudId: string | null;
  cloudName: string;
  setCloud: (id: string | null, name: string) => void;

  // seleção / view
  setSelected: (id: string | null) => void;
  setZoom: (z: number) => void;

  // produto / lados / acabamentos
  setProduct: (id: string) => void;
  setSide: (side: Side) => void;
  setFinish: (part: 'collar' | 'cuff', value: string | undefined) => void;

  // cores
  setColor: (key: string, value: string) => void;
  toggleSyncColors: () => void;

  // elementos
  addText: (kind: TextKind) => string;
  addImage: (img: { src: string; naturalW: number; naturalH: number }) => string;
  updateElement: (id: string, patch: Partial<DesignElement>) => void;
  removeElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // histórico
  undo: () => void;
  redo: () => void;

  // persistência / export
  loadDesign: (design: DesignState, meta?: { cloudId: string; cloudName: string }) => void;
  newSimulation: () => void;
  exportJSON: () => string;

  // commit imediato de histórico (usado pelo canvas no fim de um arraste)
  commitHistory: () => void;
}

/* ----------------------------------------------------------------- helpers */

function nextZIndex(elements: DesignElement[]): number {
  return elements.reduce((max, e) => Math.max(max, e.zIndex), 0) + 1;
}

export const useDesignStore = create<DesignStore>((set, get) => {
  /** Empurra o último checkpoint para `past` se houve mudança real. */
  function commit() {
    const { design, past } = get();
    if (lastCommitted && !eq(lastCommitted, design)) {
      const trimmed = [...past, lastCommitted].slice(-HISTORY_LIMIT);
      set({ past: trimmed, future: [] });
    }
    lastCommitted = clone(design);
  }

  /** Agenda commit (debounce) — para edições contínuas (arraste, sliders). */
  function scheduleCommit() {
    if (historyTimer) clearTimeout(historyTimer);
    historyTimer = setTimeout(() => {
      historyTimer = null;
      commit();
    }, HISTORY_DEBOUNCE_MS);
  }

  /** Autosave em localStorage com debounce. */
  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveDesign(get().design);
    }, SAVE_DEBOUNCE_MS);
  }

  /** Aplica mutação no design + agenda histórico e save. */
  function mutate(producer: (d: DesignState) => DesignState) {
    set((s) => ({ design: producer(s.design) }));
    scheduleCommit();
    scheduleSave();
  }

  // base do histórico = estado inicial
  const initial = makeInitialDesign();
  lastCommitted = clone(initial);

  return {
    design: initial,
    past: [],
    future: [],
    selectedId: null,
    zoom: 1,
    cloudId: null,
    cloudName: '',

    setCloud: (id, name) => set({ cloudId: id, cloudName: name }),

    setSelected: (id) => set({ selectedId: id }),
    setZoom: (z) => set({ zoom: Math.min(3, Math.max(0.25, z)) }),

    setProduct: (id) => {
      const product = getProduct(id);
      const colors = defaultsOf(product.regions);
      mutate((d) => ({
        ...d,
        productId: id,
        colors,
        finishes: {},
        baseImages: renderBaseImages(id, colors),
        // mantém elementos do usuário; eles continuam manipuláveis
      }));
      set({ selectedId: null });
    },

    setSide: (side) => {
      set({ design: { ...get().design, side }, selectedId: null });
      scheduleSave();
    },

    setFinish: (part, value) =>
      mutate((d) => ({ ...d, finishes: { ...d.finishes, [part]: value } })),

    setColor: (key, value) => {
      mutate((d) => {
        const colors = d.syncColors
          ? Object.keys(d.colors).reduce<Record<string, string>>((acc, k) => {
              acc[k] = value;
              return acc;
            }, {})
          : { ...d.colors, [key]: value };
        return {
          ...d,
          colors,
          baseImages: renderBaseImages(d.productId, colors),
        };
      });
    },

    toggleSyncColors: () =>
      mutate((d) => ({ ...d, syncColors: !d.syncColors })),

    addText: (kind) => {
      const id = uid('txt');
      const defaults: Record<TextKind, Partial<TextElement>> = {
        name: { value: 'SOBRENOME', fontSize: 64, y: 0.66 },
        number: { value: '10', fontSize: 220, y: 0.5 },
        text: { value: 'Texto', fontSize: 56, y: 0.4 },
      };
      mutate((d) => {
        const el: TextElement = {
          type: 'text',
          id,
          kind,
          side: d.side,
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          zIndex: nextZIndex(d.elements),
          value: 'Texto',
          fontFamily: kind === 'number' ? 'Anton' : 'Oswald',
          fontSize: 64,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
          ...defaults[kind],
        };
        return { ...d, elements: [...d.elements, el] };
      });
      set({ selectedId: id });
      return id;
    },

    addImage: ({ src, naturalW, naturalH }) => {
      const id = uid('img');
      mutate((d) => {
        const el: ImageElement = {
          type: 'image',
          id,
          side: d.side,
          x: 0.5,
          y: 0.35,
          scale: 1,
          rotation: 0,
          zIndex: nextZIndex(d.elements),
          src,
          naturalW,
          naturalH,
        };
        return { ...d, elements: [...d.elements, el] };
      });
      set({ selectedId: id });
      return id;
    },

    updateElement: (id, patch) => {
      mutate((d) => ({
        ...d,
        elements: d.elements.map((e) =>
          e.id === id ? ({ ...e, ...patch } as DesignElement) : e,
        ),
      }));
    },

    removeElement: (id) => {
      mutate((d) => ({
        ...d,
        elements: d.elements.filter((e) => e.id !== id),
      }));
      if (get().selectedId === id) set({ selectedId: null });
    },

    bringForward: (id) =>
      mutate((d) => {
        const max = nextZIndex(d.elements);
        return {
          ...d,
          elements: d.elements.map((e) =>
            e.id === id ? { ...e, zIndex: max } : e,
          ),
        };
      }),

    sendBackward: (id) =>
      mutate((d) => {
        const min = d.elements.reduce(
          (m, e) => Math.min(m, e.zIndex),
          Infinity,
        );
        return {
          ...d,
          elements: d.elements.map((e) =>
            e.id === id ? { ...e, zIndex: min - 1 } : e,
          ),
        };
      }),

    commitHistory: () => commit(),

    undo: () => {
      commit(); // captura qualquer edição pendente
      const { past, future, design } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [design, ...future].slice(0, HISTORY_LIMIT),
        design: previous,
        selectedId: null,
      });
      lastCommitted = clone(previous);
      scheduleSave();
    },

    redo: () => {
      const { past, future, design } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        past: [...past, design].slice(-HISTORY_LIMIT),
        future: future.slice(1),
        design: next,
        selectedId: null,
      });
      lastCommitted = clone(next);
      scheduleSave();
    },

    loadDesign: (design, meta) => {
      set({
        design: clone(design),
        past: [],
        future: [],
        selectedId: null,
        cloudId: meta?.cloudId ?? null,
        cloudName: meta?.cloudName ?? '',
      });
      lastCommitted = clone(design);
      scheduleSave();
    },

    newSimulation: () => {
      const fresh = makeInitialDesign();
      set({
        design: fresh,
        past: [],
        future: [],
        selectedId: null,
        zoom: 1,
        cloudId: null,
        cloudName: '',
      });
      lastCommitted = clone(fresh);
      scheduleSave();
    },

    exportJSON: () => JSON.stringify(get().design, null, 2),
  };
});

/** Restaura o último design salvo (chamado uma vez no boot da app). */
export function hydrateFromStorage() {
  const saved = loadFromStorage();
  if (saved) {
    useDesignStore.getState().loadDesign(saved);
  }
}
