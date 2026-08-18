import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Topbar } from './components/Topbar';
import { SimulatorHeader } from './components/SimulatorHeader';
import { LeftPanel } from './components/LeftPanel';
import { CanvasStage } from './components/CanvasStage';
import { RightPanelColors } from './components/RightPanelColors';
import { CartDrawer } from './components/CartDrawer';
import { AiGenerationModal } from './components/AiGenerationModal';
import { StartFlow } from './components/StartFlow';
import { SiteLanding } from './components/SiteLanding';
import { CheckoutPage } from './components/CheckoutPage';
import { KitLab } from './components/kit/KitLab';
import { KitCheckout } from './components/kit/KitCheckout';
import { AdminPanel } from './components/admin/AdminPanel';
import { TooltipProvider } from './components/ui/tooltip';
import { useDesignStore } from './store/useDesignStore';
import { useFlowStore } from './store/useFlowStore';

/**
 * Atalho fora do fluxo normal: `?lab=kit` abre o simulador de conjuntos.
 * `?lab=jogador` continua a valer — era o nome do ambiente de teste, agora
 * a única versão — para não partir as ligações já partilhadas.
 */
const LAB = new URLSearchParams(window.location.search).get('lab');
const LAB_KIT = LAB === 'kit' || LAB === 'jogador';

/** Administração em `/admin` (o vercel.json reescreve tudo para o index, por
    isso o caminho chega cá) — ou `?admin`, para funcionar em previews. */
const ADMIN =
  window.location.pathname.replace(/\/$/, '') === '/admin'
  || new URLSearchParams(window.location.search).has('admin');

export default function App() {
  const screen = useFlowStore((s) => s.screen);

  // Atalhos globais de desfazer/refazer (apenas no editor).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useFlowStore.getState().screen !== 'editor') return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useDesignStore.getState().undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        useDesignStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
      {/* o checkout do simulador tem precedência sobre o modo `?lab`,
          senão o laboratório prendia o utilizador no simulador */}
      {ADMIN ? (
        <AdminPanel />
      ) : screen === 'kitCheckout' ? (
        <KitCheckout />
      ) : LAB_KIT ? (
        <KitLab />
      ) : screen === 'site' ? (
        <SiteLanding />
      ) : screen === 'kit' ? (
        <KitLab />
      ) : screen === 'editor' ? (
        <div className="flex h-full flex-col bg-background">
          <SimulatorHeader />
          <Topbar />
          <div className="flex min-h-0 flex-1">
            <LeftPanel />
            <main className="min-w-0 flex-1">
              <CanvasStage />
            </main>
            <RightPanelColors />
          </div>
        </div>
      ) : screen === 'checkout' ? (
        <CheckoutPage />
      ) : (
        <StartFlow />
      )}
      <CartDrawer />
      <AiGenerationModal />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  );
}
