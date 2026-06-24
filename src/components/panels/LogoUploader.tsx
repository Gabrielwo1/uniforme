import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { normalizeImageFile } from '@/lib/image';
import { uploadLogo } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useDesignStore } from '@/store/useDesignStore';
import { cn } from '@/lib/utils';

/** Dropzone + input de arquivo para subir logos/patrocínios. */
export function LogoUploader() {
  const addImage = useDesignStore((s) => s.addImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const norm = await normalizeImageFile(file);
        let src = norm.dataUrl;
        if (isSupabaseConfigured) {
          try {
            src = await uploadLogo(norm.blob, 'png');
          } catch (e) {
            console.warn('[upload] fallback para dataURL:', e);
          }
        }
        addImage({ src, naturalW: norm.width, naturalH: norm.height });
      }
    } catch {
      setError('Não foi possível processar a imagem.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:bg-muted',
        )}
      >
        <ImagePlus className="h-7 w-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          {busy ? 'Processando…' : 'Enviar logo / patrocínio'}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Clique ou arraste (PNG, JPG, WebP)
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        As imagens são otimizadas (até 2000px) no seu navegador antes de entrar
        no canvas.
      </p>
    </div>
  );
}
