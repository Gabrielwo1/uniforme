import { ArrowLeft, ChevronRight, Home, Phone, ShoppingBag } from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useOrderStore } from '@/store/useOrderStore';
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
  { key: 'futebol', label: 'Futebol / Futsal', image: '/modalities/futebol.jpg' },
  { key: 'basquetebol', label: 'Basquetebol', image: '/modalities/basquetebol.jpg' },
  { key: 'andebol', label: 'Andebol', image: '/modalities/andebol.jpg' },
  { key: 'voleibol', label: 'Voleibol', image: '/modalities/voleibol.jpg' },
  { key: 'hoquei', label: 'Hóquei', image: '/modalities/hoquei.jpg' },
  { key: 'atletismo', label: 'Atletismo', image: '/modalities/atletismo.jpg' },
  { key: 'padel', label: 'Padel / Ténis', image: '/modalities/padel.jpg' },
  { key: 'motocross', label: 'Motocross', image: '/modalities/motocross.jpg' },
];

/** Por enquanto o catálogo digitalizado cobre futebol/futsal. */
const ACTIVE_MODALITIES = new Set(['futebol']);

/** Fotos reais do catálogo (estúdio escuro) — dão o mesmo aspecto premium da etapa de modalidade. */
const CATEGORIES: { key: string; label: string; image?: string }[] = [
  { key: 'jogo', label: 'Jogo', image: '/products/kit-champions.jpg' },
  { key: 'treino', label: 'Treino', image: '/products/kit-titan.jpg' },
  { key: 'saida', label: 'Saída', image: '/products/kit-galatico.jpg' },
  { key: 'acessorios', label: 'Acessórios', image: '/products/kit-guarda-redes.jpg' },
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
            ? 'bg-black/70 backdrop-grayscale'
            : 'bg-gradient-to-t from-black/90 via-black/30 to-black/40 group-hover:via-black/20',
        )}
      />
      {!disabled && (
        <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
      )}
      <div className="relative flex h-full flex-col items-end justify-end gap-0.5 p-5 text-left">
        <span
          className={cn(
            'w-full text-xl font-extrabold tracking-tight [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]',
            disabled ? 'text-white/55' : 'text-white',
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span
            className={cn(
              'w-full text-[11px] font-semibold uppercase tracking-widest',
              disabled ? 'text-white/40' : 'text-white/80',
            )}
          >
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
}

/** Header escuro do simulador — mesma linguagem visual do site institucional
 * (SiteLanding), com breadcrumb do funil e atalhos extra (site, carrinho,
 * contacto) em vez do menu de navegação de marketing. */
function SimulatorHeader() {
  const screen = useFlowStore((s) => s.screen);
  const modality = useFlowStore((s) => s.modality);
  const category = useFlowStore((s) => s.category);
  const goToSite = useFlowStore((s) => s.goToSite);
  const goToCheckout = useFlowStore((s) => s.goToCheckout);
  const items = useOrderStore((s) => s.items);

  const modalityLabel = MODALITIES.find((m) => m.key === modality)?.label;
  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label;

  return (
    <header className="sticky top-0 z-30 bg-[#131313] text-white">
      <div className="mx-auto flex h-[64px] max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <button onClick={goToSite} title="Voltar ao site" className="shrink-0">
            <img src={logoUrl} alt="KYPZL" className="h-6 w-auto brightness-0 invert" />
          </button>
          <div className="hidden items-center gap-1.5 text-xs text-white/50 sm:flex">
            <span className={cn(screen === 'modalidade' && 'font-semibold text-white')}>
              Modalidade
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className={cn(screen === 'categoria' && 'font-semibold text-white')}>
              {modalityLabel ?? 'Categoria'}
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className={cn(screen === 'modelo' && 'font-semibold text-white')}>
              {screen === 'modelo' ? (categoryLabel ?? 'Modelo') : 'Modelo'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
            onClick={goToSite}
          >
            <Home /> Site
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <a href="tel:+351912300289">
              <Phone /> Contacto
            </a>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="relative"
            disabled={items.length === 0}
            onClick={goToCheckout}
          >
            <ShoppingBag />
            <span className="hidden sm:inline">Pedido</span>
            {items.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {items.length}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
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
    <div className="flex h-full flex-col bg-background">
      <SimulatorHeader />
      <div className="scrollbar-clean flex flex-1 flex-col items-center overflow-y-auto px-6 py-8">
      <h1 className="text-2xl font-bold tracking-wide">SIMULADOR</h1>

      {/* trilha do funil (versão compacta, visível também em telas pequenas) */}
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:hidden">
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
        <div className="mt-8 grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODALITIES.map((m) => {
            const active = ACTIVE_MODALITIES.has(m.key);
            return (
              <PremiumCard
                key={m.key}
                className="h-52"
                label={m.label}
                image={m.image}
                disabled={!active}
                sublabel={active ? 'Personalizar agora' : 'Brevemente'}
                onClick={() => chooseModality(m.key)}
              />
            );
          })}
        </div>
      )}

      {/* --------------------------------------------------- 2. categoria */}
      {screen === 'categoria' && (
        <div className="mt-8 grid w-full max-w-5xl grid-cols-2 gap-5 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = PRODUCTS.filter((p) => p.category === c.key).length;
            const active = count > 0;
            return (
              <PremiumCard
                key={c.key}
                className="h-52"
                label={c.label}
                image={c.image}
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
    </div>
  );
}
