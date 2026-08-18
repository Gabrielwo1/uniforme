import { useState } from 'react';
import { ArrowLeft, Loader2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { submitKitOrder } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { downloadText } from '@/lib/download';
import { cn } from '@/lib/utils';
import { linkWhatsApp } from '@/lib/whatsapp';
import { estampaDemoPorId, moldeDemo } from '@/lib/kitDemo';
import { fontePorId, localPorId } from '@/lib/kitLocais';
import { PECAS_KIT, PECA_LABEL } from '@/types/kit';
import type { KitOrderItem } from '@/types/kitOrder';
import { CustomerForm, isCustomerValid } from '../CustomerForm';
import { Button } from '../ui/button';
import { Animacao } from '../ui/animacao';
import { IconeWhatsApp } from '../ui/icone-whatsapp';
import sucesso from '@/assets/animacoes/sucesso.json';
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
  const [aba, setAba] = useState(0);
  // remover um conjunto pode deixar a aba a apontar para lá do fim
  const abaSegura = Math.min(aba, Math.max(0, itens.length - 1));

  const total = itens.reduce((n, i) => n + i.quantidade, 0);

  const enviar = async () => {
    if (!isCustomerValid(cliente)) {
      setAEditar(true);
      toast.error('Preencha nome e e-mail para enviar o pedido.');
      return;
    }

    // A janela abre AQUI, ainda dentro do clique: depois do primeiro await
    // o browser já não a reconhece como gesto do utilizador e o bloqueador
    // de popups engole-a.
    const janela = window.open(linkWhatsApp(cliente, itens), '_blank', 'noopener');

    setAEnviar(true);
    try {
      // o registo continua a ser feito: é dele que vive a lista de leads,
      // e a conversa no WhatsApp pode nunca chegar a ser enviada
      if (isSupabaseConfigured) {
        await submitKitOrder(cliente, itens);
      } else {
        downloadText(
          JSON.stringify({ cliente, itens }, null, 2),
          `pedido-kypzl-${Date.now()}.json`,
        );
      }
      if (!janela) toast.warning('Permita janelas para abrir o WhatsApp.');
      limpar();
      setEnviado(true);
    } catch (e) {
      console.warn('[pedido]', e);
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
          <h1 className="text-2xl font-bold">Pedido enviado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O resumo abriu no WhatsApp. Envie a mensagem e a equipa KYPZL
            responde com o orçamento e os prazos.
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
        {/* a marca entra como imagem, não como texto: o cabeçalho é o
            único sítio do simulador onde ela aparece. `nowrap` porque o
            título a partir em duas linhas estica o bloco para lá dos 56px
            do cabeçalho e corta a logo pelo topo. */}
        <div className="shrink-0">
          <img src={logoUrl} alt="KYPZL" className="mb-1 h-5 w-auto" />
          <h1 className="whitespace-nowrap text-base font-bold leading-tight">Finalizar pedido</h1>
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
                'O resumo abre no WhatsApp — basta enviar.',
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
          </section>

          <div className="space-y-2">
            <Button className="w-full" disabled={aEnviar || itens.length === 0} onClick={enviar}>
              {aEnviar ? <Loader2 className="animate-spin" /> : <IconeWhatsApp />}
              {aEnviar ? 'A enviar…' : 'Enviar por WhatsApp'}
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

        <main className="space-y-3">
          {itens.length === 0 ? (
            <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
              O pedido está vazio.
            </p>
          ) : (
            <>
              {/* Com um conjunto só, abas seriam ruído. A partir de dois, a
                  lista empilhada obrigava a rolar por fichas enormes para
                  comparar — as abas põem-nas no mesmo sítio. */}
              {itens.length > 1 && (
                <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
                  {itens.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setAba(i)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                        i === abaSegura
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {item.nome}
                      <span
                        className={cn(
                          'grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px]',
                          i === abaSegura ? 'bg-background text-foreground' : 'bg-muted',
                        )}
                      >
                        {item.quantidade}
                      </span>
                    </button>
                  ))}
                </nav>
              )}
              <FichaConjunto item={itens[abaSegura]} />
            </>
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
        <div className="flex justify-center gap-4 rounded-lg bg-[url(/moldes/fundo-campo.jpg)] bg-cover bg-center p-4">
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

          <Aplicacoes item={item} />
        </div>
      </div>
    </section>
  );
}

/** Nomes, números e logos — a lista que a produção precisa de ver escrita,
    porque na imagem o nome é pequeno e o hex do contorno não se lê. */
function Aplicacoes({ item }: { item: KitOrderItem }) {
  const lista = item.design.aplicacoes ?? [];
  if (lista.length === 0) return null;

  return (
    <div className="rounded-md border p-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Personalização
      </p>
      <ul className="mt-1.5 space-y-1.5">
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
