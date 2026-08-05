import { RotateCcw } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { PECAS_KIT } from '@/types/kit';
import { Button } from '../ui/button';
import { ControlosPeca, KitViewer, PainelCores } from './KitViewer';

/**
 * Laboratório do novo simulador por template — a tela onde a mecânica pedida
 * pelo cliente (estampas SVG recoloríveis por camada, conjunto completo,
 * sincronização) é testada antes de substituir o editor atual.
 *
 * As formas são de demonstração (ver `kitDemo.ts`); o que está a ser validado
 * aqui é o MOTOR, que não muda quando os assets reais entrarem.
 */
export function KitLab() {
  const reset = useKitStore((s) => s.reset);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Protótipo
          </p>
          <h1 className="text-base font-bold leading-tight">Simulador por templates</h1>
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
            As formas são provisórias. O que está a ser testado é a mecânica:
            cada cor é uma camada independente do template, e o cadeado
            sincroniza as peças entre si.
          </p>
        </aside>
      </div>
    </div>
  );
}
