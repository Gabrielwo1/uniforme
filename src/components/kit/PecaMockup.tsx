import { useId } from 'react';
import type { CamadaEstampa, Estampa, LadoKit, MoldePeca, PecaConfig } from '@/types/kit';
import { cn } from '@/lib/utils';

/**
 * Motor de composição de uma peça — o coração do simulador por template.
 *
 * Compõe, por ordem: cor base na silhueta → camadas da estampa recortadas
 * pela silhueta → textura de sombreado em multiply → detalhes (costuras).
 *
 * As camadas vêm do Illustrator monocromáticas; `fill` é forçado no grupo E
 * nos filhos, porque os exports costumam trazer `fill` explícito nos paths,
 * que ganharia do valor herdado do grupo.
 */
export function PecaMockup({
  molde,
  estampa,
  config,
  className,
  children,
}: {
  molde: MoldePeca;
  estampa: Estampa;
  config: PecaConfig;
  className?: string;
  /** Camada de personalização (nome/número/logos) sobreposta à peça. */
  children?: React.ReactNode;
}) {
  // ids únicos por instância: há várias peças/lados no ecrã ao mesmo tempo
  const uid = useId().replace(/:/g, '');
  const clipId = `clip-${uid}`;

  const corDaCamada = (c: CamadaEstampa) => config.cores[c.id] ?? c.corPadrao;

  return (
    <div className={cn('relative', className)}>
      <svg viewBox={molde.viewBox} className="absolute inset-0 h-full w-full">
        <defs>
          <clipPath id={clipId}>
            <path d={molde.silhueta} />
          </clipPath>
        </defs>

        <path d={molde.silhueta} fill={config.corBase} />

        <g clipPath={`url(#${clipId})`}>
          {estampa.camadas.map((camada) => {
            const desenho = camada.desenho[molde.lado];
            if (!desenho) return null;
            return (
              <g
                key={camada.id}
                fill={corDaCamada(camada)}
                stroke="none"
                dangerouslySetInnerHTML={{
                  __html: forcarCor(desenho, corDaCamada(camada)),
                }}
              />
            );
          })}
        </g>
      </svg>

      {molde.textura && (
        <img
          src={molde.textura}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply"
        />
      )}

      {molde.detalhes && (
        <svg
          viewBox={molde.viewBox}
          className="pointer-events-none absolute inset-0 h-full w-full"
          dangerouslySetInnerHTML={{ __html: molde.detalhes }}
        />
      )}

      {children}
    </div>
  );
}

/**
 * Reescreve os `fill` do desenho para a cor da camada.
 *
 * Os exports do Illustrator/CorelDRAW trazem o desenho a preto com `fill`
 * explícito em cada path; sem esta troca, herdar a cor do grupo não teria
 * efeito. `fill="none"` é preservado — é o que mantém os vazados do desenho.
 */
function forcarCor(svgInterno: string, cor: string): string {
  return svgInterno
    .replace(/fill="(?!none")[^"]*"/g, `fill="${cor}"`)
    .replace(/fill:\s*(?!none)[^;"']+/g, `fill:${cor}`);
}

/** Rótulo de lado usado nas grelhas do editor. */
export function ladoLabel(lado: LadoKit) {
  return lado === 'frente' ? 'Frente' : 'Verso';
}
