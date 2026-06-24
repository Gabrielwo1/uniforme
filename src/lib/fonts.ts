/** Fontes disponíveis para nome/número/texto (carregadas via index.html). */
export interface FontOption {
  label: string;
  value: string;
}

export const FONTS: FontOption[] = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Anton', value: 'Anton' },
  { label: 'Bebas Neue', value: 'Bebas Neue' },
  { label: 'Oswald', value: 'Oswald' },
  { label: 'Teko', value: 'Teko' },
];

/**
 * Garante que a fonte esteja decodificada antes de desenhar no canvas, evitando
 * "flash" de fonte trocada / medição errada de largura no Fabric.
 */
export async function ensureFontLoaded(family: string, sample = 'ABC 0123'): Promise<void> {
  if (!('fonts' in document)) return;
  try {
    await document.fonts.load(`700 48px "${family}"`, sample);
    await document.fonts.ready;
  } catch {
    /* fallback silencioso para a fonte do sistema */
  }
}
