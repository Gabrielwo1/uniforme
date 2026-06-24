import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { Topbar } from './components/Topbar';
import { LeftPanel } from './components/LeftPanel';
import { CanvasStage } from './components/CanvasStage';
import { RightPanelColors } from './components/RightPanelColors';
import { TooltipProvider } from './components/ui/tooltip';
import { useDesignStore } from './store/useDesignStore';

export default function App() {
  // Atalhos globais de desfazer/refazer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
      <div className="flex h-full flex-col bg-background">
        <Topbar />
        <div className="flex min-h-0 flex-1">
          <LeftPanel />
          <main className="min-w-0 flex-1">
            <CanvasStage />
          </main>
          <RightPanelColors />
        </div>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  );
}
