import { Fragment, useId } from 'react';
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
  const detalhes = molde.detalhes && (
    <svg
      viewBox={molde.viewBox}
      className="pointer-events-none absolute inset-0 h-full w-full"
      dangerouslySetInnerHTML={{ __html: molde.detalhes }}
    />
  );

  return (
    <div className={cn('relative', className)} style={style}>
      {molde.zonas.map((zona, i) => (
        <Fragment key={zona.id}>
          <Zona zona={zona} molde={molde} estampa={estampa} config={config} />
          {/* colar que pendura À FRENTE do pescoço: a pele (detalhes) entra
              entre o corpo e as zonas da gola, em vez de por cima de tudo */}
          {i === 0 && molde.detalhesSob && detalhes}
        </Fragment>
      ))}

      {!molde.detalhesSob && detalhes}

      {children}
    </div>
  );
}

/** Cor de uma zona; as que `segue` outra usam a cor dessa. */
export function corDaZona(zona: ZonaPeca, molde: MoldePeca, config: PecaConfig): string {
  const alvo = zona.segue ? molde.zonas.find((z) => z.id === zona.segue) : undefined;
  const z = alvo ?? zona;
  return config.coresZonas[z.id] ?? z.corPadrao;
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
  const cor = corDaZona(zona, molde, config);
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

    // TUDO (cor, estampa e sombreado) dentro de UM grupo isolado e recortado
    // pela máscara. Antes o multiply do sombreado ficava de fora e fundia-se com
    // o que estivesse por baixo: na orla da peça, onde o fundo ainda é só
    // semitransparente, o multiply devolve a cor da própria textura (clara) e
    // nascia uma linha branca à volta de calções/meiões ESCUROS (013, 2026-10-08).
    return (
      <div className="absolute inset-0 isolate" style={mascara}>
        <div className="absolute inset-0" style={{ backgroundColor: cor }} />

        {camadas.length > 0 && (
          <svg viewBox={molde.viewBox} className="absolute inset-0 h-full w-full">
            {camadas.map((camada) => (
              <g
                key={camada.id}
                dangerouslySetInnerHTML={{
                  __html: instanciar(
                    forcarCor(camada.desenho[molde.lado]!, corDaCamada(camada)),
                    uid,
                  ),
                }}
              />
            ))}
          </svg>
        )}

        <img
          src={zona.imagem}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply"
        />
      </div>
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
                __html: instanciar(
                  forcarCor(camada.desenho[molde.lado]!, corDaCamada(camada)),
                  uid,
                ),
              }}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

/**
 * Dá ids ÚNICOS aos recortes (`clipPath`) da arte: a mesma arte monta no DOM
 * várias vezes ao mesmo tempo (palco, miniaturas, painéis escondidos em
 * mobile) e `url(#id)` resolve para o PRIMEIRO elemento com esse id — se esse
 * estiver num ramo `display:none`, o recorte falha e a arte escorre pela manga.
 * A arte escreve `__U__` onde quer o id único; aqui troca-se pelo uid desta zona.
 */
export function instanciar(svgInterno: string, uid: string): string {
  return svgInterno.split('__U__').join(uid);
}

/**
 * Reescreve as cores do desenho para a cor da camada.
 *
 * Os exports trazem o desenho com a cor explícita em cada elemento; sem
 * esta troca, herdar a cor do grupo não teria efeito. `none` é preservado
 * — é o que mantém os vazados e o que distingue arte de traço de arte de
 * preenchimento (os moldes do cliente usam ambas, ver converter-molde.py).
 */
export function forcarCor(svgInterno: string, cor: string): string {
  return svgInterno
    .replace(/fill="(?!none")[^"]*"/g, `fill="${cor}"`)
    .replace(/stroke="(?!none")[^"]*"/g, `stroke="${cor}"`)
    .replace(/fill:\s*(?!none)[^;"']+/g, `fill:${cor}`)
    .replace(/stroke:\s*(?!none)[^;"']+/g, `stroke:${cor}`);
}
