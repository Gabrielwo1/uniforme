import { useDesignStore } from '@/store/useDesignStore';
import { getProduct, productSides, SIDE_LABEL } from '@/lib/products';
import { cn } from '@/lib/utils';

/**
 * Alterna entre os lados do produto (segmented control). "Lado" (perfil) só
 * aparece para produtos que têm essa foto — ver `productSides`.
 */
export function SideToggle() {
  const side = useDesignStore((s) => s.design.side);
  const productId = useDesignStore((s) => s.design.productId);
  const setSide = useDesignStore((s) => s.setSide);

  const sides = productSides(getProduct(productId));

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
      {sides.map((s) => (
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
          {SIDE_LABEL[s]}
        </button>
      ))}
    </div>
  );
}
