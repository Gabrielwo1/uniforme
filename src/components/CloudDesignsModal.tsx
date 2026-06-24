import { useEffect, useState } from 'react';
import { Shirt, Trash2 } from 'lucide-react';
import {
  deleteDesignCloud,
  getDesignCloud,
  listDesigns,
  type DesignListItem,
} from '@/lib/api';
import { useDesignStore } from '@/store/useDesignStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

/** Modal "Abrir": lista designs salvos na nuvem e permite carregar/excluir. */
export function CloudDesignsModal({ onClose }: { onClose: () => void }) {
  const loadDesign = useDesignStore((s) => s.loadDesign);
  const [items, setItems] = useState<DesignListItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => listDesigns().then(setItems);

  useEffect(() => {
    refresh();
  }, []);

  const open = async (id: string) => {
    setBusy(id);
    const row = await getDesignCloud(id);
    setBusy(null);
    if (row) {
      loadDesign(row.state, { cloudId: row.id, cloudName: row.name });
      onClose();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este design da nuvem?')) return;
    setBusy(id);
    try {
      await deleteDesignCloud(id);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Abrir design da nuvem</DialogTitle>
        </DialogHeader>

        <div className="scrollbar-clean max-h-[60vh] overflow-y-auto">
          {items === null && (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
          )}
          {items?.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum design salvo ainda. Use “Salvar” para enviar o atual.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items?.map((d) => (
              <div
                key={d.id}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow"
              >
                <button
                  onClick={() => open(d.id)}
                  disabled={busy === d.id}
                  className="block w-full"
                >
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    {d.preview ? (
                      <img
                        src={d.preview}
                        alt={d.name}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Shirt className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="truncate px-2.5 py-1.5 text-left text-xs font-medium">
                    {d.name}
                  </div>
                </button>
                <div className="flex items-center justify-between border-t px-2.5 py-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(d.updated_at).toLocaleDateString('pt-BR')}
                  </span>
                  <button
                    className="text-muted-foreground transition hover:text-destructive"
                    onClick={() => remove(d.id)}
                    disabled={busy === d.id}
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
