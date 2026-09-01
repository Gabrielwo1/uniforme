import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PALETA } from '@/lib/kitCores';

/**
 * Seletor de cor em BLOCOS — a grelha fechada da paleta, como no
 * concorrente, em vez do `<input type="color">` livre (pedido do
 * cliente). O gatilho é o quadrado da cor atual; a grelha abre por baixo
 * e cada bloco diz o nome no tooltip.
 */
export function SeletorCor({
  cor,
  onChange,
  title,
  className,
  alinhar = 'direita',
}: {
  cor: string;
  onChange: (cor: string) => void;
  title?: string;
  /** Classes do GATILHO (tamanho, cantos) — o painel não muda. */
  className?: string;
  /** De que lado o painel se estende: 'direita' ancora à direita do
      gatilho e cresce para a esquerda (paineis encostados à direita do
      ecrã), 'esquerda' o contrário. */
  alinhar?: 'esquerda' | 'direita';
}) {
  const [aberto, setAberto] = useState(false);

  const escolher = (hex: string) => {
    onChange(hex);
    setAberto(false);
  };

  return (
    <span className="relative inline-block">
      <button
        type="button"
        title={title}
        onClick={() => setAberto((v) => !v)}
        style={{ backgroundColor: cor }}
        className={cn('block cursor-pointer rounded-md border-2 border-border', className)}
      />

      {aberto && (
        <>
          {/* véu invisível: clicar fora fecha */}
          <button
            type="button"
            aria-hidden
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setAberto(false)}
          />
          <div
            className={cn(
              'absolute top-full z-30 mt-1.5 w-[248px] rounded-lg border bg-popover p-2 shadow-xl',
              alinhar === 'direita' ? 'right-0' : 'left-0',
            )}
          >
            <div className="grid grid-cols-8 gap-1">
              {PALETA.map(({ nome, hex }) => (
                <button
                  key={hex}
                  type="button"
                  title={nome}
                  onClick={() => escolher(hex)}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    'h-6 w-6 rounded border border-border transition hover:scale-110',
                    cor.toLowerCase() === hex.toLowerCase()
                      && 'ring-2 ring-primary ring-offset-1 ring-offset-popover',
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
