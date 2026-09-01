import { useEffect, useState } from 'react';
import { ArrowLeft, BadgePlus, ClipboardList, Moon, Plus, RotateCcw, Shirt, Sun, Type } from 'lucide-react';
import logoUrl from '@/assets/kypzl-logo.png';
import { toast } from 'sonner';
import { useFlowStore } from '@/store/useFlowStore';
import { useKitStore } from '@/store/useKitStore';
import { useTemaStore } from '@/store/useTemaStore';
import { estampaDemoPorId } from '@/lib/kitDemo';
import { useKitOrderStore } from '@/store/useKitOrderStore';
import { PECAS_KIT } from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { CadeadoConjunto, GaleriaEstampas, KitViewer, PainelCores } from './KitViewer';
import { OutrosSimuladores } from './OutrosSimuladores';
import { PainelAplicacoes } from './PainelAplicacoes';
import { TelaCarregamento } from './TelaCarregamento';
import { Animacao } from '../ui/animacao';
import sucesso from '@/assets/animacoes/sucesso.json';

/**
 * Simulador de conjuntos, na arquitetura da referência:
 *
 *   - topo, ao centro: as áreas de personalização (modelos, nome/número,
 *     escudo/logos) — como no concorrente
 *   - esquerda: o painel da área escolhida (modelos por omissão)
 *   - centro: o conjunto, frente e verso
 *   - direita: cores (por peça: zonas + camadas da estampa)
 */
type MenuTopo = 'estampas' | 'nome' | 'escudo';

const MENU: { id: MenuTopo; rotulo: string; Icone: typeof Shirt }[] = [
  { id: 'estampas', rotulo: 'Modelos / Estampas', Icone: Shirt },
  { id: 'nome', rotulo: 'Nome e Número', Icone: Type },
  { id: 'escudo', rotulo: 'Escudo e Logos', Icone: BadgePlus },
];

