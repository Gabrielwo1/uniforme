import { useDesignStore } from '@/store/useDesignStore';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

const COLLARS = [
  { value: 'careca', label: 'Careca' },
  { value: 'gola-v', label: 'Gola V' },
  { value: 'polo', label: 'Polo' },
];

const CUFFS = [
  { value: 'reto', label: 'Punho reto' },
  { value: 'ribana', label: 'Ribana' },
];

/**
 * Acabamentos: variações do produto. No MVP guardamos a escolha no design
 * (entram no orçamento). Em produção trocariam a imagem-base / camada.
 */
export function TabFinishes() {
  const finishes = useDesignStore((s) => s.design.finishes);
  const setFinish = useDesignStore((s) => s.setFinish);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Tipo de gola</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {COLLARS.map((o) => (
            <Button
              key={o.value}
              variant={finishes.collar === o.value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFinish('collar', finishes.collar === o.value ? undefined : o.value)
              }
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Punho / manga</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {CUFFS.map((o) => (
            <Button
              key={o.value}
              variant={finishes.cuff === o.value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setFinish('cuff', finishes.cuff === o.value ? undefined : o.value)
              }
            >
              {o.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        As escolhas de acabamento são registradas no orçamento exportado (JSON).
      </p>
    </div>
  );
}
