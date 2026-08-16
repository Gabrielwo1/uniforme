import { useState } from 'react';
import { ArrowLeft, Check, Loader2, Pencil, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import { useFlowStore } from '@/store/useFlowStore';
import { submitKitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { estampaDemoPorId, moldeDemo } from '@/lib/kitDemo';
import { PECAS_KIT, PECA_LABEL } from '@/types/kit';
import type { KitOrderItem } from '@/types/kitOrder';
import { CustomerForm, isCustomerValid } from '../CustomerForm';
import { Button } from '../ui/button';
import { KitPreview } from './KitPreview';

/**
 * Checkout do simulador de conjuntos — SEM IA.
 *
 *   · Esquerda: dados do cliente (já preenchidos no painel, editáveis aqui),
 *     o que acontece a seguir e os contactos KYPZL.
 *   · Direita: os conjuntos do pedido, frente e verso, com a ficha técnica
 *     de cada peça (tema + cores) para a produção.
 *
 * O conjunto composto pelo motor É a imagem final: não há foto para gerar.
 */
export function KitCheckout() {
  const itens = useKitOrderStore((s) => s.itens);
  const cliente = useKitOrderStore((s) => s.cliente);
  const setCliente = useKitOrderStore((s) => s.setCliente);
  const limpar = useKitOrderStore((s) => s.limpar);

  const [aEnviar, setAEnviar] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [aEditar, setAEditar] = useState(false);

  const total = itens.reduce((n, i) => n + i.quantidade, 0);

  const enviar = async () => {
    if (!isCustomerValid(cliente)) {
      setAEditar(true);
      toast.error('Preencha nome e e-mail para enviar o pedido.');
      return;
    }
    setAEnviar(true);
    try {
      if (isSupabaseConfigured) {
        await submitKitOrder(cliente, itens);
      } else {
        downloadText(
          JSON.stringify({ cliente, itens }, null, 2),
          `pedido-kypzl-${Date.now()}.json`,
        );
      }
      limpar();
      setEnviado(true);
    } catch (e) {
      console.warn('[pedido]', e);
      toast.error('Não foi possível enviar. Tente novamente.');
    } finally {
      setAEnviar(false);
    }
  };

  if (enviado) {
    return (
      <div className="grid h-full place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Pedido enviado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Recebemos o seu conjunto. A equipa KYPZL vai rever os detalhes e
            responder com o orçamento por e-mail.
          </p>
          <Button className="mt-6" onClick={() => useFlowStore.getState().goToSite()}>
            Voltar ao site
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Button variant="ghost" size="icon" onClick={() => useFlowStore.getState().back()}>
          <ArrowLeft />
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            KYPZL
          </p>
          <h1 className="text-base font-bold leading-tight">Finalizar pedido</h1>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {total} {total === 1 ? 'conjunto' : 'conjuntos'}
        </span>
      </header>

      <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold">Os seus dados</h2>
              <button
                onClick={() => setAEditar((v) => !v)}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Pencil className="h-3 w-3" />
                {aEditar ? 'Fechar' : 'Editar'}
              </button>
            </div>

            {aEditar ? (
              <CustomerForm value={cliente} onChange={setCliente} />
            ) : (
              <dl className="space-y-1.5 text-sm">
                <Linha rotulo="Nome" valor={cliente.name} />
                <Linha rotulo="E-mail" valor={cliente.email} />
                {cliente.phone && <Linha rotulo="Telefone" valor={cliente.phone} />}
                {cliente.club && <Linha rotulo="Clube" valor={cliente.club} />}
                {cliente.notes && <Linha rotulo="Notas" valor={cliente.notes} />}
              </dl>
            )}
          </section>

          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-2 text-sm font-bold">O que acontece a seguir</h2>
            <ol className="space-y-2 text-xs text-muted-foreground">
              {[
                'Revemos o conjunto e as cores escolhidas.',
                'Enviamos o orçamento por e-mail, com prazos de produção.',
                'Depois da sua aprovação, entra em produção.',
              ].map((passo, i) => (
                <li key={passo} className="flex gap-2">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background">
                    {i + 1}
                  </span>
                  {passo}
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-2">
            <Button className="w-full" disabled={aEnviar || itens.length === 0} onClick={enviar}>
              {aEnviar ? <Loader2 className="animate-spin" /> : <Send />}
              {aEnviar ? 'A enviar…' : 'Enviar pedido'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => useFlowStore.getState().back()}
            >
              <Plus /> Adicionar outro conjunto
            </Button>
          </div>
        </aside>

        <main className="space-y-4">
          {itens.length === 0 ? (
            <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
              O pedido está vazio.
            </p>
          ) : (
            itens.map((item) => <FichaConjunto key={item.id} item={item} />)
          )}
        </main>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 flex-1 break-words">{valor || '—'}</dd>
    </div>
  );
}

/** Um conjunto do pedido: frente e verso + ficha técnica das peças. */
function FichaConjunto({ item }: { item: KitOrderItem }) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <h2 className="text-sm font-bold">{item.nome}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">
          {item.quantidade} {item.quantidade === 1 ? 'unidade' : 'unidades'}
        </span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_minmax(0,300px)]">
        <div className="flex justify-center gap-4 rounded-lg bg-gradient-to-b from-[#dfe4ea] to-[#b9c2cc] p-4">
          {(['frente', 'verso'] as const).map((lado) => (
            <div key={lado} className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                {lado}
              </span>
              <KitPreview design={item.design} lado={lado} className="h-[320px]" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {PECAS_KIT.map((peca) => {
            const config = item.design.pecas[peca];
            if (!config) return null;
            const estampa = estampaDemoPorId(peca, config.estampaId);
            const zonas = moldeDemo(peca, 'frente').zonas;
            return (
              <div key={peca} className="rounded-md border p-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {PECA_LABEL[peca]}
                </p>
                <p className="text-sm font-bold">
                  {estampa.nome} · {estampa.codModelo}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {zonas.map((zona) => (
                    <Amostra
                      key={zona.id}
                      rotulo={zona.nome}
                      cor={config.coresZonas[zona.id] ?? zona.corPadrao}
                    />
                  ))}
                  {estampa.camadas.map((camada) => (
                    <Amostra
                      key={camada.id}
                      rotulo={camada.nome}
                      cor={config.cores[camada.id] ?? camada.corPadrao}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Cor de uma zona/camada, com o código hex para a produção. */
function Amostra({ rotulo, cor }: { rotulo: string; cor: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="h-5 w-5 shrink-0 rounded border"
        style={{ backgroundColor: cor }}
        aria-hidden
      />
      <span className="text-[10px] leading-tight">
        {rotulo}
        <br />
        <span className="text-muted-foreground">{cor.toUpperCase()}</span>
      </span>
    </div>
  );
}
