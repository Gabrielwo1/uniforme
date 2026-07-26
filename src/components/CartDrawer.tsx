import { Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { useAiPortraitStore } from '@/store/useAiPortraitStore';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';

/**
 * Painel lateral do pedido (estilo carrinho de e-commerce) — substitui o
 * antigo dialog "Adicionado ao pedido / Sim continuar / Não finalizar".
 * Aberto pelo botão "Finalizar" do editor e pelos ícones de carrinho do
 * header do simulador.
 */
export function CartDrawer() {
  const items = useOrderStore((s) => s.items);
  const drawerOpen = useOrderStore((s) => s.drawerOpen);
  const closeDrawer = useOrderStore((s) => s.closeDrawer);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const handleAddMore = () => {
    closeDrawer();
    useDesignStore.getState().newSimulation();
    useFlowStore.getState().gotoCategory();
    requestProductsTab();
    toast.success('Escolha o próximo artigo');
  };

  const handleFinalize = async () => {
    const currentItems = items;
    closeDrawer();
    if (currentItems.length > 0) {
      // Bloqueia com o modal de progresso até a foto do jogador — vestindo
      // TODAS as peças do pedido juntas — ficar pronta. O checkout já abre
      // com a imagem final carregada.
      await useAiPortraitStore.getState().generateWithModal(currentItems);
    }
    useFlowStore.getState().goToCheckout();
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            O seu pedido {items.length > 0 && `(${items.length})`}
          </SheetTitle>
        </SheetHeader>

        <div className="scrollbar-clean flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">O seu carrinho está vazio.</p>
            </div>
          ) : (
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
          )}

          <button
            onClick={handleAddMore}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2.5 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Adicionar outro artigo
          </button>
        </div>

        <SheetFooter>
          <Button className="w-full" size="lg" disabled={items.length === 0} onClick={handleFinalize}>
            Finalizar pedido
          </Button>
          <Button variant="outline" className="w-full" onClick={closeDrawer}>
            Continuar a editar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
