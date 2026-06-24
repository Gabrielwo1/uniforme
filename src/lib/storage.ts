import type { DesignState } from '@/types/design';

const KEY = 'esportes:design:v1';

/** Persistência client-side (MVP) com tratamento de erro defensivo. */
export function saveDesign(design: DesignState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(design));
  } catch {
    /* quota cheia ou modo privado — ignora silenciosamente no MVP */
  }
}

export function loadDesign(): DesignState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DesignState;
  } catch {
    return null;
  }
}

export function clearDesign(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
