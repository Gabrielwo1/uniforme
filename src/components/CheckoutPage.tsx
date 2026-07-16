import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import logoUrl from '@/assets/kypzl-logo.png';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { submitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { getProduct } from '@/lib/products';
import { renderOnModel } from '@/lib/modelPreview';
import { buildAIPortraitInput, requestAIPortrait } from '@/lib/aiPortrait';
import type { OrderCustomer, OrderItem } from '@/types/order';
import { ModelPreviewDialog } from './ModelPreviewDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

/**
 * Página real de checkout (não um popup) — layout tipo e-commerce:
 * formulário de dados de um lado, resumo do pedido (foto do modelo + peças)
 * do outro. Substitui inteiramente a tela (como o editor/funil), acessada
 * via useFlowStore.screen === 'checkout'.
 */
export function CheckoutPage() {
  const items = useOrderStore((s) => s.items);
  const clearItems = useOrderStore((s) => s.clearItems);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [previewItem, setPreviewItem] = useState<OrderItem | null>(null);
  const [heroSrc, setHeroSrc] = useState<string | null>(null);
  const [heroItem, setHeroItem] = useState<OrderItem | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);
  const [aiSrc, setAiSrc] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // "Foto do modelo": prefere um artigo cuja imagem já é uma foto real
  // (equipamentos completos); senão, sintetiza via renderOnModel a partir
  // do primeiro artigo compatível (camisa/polo). Este preview é grátis e
  // instantâneo — aparece na hora enquanto a foto real por IA (abaixo) é
  // gerada em segundo plano.
  useEffect(() => {
    if (items.length === 0) {
      setHeroSrc(null);
      setHeroItem(null);
      return;
    }
    let cancelled = false;

    const realPhoto = items.find((it) => getProduct(it.productId).isModelPhoto);
    if (realPhoto?.preview) {
      setHeroSrc(realPhoto.preview);
      setHeroItem(realPhoto);
      return;
    }

    const synthesizable = items.find((it) => getProduct(it.productId).modelTemplate && it.preview);
    setHeroItem(synthesizable ?? items[0] ?? null);
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
  }, [items]);

  // Foto real por IA: gerada automaticamente para todo item finalizado,
  // para todos os utilizadores — sem botão, sem passo manual. Roda em
  // segundo plano assim que o item "herói" do checkout é definido acima; o
  // preview grátis (heroSrc) continua visível até a foto real ficar pronta.
  useEffect(() => {
    setAiSrc(null);
    if (!heroItem) {
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    requestAIPortrait(buildAIPortraitInput(heroItem))
      .then((result) => {
        if (!cancelled) setAiSrc(result.imageUrl);
      })
      .catch((e) => {
        console.warn('[checkout] geração automática de foto por IA:', e);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroItem?.id]);

  const handleBack = () => useFlowStore.getState().back();

  const handleMore = () => {
    useDesignStore.getState().newSimulation();
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
        downloadText(
          JSON.stringify({ customer, items }, null, 2),
          `pedido-${Date.now()}.json`,
        );
      }
      clearItems();
      setDone(true);
    } catch (e) {
      console.warn('[pedido]', e);
      toast.error('Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleNewSimulation = () => {
    useDesignStore.getState().newSimulation();
    useFlowStore.getState().restart();
    requestProductsTab();
  };

  return (
    <div className="scrollbar-clean flex h-full flex-col overflow-y-auto bg-background">
      {/* Topo */}
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b bg-background px-4">
        {!done && (
          <Button variant="ghost" size="icon-sm" onClick={handleBack}>
            <ArrowLeft />
          </Button>
        )}
        <img src={logoUrl} alt="KYPZL" className="h-6 w-auto" />
        <span className="text-sm font-semibold">Finalizar Pedido</span>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {done ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <h1 className="text-xl font-bold">Pedido Realizado</h1>
            <p className="text-sm text-muted-foreground">
              Obrigado! A equipa KYPZL recebeu o seu pedido e entrará em
              contacto brevemente para combinar os detalhes.
            </p>
            <Button className="mt-2 w-full" onClick={handleNewSimulation}>
              Nova simulação
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ainda não adicionou artigos. Personalize um produto e clique em
              Finalizar.
            </p>
            <Button variant="outline" onClick={handleBack}>
              Voltar a montar
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Coluna: informações */}
            <div className="order-2 lg:order-1">
              <h1 className="text-xl font-bold">Os seus dados</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Para enviarmos o seu pedido ({items.length}{' '}
                {items.length === 1 ? 'artigo' : 'artigos'}) à equipa KYPZL. Sem
                pagamento agora — entraremos em contacto.
              </p>
              <div className="mt-6">
                <CheckoutForm sending={sending} onSubmit={handleSubmit} />
              </div>
            </div>

            {/* Coluna: resumo (foto do modelo + peças) */}
            <div className="order-1 space-y-5 lg:order-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Foto do modelo
                </p>
                <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {aiSrc ?? heroSrc ? (
                    <img src={aiSrc ?? heroSrc ?? ''} alt="Modelo com o pedido" className="h-full w-full object-contain" />
                  ) : heroLoading ? (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Gerando pré-visualização…
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 px-6 text-center text-xs text-muted-foreground">
                      <UserRound className="h-6 w-6" />
                      Foto do modelo indisponível para estas peças.
                    </div>
                  )}
                  {aiLoading && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow">
                      <LoaderCircle className="h-3 w-3 animate-spin" />
                      Gerando foto real…
                    </div>
                  )}
                </div>
                {aiSrc && (
                  <p className="mt-1.5 text-xs text-muted-foreground">Foto gerada por IA.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peças selecionadas
                </p>
                <div className="space-y-2">
                  {items.map((it) => {
                    const modelTemplate = getProduct(it.productId).modelTemplate;
                    return (
                      <div
                        key={it.id}
                        className="flex items-center gap-3 rounded-lg border bg-card p-2 shadow-sm"
                      >
                        <button
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted"
                          onClick={() => it.preview && setPreviewItem(it)}
                          title={modelTemplate ? 'Ver prancha e no modelo' : 'Ver prancha'}
                        >
                          {it.preview ? (
                            <img src={it.preview} alt={it.productName} className="h-full w-full object-contain" />
                          ) : (
                            <ShoppingBag className="mx-auto mt-3 h-6 w-6 text-muted-foreground" />
                          )}
                        </button>
                        <span className="flex-1 truncate text-sm font-medium">{it.productName}</span>
                        <button
                          className="text-muted-foreground transition hover:text-destructive"
                          title="Remover"
                          onClick={() => useOrderStore.getState().removeItem(it.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo do pedido
                </p>
                <p className="mt-1">
                  {items.length} {items.length === 1 ? 'artigo' : 'artigos'} — sem
                  compromisso; o orçamento é combinado com a KYPZL.
                </p>
              </div>

              <button
                className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={handleMore}
              >
                + Continuar a montar (adicionar outro artigo)
              </button>
            </div>
          </div>
        )}
      </div>

      <ModelPreviewDialog
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
        title={previewItem?.productName ?? ''}
        boardSrc={previewItem?.preview ?? null}
        modelTemplate={previewItem ? getProduct(previewItem.productId).modelTemplate : undefined}
      />
    </div>
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
      className="max-w-md space-y-4"
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
      <Button type="submit" size="lg" className="w-full" disabled={!valid || sending}>
        {sending ? 'A enviar…' : 'Enviar Pedido'}
      </Button>
    </form>
  );
}
