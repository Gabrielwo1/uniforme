import { estiloAjuste, useAjuste } from '@/lib/ajustes';
import type { LadoKit } from '@/types/kit';
import { cn } from '@/lib/utils';

/**
 * Camada estática da prancheta (o jogador por baixo, as chuteiras entre o
 * meião e o calção). Não recolore, mas pode levar o ajuste fino que o editor
 * de camadas do admin grava — por isso passa por aqui em vez de ser um <img>
 * solto em cada ecrã.
 */
export function CamadaFixa({
  tipo,
  lado,
  className,
}: {
  tipo: 'jogador' | 'botas';
  lado: LadoKit;
  className?: string;
}) {
  const ajuste = useAjuste(lado, tipo);
  return (
    <img
      src={`/moldes/jog/${tipo}-${lado}.png`}
      alt=""
      aria-hidden
      draggable={false}
      data-camada={tipo}
      className={cn('pointer-events-none absolute inset-0 h-full w-full object-contain', className)}
      style={estiloAjuste(ajuste)}
    />
  );
}
