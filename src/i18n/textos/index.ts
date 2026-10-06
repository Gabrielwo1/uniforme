import { COMUM } from './comum';
import { SIMULADOR } from './simulador';
import { LANDING } from './landing';

/**
 * Uma LINHA por texto, com as colunas SEMPRE nesta ordem — o tipo obriga a
 * que ninguém se esqueça de um idioma:
 *
 *   [ PT (a chave), EN, ES, FR, DE, IT ]
 *
 * A auditoria `scripts/verificar_i18n.py` confere que todo `t('…')` do
 * código tem a sua linha aqui, e vice-versa.
 */
export type Linha = readonly [pt: string, en: string, es: string, fr: string, de: string, it: string];

export const LINHAS: readonly Linha[] = [...COMUM, ...SIMULADOR, ...LANDING];
