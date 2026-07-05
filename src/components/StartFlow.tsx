import { ArrowLeft, ChevronRight } from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { useDesignStore } from '@/store/useDesignStore';
import { PRODUCTS } from '@/lib/products';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * Funil de entrada do simulador (páginas 1–3 do briefing):
 *   1. Modalidade  2. Categoria  3. Modelo → abre o editor.
 * Sem preços — o orçamento é combinado com a KYPZL após o pedido.
 */

const MODALITIES: { key: string; label: string }[] = [
  { key: 'futebol', label: 'Futebol / Futsal' },
  { key: 'basquetebol', label: 'Basquetebol' },
  { key: 'andebol', label: 'Andebol' },
  { key: 'voleibol', label: 'Voleibol' },
  { key: 'hoquei', label: 'Hóquei' },
  { key: 'atletismo', label: 'Atletismo' },
  { key: 'padel', label: 'Padel / Ténis' },
  { key: 'motocross', label: 'Motocross' },
];

/** Por enquanto o catálogo digitalizado cobre futebol/futsal. */
const ACTIVE_MODALITIES = new Set(['futebol']);

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'jogo', label: 'Jogo' },
  { key: 'treino', label: 'Treino' },
  { key: 'saida', label: 'Saída' },
  { key: 'acessorios', label: 'Acessórios' },
];

export function StartFlow() {
  const screen = useFlowStore((s) => s.screen);
  const modality = useFlowStore((s) => s.modality);
  const category = useFlowStore((s) => s.category);
  const chooseModality = useFlowStore((s) => s.chooseModality);
  const chooseCategory = useFlowStore((s) => s.chooseCategory);
  const openEditor = useFlowStore((s) => s.openEditor);
  const back = useFlowStore((s) => s.back);
  const setProduct = useDesignStore((s) => s.setProduct);

  const modalityLabel = MODALITIES.find((m) => m.key === modality)?.label;
  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label;

  const pickModel = (id: string) => {
    setProduct(id);
    openEditor();
  };

  return (
    <div className="scrollbar-clean flex h-full flex-col items-center overflow-y-auto bg-background px-6 py-8">
      <img src={logoUrl} alt="KYPZL" className="h-9 w-auto" />
      <h1 className="mt-6 text-2xl font-bold tracking-wide">SIMULADOR</h1>

      {/* trilha do funil */}
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <span className={cn(screen === 'modalidade' && 'font-semibold text-foreground')}>
          Modalidade
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className={cn(screen === 'categoria' && 'font-semibold text-foreground')}>
          {modalityLabel ?? 'Categoria'}
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className={cn(screen === 'modelo' && 'font-semibold text-foreground')}>
          {screen === 'modelo' ? (categoryLabel ?? 'Modelo') : 'Modelo'}
        </span>
      </div>

      {screen !== 'modalidade' && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={back}>
          <ArrowLeft /> Voltar
        </Button>
      )}

      {/* -------------------------------------------------- 1. modalidade */}
      {screen === 'modalidade' && (
        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {MODALITIES.map((m) => {
            const active = ACTIVE_MODALITIES.has(m.key);
            return (
              <button
                key={m.key}
                disabled={!active}
                onClick={() => chooseModality(m.key)}
                className={cn(
                  'flex h-28 flex-col items-center justify-center rounded-xl px-4 text-center text-base font-semibold transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow hover:scale-[1.02] hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                {m.label}
                {!active && (
                  <span className="mt-1 text-[10px] font-normal uppercase tracking-wide">
                    Brevemente
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------- 2. categoria */}
      {screen === 'categoria' && (
        <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = PRODUCTS.filter((p) => p.category === c.key).length;
            const active = count > 0;
            return (
              <button
                key={c.key}
                disabled={!active}
                onClick={() => chooseCategory(c.key)}
                className={cn(
                  'flex h-24 flex-col items-center justify-center rounded-xl px-4 text-center text-base font-semibold transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow hover:scale-[1.02] hover:bg-primary/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
              >
                {c.label}
                <span className="mt-1 text-[10px] font-normal uppercase tracking-wide">
                  {active ? `${count} ${count === 1 ? 'modelo' : 'modelos'}` : 'Brevemente'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------ 3. modelo */}
      {screen === 'modelo' && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Escolha o modelo
          </h2>
          <div className="mt-4 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PRODUCTS.filter((p) => p.category === category).map((p) => (
              <button
                key={p.id}
                onClick={() => pickModel(p.id)}
                className="group rounded-xl border bg-card p-3 text-center shadow-sm transition hover:border-primary hover:shadow"
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-full w-full object-contain p-1 transition group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <span className="mt-2 block text-sm font-semibold">{p.name}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  100% personalizável
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-10 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
        Tem uma ideia? Nós concretizamos. Monte o seu equipamento e envie o
        pedido — a equipa KYPZL entra em contacto para combinar os detalhes.
      </p>
    </div>
  );
}
