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
import { TooltipProvider } from './components/ui/tooltip';
import { useDesignStore } from './store/useDesignStore';
import { useFlowStore } from './store/useFlowStore';

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
      {screen === 'site' ? (
        <SiteLanding />
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
