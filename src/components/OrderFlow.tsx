import { useState } from 'react';
import { CheckCircle2, PackageCheck, ShoppingBag, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { submitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { getProduct } from '@/lib/products';
import type { OrderCustomer, OrderItem } from '@/types/order';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ModelPreviewDialog } from './ModelPreviewDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

/**
 * Fluxo de fecho do pedido (sem preço/cobrança):
 *  ask      → "Pretende mais alguma coisa?" SIM/NÃO
 *               SIM → volta à categoria (mais um artigo)
 *               NÃO → view
 *  view     → prancha técnica + imagens de cada item; "Continuar a montar"
 *             (volta a editar) ou "Finalizar pedido" → checkout
 *  checkout → formulário de dados do cliente
 *  done     → modal "Pedido Realizado"
 */
export function OrderFlow() {
  const step = useOrderStore((s) => s.step);
  const setStep = useOrderStore((s) => s.setStep);
  const items = useOrderStore((s) => s.items);
  const removeItem = useOrderStore((s) => s.removeItem);
  const clearItems = useOrderStore((s) => s.clearItems);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const [sending, setSending] = useState(false);
  const [previewItem, setPreviewItem] = useState<OrderItem | null>(null);

  const close = () => setStep('idle');

  const handleMore = () => {
    close();
    useDesignStore.getState().newSimulation();
    // "SE SIM VOLTAR A PÁGINA 2" — escolha de categoria, mantendo a modalidade.
    useFlowStore.getState().gotoCategory();
    requestProductsTab();
    toast.success('Escolha o próximo artigo');
  };

  const handleSubmit = async (customer: OrderCustomer) => {
    setSending(true);
    try {
      if (isSupabaseConfigured) {
        await submitOrder(customer, items);
      } else {
        // modo local: baixa o pedido em JSON para envio manual.
        downloadText(
          JSON.stringify({ customer, items }, null, 2),
          `pedido-${Date.now()}.json`,
        );
      }
      clearItems();
      setStep('done');
    } catch (e) {
      console.warn('[pedido]', e);
      toast.error('Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleDone = () => {
    close();
    useDesignStore.getState().newSimulation();
    // Pedido concluído: recomeça na página 1 (modalidade).
    useFlowStore.getState().restart();
    requestProductsTab();
  };

  return (
    <>
      {/* ---------------------------------------- pergunta pós-finalizar */}
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
            <Button onClick={() => setStep('view')}>Não, finalizar</Button>
          </div>
          <button
            className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setStep('view')}
          >
            Ver o pedido ({items.length} {items.length === 1 ? 'artigo' : 'artigos'})
          </button>
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------- visualizar pedido */}
      <Dialog open={step === 'view'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              O seu pedido
            </DialogTitle>
            <DialogDescription>
              {items.length === 0
                ? 'Ainda não adicionou artigos. Personalize um produto e clique em Finalizar.'
                : `${items.length} ${items.length === 1 ? 'artigo' : 'artigos'} — sem compromisso; o orçamento é combinado com a KYPZL.`}
            </DialogDescription>
          </DialogHeader>

          {items.length > 0 && (
            <div className="scrollbar-clean grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {items.map((it) => {
                const modelTemplate = getProduct(it.productId).modelTemplate;
                return (
                  <div key={it.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <button
                      className="block aspect-square w-full bg-muted"
                      onClick={() => it.preview && setPreviewItem(it)}
                      title={modelTemplate ? 'Ver prancha e no modelo' : 'Ver prancha'}
                    >
                      {it.preview ? (
                        <img src={it.preview} alt={it.productName} className="h-full w-full object-contain p-1" />
                      ) : (
                        <ShoppingBag className="mx-auto mt-8 h-8 w-8 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex items-center justify-between px-2.5 py-1.5">
                      <span className="truncate text-xs font-medium">{it.productName}</span>
                      <div className="flex items-center gap-2">
                        {modelTemplate && (
                          <button
                            className="text-muted-foreground transition hover:text-primary"
                            title="Ver no modelo"
                            onClick={() => setPreviewItem(it)}
                          >
                            <UserRound className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          className="text-muted-foreground transition hover:text-destructive"
                          title="Remover"
                          onClick={() => removeItem(it.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              Continuar a montar
            </Button>
            <Button disabled={items.length === 0} onClick={() => setStep('checkout')}>
              Finalizar pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------- formulário de dados */}
      <Dialog open={step === 'checkout'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Os seus dados</DialogTitle>
            <DialogDescription>
              Para enviarmos o seu pedido ({items.length}{' '}
              {items.length === 1 ? 'artigo' : 'artigos'}) à equipa KYPZL. Sem
              pagamento agora — entraremos em contacto.
            </DialogDescription>
          </DialogHeader>
          <CheckoutForm sending={sending} onSubmit={handleSubmit} />
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------ pedido realizado */}
      <Dialog open={step === 'done'} onOpenChange={(o) => !o && handleDone()}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <DialogTitle className="text-xl">Pedido Realizado</DialogTitle>
            <DialogDescription>
              Obrigado! A equipa KYPZL recebeu o seu pedido e entrará em
              contacto brevemente para combinar os detalhes.
            </DialogDescription>
            <Button className="mt-2 w-full" onClick={handleDone}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* -------------------------------- prancha + no modelo (por item) */}
      <ModelPreviewDialog
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
        title={previewItem?.productName ?? ''}
        boardSrc={previewItem?.preview ?? null}
        modelTemplate={previewItem ? getProduct(previewItem.productId).modelTemplate : undefined}
      />
    </>
  );
}

function CheckoutForm({
  sending,
  onSubmit,
}: {
  sending: boolean;
  onSubmit: (c: OrderCustomer) => void;
}) {
  const [form, setForm] = useState<OrderCustomer>({
    name: '',
    email: '',
    phone: '',
    club: '',
    notes: '',
  });

  const set = (k: keyof OrderCustomer) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid = form.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !sending) onSubmit(form);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ord-name">Nome *</Label>
        <Input id="ord-name" value={form.name} onChange={set('name')} placeholder="O seu nome" autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ord-email">E-mail *</Label>
        <Input id="ord-email" type="email" value={form.email} onChange={set('email')} placeholder="nome@exemplo.pt" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ord-phone">Telefone</Label>
          <Input id="ord-phone" value={form.phone} onChange={set('phone')} placeholder="+351 ..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ord-club">Clube / Equipa</Label>
          <Input id="ord-club" value={form.club} onChange={set('club')} placeholder="Opcional" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ord-notes">Observações</Label>
        <Textarea
          id="ord-notes"
          value={form.notes}
          onChange={set('notes')}
          placeholder="Quantidades, tamanhos, prazos…"
        />
      </div>
      <Button type="submit" className="w-full" disabled={!valid || sending}>
        {sending ? 'A enviar…' : 'Enviar pedido'}
      </Button>
    </form>
  );
}
