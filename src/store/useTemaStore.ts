import { create } from 'zustand';

/**
 * Tema claro/escuro.
 *
 * A classe vive no `<html>` (é o que o Tailwind lê, com `darkMode: 'class'`)
 * e a escolha fica no localStorage. Sem escolha guardada segue-se o sistema
 * operativo — quem já tem o portátil em escuro não leva com um ecrã branco
 * na cara à primeira visita.
 *
 * A aplicação inicial é feita em `index.html`, antes do React montar: se
 * esperasse pelo primeiro render, a página piscava a branco.
 */

export type Tema = 'claro' | 'escuro';

const CHAVE = 'kypzl:tema';

export function temaGuardado(): Tema | null {
  const v = localStorage.getItem(CHAVE);
  return v === 'claro' || v === 'escuro' ? v : null;
}

export function temaDoSistema(): Tema {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'escuro');
}

interface TemaStore {
  tema: Tema;
  alternar: () => void;
}

export const useTemaStore = create<TemaStore>((set, get) => ({
  tema: temaGuardado() ?? temaDoSistema(),

  alternar: () => {
    const tema: Tema = get().tema === 'escuro' ? 'claro' : 'escuro';
    localStorage.setItem(CHAVE, tema);
    aplicar(tema);
    set({ tema });
  },
}));
