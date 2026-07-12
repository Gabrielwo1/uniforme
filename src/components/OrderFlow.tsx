import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { submitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { getProduct } from '@/lib/products';
import { renderOnModel } from '@/lib/modelPreview';
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
 *  view     → tela de checkout: foto do modelo + peças selecionadas +
 *             resumo do pedido; "Continuar a montar" (volta a editar) ou
 *             "Finalizar Pedido" → checkout (formulário)
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
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);

  const close = () => setStep('idle');

  // "Foto do modelo" do resumo do pedido: prefere um artigo cuja imagem já
  // é uma foto real (equipamentos completos); senão, sintetiza a partir do
  // primeiro artigo compatível (camisa/polo) via renderOnModel.
  useEffect(() => {
    if (step !== 'view' || items.length === 0) {
      setHeroSrc(null);
      return;
    }
    let cancelled = false;

    const realPhoto = items.find((it) => getProduct(it.productId).isModelPhoto);
    if (realPhoto?.preview) {
      setHeroSrc(realPhoto.preview);
      return;
    }

    const synthesizable = items.find((it) => getProduct(it.productId).modelTemplate && it.preview);
    if (!synthesizable?.preview) {
      setHeroSrc(null);
      return;
    }
    setHeroLoading(true);
    renderOnModel(synthesizable.preview, getProduct(synthesizable.productId).modelTemplate!)
      .then((src) => {
        if (!cancelled) setHeroSrc(src);
      })
      .catch((e) => {
        console.warn('[checkout] falha ao gerar foto do modelo:', e);
        if (!cancelled) setHeroSrc(null);
      })
      .finally(() => {
        if (!cancelled) setHeroLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, items]);

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

      {/* --------------------------------------------- tela de checkout */}
      <Dialog open={step === 'view'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Confirme o seu pedido
            </DialogTitle>
            <DialogDescription>
              {items.length === 0
                ? 'Ainda não adicionou artigos. Personalize um produto e clique em Finalizar.'
                : `${items.length} ${items.length === 1 ? 'artigo' : 'artigos'} — sem compromisso; o orçamento é combinado com a KYPZL.`}
            </DialogDescription>
          </DialogHeader>

          {items.length > 0 && (
            <div className="scrollbar-clean max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              {/* Foto do modelo */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Foto do modelo
                </p>
                <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {heroLoading ? (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Gerando pré-visualização…
                    </div>
                  ) : heroSrc ? (
                    <img src={heroSrc} alt="Modelo com o pedido" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-6 text-center text-xs text-muted-foreground">
                      <UserRound className="h-6 w-6" />
                      Foto do modelo indisponível para estas peças.
                    </div>
                  )}
                </div>
              </div>

              {/* Peças selecionadas */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peças selecionadas
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              </div>

              {/* Resumo do pedido */}
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo do pedido
                </p>
                <p className="mt-1 text-sm">
                  {items.length} {items.length === 1 ? 'artigo' : 'artigos'}:{' '}
                  {items.map((it) => it.productName).join(', ')}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <Button
              size="lg"
              className="w-full"
              disabled={items.length === 0}
              onClick={() => setStep('checkout')}
            >
              Finalizar Pedido
            </Button>
            <Button variant="ghost" onClick={close}>
              Continuar a montar
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
