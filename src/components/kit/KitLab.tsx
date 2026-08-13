import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useFlowStore } from '@/store/useFlowStore';
import { useKitStore } from '@/store/useKitStore';
import { PECAS_KIT } from '@/types/kit';
import { Button } from '../ui/button';
import { ControlosPeca, KitViewer, PainelCores } from './KitViewer';

/**
 * Laboratório do novo simulador por template — a tela onde a mecânica pedida
 * pelo cliente (estampas SVG recoloríveis por camada, conjunto completo,
 * sincronização) é testada antes de substituir o editor atual.
 *
 * A camisola já usa os assets reais do cliente (PNG das zonas + tema
 * convertido); calção e meião continuam com formas de demonstração.
 */
export function KitLab() {
  const reset = useKitStore((s) => s.reset);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);

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
        <span className="ml-auto text-xs text-muted-foreground">
          {sincronizadas.length} de {PECAS_KIT.length} peças sincronizadas
        </span>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw /> Repor
        </Button>
      </header>

      <div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <KitViewer />

        <aside className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Modelos / Estampas
            </p>
            {PECAS_KIT.map((peca) => (
              <ControlosPeca key={peca} peca={peca} />
            ))}
          </div>

          <div className="space-y-3">
            {PECAS_KIT.map((peca) => (
              <PainelCores key={peca} peca={peca} />
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {prontas
              ? 'A camisola usa os assets reais (zonas do PSD + tema convertido); calção e meião ainda são formas provisórias. Cada cor é uma camada independente, e o cadeado sincroniza as peças.'
              : 'A carregar o tema convertido…'}
          </p>
        </aside>
      </div>
    </div>
  );
}