export function KitLab() {
  const reset = useKitStore((s) => s.reset);
  const design = useKitStore((s) => s.design);
  const adicionar = useKitOrderStore((s) => s.adicionar);
  const noOrcamento = useKitOrderStore((s) => s.itens.length);
  const [menu, setMenu] = useState<MenuTopo>('estampas');
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);
  const aplicacoes = useKitStore((s) => s.design.aplicacoes);
  const escuro = useTemaStore((s) => s.tema === 'escuro');
  const alternarTema = useTemaStore((s) => s.alternar);

  /** Contador por separador — mostra de relance o que já foi aplicado. */
  const contagem: Record<MenuTopo, number> = {
    estampas: 0,
    nome: (aplicacoes ?? []).filter((a) => a.tipo !== 'logo').length,
    escudo: (aplicacoes ?? []).filter((a) => a.tipo === 'logo').length,
  };

  /** Nome do conjunto = tema da camisola, que é quem manda no visual. */
  const adicionarAoCarrinho = () => {
    const estampa = estampaDemoPorId('camisola', design.pecas.camisola.estampaId);
    const nome = `${estampa.nome} · ${estampa.codModelo}`;
    adicionar(design, nome);
    toast.success(`${nome} adicionado ao orçamento`, {
      description: 'Camisola, calção e meião. Continue a personalizar ou peça o orçamento.',
      icon: <Animacao dados={sucesso} className="h-6 w-6" />,
      action: { label: 'Ver orçamento', onClick: () => useFlowStore.getState().goToKitCheckout() },
    });
  };

  /** Com o orçamento vazio, o conjunto que está no ecrã conta como o
      pedido: abrir a página a dizer "está vazio" com o conjunto ali à
      frente seria um beco sem saída. */
  const orcamento = () => {
    if (noOrcamento === 0) adicionarAoCarrinho();
    useFlowStore.getState().goToKitCheckout();
  };

  // A estampa real pesa ~3 MB de vetores: entra por import dinâmico para não
  // carregar com o app. Depois de registada, `reset` torna-a a seleção.
  const [prontas, setProntas] = useState(false);
  useEffect(() => {
    let vivo = true;
    import('@/lib/kitReal').then(async ({ registarReais, registarDaBaseDeDados }) => {
      if (!vivo) return;
      registarReais();
      // os do painel de administração entram a seguir; se a rede falhar,
      // ficam os que vieram no código e o simulador abre na mesma
      await registarDaBaseDeDados();
      if (!vivo) return;
      reset();
      setProntas(true);
    });
    return () => {
      vivo = false;
    };
  }, [reset]);

  // A tela de carregamento fica ATÉ ambos: os temas prontos E ~3 s passados
  // (pedido do cliente — apresenta a marca e não pisca em cache quente).
  const [minimoPassou, setMinimoPassou] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinimoPassou(true), 3000);
    return () => clearTimeout(t);
  }, []);
  const aCarregar = !prontas || !minimoPassou;

  if (aCarregar) return <TelaCarregamento />;

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b px-5">
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
        <img
          src={logoUrl}
          alt="KYPZL"
          /* a palavra é preta no ficheiro: no escuro tem de virar branca */
          className="h-8 w-auto shrink-0 dark:brightness-0 dark:invert"
        />

        {/* os segmentos do simulador, como no concorrente: o ativo a
            cheio, os próximos esbatidos — CENTRADOS no cabeçalho, por
            isso fora do fluxo (o flex tem larguras diferentes de cada
            lado e o centro do resto não é o centro do ecrã). Só a partir
            de md — em ecrãs estreitos o cabeçalho já vai cheio. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <OutrosSimuladores className="hidden md:flex" />
        </div>

        <span className="ml-auto" />

        <Button
          variant="outline"
          size="sm"
          onClick={alternarTema}
          title={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {escuro ? <Sun /> : <Moon />}
        </Button>
        <Button variant="outline" size="sm" onClick={reset} title="Repor cores e temas">
          <RotateCcw />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={adicionarAoCarrinho}
          title="Guardar este conjunto e continuar a personalizar"
        >
          <Plus />
          Adicionar outro
        </Button>
        <Button size="sm" onClick={orcamento} className="relative">
          <ClipboardList />
          Orçamento
          {noOrcamento > 0 && (
            <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-foreground px-1 text-[10px] font-bold text-primary">
              {noOrcamento}
            </span>
          )}
        </Button>
      </header>

      <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[300px_minmax(0,1fr)_290px]">
        {/* ESQUERDA: a área escolhida no topo — modelos, nome/número ou
            escudos (o concorrente põe os modelos deste lado). O cadeado
            vive aqui porque manda na escolha de estampa E nas cores. */}
        <aside className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {MENU.find((m) => m.id === menu)?.rotulo}
          </p>
          <CadeadoConjunto />
          {menu === 'estampas' && <GaleriaEstampas />}
          {menu === 'nome' && <PainelAplicacoes tipos={['texto', 'numero']} />}
          {menu === 'escudo' && <PainelAplicacoes tipos={['logo']} />}
        </aside>

        {/* o menu das áreas flutua SOBRE o cenário, no topo — pedido do
            cliente: faz parte do palco, não do cabeçalho. O contentor leva
            fundo próprio com desfoque, senão os separadores inativos
            desapareciam contra a imagem escura. */}
        <div className="relative min-w-0">
          <nav className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border bg-background/85 p-1 shadow-lg backdrop-blur">
            {MENU.map(({ id, rotulo, Icone }) => (
              <button
                key={id}
                onClick={() => {
                  setMenu(id);
                  setLocalEmFoco(null);
                }}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  menu === id
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <Icone className="h-3.5 w-3.5" />
                {rotulo}
                {contagem[id] > 0 && (
                  <span
                    className={cn(
                      'grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold',
                      menu === id
                        ? 'bg-background text-foreground'
                        : 'bg-foreground text-background',
                    )}
                  >
                    {contagem[id]}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <KitViewer fundo="/moldes/fundo.jpg" />
        </div>

        {/* DIREITA: só cores, por peça */}
        <aside className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Cores
          </p>
          {PECAS_KIT.map((peca) => (
            <PainelCores key={peca} peca={peca} />
          ))}
        </aside>
      </div>

    </div>
  );
}
