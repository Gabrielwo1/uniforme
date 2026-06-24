import { Palette } from 'lucide-react';
import { useDesignStore } from '@/store/useDesignStore';
import { getProduct } from '@/lib/products';
import { cn } from '@/lib/utils';
import { DebouncedColor } from './ui/DebouncedControls';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

/** Paleta rápida de cores comuns para preenchimento ágil. */
const SWATCHES = [
  '#ffffff', '#000000', '#e53935', '#1e88e5', '#43a047',
  '#fdd835', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41',
  '#cfd8dc', '#37474f',
];

export function RightPanelColors() {
  const productId = useDesignStore((s) => s.design.productId);
  const colors = useDesignStore((s) => s.design.colors);
  const syncColors = useDesignStore((s) => s.design.syncColors);
  const setColor = useDesignStore((s) => s.setColor);
  const toggleSync = useDesignStore((s) => s.toggleSyncColors);

  const product = getProduct(productId);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Cores</span>
        </div>
        <Label className="flex cursor-pointer items-center gap-2">
          <span>Sincronizar</span>
          <Switch checked={syncColors} onCheckedChange={toggleSync} />
        </Label>
      </div>

      <div className="scrollbar-clean flex-1 space-y-3 overflow-y-auto p-4">
        {product.regions.map((region) => (
          <div key={region.key} className="rounded-lg border bg-card p-3 shadow-sm">
            <div className="mb-2.5">
              <DebouncedColor
                label={region.label}
                value={colors[region.key] ?? region.defaultColor}
                onCommit={(v) => setColor(region.key, v)}
              />
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {SWATCHES.map((c) => {
                const active = (colors[region.key] ?? '').toLowerCase() === c;
                return (
                  <button
                    key={c}
                    title={c}
                    onClick={() => setColor(region.key, c)}
                    className={cn(
                      'h-6 w-full rounded-md border ring-offset-background transition',
                      active
                        ? 'ring-2 ring-ring ring-offset-1'
                        : 'border-border hover:scale-105',
                    )}
                    style={{ background: c }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          {syncColors
            ? 'Sincronizar ativo: a cor escolhida é aplicada a todas as regiões.'
            : 'Cada região é colorida de forma independente.'}
        </p>
      </div>
    </aside>
  );
}
