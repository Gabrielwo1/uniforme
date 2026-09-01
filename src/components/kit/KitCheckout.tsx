import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { QUANTIDADE_INICIAL, useKitOrderStore } from '@/store/useKitOrderStore';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { submitKitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { cn } from '@/lib/utils';
import { linkEmail, linkWhatsApp } from '@/lib/whatsapp';
import { estampaDemoPorId, moldeDemo } from '@/lib/kitDemo';
import { fontePorId, localPorId } from '@/lib/kitLocais';
import { PECAS_KIT, PECA_LABEL, type PecaKit } from '@/types/kit';
import type { KitOrderItem, LinhaOrcamento } from '@/types/kitOrder';
import { CustomerForm, isCustomerValid } from '../CustomerForm';
import { Button } from '../ui/button';
import { Animacao } from '../ui/animacao';
import { IconeWhatsApp } from '../ui/icone-whatsapp';
import sucesso from '@/assets/animacoes/sucesso.json';
import { KitPreview } from './KitPreview';

/**
 * Página do ORÇAMENTO, passo a passo (a arquitetura do concorrente, mas
 * no NOSSO design system — tokens da plataforma, sem cores próprias):
 *
 *   1. Itens adicionados: cada conjunto no seu cartão, desdobrado em três
 *      linhas (camisola, calção, meião) com marcar/desmarcar e quantidade.
 *   2. Os dados do cliente.
 *   3. Enviar — o resumo abre no WhatsApp e o pedido fica registado.
 *
 * Sem tamanhos, nomes ou números aqui (decisão do cliente): só as
 * quantidades por peça; o resto combina-se na conversa.
 * SEM IA: o conjunto composto pelo motor É a imagem final.
 */

const LINHA_PADRAO: LinhaOrcamento = { incluida: true, quantidade: QUANTIDADE_INICIAL };

function linhaDe(item: KitOrderItem, peca: PecaKit): LinhaOrcamento {
  return item.linhas?.[peca] ?? LINHA_PADRAO;
}

export function KitCheckout() {
  const itens = useKitOrderStore((s) => s.itens);
  const cliente = useKitOrderStore((s) => s.cliente);
  const setCliente = useKitOrderStore((s) => s.setCliente);
  const limpar = useKitOrderStore((s) => s.limpar);

  const [aEnviar, setAEnviar] = useState(false);
  const [enviado, setEnviado] = useState<'whatsapp' | 'email' | null>(null);

  const totalPecas = itens.reduce(
    (n, i) =>
      n
      + PECAS_KIT.reduce((m, p) => {
        const l = linhaDe(i, p);
        return m + (l.incluida ? l.quantidade : 0);
      }, 0),
    0,
  );

  const enviar = async (canal: 'whatsapp' | 'email') => {
    if (!isCustomerValid(cliente)) {
      toast.error('Preencha nome e e-mail para pedir o orçamento.');
      return;
    }

    // O resumo abre AQUI, ainda dentro do clique: depois do primeiro await
    // o browser já não o reconhece como gesto do utilizador e o bloqueador
    // de popups engole a janela. O mailto não abre janela nova — entrega o
    // resumo ao programa de e-mail sem sair da página.
    let janela: Window | null = null;
    if (canal === 'whatsapp') {
      janela = window.open(linkWhatsApp(cliente, itens), '_blank', 'noopener');
    } else {
      window.location.href = linkEmail(cliente, itens);
    }

    setAEnviar(true);
    try {
      // o registo continua a ser feito: é dele que vive a lista de leads,
      // e a mensagem pode nunca chegar a ser enviada
      if (isSupabaseConfigured) {
        await submitKitOrder(cliente, itens);
      } else {
        downloadText(
          JSON.stringify({ cliente, itens }, null, 2),
          `orcamento-kypzl-${Date.now()}.json`,
        );
      }
      if (canal === 'whatsapp' && !janela) {
        toast.warning('Permita janelas para abrir o WhatsApp.');
      }
      limpar();
      setEnviado(canal);
    } catch (e) {
      console.warn('[orçamento]', e);
      toast.error('Não foi possível registar o pedido. Tente novamente.');
    } finally {
      setAEnviar(false);
    }
  };

  if (enviado) {
    return (
      <div className="grid h-full place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <Animacao dados={sucesso} className="mx-auto mb-2 h-28 w-28" />
          <h1 className="text-2xl font-bold">Pedido de orçamento enviado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {enviado === 'whatsapp'
              ? 'O resumo abriu no WhatsApp. Envie a mensagem e a equipa KYPZL responde com o orçamento e os prazos.'
              : 'O resumo abriu no seu programa de e-mail. Envie a mensagem e a equipa KYPZL responde com o orçamento e os prazos.'}
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
        <div className="shrink-0">
          <img src={logoUrl} alt="KYPZL" className="mb-1 h-5 w-auto dark:brightness-0 dark:invert" />
          <h1 className="whitespace-nowrap text-base font-bold leading-tight">Orçamento</h1>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {totalPecas} {totalPecas === 1 ? 'peça' : 'peças'}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 p-5 pb-16">
          <Passo n={1} titulo="Itens adicionados ao seu orçamento">
            {itens.length === 0 ? (
              <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
                O orçamento está vazio.{' '}
                <button
                  className="font-semibold underline"
                  onClick={() => useFlowStore.getState().back()}
                >
                  Voltar ao simulador
                </button>
              </p>
            ) : (
              <div className="space-y-4">
                {itens.map((item) => (
                  <CartaoConjunto key={item.id} item={item} />
                ))}
              </div>
            )}
          </Passo>

          <Passo n={2} titulo="Os seus dados">
            <div className="rounded-lg border bg-card p-4">
              <CustomerForm value={cliente} onChange={setCliente} />
            </div>
          </Passo>

          <Passo n={3} titulo="Pedir orçamento">
            <div className="rounded-lg border bg-card p-4">
              <ol className="mb-4 space-y-2 text-xs text-muted-foreground">
                {[
                  'O resumo abre no WhatsApp ou no e-mail — basta enviar.',
                  'Revemos o conjunto e respondemos com o orçamento e prazos.',
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  disabled={aEnviar || itens.length === 0}
                  onClick={() => enviar('whatsapp')}
                >
                  {aEnviar ? <Loader2 className="animate-spin" /> : <IconeWhatsApp />}
                  {aEnviar ? 'A enviar…' : 'Pedir orçamento por WhatsApp'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={aEnviar || itens.length === 0}
                  onClick={() => enviar('email')}
                >
                  <Mail /> Enviar por e-mail
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => useFlowStore.getState().back()}
                >
                  <Plus /> Adicionar outro conjunto
                </Button>
              </div>
            </div>
          </Passo>
        </div>
      </div>
    </div>
  );
}

/** Cabeçalho numerado de cada passo — o mesmo desenho dos passos "o que
    acontece a seguir", em ponto grande. */
function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
          {n}
        </span>
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  );
}

/** Um conjunto do orçamento: cartão com o nome, miniatura e as três linhas. */
function CartaoConjunto({ item }: { item: KitOrderItem }) {
  const remover = useKitOrderStore((s) => s.remover);

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <h3 className="text-sm font-bold">{item.nome}</h3>
        <button
          onClick={() => remover(item.id)}
          className="ml-auto grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          title="Remover este conjunto do orçamento"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex h-fit justify-center gap-2 rounded-md bg-[url(/moldes/fundo.jpg)] bg-cover bg-center p-2">
          <KitPreview design={item.design} lado="frente" className="h-40" />
          <KitPreview design={item.design} lado="verso" className="h-40" />
        </div>

        <div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Desmarque uma peça para a tirar do orçamento — ou marque para a
            voltar a pôr.
          </p>
          <div className="space-y-2">
            {PECAS_KIT.map((peca) => (
              <LinhaPeca key={peca} item={item} peca={peca} />
            ))}
          </div>
        </div>
      </div>

      <details className="border-t">
        <summary className="cursor-pointer select-none px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
          Ficha técnica (cores e personalização)
        </summary>
        <div className="px-4 pb-4">
          <FichaTecnica item={item} />
        </div>
      </details>
    </section>
  );
}

/** Uma linha do orçamento: check, nome da peça e quantidade. */
function LinhaPeca({ item, peca }: { item: KitOrderItem; peca: PecaKit }) {
  const setLinha = useKitOrderStore((s) => s.setLinha);
  const linha = linhaDe(item, peca);
  const mudar = (mudanca: Partial<LinhaOrcamento>) => setLinha(item.id, peca, mudanca);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border p-2.5 transition',
        !linha.incluida && 'bg-muted/40',
      )}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => mudar({ incluida: !linha.incluida })}
        title={linha.incluida ? 'Desmarcar para remover do orçamento' : 'Marcar para adicionar'}
      >
        <CheckCircle2
          className={cn(
            'h-5 w-5 shrink-0 transition',
            linha.incluida ? 'text-primary' : 'text-muted-foreground/30',
          )}
        />
        <span
          className={cn(
            'truncate text-sm font-bold',
            !linha.incluida && 'text-muted-foreground line-through',
          )}
        >
          {PECA_LABEL[peca]}
        </span>
      </button>

      <div
        className={cn(
          'flex items-center gap-1.5',
          !linha.incluida && 'pointer-events-none opacity-40',
        )}
      >
        <button
          onClick={() => mudar({ quantidade: linha.quantidade - 1 })}
          className="grid h-6 w-6 place-items-center rounded border transition hover:bg-accent"
          title="Menos um"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="min-w-8 text-center text-sm font-bold">{linha.quantidade}</span>
        <button
          onClick={() => mudar({ quantidade: linha.quantidade + 1 })}
          className="grid h-6 w-6 place-items-center rounded border transition hover:bg-accent"
          title="Mais um"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Ficha técnica do conjunto — tema e cores por peça, para a produção. */
