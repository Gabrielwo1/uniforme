import { useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { VARIANTE_JOGADOR, estampaDemoPorId, estampasDemo, moldeDemo } from '@/lib/kitDemo';
import {
  LADOS_KIT,
  LADO_LABEL,
  PECAS_KIT,
  PECA_LABEL,
  type Estampa,
  type LadoKit,
  type PecaKit,
} from '@/types/kit';
import { cn } from '@/lib/utils';
import { PecaMockup, forcarCor } from './PecaMockup';
import { CamadaAplicacoes } from './CamadaAplicacoes';

/**
 * Visualizador do conjunto: frente e verso lado a lado, com as três peças
 * FLUTUANTES empilhadas ao alto — a estética do simulador de referência,
 * sem corpo por trás.
 *
 * O cadeado prende/solta a peça da sincronização (ver `useKitStore.alvos`).
 */
export function KitViewer({ fundo }: { fundo?: string }) {
  return (
    <div className="relative flex h-full min-h-[660px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#dfe4ea] to-[#b9c2cc]">
      {fundo && (
        <>
          <img
            src={fundo}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* véu suave para o conjunto continuar a mandar sobre o fundo */}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-white/15" />
        </>
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

      {/* As peças partilham uma tela comum que mapeia a coluna inteira
          (ver scripts/vestir-conjunto.py): o layout está cosido nos PNG,
          por isso os slots são todos idênticos, sem margens mágicas. */}
      <div className="relative h-[615px] w-[270px]">
        {VARIANTE_JOGADOR && (
          /* mockup do designer: o avatar já vestido é o fundo. As peças
             recoloridas assentam-lhe por cima ao pixel (mesma prancheta),
             por isso não há folgas onde o kit do avatar espreite. */
          <img
            src={`/moldes/jog/jogador-${lado}.png`}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
          />
        )}
        <PecaSlot peca="camisola" lado={lado} className="absolute inset-0 z-30" />
        <PecaSlot peca="calcao" lado={lado} className="absolute inset-0 z-20" />
        <PecaSlot peca="meiao" lado={lado} className="absolute inset-0 z-10" />
        {/* chuteiras: camada estática, não recolorem */}
        <img
          src={VARIANTE_JOGADOR ? `/moldes/jog/botas-${lado}.png` : `/moldes/botas-${lado}.png`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[15] h-full w-full object-contain"
        />
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
  const aplicacoes = useKitStore((s) => s.design.aplicacoes);
  const localEmFoco = useKitStore((s) => s.localEmFoco);
  const estampa = estampaDemoPorId(peca, config.estampaId);
  const molde = moldeDemo(peca, lado);

  return (
    <PecaMockup
      molde={molde}
      estampa={estampa}
      config={config}
      className={cn('drop-shadow-lg', className)}
    >
      <CamadaAplicacoes
        aplicacoes={aplicacoes ?? []}
        peca={peca}
        lado={lado}
        viewBox={molde.viewBox}
        mascara={molde.zonas.find((z) => z.recebeEstampa)?.imagem}
        destaque={localEmFoco}
      />
    </PecaMockup>
  );
}

/**
 * Galeria de estampas à maneira da referência: separadores por peça no
 * topo, grelha de QUADRADOS que mostram o desenho do tema flat (não em
 * forma de peça), com o "Cod. Modelo" por baixo, e o cadeado de
 * sincronização da peça ativa.
 */
export function GaleriaEstampas() {
  const [peca, setPeca] = useState<PecaKit>('camisola');
  const config = useKitStore((s) => s.design.pecas[peca]);
  const sincronizadas = useKitStore((s) => s.design.sincronizadas);
  const setEstampa = useKitStore((s) => s.setEstampa);
  const toggleSincronizar = useKitStore((s) => s.toggleSincronizar);
  const presa = sincronizadas.includes(peca);

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center gap-1 border-b p-1.5">
        {PECAS_KIT.map((p) => (
          <button
            key={p}
            onClick={() => setPeca(p)}
            className={cn(
              'flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition',
              p === peca
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {PECA_LABEL[p]}
          </button>
        ))}
        <button
          onClick={() => toggleSincronizar(peca)}
          title={presa ? 'Sincronizada — clique para soltar' : 'Solta — clique para sincronizar'}
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-md border transition',
            presa ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent',
          )}
        >
          {presa ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {estampasDemo(peca).map((e) => (
          <QuadradoEstampa
            key={e.id}
            estampa={e}
            ativa={e.id === config.estampaId}
            onEscolher={() => setEstampa(peca, e.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Quadrado da galeria: o desenho do tema nas cores por omissão. */
function QuadradoEstampa({
  estampa,
  ativa,
  onEscolher,
}: {
  estampa: Estampa;
  ativa: boolean;
  onEscolher: () => void;
}) {
  return (
    <button onClick={onEscolher} title={estampa.nome} className="group flex flex-col items-center gap-1">
      <div
        className={cn(
          'aspect-square w-full overflow-hidden rounded-md border-2 transition',
          ativa ? 'border-primary ring-2 ring-primary/40' : 'border-border group-hover:border-foreground/40',
        )}
        style={{ backgroundColor: estampa.corBasePadrao }}
      >
        {estampa.camadas.length > 0 && (
          <svg
            viewBox={estampa.amostraViewBox ?? '0 0 1080 2460'}
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full"
          >
            {estampa.camadas.map((c) => (
              <g
                key={c.id}
                dangerouslySetInnerHTML={{
                  __html: forcarCor(c.desenho.frente ?? '', c.corPadrao),
                }}
              />
            ))}
          </svg>
        )}
      </div>
      <span
        className={cn(
          'w-full truncate rounded-md px-1.5 py-0.5 text-center text-xs font-bold leading-tight',
          ativa ? 'bg-foreground text-background' : 'bg-muted text-foreground',
        )}
        title={`Cod. ${estampa.codModelo}`}
      >
        {estampa.nome}
      </span>
    </button>
  );
}

/** Painel de cores: zonas da peça + uma entrada por camada da estampa. */
export function PainelCores({ peca }: { peca: PecaKit }) {
  const config = useKitStore((s) => s.design.pecas[peca]);
  const setCorZona = useKitStore((s) => s.setCorZona);
  const setCorCamada = useKitStore((s) => s.setCorCamada);
  const camadasSoltas = useKitStore((s) => s.camadasSoltas);
  const toggleCamadaPresa = useKitStore((s) => s.toggleCamadaPresa);
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
            presa={!camadasSoltas.includes(camada.id)}
            onTogglePresa={() => toggleCamadaPresa(camada.id)}
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
  presa,
  onTogglePresa,
}: {
  label: string;
  cor: string;
  numero?: number;
  onChange: (cor: string) => void;
  /** Só nas camadas da estampa: repete a cor nas outras peças. */
  presa?: boolean;
  onTogglePresa?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
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
        {onTogglePresa && (
          <button
            onClick={onTogglePresa}
            title={
              presa
                ? 'A cor repete-se nas outras peças — clique para soltar'
                : 'Cor só desta peça — clique para repetir nas outras'
            }
            className={cn(
              'absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full border transition',
              presa
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {presa ? <Lock className="h-2.5 w-2.5" /> : <LockOpen className="h-2.5 w-2.5" />}
          </button>
        )}
      </span>
      <span className="max-w-[72px] truncate text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
