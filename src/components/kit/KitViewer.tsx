import { useMemo } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { estampaDemoPorId, estampasDemo, moldeDemo } from '@/lib/kitDemo';
import {
  LADOS_KIT,
  LADO_LABEL,
  PECA_LABEL,
  type Estampa,
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
      <span className="z-40 mb-2 rounded-full bg-black/60 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
        {LADO_LABEL[lado]}
      </span>

      {/* sobreposições negativas: o conjunto lê como uma peça só, vestida.
          Os tamanhos calibram a escala real entre os PNG: a bainha da
          camisola tem de assentar na cintura do calção. */}
      <div className="relative flex flex-col items-center">
        <Manequim lado={lado} />
        {/* calibração medida nos PNG: cintura do calção (1086/2000) tem de
            caber sob a bainha da camisola (690/2000 no slot de 270px) */}
        <PecaSlot peca="camisola" lado={lado} className="z-30 h-[270px] w-[270px]" />
        <PecaSlot peca="calcao" lado={lado} className="z-20 -mt-[71px] h-[168px] w-[168px]" />
        {/* as meias assentam nas canelas do jogador (tornozelos a ±20px do
            centro), por isso os slots sobrepõem-se — o desenho dentro deles
            é estreito e não chega a tocar-se */}
        <div className="z-10 -mt-[14px] flex -space-x-[86px]">
          <PecaSlot peca="meiao" lado={lado} className="h-[270px] w-[130px] -scale-x-100" />
          <PecaSlot peca="meiao" lado={lado} className="h-[270px] w-[130px]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Jogador-modelo por trás do conjunto: manequim de loja gerado por IA e
 * recortado (`/moldes/jogador-*.png`), como padrão de encaixe das peças.
 *
 * A âncora é a ALTURA: cabeça a espreitar acima da gola e pés sob os
 * meiões. Mudar os tamanhos dos slots em `ConjuntoLado` pede um reajuste
 * de `top`/`height` aqui.
 */
function Manequim({ lado }: { lado: LadoKit }) {
  return (
    <>
      <img
        src={`/moldes/jogador-${lado}.png`}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-[40px] left-1/2 z-0 h-[612px] max-w-none -translate-x-1/2 opacity-90"
      />
      {/* sombra no chão, já que a do estúdio foi recortada com o fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[576px] z-0 h-[16px] w-[190px] -translate-x-1/2 rounded-[50%] bg-black/15 blur-[6px]"
      />
    </>
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

/**
 * Controlos por peça: galeria de MINIATURAS dos temas (renderizadas pelo
 * próprio motor, para o utilizador ver o tema em vez de adivinhar pelo
 * nome) + cadeado de sincronização.
 */
export function ControlosPeca({ peca }: { peca: PecaKit }) {
  const config = useKitStore((s) => s.design.pecas[peca]);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);
  const setEstampa = useKitStore((s) => s.setEstampa);
  const toggleSincronizar = useKitStore((s) => s.toggleSincronizar);

  const estampa = estampaDemoPorId(peca, config.estampaId);
  const presa = sincronizadas.includes(peca);

  return (
    <div className="rounded-lg border bg-card px-2.5 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {PECA_LABEL[peca]}
        </p>
        <p className="min-w-0 flex-1 truncate text-right text-xs font-bold">
          {estampa.nome} · {estampa.codModelo}
        </p>
        <button
          onClick={() => toggleSincronizar(peca)}
          title={presa ? 'Sincronizada — clique para soltar' : 'Solta — clique para sincronizar'}
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-full border transition',
            presa ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {presa ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
        {estampasDemo(peca).map((e) => (
          <MiniaturaEstampa
            key={e.id}
            peca={peca}
            estampa={e}
            ativa={e.id === config.estampaId}
            onEscolher={() => setEstampa(peca, e.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Miniatura clicável de um tema — a peça de frente, nas cores por omissão. */
function MiniaturaEstampa({
  peca,
  estampa,
  ativa,
  onEscolher,
}: {
  peca: PecaKit;
  estampa: Estampa;
  ativa: boolean;
  onEscolher: () => void;
}) {
  const molde = useMemo(() => moldeDemo(peca, 'frente'), [peca]);
  const config = useMemo(
    () => ({ estampaId: estampa.id, coresZonas: {}, cores: {} }),
    [estampa.id],
  );

  return (
    <button
      onClick={onEscolher}
      title={`${estampa.nome} · ${estampa.codModelo}`}
      className={cn(
        'flex shrink-0 flex-col items-center gap-0.5 rounded-md border p-1 transition',
        ativa ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent',
      )}
    >
      <div className="grid h-14 w-12 place-items-center rounded bg-gradient-to-b from-[#e6eaef] to-[#cdd4dc]">
        <PecaMockup molde={molde} estampa={estampa} config={config} className="h-12 w-10" />
      </div>
      <span className="max-w-[52px] truncate text-[9px] leading-tight text-muted-foreground">
        {estampa.nome}
      </span>
    </button>
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
