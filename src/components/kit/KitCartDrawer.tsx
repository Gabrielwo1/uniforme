import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import { useFlowStore } from '@/store/useFlowStore';
import { CustomerForm, isCustomerValid } from '../CustomerForm';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '../ui/sheet';
import { Button } from '../ui/button';
import { KitPreview } from './KitPreview';
import { Animacao } from '../ui/animacao';
import sucesso from '@/assets/animacoes/sucesso.json';

/**
 * Painel lateral do pedido do simulador, em dois passos:
 *
 *   1. 'carrinho' — conjuntos adicionados, com quantidade e miniatura viva
 *      (renderizada pelo motor, não uma imagem gravada).
 *   2. 'dados' — contactos do cliente. Confirmar abre o checkout.
 *
 * Sem IA pelo caminho: o conjunto já é a imagem final.
 */
export function KitCartDrawer() {
  const itens = useKitOrderStore((s) => s.itens);
  const cliente = useKitOrderStore((s) => s.cliente);
  const setCliente = useKitOrderStore((s) => s.setCliente);
  const aberto = useKitOrderStore((s) => s.painelAberto);
  const passo = useKitOrderStore((s) => s.passo);
  const setPasso = useKitOrderStore((s) => s.setPasso);
  const fechar = useKitOrderStore((s) => s.fecharPainel);
  const remover = useKitOrderStore((s) => s.remover);
  const setQuantidade = useKitOrderStore((s) => s.setQuantidade);

  const nosDados = passo === 'dados';
  const podeConfirmar = isCustomerValid(cliente);
  const total = itens.reduce((n, i) => n + i.quantidade, 0);

  /** Interlúdio do "Confirmar pedido" — o clique que fecha esta fase: a
      animação de sucesso do designer toca por cima do painel e só quando
      acaba é que o checkout abre. Avança quando ela termina (~1,7 s) OU ao
      fim de 2,5 s — o Lottie anda em requestAnimationFrame, que congela com
      o separador em segundo plano, e sem o teto quem trocasse de separador
      naquele instante ficava preso na animação. */
  const [aConfirmar, setAConfirmar] = useState(false);
  const avancou = useRef(false);
  const avancar = () => {
    if (avancou.current) return;
    avancou.current = true;
    setAConfirmar(false);
    fechar();
    useFlowStore.getState().goToKitCheckout();
  };
  const confirmar = () => {
    if (!podeConfirmar) return;
    avancou.current = false;
    setAConfirmar(true);
  };
  useEffect(() => {
    if (!aConfirmar) return;
    const t = setTimeout(avancar, 2500);
    return () => clearTimeout(t);
  });

  return (
    <Sheet open={aberto} onOpenChange={(o) => !o && fechar()}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {nosDados ? (
              <>
                <button
                  onClick={() => setPasso('carrinho')}
                  className="grid h-7 w-7 place-items-center rounded-md border transition hover:bg-accent"
                  title="Voltar aos artigos"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                Os seus dados
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Pedido
                {total > 0 && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
                    {total}
                  </span>
                )}
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {nosDados ? (
            <div className="py-2">
              <p className="mb-3 text-xs text-muted-foreground">
                Sem compromisso — o resumo abre no WhatsApp e o orçamento
                chega depois de revermos o conjunto.
              </p>
              <CustomerForm value={cliente} onChange={setCliente} />
            </div>
          ) : itens.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Ainda não adicionou nenhum conjunto.
            </p>
          ) : (
            <ul className="space-y-2 py-2">
              {itens.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-lg border bg-card p-2">
                  <div className="flex shrink-0 gap-1 overflow-hidden rounded-md bg-[url(/moldes/fundo-campo.jpg)] bg-cover bg-center p-1">
                    <KitPreview design={item.design} lado="frente" className="h-24" />
                    <KitPreview design={item.design} lado="verso" className="h-24" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-sm font-bold">{item.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Camisola + calção + meião
                      {(item.design.aplicacoes?.length ?? 0) > 0 &&
                        ` · ${item.design.aplicacoes!.length} personalizações`}
                    </p>

                    <div className="mt-auto flex items-center gap-1.5 pt-2">
                      <button
                        onClick={() => setQuantidade(item.id, item.quantidade - 1)}
                        className="grid h-6 w-6 place-items-center rounded border transition hover:bg-accent"
                        title="Menos um"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => setQuantidade(item.id, item.quantidade + 1)}
                        className="grid h-6 w-6 place-items-center rounded border transition hover:bg-accent"
                        title="Mais um"
                      >
                        <Plus className="h-3 w-3" />
                      </button>

                      <button
                        onClick={() => remover(item.id)}
                        className="ml-auto grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {aConfirmar && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/85 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Animacao dados={sucesso} className="h-32 w-32" aoTerminar={avancar} />
              <p className="text-sm font-bold">Pedido confirmado</p>
              <p className="text-xs text-muted-foreground">
                {total} {total === 1 ? 'conjunto' : 'conjuntos'} — a abrir o resumo…
              </p>
            </div>
          </div>
        )}

        <SheetFooter className="gap-2">
          {nosDados ? (
            <>
              <Button className="w-full" disabled={!podeConfirmar || aConfirmar} onClick={confirmar}>
                Confirmar pedido
              </Button>
              {!podeConfirmar && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Preencha nome e e-mail para continuar.
                </p>
              )}
              <Button variant="outline" className="w-full" onClick={() => setPasso('carrinho')}>
                Voltar aos artigos
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full"
                disabled={itens.length === 0}
                onClick={() => setPasso('dados')}
              >
                Finalizar pedido
              </Button>
              <Button variant="outline" className="w-full" onClick={fechar}>
                Continuar a personalizar
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
