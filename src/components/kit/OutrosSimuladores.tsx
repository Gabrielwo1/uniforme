import type { SVGProps } from 'react';
import { Shirt, Volleyball } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Os segmentos do simulador, no cabeçalho — como no concorrente: a
 * modalidade ativa a cheio e as próximas esbatidas, cada uma no seu
 * crachá redondo. Por agora só o futebol existe; as outras respondem
 * com "brevemente" em vez de fingirem que abrem.
 *
 * A bola de futebol e a de basquete não existem no lucide desta versão,
 * por isso são desenhadas aqui com a MESMA gramática (viewBox 24, traço
 * 2, `currentColor`) para ninguém notar a diferença.
 */

function BolaFutebol(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 7.5 16 10.5 14.5 15h-5L8 10.5Z" />
      <path d="M12 7.5V2M16 10.5l4.8-1.7M14.5 15l3 4.4M9.5 15l-3 4.4M8 10.5 3.2 8.8" />
    </svg>
  );
}

function BolaBasquete(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 2v20M2 12h20" />
      <path d="M5.3 5.4c3.9 2.8 3.9 10.4 0 13.2M18.7 5.4c-3.9 2.8-3.9 10.4 0 13.2" />
    </svg>
  );
}

const SEGMENTOS = [
  { nome: 'Futebol', ativo: true, Icone: BolaFutebol },
  { nome: 'Basquetebol', ativo: false, Icone: BolaBasquete },
  { nome: 'Voleibol', ativo: false, Icone: Volleyball },
  { nome: 'Treino e pólos', ativo: false, Icone: Shirt },
];

export function OutrosSimuladores({ className }: { className?: string }) {
  return (
    <div className={cn('items-center gap-1.5', className)}>
      {SEGMENTOS.map(({ nome, ativo, Icone }) => (
        <button
          key={nome}
          title={ativo ? `${nome} — está aqui` : `${nome} — brevemente`}
          onClick={() =>
            !ativo
            && toast.info(`${nome} — brevemente`, {
              description: 'Este segmento do simulador está a caminho.',
            })
          }
          className={cn(
            'grid h-9 w-9 place-items-center rounded-full border-2 transition',
            ativo
              ? 'border-foreground text-foreground'
              : 'border-muted-foreground/30 text-muted-foreground/40 hover:border-muted-foreground/50 hover:text-muted-foreground/70',
          )}
        >
          <Icone className="h-[18px] w-[18px]" />
        </button>
      ))}
    </div>
  );
}
