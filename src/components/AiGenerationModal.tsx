import { Sparkles } from 'lucide-react';
import { useAiPortraitStore } from '@/store/useAiPortraitStore';
import { useOrderStore } from '@/store/useOrderStore';

/**
 * Modal bloqueante (sem opção de fechar) exibido enquanto a foto do
 * jogador do artigo "herói" é gerada por IA, disparado a partir do
 * CartDrawer ao clicar "Finalizar pedido". Só desaparece quando a foto
 * está pronta — o checkout abre já com a imagem final carregada.
 */
export function AiGenerationModal() {
  const activeItemId = useAiPortraitStore((s) => s.activeItemId);
  const progress = useAiPortraitStore((s) => s.progress);
  const items = useOrderStore((s) => s.items);

  if (!activeItemId) return null;
  const item = items.find((i) => i.id === activeItemId);
  const pct = Math.min(Math.round(progress), 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-background p-7 text-center shadow-2xl">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          {item?.preview ? (
            <img src={item.preview} alt="" className="h-full w-full object-contain opacity-70" />
          ) : (
            <Sparkles className="h-10 w-10 text-primary" />
          )}
        </div>
        <p className="mt-4 text-sm font-semibold">A preparar a sua prancha final…</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Estamos a vestir o seu design num modelo profissional de estúdio.
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
