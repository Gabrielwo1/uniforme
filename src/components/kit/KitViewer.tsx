import { ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { estampaDemoPorId, moldeDemo } from '@/lib/kitDemo';
import {
  LADOS_KIT,
  LADO_LABEL,
  PECA_LABEL,
  type LadoKit,
  type PecaKit,
} from '@/types/kit';
import { cn } from '@/lib/utils';
import { PecaMockup } from './PecaMockup';

/**
 * Visualizador do conjunto: frente e verso lado a lado, com as três peças
 * empilhadas como um equipamento vestido, sobre a foto do jogador.
 *
 * Setas trocam a estampa da peça; o cadeado prende/solta a peça da
 * sincronização (ver `useKitStore.alvos`).
 */
export function KitViewer({ fundo }: { fundo?: string }) {
  return (
    <div className="relative flex h-full min-h-[660px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#dfe4ea] to-[#b9c2cc]">
      {fundo && (
        <img
          src={fundo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60"
        />
      )}

      <div className="relative flex items-start justify-center gap-6 p-6">
        {LADOS_KIT.map((lado) => (
          <ConjuntoLado key={lado} lado={lado} />
        ))}
      </div>
    </div>
  );
}

/** Um lado completo do conjunto (camisola + calção + meião empilhados). */
function ConjuntoLado({ lado }: { lado: LadoKit }) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-2 rounded-full bg-black/60 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        {LADO_LABEL[lado]}
      </span>

      {/* sobreposições negativas: o conjunto lê como uma peça só, vestida.
          Os tamanhos calibram a escala real entre os PNG: a bainha da
          camisola tem de assentar na cintura do calção. */}
      <PecaSlot peca="camisola" lado={lado} className="z-30 h-[270px] w-[270px]" />
      <PecaSlot peca="calcao" lado={lado} className="z-20 -mt-[79px] h-[194px] w-[194px]" />
      <div className="z-10 -mt-[26px] flex gap-7">
        <PecaSlot peca="meiao" lado={lado} className="h-[207px] w-[100px] -scale-x-100" />
        <PecaSlot peca="meiao" lado={lado} className="h-[207px] w-[100px]" />
      </div>
    </div>
  );
}

function PecaSlot({
  peca,
  lado,
  className,
}: {
  peca: PecaKit;
  lado: LadoKit;
  className?: string;
}) {
  const config = useKitStore((s) => s.design.pecas[peca]);
  const estampa = estampaDemoPorId(peca, config.estampaId);
  const molde = moldeDemo(peca, lado);

  return (
    <PecaMockup
      molde={molde}
      estampa={estampa}
      config={config}
      className={cn('drop-shadow-lg', className)}
    />
  );
}

/** Controlos por peça — setas de estampa + cadeado de sincronização. */
export function ControlosPeca({ peca }: { peca: PecaKit }) {
  const config = useKitStore((s) => s.design.pecas[peca]);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);
  const cicloEstampa = useKitStore((s) => s.cicloEstampa);
  const toggleSincronizar = useKitStore((s) => s.toggleSincronizar);

  const estampa = estampaDemoPorId(peca, config.estampaId);
  const presa = sincronizadas.includes(peca);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 shadow-sm">
      <button
        onClick={() => cicloEstampa(peca, -1)}
        title="Estampa anterior"
        className="grid h-7 w-7 place-items-center rounded-full border transition hover:bg-accent"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {PECA_LABEL[peca]}
        </p>
        <p className="truncate text-xs font-bold">
          {estampa.nome} · {estampa.codModelo}
        </p>
      </div>

      <button
        onClick={() => cicloEstampa(peca, 1)}
        title="Estampa seguinte"
        className="grid h-7 w-7 place-items-center rounded-full border transition hover:bg-accent"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <button
        onClick={() => toggleSincronizar(peca)}
        title={presa ? 'Sincronizada — clique para soltar' : 'Solta — clique para sincronizar'}
        className={cn(
          'grid h-7 w-7 place-items-center rounded-full border transition',
          presa ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent',
        )}
      >
        {presa ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/** Painel de cores: cor base + uma entrada por camada da estampa. */
export function PainelCores({ peca }: { peca: PecaKit }) {
  const config = useKitStore((s) => s.design.pecas[peca]);
  const setCorZona = useKitStore((s) => s.setCorZona);
  const setCorCamada = useKitStore((s) => s.setCorCamada);
  const estampa = estampaDemoPorId(peca, config.estampaId);

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Cores {PECA_LABEL[peca]}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-3">
        {moldeDemo(peca, 'frente').zonas.map((zona) => (
          <Swatch
            key={zona.id}
            label={zona.nome}
            cor={config.coresZonas[zona.id] ?? zona.corPadrao}
            onChange={(cor) => setCorZona(peca, zona.id, cor)}
          />
        ))}
        {estampa.camadas.map((camada, i) => (
          <Swatch
            key={camada.id}
            label={camada.nome}
            numero={i + 1}
            cor={config.cores[camada.id] ?? camada.corPadrao}
            onChange={(cor) => setCorCamada(peca, camada.id, cor)}
          />
        ))}
      </div>
    </div>
  );
}

function Swatch({
  label,
  cor,
  numero,
  onChange,
}: {
  label: string;
  cor: string;
  numero?: number;
  onChange: (cor: string) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1">
      <span className="relative">
        <input
          type="color"
          value={cor}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border-2 border-border bg-transparent p-0"
          title={label}
        />
        {numero !== undefined && (
          <span className="pointer-events-none absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-[9px] font-bold text-background">
            {numero}
          </span>
        )}
      </span>
      <span className="max-w-[72px] truncate text-[10px] text-muted-foreground">{label}</span>
    </label>
  );
}
