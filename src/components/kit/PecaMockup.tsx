import { useId } from 'react';
import type {
  CamadaEstampa,
  Estampa,
  MoldePeca,
  PecaConfig,
  ZonaPeca,
} from '@/types/kit';
import { cn } from '@/lib/utils';

/**
 * Motor de composição de uma peça — o coração do simulador por template.
 *
 * A peça é feita de ZONAS coloríveis (corpo, gola, punhos), cada uma com a sua
 * cor. Só a zona do corpo recebe a estampa; assim a gola pode ser vermelha
 * sobre um corpo às riscas, como acontece nas camisolas reais.
 *
 * Composição de cada zona:
 *   1. a forma da zona preenchida com a cor escolhida
 *   2. (só no corpo) as camadas da estampa, recortadas por essa forma
 *   3. o sombreado do tecido em multiply, que dá o aspeto de pano
 *
 * A forma vem do canal alfa do PNG recortado — o mesmo ficheiro serve de
 * máscara e de sombreado, por isso o designer só exporta uma imagem por zona.
 */
export function PecaMockup({
  molde,
  estampa,
  config,
  className,
  style,
  children,
}: {
  molde: MoldePeca;
  estampa: Estampa;
  config: PecaConfig;
  className?: string;
  style?: React.CSSProperties;
  /** Camada de personalização (nome/número/logos) sobreposta à peça. */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('relative', className)} style={style}>
      {molde.zonas.map((zona) => (
        <Zona
          key={zona.id}
          zona={zona}
          molde={molde}
          estampa={estampa}
          config={config}
        />
      ))}

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

function Zona({
  zona,
  molde,
  estampa,
  config,
}: {
  zona: ZonaPeca;
  molde: MoldePeca;
  estampa: Estampa;
  config: PecaConfig;
}) {
  const uid = useId().replace(/:/g, '');
  const cor = config.coresZonas[zona.id] ?? zona.corPadrao;
  const corDaCamada = (c: CamadaEstampa) => config.cores[c.id] ?? c.corPadrao;

  const camadas = zona.recebeEstampa
    ? estampa.camadas.filter((c) => c.desenho[molde.lado])
    : [];

  // Zona vinda de PNG: o alfa da imagem recorta a cor e a estampa, e a mesma
  // imagem volta por cima em multiply para trazer as dobras do tecido.
  if (zona.imagem) {
    const mascara: React.CSSProperties = {
      WebkitMaskImage: `url(${zona.imagem})`,
      maskImage: `url(${zona.imagem})`,
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
    };

    return (
      <>
        <div className="absolute inset-0" style={{ ...mascara, backgroundColor: cor }} />

        {camadas.length > 0 && (
          <div className="absolute inset-0" style={mascara}>
            <svg viewBox={molde.viewBox} className="h-full w-full">
              {camadas.map((camada) => (
                <g
                  key={camada.id}
                  dangerouslySetInnerHTML={{
                    __html: forcarCor(camada.desenho[molde.lado]!, corDaCamada(camada)),
                  }}
                />
              ))}
            </svg>
          </div>
        )}

        <img
          src={zona.imagem}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply"
        />
      </>
    );
  }

  // Zona vetorial: mesma lógica, mas o recorte é um path em vez de um alfa.
  if (!zona.silhueta) return null;
  const clipId = `clip-${uid}`;

  return (
    <svg viewBox={molde.viewBox} className="absolute inset-0 h-full w-full">
      <defs>
        <clipPath id={clipId}>
          <path d={zona.silhueta} />
        </clipPath>
      </defs>
      <path d={zona.silhueta} fill={cor} />
      {camadas.length > 0 && (
        <g clipPath={`url(#${clipId})`}>
          {camadas.map((camada) => (
            <g
              key={camada.id}
              dangerouslySetInnerHTML={{
                __html: forcarCor(camada.desenho[molde.lado]!, corDaCamada(camada)),
              }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/**
 * Reescreve os `fill` do desenho para a cor da camada.
 *
 * Os exports do Illustrator trazem o desenho a preto com `fill` explícito em
 * cada path; sem esta troca, herdar a cor do grupo não teria efeito.
 * `fill="none"` é preservado — é o que mantém os vazados do desenho.
 */
export function forcarCor(svgInterno: string, cor: string): string {
  return svgInterno
    .replace(/fill="(?!none")[^"]*"/g, `fill="${cor}"`)
    .replace(/fill:\s*(?!none)[^;"']+/g, `fill:${cor}`);
}
