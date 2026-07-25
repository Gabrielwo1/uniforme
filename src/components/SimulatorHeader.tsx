import { ChevronRight, Home, Phone, ShoppingBag } from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { useOrderStore } from '@/store/useOrderStore';
import { MODALITIES, CATEGORIES } from '@/lib/funnelData';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/** Header escuro do simulador — mesma linguagem visual do site institucional
 * (SiteLanding), com breadcrumb do funil e atalhos extra (site, carrinho,
 * contacto) em vez do menu de navegação de marketing. Usado no funil
 * (StartFlow) e também empilhado acima da barra de ferramentas branca do
 * editor, para que "voltar ao site" fique sempre acessível. */
export function SimulatorHeader() {
  const screen = useFlowStore((s) => s.screen);
  const modality = useFlowStore((s) => s.modality);
  const category = useFlowStore((s) => s.category);
  const goToSite = useFlowStore((s) => s.goToSite);
  const openDrawer = useOrderStore((s) => s.openDrawer);
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
            <span className={cn((screen === 'modelo' || screen === 'editor') && 'font-semibold text-white')}>
              {screen === 'modelo' || screen === 'editor' ? (categoryLabel ?? 'Modelo') : 'Modelo'}
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
            onClick={openDrawer}
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
