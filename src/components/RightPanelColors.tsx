import { Palette } from 'lucide-react';
import { useDesignStore } from '@/store/useDesignStore';
import { getProduct } from '@/lib/products';
import { cn } from '@/lib/utils';
import { DebouncedColor } from './ui/DebouncedControls';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

/**
 * Paleta de cores padrão do catálogo KYPZL 2023 (nomes/aproximações de cor).
 * Facilita escolher uma cor de tecido que a marca realmente produz.
 */
const SWATCHES: { hex: string; name: string }[] = [
  { hex: '#2B2A29', name: 'Preto' },
  { hex: '#FFFFFF', name: 'Branco' },
  { hex: '#383E42', name: 'Cinza Antracite' },
  { hex: '#C0C5C9', name: 'Cinza Prata' },
  { hex: '#1B2A4A', name: 'Azul Marinho' },
  { hex: '#1E50A2', name: 'Azul Royal' },
  { hex: '#7EC8E3', name: 'Azul Celeste' },
  { hex: '#1AA7A0', name: 'Azul Turquesa' },
  { hex: '#1E8E3E', name: 'Verde' },
  { hex: '#14532D', name: 'Verde Garrafa' },
  { hex: '#9CCC2E', name: 'Verde Lima' },
  { hex: '#B62126', name: 'Vermelho' },
  { hex: '#6E1423', name: 'Grená' },
  { hex: '#F57C00', name: 'Laranja' },
  { hex: '#FFD400', name: 'Amarelo' },
  { hex: '#E1A100', name: 'Amarelo Dourado' },
  { hex: '#E91E63', name: 'Rosa' },
  { hex: '#C19A6B', name: 'Camel' },
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
                const active =
                  (colors[region.key] ?? '').toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    title={c.name}
                    onClick={() => setColor(region.key, c.hex)}
                    className={cn(
                      'h-6 w-full rounded-md border ring-offset-background transition',
                      active
                        ? 'ring-2 ring-ring ring-offset-1'
                        : 'border-border hover:scale-105',
                    )}
                    style={{ background: c.hex }}
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
