import { useDesignStore } from '@/store/useDesignStore';
import { cn } from '@/lib/utils';

/** Alterna entre Frente e Verso do produto (segmented control). */
export function SideToggle() {
  const side = useDesignStore((s) => s.design.side);
  const setSide = useDesignStore((s) => s.setSide);

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
      {(['front', 'back'] as const).map((s) => (
        <button
          key={s}
          onClick={() => setSide(s)}
          className={cn(
            'rounded-md px-4 py-1 text-xs font-medium transition-colors',
            side === s
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {s === 'front' ? 'Frente' : 'Verso'}
        </button>
      ))}
    </div>
  );
}