function FichaTecnica({ item }: { item: KitOrderItem }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
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

      <Aplicacoes item={item} />
    </div>
  );
}

/** Nomes, números e logos aplicados no simulador — a lista que a produção
    precisa de ver escrita, porque na imagem o nome é pequeno e o hex do
    contorno não se lê. */
function Aplicacoes({ item }: { item: KitOrderItem }) {
  const lista = item.design.aplicacoes ?? [];
  if (lista.length === 0) return null;

  return (
    <div className="rounded-md border p-2.5 sm:col-span-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Personalização aplicada no simulador
      </p>
      <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        {lista.map((a) => {
          const local = localPorId(a.localId);
          return (
            <li key={a.id} className="flex items-center gap-2">
              {a.tipo === 'logo' ? (
                <img
                  src={a.imagem}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded border object-contain"
                />
              ) : (
                <span
                  className="grid h-7 shrink-0 place-items-center rounded border px-1.5 text-xs font-bold"
                  style={{
                    fontFamily: fontePorId(a.fonteId).css,
                    color: a.cor,
                    backgroundColor: '#3a3a3a',
                  }}
                >
                  {a.texto}
                </span>
              )}
              <span className="min-w-0 text-[10px] leading-tight">
                <span className="font-semibold">
                  {local ? `${PECA_LABEL[local.peca]} · ${local.nome}` : 'Posição desconhecida'}
                </span>
                <br />
                <span className="text-muted-foreground">
                  {a.tipo === 'logo'
                    ? (a.nomeFicheiro ?? 'imagem')
                    : `${fontePorId(a.fonteId).nome} · ${a.cor.toUpperCase()}${
                        a.corContorno ? ` / contorno ${a.corContorno.toUpperCase()}` : ''
                      }`}{' '}
                  · {Math.round(a.escala * 100)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
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
