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

/** Textura escura premium partilhada (pode ser trocada por foto por modalidade). */
const CARD_BG = '/card-bg.jpg';

interface Modality {
  key: string;
  label: string;
  /** Foto de fundo opcional (escurecida na apresentação). */
  image?: string;
}

const MODALITIES: Modality[] = [
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

/** Card premium: fundo escurecido + acento vermelho KYPZL. */
function PremiumCard({
  label,
  sublabel,
  disabled,
  image,
  className,
  onClick,
}: {
  label: string;
  sublabel?: string;
  disabled?: boolean;
  image?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl shadow-md ring-1 transition',
        disabled
          ? 'cursor-not-allowed ring-white/5'
          : 'ring-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:ring-primary',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-center transition-transform duration-500',
          !disabled && 'group-hover:scale-105',
        )}
        style={{ backgroundImage: `url(${image ?? CARD_BG})` }}
      />
      <div
        className={cn(
          'absolute inset-0 transition-colors',
          disabled
            ? 'bg-black/80 backdrop-grayscale'
            : 'bg-gradient-to-t from-black/85 via-black/45 to-black/25 group-hover:from-black/75',
        )}
      />
      {!disabled && (
        <span className="absolute inset-x-0 top-0 h-[3px] bg-primary" />
      )}
      <div className="relative flex h-full flex-col items-center justify-center gap-1 px-4 py-6 text-center">
        <span
          className={cn(
            'text-lg font-bold drop-shadow-sm',
            disabled ? 'text-white/45' : 'text-white',
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className={cn(
              'text-[10px] font-medium uppercase tracking-widest',
              disabled ? 'text-white/35' : 'text-primary-foreground/70',
            )}
          >
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

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
        <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {MODALITIES.map((m) => {
            const active = ACTIVE_MODALITIES.has(m.key);
            return (
              <PremiumCard
                key={m.key}
                className="h-32"
                label={m.label}
                image={m.image}
                disabled={!active}
                sublabel={active ? undefined : 'Brevemente'}
                onClick={() => chooseModality(m.key)}
              />
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------- 2. categoria */}
      {screen === 'categoria' && (
        <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = PRODUCTS.filter((p) => p.category === c.key).length;
            const active = count > 0;
            return (
              <PremiumCard
                key={c.key}
                className="h-28"
                label={c.label}
                disabled={!active}
                sublabel={
                  active ? `${count} ${count === 1 ? 'modelo' : 'modelos'}` : 'Brevemente'
                }
                onClick={() => chooseCategory(c.key)}
              />
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
