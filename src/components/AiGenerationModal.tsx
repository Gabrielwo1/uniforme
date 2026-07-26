import { Sparkles } from 'lucide-react';
import { useAiPortraitStore } from '@/store/useAiPortraitStore';
import { useOrderStore } from '@/store/useOrderStore';

/**
 * Modal bloqueante (sem opção de fechar) exibido enquanto a foto do
 * jogador — vestindo TODAS as peças do pedido juntas — é gerada por IA,
 * disparado a partir do CartDrawer ao clicar "Finalizar pedido". Só
 * desaparece quando a foto está pronta — o checkout abre já com a imagem
 * final carregada.
 */
export function AiGenerationModal() {
  const activeKey = useAiPortraitStore((s) => s.activeKey);
  const progress = useAiPortraitStore((s) => s.progress);
  const items = useOrderStore((s) => s.items);

  if (!activeKey) return null;
  const pct = Math.min(Math.round(progress), 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-background p-7 text-center shadow-2xl">
        {items.length > 0 ? (
          <div className="flex items-center justify-center -space-x-3">
            {items.slice(0, 4).map((it) =>
              it.preview ? (
                <img
                  key={it.id}
                  src={it.preview}
                  alt=""
                  className="h-16 w-16 rounded-full border-2 border-background bg-muted object-contain opacity-80"
                />
              ) : null,
            )}
          </div>
        ) : (
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
        )}
        <p className="mt-4 text-sm font-semibold">A preparar a sua prancha final…</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Estamos a vestir o seu design completo — {items.length}{' '}
          {items.length === 1 ? 'peça' : 'peças'} — num jogador em campo, de frente e de costas.
        </p>
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-medium tabular-nums text-muted-foreground">{pct}%</p>
      </div>
    </div>
  );
}
