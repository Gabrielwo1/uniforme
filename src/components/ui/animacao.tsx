import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Toca uma animação Lottie do designer.
 *
 * O player entra por IMPORT DINÂMICO: são ~70 KB gzip que só interessam no
 * momento em que há uma animação para mostrar (o fim de um pedido, um erro),
 * e não têm de pesar no arranque do simulador.
 *
 * O JSON é importado por quem usa o componente — assim cada animação entra
 * no bundle que a precisa, e acrescentar uma nova é copiar um ficheiro para
 * `src/assets/animacoes/` e passá-lo aqui.
 */
export function Animacao({
  dados,
  className,
  repetir = false,
  aoTerminar,
}: {
  /** JSON exportado do After Effects (Bodymovin). */
  dados: unknown;
  className?: string;
  repetir?: boolean;
  aoTerminar?: () => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  // numa ref para o efeito não se reiniciar quando o pai redesenha e passa
  // uma função nova — a animação recomeçaria do zero a cada render
  const terminou = useRef(aoTerminar);
  terminou.current = aoTerminar;

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;

    let anim: { destroy: () => void } | undefined;
    let vivo = true;

    import('lottie-web').then(({ default: lottie }) => {
      if (!vivo || !alvo) return;
      const a = lottie.loadAnimation({
        container: alvo,
        renderer: 'svg',
        loop: repetir,
        autoplay: true,
        animationData: dados,
      });
      a.addEventListener('complete', () => terminou.current?.());
      anim = a;
    });

    return () => {
      vivo = false;
      anim?.destroy();
    };
  }, [dados, repetir]);

  return <div ref={caixa} aria-hidden className={cn('shrink-0', className)} />;
}
