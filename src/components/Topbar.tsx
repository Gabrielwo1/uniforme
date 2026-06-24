import { useState } from 'react';
import {
  Braces,
  Download,
  Eye,
  FilePlus,
  FolderOpen,
  Redo2,
  Save,
  Shirt,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDesignStore } from '@/store/useDesignStore';
import { getCanvas } from '@/lib/canvasBridge';
import { downloadDataUrl, downloadText } from '@/lib/download';
import { saveDesign } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveDesignCloud } from '@/lib/api';
import { CloudDesignsModal } from './CloudDesignsModal';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

export function Topbar() {
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const canUndo = useDesignStore((s) => s.past.length > 0);
  const canRedo = useDesignStore((s) => s.future.length > 0);
  const zoom = useDesignStore((s) => s.zoom);
  const setZoom = useDesignStore((s) => s.setZoom);
  const exportJSON = useDesignStore((s) => s.exportJSON);
  const newSimulation = useDesignStore((s) => s.newSimulation);

  const [preview, setPreview] = useState<string | null>(null);
  const [showCloud, setShowCloud] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const state = useDesignStore.getState().design;
    saveDesign(state); // sempre local (rápido/offline)

    if (!isSupabaseConfigured) {
      toast.success('Design salvo localmente');
      return;
    }

    const store = useDesignStore.getState();
    let name = store.cloudName;
    if (!name) {
      name = (prompt('Nome do design:', 'Meu uniforme') ?? '').trim();
      if (!name) return;
    }
    setSaving(true);
    try {
      const previewPng = getCanvas().exportPNG(1) ?? undefined;
      const id = await saveDesignCloud({ id: store.cloudId, name, state, preview: previewPng });
      store.setCloud(id, name);
      toast.success('Design salvo na nuvem');
    } catch (e) {
      toast.error('Falha ao salvar na nuvem — guardado localmente');
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    const png = getCanvas().exportPNG(2);
    if (png) setPreview(png);
  };

  const handleExportPNG = () => {
    const png = getCanvas().exportPNG(3);
    if (png) {
      downloadDataUrl(png, `uniforme-${Date.now()}.png`);
      toast.success('PNG exportado em alta resolução');
    }
  };

  const handleExportJSON = () => {
    downloadText(exportJSON(), `orcamento-${Date.now()}.json`);
    toast.success('Orçamento (JSON) exportado');
  };

  const handleNew = () => {
    if (confirm('Iniciar nova simulação? As alterações não salvas serão perdidas.')) {
      newSimulation();
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-3">
      {/* Marca */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shirt className="h-4 w-4" />
        </div>
        <span className="hidden text-sm font-semibold sm:inline">
          Editor de Uniformes
        </span>
      </div>

      {/* Histórico + zoom */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo}>
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo}>
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button variant="ghost" size="icon" onClick={() => setZoom(zoom - 0.25)}>
          <ZoomOut />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={() => setZoom(zoom + 0.25)}>
          <ZoomIn />
        </Button>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={handleNew}>
          <FilePlus />
          <span className="hidden lg:inline">Nova</span>
        </Button>
        {isSupabaseConfigured && (
          <Button variant="outline" size="sm" onClick={() => setShowCloud(true)}>
            <FolderOpen />
            <span className="hidden lg:inline">Abrir</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handlePreview}>
          <Eye />
          <span className="hidden lg:inline">Visualizar</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPNG}>
          <Download />
          <span className="hidden lg:inline">PNG</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
          <Save />
          <span className="hidden lg:inline">{saving ? 'Salvando…' : 'Salvar'}</span>
        </Button>
        <Button size="sm" onClick={handleExportJSON}>
          <Braces />
          <span className="hidden md:inline">Orçamento</span>
        </Button>
      </div>

      {/* Modal de designs na nuvem */}
      {showCloud && <CloudDesignsModal onClose={() => setShowCloud(false)} />}

      {/* Pré-visualização */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização</DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={preview}
              alt="Pré-visualização do uniforme"
              className="mx-auto max-h-[70vh] w-auto rounded-lg border bg-muted"
            />
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
