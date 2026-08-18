import { useEffect, useState } from 'react';
import { ArrowLeft, BadgePlus, RotateCcw, Shirt, ShoppingBag, Type } from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { useFlowStore } from '@/store/useFlowStore';
import { useKitStore } from '@/store/useKitStore';
import { estampaDemoPorId } from '@/lib/kitDemo';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import { PECAS_KIT } from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { GaleriaEstampas, KitViewer, PainelCores } from './KitViewer';
import { KitCartDrawer } from './KitCartDrawer';
import { PainelAplicacoes } from './PainelAplicacoes';

/**
 * Simulador de conjuntos, na arquitetura da referência:
 *
 *   - esquerda: cores (por peça: zonas + camadas da estampa)
 *   - centro: o conjunto, frente e verso
 *   - direita: personalização — separadores no topo (estampas, nome/número,
 *     escudo/logos) e, por baixo, o painel da área escolhida
 */
type MenuTopo = 'estampas' | 'nome' | 'escudo';

const MENU: { id: MenuTopo; rotulo: string; curto: string; Icone: typeof Shirt }[] = [
  { id: 'estampas', rotulo: 'Modelos / Estampas', curto: 'Estampas', Icone: Shirt },
  { id: 'nome', rotulo: 'Nome e Número', curto: 'Nome e Nº', Icone: Type },
  { id: 'escudo', rotulo: 'Escudo e Logos', curto: 'Escudo', Icone: BadgePlus },
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
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);
  const aplicacoes = useKitStore((s) => s.design.aplicacoes);

  /** Contador por separador — mostra de relance o que já foi aplicado. */
  const contagem: Record<MenuTopo, number> = {
    estampas: 0,
    nome: (aplicacoes ?? []).filter((a) => a.tipo !== 'logo').length,
    escudo: (aplicacoes ?? []).filter((a) => a.tipo === 'logo').length,
  };

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
        {/* só a marca: o que o ecrã é vê-se pelo próprio ecrã, e o
            cabeçalho ganha o espaço para os controlos */}
        <img src={logoUrl} alt="KYPZL" className="h-5 w-auto shrink-0" />

        <span className="ml-auto hidden text-xs text-muted-foreground lg:inline">
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

        {/* Personalização: o menu é o TOPO deste bloco, não do cabeçalho —
            escolher a área e mexer nela é o mesmo gesto, e ter o separador
            do outro lado do ecrã obrigava a atravessá-lo a cada troca. */}
        <aside className="space-y-3">
          <nav className="grid grid-cols-3 gap-1 rounded-lg border bg-card p-1 shadow-sm">
            {MENU.map(({ id, rotulo, curto, Icone }) => (
              <button
                key={id}
                onClick={() => {
                  setMenu(id);
                  setLocalEmFoco(null);
                }}
                title={rotulo}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-bold leading-tight transition',
                  menu === id
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <Icone className="h-4 w-4" />
                {curto}
                {contagem[id] > 0 && (
                  <span
                    className={cn(
                      'absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold',
                      menu === id ? 'bg-background text-foreground' : 'bg-foreground text-background',
                    )}
                  >
                    {contagem[id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {menu === 'estampas' && <GaleriaEstampas />}
          {menu === 'nome' && <PainelAplicacoes tipos={['texto', 'numero']} />}
          {menu === 'escudo' && <PainelAplicacoes tipos={['logo']} />}
        </aside>
      </div>

      <KitCartDrawer />
    </div>
  );
}
