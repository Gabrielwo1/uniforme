import { useEffect, useState } from 'react';
import { ArrowLeft, BadgePlus, PersonStanding, RotateCcw, Shirt, ShoppingBag, Type } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import { useKitStore } from '@/store/useKitStore';
import { VARIANTE_JOGADOR, estampaDemoPorId } from '@/lib/kitDemo';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import { PECAS_KIT } from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { GaleriaEstampas, KitViewer, PainelCores } from './KitViewer';
import { KitCartDrawer } from './KitCartDrawer';

/**
 * Simulador de conjuntos, na arquitetura da referência:
 *
 *   - menu superior: áreas de personalização (estampas hoje; nome/número e
 *     escudo/logos entram a seguir — os botões já marcam o sítio)
 *   - esquerda: cores (por peça: zonas + camadas da estampa)
 *   - centro: o conjunto, frente e verso
 *   - direita: galeria de estampas em quadrados, com separadores por peça
 */
type MenuTopo = 'estampas' | 'nome' | 'escudo';

const MENU: { id: MenuTopo; rotulo: string; Icone: typeof Shirt }[] = [
  { id: 'estampas', rotulo: 'Modelos / Estampas', Icone: Shirt },
  { id: 'nome', rotulo: 'Nome e Número', Icone: Type },
  { id: 'escudo', rotulo: 'Escudo e Logos', Icone: BadgePlus },
];

/** Ambientes de teste, alternáveis no cabeçalho (`?lab=`). */
const VARIANTES: { id: 'kit' | 'jogador'; rotulo: string; Icone: typeof Shirt }[] = [
  { id: 'kit', rotulo: 'Peças', Icone: Shirt },
  { id: 'jogador', rotulo: 'Jogador', Icone: PersonStanding },
];

export function KitLab() {
  const reset = useKitStore((s) => s.reset);
  const design = useKitStore((s) => s.design);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);
  const adicionar = useKitOrderStore((s) => s.adicionar);
  const abrirPainel = useKitOrderStore((s) => s.abrirPainel);
  const noCarrinho = useKitOrderStore((s) =>
    s.itens.reduce((n, i) => n + i.quantidade, 0),
  );
  const [menu, setMenu] = useState<MenuTopo>('estampas');

  /** Nome do conjunto = tema da camisola, que é quem manda no visual. */
  const adicionarAoCarrinho = () => {
    const estampa = estampaDemoPorId('camisola', design.pecas.camisola.estampaId);
    adicionar(design, `${estampa.nome} · ${estampa.codModelo}`);
  };

  // A estampa real pesa ~3 MB de vetores: entra por import dinâmico para não
  // carregar com o app. Depois de registada, `reset` torna-a a seleção.
  const [prontas, setProntas] = useState(false);
  useEffect(() => {
    let vivo = true;
    import('@/lib/kitReal').then(({ registarReais }) => {
      if (!vivo) return;
      registarReais();
      reset();
      setProntas(true);
    });
    return () => {
      vivo = false;
    };
  }, [reset]);

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Button
          variant="ghost"
          size="icon"
          title="Voltar ao site"
          onClick={() => useFlowStore.getState().goToSite()}
        >
          <ArrowLeft />
        </Button>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            KYPZL
          </p>
          <h1 className="text-base font-bold leading-tight">Simulador de conjuntos</h1>
        </div>

        {/* menu superior, estilo referência */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {MENU.map(({ id, rotulo, Icone }) => (
            <button
              key={id}
              onClick={() => setMenu(id)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                menu === id
                  ? 'border-foreground bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Icone className="h-3.5 w-3.5" />
              {rotulo}
            </button>
          ))}
        </nav>

        {/* alternador dos dois ambientes de teste: as peças sozinhas
            (versão original) ou vestidas no jogador. A variante é lida do
            URL no arranque, por isso a troca recarrega a página. */}
        <div className="ml-auto flex items-center rounded-md border p-0.5 md:ml-0">
          {VARIANTES.map(({ id, rotulo, Icone }) => {
            const ativa = (id === 'jogador') === VARIANTE_JOGADOR;
            return (
              <button
                key={id}
                onClick={() => {
                  if (!ativa) window.location.search = `?lab=${id}`;
                }}
                title={`Ver ${rotulo.toLowerCase()}`}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition',
                  ativa ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <Icone className="h-3.5 w-3.5" />
                {rotulo}
              </button>
            );
          })}
        </div>

        <span className="hidden text-xs text-muted-foreground lg:inline">
          {sincronizadas.length} de {PECAS_KIT.length} peças sincronizadas
        </span>
        <Button variant="outline" size="sm" onClick={reset} title="Repor cores e temas">
          <RotateCcw />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={abrirPainel}
          title="Ver pedido"
          className="relative"
        >
          <ShoppingBag />
          {noCarrinho > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {noCarrinho}
            </span>
          )}
        </Button>
        <Button size="sm" onClick={adicionarAoCarrinho}>
          Adicionar ao carrinho
        </Button>
      </header>

      <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[290px_minmax(0,1fr)_300px]">
        <aside className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cores
          </p>
          {PECAS_KIT.map((peca) => (
            <PainelCores key={peca} peca={peca} />
          ))}
          {!prontas && (
            <p className="text-[11px] text-muted-foreground">A carregar o tema convertido…</p>
          )}
        </aside>

        <KitViewer fundo="/moldes/fundo-campo.jpg" />

        <aside className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {MENU.find((m) => m.id === menu)?.rotulo}
          </p>
          {menu === 'estampas' ? (
            <GaleriaEstampas />
          ) : (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              {menu === 'nome'
                ? 'Nome e número no conjunto — em desenvolvimento. O motor de texto já existe no editor anterior e será ligado aqui.'
                : 'Escudo e logos no conjunto — em desenvolvimento. A biblioteca de logos do editor anterior será ligada aqui.'}
            </div>
          )}
        </aside>
      </div>

      <KitCartDrawer />
    </div>
  );
}
