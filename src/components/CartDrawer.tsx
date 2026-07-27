import { ArrowLeft, Plus, ShoppingBag, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { useAiPortraitStore } from '@/store/useAiPortraitStore';
import { CustomerForm, isCustomerValid } from './CustomerForm';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

/**
 * Painel lateral do pedido (estilo carrinho de e-commerce), em dois passos:
 *
 *   1. 'cart' — artigos adicionados; "Finalizar pedido" avança para os dados.
 *   2. 'form' — dados de contacto. Ao confirmar, dispara o modal de progresso
 *      da geração por IA e abre o checkout já com foto e dados prontos.
 *
 * Aberto pelo botão "Adicionar ao carrinho" do editor e pelos ícones de
 * carrinho do header do simulador.
 */
export function CartDrawer() {
  const items = useOrderStore((s) => s.items);
  const customer = useOrderStore((s) => s.customer);
  const setCustomer = useOrderStore((s) => s.setCustomer);
  const drawerOpen = useOrderStore((s) => s.drawerOpen);
  const drawerStep = useOrderStore((s) => s.drawerStep);
  const setDrawerStep = useOrderStore((s) => s.setDrawerStep);
  const closeDrawer = useOrderStore((s) => s.closeDrawer);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const onForm = drawerStep === 'form';
  const canSubmit = isCustomerValid(customer);

  const handleAddMore = () => {
    closeDrawer();
    useDesignStore.getState().newSimulation();
    useFlowStore.getState().gotoCategory();
    requestProductsTab();
    toast.success('Escolha o próximo artigo');
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    const currentItems = items;
    closeDrawer();
    if (currentItems.length > 0) {
      // Bloqueia com o modal de progresso até a foto do jogador — vestindo
      // TODAS as peças do pedido juntas — ficar pronta. O checkout já abre
      // com a imagem final carregada e os dados preenchidos.
      await useAiPortraitStore.getState().generateWithModal(currentItems);
    }
    useFlowStore.getState().goToCheckout();
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {onForm ? (
              <>
                <button
                  onClick={() => setDrawerStep('cart')}
                  className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                  title="Voltar aos artigos"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Os seus dados
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 text-primary" />
                O seu pedido {items.length > 0 && `(${items.length})`}
              </>
            )}
          </SheetTitle>

          {/* passos da finalização */}
          <div className="mt-3 flex items-center gap-2 text-[11px] font-medium">
            <StepChip n={1} label="Artigos" active={!onForm} done={onForm} />
            <span className="h-px flex-1 bg-border" />
            <StepChip n={2} label="Dados" active={onForm} />
          </div>
        </SheetHeader>

        <div className="scrollbar-clean flex-1 overflow-y-auto p-5">
          {onForm ? (
            <>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Para enviarmos o seu pedido ({items.length}{' '}
                {items.length === 1 ? 'artigo' : 'artigos'}) à equipa KYPZL —
                entraremos em contacto para afinar tudo consigo. Sem pagamento
                agora.
              </p>
              <CustomerForm value={customer} onChange={setCustomer} idPrefix="cart" autoFocus />
            </>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">O seu carrinho está vazio.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5 shadow-sm">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      {it.preview ? (
                        <img src={it.preview} alt={it.productName} className="h-full w-full object-contain" />
                      ) : (
                        <ShoppingBag className="mx-auto mt-3.5 h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="flex-1 truncate text-sm font-medium">{it.productName}</span>
                    <button
                      className="shrink-0 p-1 text-muted-foreground transition hover:text-destructive"
                      title="Remover"
                      onClick={() => useOrderStore.getState().removeItem(it.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleAddMore}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Adicionar outro artigo
              </button>
            </>
          )}
        </div>

        <SheetFooter>
          {onForm ? (
            <>
              <Button className="w-full" size="lg" disabled={!canSubmit} onClick={handleConfirm}>
                <Sparkles /> Confirmar e ver o resultado
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setDrawerStep('cart')}>
                Voltar aos artigos
              </Button>
              {!canSubmit && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Preencha nome e e-mail para continuar.
                </p>
              )}
            </>
          ) : (
            <>
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0}
                onClick={() => setDrawerStep('form')}
              >
                Finalizar pedido
              </Button>
              <Button variant="outline" className="w-full" onClick={closeDrawer}>
                Continuar a editar
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Indicador compacto de passo (1 Artigos → 2 Dados). */
function StepChip({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span className={cn('flex items-center gap-1.5', active ? 'text-foreground' : 'text-muted-foreground')}>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
          active
            ? 'bg-primary text-primary-foreground'
            : done
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground',
        )}
      >
        {n}
      </span>
      {label}
    </span>
  );
}
