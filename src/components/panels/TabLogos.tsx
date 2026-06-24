import { Trash2 } from 'lucide-react';
import { useDesignStore } from '@/store/useDesignStore';
import type { ImageElement } from '@/types/design';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { NumberSlider } from '../ui/DebouncedControls';
import { LogoUploader } from './LogoUploader';

/** Posições predefinidas (relativas) para logos/patrocínios. */
const PRESETS = [
  { label: 'Peito esq.', x: 0.34, y: 0.32 },
  { label: 'Peito dir.', x: 0.66, y: 0.32 },
  { label: 'Centro', x: 0.5, y: 0.34 },
  { label: 'Manga', x: 0.8, y: 0.27 },
  { label: 'Barriga', x: 0.5, y: 0.55 },
  { label: 'Costas', x: 0.5, y: 0.3 },
];

export function TabLogos() {
  const side = useDesignStore((s) => s.design.side);
  const elements = useDesignStore((s) => s.design.elements);
  const selectedId = useDesignStore((s) => s.selectedId);
  const setSelected = useDesignStore((s) => s.setSelected);
  const update = useDesignStore((s) => s.updateElement);
  const remove = useDesignStore((s) => s.removeElement);

  const logos = elements.filter(
    (e): e is ImageElement => e.type === 'image' && e.side === side,
  );
  const selected = logos.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <LogoUploader />

      {logos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logos ({side === 'front' ? 'frente' : 'verso'})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {logos.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l.id)}
                className={cn(
                  'aspect-square overflow-hidden rounded-lg border bg-muted p-1 transition',
                  selectedId === l.id
                    ? 'border-primary ring-1 ring-primary'
                    : 'hover:border-primary/40',
                )}
              >
                <img src={l.src} alt="logo" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected ? (
        <div className="space-y-4 rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Posicionar logo</p>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => remove(selected.id)}
            >
              <Trash2 />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Posições rápidas</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="text-[11px]"
                  onClick={() => update(selected.id, { x: p.x, y: p.y })}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <NumberSlider
            label="Tamanho"
            value={selected.scale * 100}
            min={20}
            max={300}
            onChange={(v) => update(selected.id, { scale: v / 100 })}
            suffix="%"
          />
          <NumberSlider
            label="Rotação"
            value={selected.rotation}
            min={-180}
            max={180}
            onChange={(v) => update(selected.id, { rotation: v })}
            suffix="°"
          />
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Selecione um logo (aqui ou no canvas) para aplicar uma posição
          predefinida, redimensionar ou rotacionar. Você também pode arrastá-lo
          livremente no canvas.
        </p>
      )}
    </div>
  );
}
