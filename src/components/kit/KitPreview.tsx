import { estampaDemoPorId, moldeDemo } from '@/lib/kitDemo';
import { PECAS_KIT, type KitDesign, type LadoKit } from '@/types/kit';
import { cn } from '@/lib/utils';
import { PecaMockup } from './PecaMockup';
import { CamadaAplicacoes } from './CamadaAplicacoes';

/**
 * Pré-visualização de um conjunto GUARDADO (carrinho e checkout).
 *
 * Renderiza a partir de um `KitDesign` passado, em vez de ler o estado do
 * simulador — é o que permite mostrar no carrinho o conjunto tal como foi
 * adicionado, mesmo que o utilizador continue a mexer no simulador a seguir.
 *
 * Usa o mesmo motor do visualizador, por isso a miniatura é sempre fiel:
 * nada é rasterizado nem guardado como imagem.
 */
export function KitPreview({
  design,
  lado,
  className,
}: {
  design: KitDesign;
  lado: LadoKit;
  className?: string;
}) {
  return (
    <div className={cn('relative aspect-[380/615]', className)}>
      {/* o mesmo empilhamento do simulador: o avatar do designer por baixo,
          as peças recoloridas por cima ao pixel, as chuteiras entre o meião
          e o calção. Sem ele a miniatura eram peças a flutuar, que não é o
          que o cliente aprovou no ecrã anterior. */}
      <img
        src={`/moldes/jog/jogador-${lado}.png`}
        alt=""
        aria-hidden
        className="absolute inset-0 z-0 h-full w-full object-contain"
      />
      {PECAS_KIT.map((peca, i) => {
        const config = design.pecas[peca];
        if (!config) return null;
        const molde = moldeDemo(peca, lado);
        return (
          <PecaMockup
            key={peca}
            molde={molde}
            estampa={estampaDemoPorId(peca, config.estampaId)}
            config={config}
            className="absolute inset-0"
            style={{ zIndex: 30 - i * 10 }}
          >
            <CamadaAplicacoes
              aplicacoes={design.aplicacoes ?? []}
              peca={peca}
              lado={lado}
              viewBox={molde.viewBox}
              mascara={molde.zonas.find((z) => z.recebeEstampa)?.imagem}
            />
          </PecaMockup>
        );
      })}
      <img
        src={`/moldes/jog/botas-${lado}.png`}
        alt=""
        aria-hidden
        className="absolute inset-0 z-[15] h-full w-full object-contain"
      />
    </div>
  );
}
