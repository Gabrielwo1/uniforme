import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IDIOMAS, type CodigoIdioma } from '@/i18n/idiomas';
import { useIdioma } from '@/i18n/useIdioma';

/**
 * Seletor de idioma — duas caras do mesmo estado (`useIdioma`):
 *  - `BandeirasIdioma`: a fila de bandeiras do cabeçalho da landing;
 *  - `MenuIdioma`: o botão compacto do simulador (bandeira + código) com a
 *    lista por baixo.
 *
 * Bandeiras em SVG inline em vez de emoji, que nem todos os sistemas
 * (Windows) desenham.
 */
export function Flag({ code }: { code: CodigoIdioma }) {
  // viewBox quadrado + slice: a bandeira preenche o círculo sem deformar.
  const common = {
    viewBox: '0 0 6 4',
    preserveAspectRatio: 'xMidYMid slice',
    className: 'h-full w-full',
  } as const;
  if (code === 'pt')
    return (
      <svg {...common}>
        <rect width="6" height="4" fill="#da291c" />
        <rect width="2.4" height="4" fill="#046a38" />
        <circle cx="2.4" cy="2" r="0.82" fill="#ffe900" stroke="#046a38" strokeWidth="0.12" />
      </svg>
    );
  if (code === 'es')
    return (
      <svg {...common}>
        <rect width="6" height="4" fill="#c60b1e" />
        <rect y="1" width="6" height="2" fill="#ffc400" />
      </svg>
    );
  if (code === 'fr')
    return (
      <svg {...common}>
        <rect width="6" height="4" fill="#fff" />
        <rect width="2" height="4" fill="#002395" />
        <rect x="4" width="2" height="4" fill="#ed2939" />
      </svg>
    );
  if (code === 'de')
    return (
      <svg {...common}>
        <rect width="6" height="4" fill="#ffce00" />
        <rect width="6" height="2.67" fill="#dd0000" />
        <rect width="6" height="1.33" fill="#000" />
      </svg>
    );
  if (code === 'it')
    return (
      <svg {...common}>
        <rect width="6" height="4" fill="#fff" />
        <rect width="2" height="4" fill="#009246" />
        <rect x="4" width="2" height="4" fill="#ce2b37" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect width="6" height="4" fill="#012169" />
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#fff" strokeWidth="0.8" />
      <path d="M0,0 L6,4 M6,0 L0,4" stroke="#c8102e" strokeWidth="0.45" />
      <path d="M3,0 V4 M0,2 H6" stroke="#fff" strokeWidth="1.3" />
      <path d="M3,0 V4 M0,2 H6" stroke="#c8102e" strokeWidth="0.78" />
    </svg>
  );
}

/** A fila de bandeiras do cabeçalho da landing (fundo escuro). */
export function BandeirasIdioma() {
  const idioma = useIdioma((s) => s.idioma);
  const setIdioma = useIdioma((s) => s.setIdioma);
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      {IDIOMAS.map((l) => (
        <button
          key={l.code}
          onClick={() => setIdioma(l.code)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={idioma === l.code}
          className={cn(
            'h-6 w-6 overflow-hidden rounded-full ring-1 transition',
            idioma === l.code
              ? 'opacity-100 ring-2 ring-white'
              : 'opacity-55 ring-white/25 hover:opacity-90',
          )}
        >
          <Flag code={l.code} />
        </button>
      ))}
    </div>
  );
}

/** O botão compacto do simulador: bandeira atual + lista ao clicar. */
export function MenuIdioma({ className }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const idioma = useIdioma((s) => s.idioma);
  const setIdioma = useIdioma((s) => s.setIdioma);
  const atual = IDIOMAS.find((l) => l.code === idioma) ?? IDIOMAS[0];

  return (
    <span className={cn('relative inline-block', className)}>
      <button
        type="button"
        title={atual.label}
        aria-label={atual.label}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-md border bg-background px-2 text-xs font-bold transition hover:bg-accent"
      >
        <span className="h-5 w-5 overflow-hidden rounded-full ring-1 ring-border">
          <Flag code={atual.code} />
        </span>
        <span className="hidden sm:inline">{atual.curto}</span>
      </button>

      {aberto && (
        <>
          {/* véu invisível: clicar fora fecha */}
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setAberto(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-30 mt-1.5 w-44 rounded-lg border bg-popover p-1 shadow-xl"
          >
            {IDIOMAS.map((l) => (
              <li key={l.code} role="option" aria-selected={l.code === idioma}>
                <button
                  type="button"
                  onClick={() => {
                    setIdioma(l.code);
                    setAberto(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent',
                    l.code === idioma && 'font-semibold',
                  )}
                >
                  <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
                    <Flag code={l.code} />
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {l.code === idioma && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </span>
  );
}
