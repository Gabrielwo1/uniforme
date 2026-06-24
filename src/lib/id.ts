/** Gera ids curtos e únicos para elementos do design. */
export function uid(prefix = 'el'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}
