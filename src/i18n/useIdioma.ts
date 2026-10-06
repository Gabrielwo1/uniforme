import { useCallback } from 'react';
import { create } from 'zustand';
import { IDIOMA_PADRAO, idiomaValido, type CodigoIdioma } from './idiomas';
import { LINHAS } from './textos';

/**
 * Tradução da interface — SEM biblioteca, de propósito: o site tem umas
 * centenas de frases e uma tabela chega.
 *
 * COMO FUNCIONA
 *  - A CHAVE é o próprio texto em português: `t('Orçamento')`. Lê-se no
 *    código sem abrir a tabela e um texto novo nunca fica "sem chave".
 *  - Se a frase não estiver na tabela (ou o idioma for PT), devolve-se o
 *    português: uma tradução em falta nunca deixa um botão em branco.
 *  - Variáveis entram com chavetas: `t('{n} peças', { n: 3 })`.
 *  - A escolha fica no browser (localStorage) e, à primeira visita, segue
 *    o idioma do navegador se for um dos suportados.
 *
 * `useT()` subscreve o idioma — o componente volta a desenhar-se ao trocar.
 * Fora de componentes (constantes, utilitários) usa-se `traduzir()`, mas
 * SEMPRE na altura de desenhar, nunca ao carregar o módulo.
 */

const CHAVE = 'kypzl-idioma';
const POSICAO: Record<Exclude<CodigoIdioma, 'pt'>, number> = { en: 1, es: 2, fr: 3, de: 4, it: 5 };

const TABELAS = new Map<Exclude<CodigoIdioma, 'pt'>, Map<string, string>>();
for (const idioma of Object.keys(POSICAO) as (keyof typeof POSICAO)[]) {
  const tabela = new Map<string, string>();
  for (const linha of LINHAS) tabela.set(linha[0], linha[POSICAO[idioma]]);
  TABELAS.set(idioma, tabela);
}

function inicial(): CodigoIdioma {
  try {
    const guardado = localStorage.getItem(CHAVE);
    if (idiomaValido(guardado)) return guardado;
  } catch {
    /* sem localStorage (janela privada): segue para o navegador */
  }
  const doNavegador = (navigator.language || '').slice(0, 2).toLowerCase();
  return idiomaValido(doNavegador) ? doNavegador : IDIOMA_PADRAO;
}

interface IdiomaStore {
  idioma: CodigoIdioma;
  setIdioma: (idioma: CodigoIdioma) => void;
}

export const useIdioma = create<IdiomaStore>((set) => ({
  idioma: inicial(),
  setIdioma: (idioma) => {
    try {
      localStorage.setItem(CHAVE, idioma);
    } catch {
      /* a escolha vale para esta sessão na mesma */
    }
    document.documentElement.lang = idioma;
    set({ idioma });
  },
}));

document.documentElement.lang = useIdioma.getState().idioma;

type Variaveis = Record<string, string | number>;

function aplicar(texto: string, vars?: Variaveis): string {
  if (!vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Traduz `texto` (em PT) para o idioma atual. */
export function traduzir(texto: string, vars?: Variaveis, idioma?: CodigoIdioma): string {
  const lingua = idioma ?? useIdioma.getState().idioma;
  const traduzido = lingua === 'pt' ? undefined : TABELAS.get(lingua)?.get(texto);
  return aplicar(traduzido ?? texto, vars);
}

/** Hook: devolve `t` ligada ao idioma atual (e re-desenha ao trocar). */
export function useT() {
  const idioma = useIdioma((s) => s.idioma);
  return useCallback((texto: string, vars?: Variaveis) => traduzir(texto, vars, idioma), [idioma]);
}
