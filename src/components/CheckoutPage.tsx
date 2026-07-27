import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Globe,
  LoaderCircle,
  Mail,
  MessageSquareText,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import logoUrl from '@/assets/kypzl-logo.png';
import { useOrderStore } from '@/store/useOrderStore';
import { useDesignStore } from '@/store/useDesignStore';
import { useFlowStore } from '@/store/useFlowStore';
import { submitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { useAiPortraitStore } from '@/store/useAiPortraitStore';
import { buildAIPortraitInput } from '@/lib/aiPortrait';
import { CustomerForm, isCustomerValid } from './CustomerForm';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

/**
 * Página real de checkout (não um popup) — layout tipo e-commerce premium:
 *   · Esquerda: revisão dos dados (já preenchidos no passo 2 do CartDrawer,
 *     editáveis aqui) + "o que acontece a seguir" + contactos KYPZL.
 *   · Direita: passerelle — foto GRANDE e larga do jogador vestindo TODAS as
 *     peças do pedido, de frente e de costas (gerada por IA, com cache).
 * Sem sobreposição sintética: a foto do modelo é 100% gerada por IA.
 */
export function CheckoutPage() {
  const items = useOrderStore((s) => s.items);
  const customer = useOrderStore((s) => s.customer);
  const setCustomer = useOrderStore((s) => s.setCustomer);
  const clearItems = useOrderStore((s) => s.clearItems);
  const requestProductsTab = useOrderStore((s) => s.requestProductsTab);

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  /** Dados vêm preenchidos do painel — só abre o form se quiser corrigir. */
  const [editingCustomer, setEditingCustomer] = useState(false);

  // Foto do jogador vestindo TODAS as peças do pedido juntas — cache
  // partilhado com o CartDrawer/AiGenerationModal, chaveado pelo conjunto
  // de artigos (já pode chegar pronta, pré-gerada ao finalizar o pedido).
  const cacheKey = items.length > 0 ? buildAIPortraitInput(items).cacheKey : null;

  const aiPhotos = useAiPortraitStore((s) => s.cache);
  const aiFailed = useAiPortraitStore((s) => s.failed);
  const fetchCombined = useAiPortraitStore((s) => s.fetchCombined);
  const clearFailed = useAiPortraitStore((s) => s.clearFailed);

  const groupPhoto = cacheKey ? aiPhotos[cacheKey] : undefined;
  const groupFailed = cacheKey ? !!aiFailed[cacheKey] : false;
  const generating = items.length > 0 && !groupPhoto && !groupFailed;

  useEffect(() => {
    if (items.length === 0 || !cacheKey || aiPhotos[cacheKey] || aiFailed[cacheKey]) return;
    fetchCombined(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const retryAI = () => {
    if (!cacheKey) return;
    clearFailed(cacheKey);
    fetchCombined(items);
  };

  const handleBack = () => useFlowStore.getState().back();

  const handleMore = () => {
    useDesignStore.getState().newSimulation();
    useFlowStore.getState().gotoCategory();
    requestProductsTab();
    toast.success('Escolha o próximo artigo');
  };

  const handleSubmit = async () => {
    if (!isCustomerValid(customer)) {
      setEditingCustomer(true);
      toast.error('Preencha nome e e-mail para enviar o pedido.');
      return;
    }
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
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Sem pagamento agora · orçamento à medida
        </span>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
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
          <div className="grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
            {/* --------------------------------- coluna: revisão + contactos */}
            <div className="order-2 lg:order-1">
              <h1 className="text-xl font-bold">Reveja e envie</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                O seu pedido ({items.length}{' '}
                {items.length === 1 ? 'artigo' : 'artigos'}) segue para a equipa
                KYPZL — entraremos em contacto para afinar tudo consigo.
              </p>

              <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Os seus dados
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCustomer((v) => !v)}
                  >
                    <Pencil />
                    {editingCustomer ? 'Concluir' : 'Editar'}
                  </Button>
                </div>

                {editingCustomer ? (
                  <CustomerForm
                    value={customer}
                    onChange={setCustomer}
                    idPrefix="checkout"
                    className="mt-4"
                  />
                ) : (
                  <dl className="mt-3 space-y-2 text-sm">
                    <SummaryRow label="Nome" value={customer.name} />
                    <SummaryRow label="E-mail" value={customer.email} />
                    <SummaryRow label="Telefone" value={customer.phone} />
                    <SummaryRow label="Clube / Equipa" value={customer.club} />
                    <SummaryRow label="Observações" value={customer.notes} />
                  </dl>
                )}
              </div>

              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={sending}
                onClick={handleSubmit}
              >
                <Send />
                {sending ? 'A enviar…' : 'Enviar Pedido'}
              </Button>

              <NextSteps className="mt-8" />
              <ContactCard className="mt-5" />
            </div>

            {/* ----------------------------------------- coluna: passerelle */}
            <div className="order-1 lg:order-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  O seu equipamento no jogador
                </p>
                {groupPhoto && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Foto gerada por IA
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                {/* trilho — peças incluídas nesta foto (não trocam a foto) */}
                <div className="order-2 flex gap-3 overflow-x-auto pb-1 sm:order-1 sm:w-[92px] sm:flex-col sm:overflow-visible sm:pb-0">
                  {items.map((it) => (
                    <div key={it.id} className="group relative shrink-0">
                      <div
                        title={it.productName}
                        className="h-20 w-20 overflow-hidden rounded-xl border bg-card p-1.5 shadow-sm sm:h-[88px] sm:w-full"
                      >
                        {it.preview ? (
                          <img
                            src={it.preview}
                            alt={it.productName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ShoppingBag className="mx-auto h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      {groupPhoto && (
                        <span
                          className="absolute left-1 top-1 rounded-full bg-primary p-1 shadow"
                          title="Incluída nesta foto"
                        >
                          <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                        </span>
                      )}
                      <button
                        className="absolute -right-1.5 -top-1.5 hidden rounded-full border bg-background p-1 text-muted-foreground shadow-sm transition hover:text-destructive group-hover:block"
                        title="Remover artigo"
                        onClick={() => useOrderStore.getState().removeItem(it.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={handleMore}
                    className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-muted-foreground transition hover:border-primary hover:text-primary sm:h-[88px] sm:w-full"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">Adicionar</span>
                  </button>
                </div>

                {/* foto grande e larga do jogador — frente + costas lado a lado */}
                <div className="order-1 min-w-0 flex-1 sm:order-2">
                  <div className="relative mx-auto aspect-[3/2] w-full max-w-[880px] overflow-hidden rounded-2xl bg-[#0e2412] shadow-xl ring-1 ring-black/10">
                    {/* clarão quente de fim de tarde (assinatura do fundo de campo) */}
                    <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_0%,rgba(182,33,38,0.22),transparent_60%)]" />

                    {groupPhoto ? (
                      <img
                        src={groupPhoto}
                        alt="Jogador vestindo o equipamento completo, de frente e de costas"
                        className="relative h-full w-full object-cover"
                      />
                    ) : generating ? (
                      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
                        {items[0]?.preview && (
                          <img
                            src={items[0].preview}
                            alt=""
                            className="h-32 w-32 animate-pulse object-contain opacity-25"
                          />
                        )}
                        <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          A gerar fotografia do jogador…
                        </div>
                        <p className="max-w-[280px] text-xs leading-relaxed text-white/50">
                          A vestir o seu design completo, de frente e de
                          costas, num jogador em campo · cerca de 20 segundos
                        </p>
                      </div>
                    ) : (
                      <div className="relative flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                        {items[0]?.preview && (
                          <img
                            src={items[0].preview}
                            alt=""
                            className="max-h-[45%] w-auto object-contain"
                          />
                        )}
                        <p className="text-xs text-white/60">
                          Não foi possível gerar a foto do jogador agora.
                        </p>
                        <Button size="sm" variant="secondary" onClick={retryAI}>
                          <RefreshCcw /> Tentar novamente
                        </Button>
                      </div>
                    )}

                    {/* faixa de identificação */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 pt-16">
                      <p className="text-base font-bold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
                        {items.map((it) => it.productName).join(' + ')}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                        Frente e verso · Sublimação KYPZL
                      </p>
                    </div>
                    <span className="absolute inset-x-0 top-0 h-1 bg-primary" />
                  </div>

                  {/* resumo compacto */}
                  <div className="mx-auto mt-3 flex w-full max-w-[880px] items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {items.length} {items.length === 1 ? 'artigo' : 'artigos'} no pedido
                    </span>
                    <span>Sem compromisso — orçamento combinado com a KYPZL</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Passo-a-passo do que acontece após o envio (comunicação/confiança). */
function NextSteps({ className }: { className?: string }) {
  const steps = [
    {
      icon: PackageCheck,
      title: 'Enviamos o seu pedido',
      desc: 'O design segue exatamente como o criou, com todas as personalizações.',
    },
    {
      icon: MessageSquareText,
      title: 'A equipa entra em contacto',
      desc: 'Afinamos tamanhos, quantidades e orçamento consigo — sem compromisso.',
    },
    {
      icon: ShieldCheck,
      title: 'Produção sublimada KYPZL',
      desc: 'Peças produzidas à medida, com sublimação de alta durabilidade.',
    },
  ];
  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        O que acontece a seguir
      </p>
      <div className="mt-3 space-y-3.5">
        {steps.map((s, i) => (
          <div key={s.title} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <s.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cartão de contactos da KYPZL (canais reais da marca). */
function ContactCard({ className }: { className?: string }) {
  const rows = [
    { icon: Phone, label: '+351 912 300 289', href: 'tel:+351912300289', external: false },
    { icon: Mail, label: 'info@kypzl.pt', href: 'mailto:info@kypzl.pt', external: false },
    { icon: Globe, label: 'www.kypzl.pt', href: 'https://www.kypzl.pt', external: true },
    { icon: AtSign, label: '@kypzl_', href: 'https://instagram.com/kypzl_', external: true },
  ];
  return (
    <div className={cn('overflow-hidden rounded-xl border shadow-sm', className)}>
      <div className="relative bg-[#131313] p-4">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(182,33,38,0.35),transparent_55%)]" />
        <img
          src={logoUrl}
          alt="KYPZL"
          className="relative h-5 w-auto brightness-0 invert"
        />
        <p className="relative mt-2.5 text-sm font-semibold text-white">
          Fale connosco a qualquer momento
        </p>
        <p className="relative mt-0.5 text-xs text-white/60">
          Dúvidas sobre tecidos, prazos ou quantidades? Estamos por perto.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border">
        {rows.map((r) => (
          <a
            key={r.label}
            href={r.href}
            {...(r.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="flex items-center gap-2.5 bg-card px-3.5 py-3 text-xs font-medium transition hover:bg-accent"
          >
            <r.icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{r.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Linha do resumo dos dados — omitida quando o campo está vazio. */
function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium">{value}</dd>
    </div>
  );
}
