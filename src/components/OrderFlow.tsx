import { PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

/**
 * Micro-interação logo após "Finalizar": "Pretende mais alguma coisa?"
 *   SIM → volta à categoria (mais um artigo)
 *   NÃO → useFlowStore.goToCheckout() — página real (ver CheckoutPage.tsx)
 */
export function OrderFlow() {
  const step = useOrderStore((s) => s.step);
  const setStep = useOrderStore((s) => s.setStep);
  const items = useOrderStore((s) => s.items);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const close = () => setStep('idle');

  const handleMore = () => {
    close();
    useDesignStore.getState().newSimulation();
    // "SE SIM VOLTAR A PÁGINA 2" — escolha de categoria, mantendo a modalidade.
    useFlowStore.getState().gotoCategory();
    requestProductsTab();
    toast.success('Escolha o próximo artigo');
  };

  const handleCheckout = () => {
    close();
    useFlowStore.getState().goToCheckout();
  };

  return (
    <Dialog open={step === 'ask'} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Adicionado ao pedido
          </DialogTitle>
          <DialogDescription>
            O seu artigo foi acrescentado. Pretende mais alguma coisa?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleMore}>
            Sim, continuar
          </Button>
          <Button onClick={handleCheckout}>Não, finalizar</Button>
        </div>
        <button
          className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={handleCheckout}
        >
          Ver o pedido ({items.length} {items.length === 1 ? 'artigo' : 'artigos'})
        </button>
      </DialogContent>
    </Dialog>
  );
}
