import { useEffect, useState } from 'react';
import { LayoutGrid, LoaderCircle, UserRound } from 'lucide-react';
import { renderOnModel } from '@/lib/modelPreview';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

/**
 * Pré-visualização final: alterna entre a "Prancha" (produto plano, frente)
 * e "No Modelo" (composição fotorrealista sobre uma foto real, gerada no
 * navegador a partir do design atual — ver src/lib/modelPreview.ts).
 */
export function ModelPreviewDialog({
  open,
  onOpenChange,
  title,
  boardSrc,
  modelTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  boardSrc: string | null;
  /** Nome do template em /public/models/<nome>/ — omitido se o produto não é compatível (ex.: calção, meia). */
  modelTemplate?: string;
}) {
  const [tab, setTab] = useState<'prancha' | 'modelo'>('prancha');
  const [modelSrc, setModelSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) {
      setTab('prancha');
      setModelSrc(null);
      setError(false);
    }
  }, [open]);

  const generate = async () => {
    if (!boardSrc || !modelTemplate) return;
    setLoading(true);
    setError(false);
    try {
      const result = await renderOnModel(boardSrc, modelTemplate);
      setModelSrc(result);
    } catch (e) {
      console.warn('[model-preview]', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (v: string) => {
    setTab(v as 'prancha' | 'modelo');
    if (v === 'modelo' && !modelSrc && !loading) void generate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {modelTemplate && (
            <DialogDescription>
              Confira o produto plano ou veja como fica personalizado, vestido.
            </DialogDescription>
          )}
        </DialogHeader>

        {modelTemplate ? (
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prancha" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Prancha
              </TabsTrigger>
              <TabsTrigger value="modelo" className="gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                No Modelo
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prancha" className="mt-3">
              {boardSrc && (
                <img
                  src={boardSrc}
                  alt="Prancha do produto"
                  className="mx-auto max-h-[60vh] w-auto rounded-lg border bg-muted"
                />
              )}
            </TabsContent>

            <TabsContent value="modelo" className="mt-3">
              {loading && (
                <div className="flex h-[360px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Gerando pré-visualização…
                </div>
              )}
              {!loading && error && (
                <p className="py-16 text-center text-sm text-destructive">
                  Não foi possível gerar a pré-visualização no modelo.
                </p>
              )}
              {!loading && !error && modelSrc && (
                <img
                  src={modelSrc}
                  alt="Pré-visualização no modelo"
                  className="mx-auto max-h-[60vh] w-auto rounded-lg border bg-muted"
                />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          boardSrc && (
            <img
              src={boardSrc}
              alt="Prancha do produto"
              className="mx-auto max-h-[70vh] w-auto rounded-lg border bg-muted"
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
