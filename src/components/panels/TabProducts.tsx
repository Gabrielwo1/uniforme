import { PRODUCTS } from '@/lib/products';
import { useDesignStore } from '@/store/useDesignStore';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { key: 'camisa', label: 'Camisas' },
  { key: 'calcao', label: 'Calções' },
] as const;

export function TabProducts() {
  const productId = useDesignStore((s) => s.design.productId);
  const setProduct = useDesignStore((s) => s.setProduct);

  return (
    <div className="space-y-5">
      {CATEGORIES.map((cat) => {
        const items = PRODUCTS.filter((p) => p.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cat.label}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProduct(p.id)}
                  className={cn(
                    'group rounded-xl border bg-card p-2 text-left shadow-sm transition',
                    productId === p.id
                      ? 'border-primary ring-1 ring-primary'
                      : 'hover:border-primary/40 hover:shadow',
                  )}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
                    <img
                      src={p.thumbnail}
                      alt={p.name}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  </div>
                  <span className="mt-1.5 block truncate text-center text-xs font-medium">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Trocar de produto mantém os elementos adicionados (nome, número, logos)
        para você reaproveitá-los.
      </p>
    </div>
  );
}
