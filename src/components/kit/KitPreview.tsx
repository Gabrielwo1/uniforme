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
    <div className={cn('relative aspect-[270/615]', className)}>
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
    </div>
  );
}
