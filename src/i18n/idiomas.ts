/**
 * Idiomas do site e do simulador.
 *
 * A ORDEM é a das bandeiras no seletor. O português é a língua-fonte: todo
 * o texto da interface está escrito em PT no código e as outras línguas
 * vêm da tabela em `textos/` (ver `useIdioma.ts`).
 */
export const IDIOMAS = [
  { code: 'pt', label: 'Português', curto: 'PT' },
  { code: 'es', label: 'Español', curto: 'ES' },
  { code: 'fr', label: 'Français', curto: 'FR' },
  { code: 'en', label: 'English', curto: 'EN' },
  { code: 'de', label: 'Deutsch', curto: 'DE' },
  { code: 'it', label: 'Italiano', curto: 'IT' },
] as const;

export type CodigoIdioma = (typeof IDIOMAS)[number]['code'];

export const IDIOMA_PADRAO: CodigoIdioma = 'pt';

export function idiomaValido(code: string | null | undefined): code is CodigoIdioma {
  return IDIOMAS.some((i) => i.code === code);
}
