import { useLayoutEffect, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { estampaDemoPorId, estampasDemo, moldeDemo } from '@/lib/kitDemo';
import {
  LADOS_KIT,
  LADO_LABEL,
  PECAS_KIT,
  PECA_LABEL,
  type Estampa,
  type LadoKit,
  type PecaConfig,
  type PecaKit,
} from '@/types/kit';
import { cn } from '@/lib/utils';
import { PecaMockup } from './PecaMockup';
import { AMOSTRAS } from '@/lib/kitCaixas';
import { CamadaAplicacoes } from './CamadaAplicacoes';
import { SeletorCor } from './SeletorCor';

/**
 * Visualizador do conjunto: frente e verso lado a lado, vestidos no
 * jogador do mockup do designer.
 */
/* O par frente+verso à escala natural (wrapper 380 px × 2 + intervalo).
   O avatar novo é mais largo e o par já não cabe em todos os ecrãs — o
   visualizador ENCOLHE O PAR COMO UM TODO para caber, em vez de deixar as
   colunas transbordar. Nunca amplia: acima de 1 os PNG só perderiam nitidez. */
const LARGURA_PAR = 380 * 2 + 24;
const ALTURA_PAR = 615 + 30;
/* Em ecrã ESTREITO (telemóvel) o par encolhido ficava ilegível: abaixo
   desta largura o visualizador mostra UM lado de cada vez, grande, com o
   alternador Frente/Verso em pílula — como no concorrente. */
const LARGURA_UM = 380;
const LIMIAR_MOVEL = 560;

export function KitViewer({ fundo }: { fundo?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [movel, setMovel] = useState(false);
  const [ladoMovel, setLadoMovel] = useState<LadoKit>('frente');

  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ajustar = () => {
      const w = el.clientWidth;
      const um = w < LIMIAR_MOVEL;
      setMovel(um);
      setEscala(Math.min(1, (w - (um ? 24 : 32)) / (um ? LARGURA_UM : LARGURA_PAR)));
    };
    const ro = new ResizeObserver(ajustar);
    ro.observe(el);
    ajustar();
    return () => ro.disconnect();
  }, []);

  const largura = movel ? LARGURA_UM : LARGURA_PAR;
  const altura = movel ? 615 : ALTURA_PAR;

  return (
    <div
      ref={caixa}
      className="relative flex h-full min-h-[560px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#dfe4ea] to-[#b9c2cc] md:min-h-[660px] dark:from-[#1b1a19] dark:to-[#100f0f]"
    >
      {fundo && (
        <>
          <img
            src={fundo}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* véu mínimo: separa o conjunto do fundo sem lavar a foto — a
              15% o céu noturno do estádio ficava cinzento. No tema escuro
              inverte-se: em vez de clarear, escurece. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-white/5 dark:bg-black/25"
          />
        </>
      )}

      {/* alternador de lado, só no modo de um lado (telemóvel) */}
      {movel && (
        <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 rounded-full bg-black/60 p-1 backdrop-blur">
          {LADOS_KIT.map((lado) => (
            <button
              key={lado}
              onClick={() => setLadoMovel(lado)}
              className={cn(
                'rounded-full px-4 py-1 text-[11px] font-bold uppercase tracking-widest transition',
                ladoMovel === lado ? 'bg-white text-black' : 'text-white/80',
              )}
            >
              {LADO_LABEL[lado]}
            </button>
          ))}
        </div>
      )}

      {/* a caixa exterior reserva o tamanho JÁ escalado; a interior fica ao
          tamanho natural e encolhe por transform — os slots absolutos das
          peças nunca mudam de geometria */}
      <div
        className="relative"
        style={{ width: largura * escala, height: altura * escala }}
      >
        <div
          className="flex items-start justify-center gap-6"
          style={{
            width: largura,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
          }}
        >
          {(movel ? [ladoMovel] : LADOS_KIT).map((lado) => (
            <ConjuntoLado key={lado} lado={lado} rotulo={!movel} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Um lado completo do conjunto (camisola + calção + meião empilhados). */
function ConjuntoLado({ lado, rotulo = true }: { lado: LadoKit; rotulo?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {/* no modo de um lado o alternador já diz o lado — a etiqueta sai */}
      {rotulo && (
        <span className="z-40 mb-2 rounded-full bg-black/60 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          {LADO_LABEL[lado]}
        </span>
      )}

      {/* As peças partilham uma tela comum que mapeia a coluna inteira
          (ver scripts/montar-dino2.py): o layout está cosido nos PNG, por
          isso os slots são todos idênticos, sem margens mágicas. */}
      <div className="relative h-[615px] w-[380px]">
        {/* mockup do designer: o avatar já vestido é o fundo. As peças
            recoloridas assentam-lhe por cima ao pixel (mesma prancheta),
            por isso não há folgas onde o kit do avatar espreite. */}
        <img
          src={`/moldes/jog/jogador-${lado}.png`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain"
        />
        <PecaSlot peca="camisola" lado={lado} className="absolute inset-0 z-30" />
        <PecaSlot peca="calcao" lado={lado} className="absolute inset-0 z-20" />
        <PecaSlot peca="meiao" lado={lado} className="absolute inset-0 z-10" />
        {/* chuteiras: camada estática, não recolorem */}
        <img
          src={`/moldes/jog/botas-${lado}.png`}
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
 * topo e grelha de QUADRADOS com o desenho do tema flat (não em forma de
 * peça). Com o cadeado fechado, escolher aqui muda as três peças.
 */
export function GaleriaEstampas() {
  const [peca, setPeca] = useState<PecaKit>('camisola');
  const config = useKitStore((s) => s.design.pecas[peca]);
  const setEstampa = useKitStore((s) => s.setEstampa);

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
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {estampasDemo(peca).map((e) => (
          <MiniaturaEstampa
            key={e.id}
            estampa={e}
            peca={peca}
            ativa={e.id === config.estampaId}
            onEscolher={() => setEstampa(peca, e.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Miniatura da galeria: a PEÇA VESTIDA com o tema nas cores por omissão —
 * como na referência, um ícone da camisola/calção/meião e não um quadrado
 * de padrão flat. É o mesmo motor do visualizador, recortado à janela da
 * peça (AMOSTRAS): a miniatura nunca mente sobre o resultado.
 *
 * Por baixo vai o CÓDIGO, não o nome: com o catálogo a crescer, "Cod. 044"
 * é o que a produção e o cliente trocam ao telefone. O nome fica no title.
 */
function MiniaturaEstampa({
  estampa,
  peca,
  ativa,
  onEscolher,
}: {
  estampa: Estampa;
  peca: PecaKit;
  ativa: boolean;
  onEscolher: () => void;
}) {
  const molde = moldeDemo(peca, 'frente');
  const [ax, ay, aw, ah] = (estampa.amostraViewBox ?? AMOSTRAS[peca])
    .split(' ')
    .map(Number);
  const [, , telaW, telaH] = molde.viewBox.split(' ').map(Number);

  // a config por omissão do tema: é o que a galeria promete que a peça
  // fica se for escolhida sem mexer em nada
  const config: PecaConfig = {
    estampaId: estampa.id,
    coresZonas: { corpo: estampa.corBasePadrao },
    cores: {},
  };

  return (
    <button
      onClick={onEscolher}
      title={`${estampa.nome} · Cod. ${estampa.codModelo}`}
      className="group flex flex-col items-center gap-1"
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-md border-2 bg-gradient-to-b from-[#f2f4f6] to-[#dde2e8] transition dark:from-[#26262a] dark:to-[#1a1a1d]',
          ativa
            ? 'border-primary ring-2 ring-primary/40'
            : 'border-border group-hover:border-foreground/40',
        )}
        style={{ aspectRatio: `${aw} / ${ah}` }}
      >
        {/* a tela inteira, escalada e deslocada para a janela da peça
            encher a miniatura — o recorte é do contentor, não das camadas */}
        <div
          className="absolute"
          style={{
            width: `${(telaW / aw) * 100}%`,
            height: `${(telaH / ah) * 100}%`,
            left: `${(-ax / aw) * 100}%`,
            top: `${(-ay / ah) * 100}%`,
          }}
        >
          <PecaMockup
            molde={molde}
            estampa={estampa}
            config={config}
            className="h-full w-full"
          />
        </div>
      </div>
      <span
        className={cn(
          'w-full truncate rounded-md px-1 py-0.5 text-center text-[11px] font-bold leading-tight',
          ativa ? 'bg-foreground text-background' : 'bg-muted text-foreground',
        )}
      >
        Cod. {estampa.codModelo}
      </span>
    </button>
  );
}

/**
 * O CADEADO — um só, no topo das cores.
 *
 * Fechado, tudo o que se mexe numa peça mexe nas três: cor base, cor de
 * camada e escolha de estampa. Aberto, cada peça anda por si. Havia antes
 * dois cadeados a decidir isto (um por peça, escondido na galeria, e um por
 * camada em cada quadrado) — e as cores base seguiam o primeiro sem que
 * nada no painel o mostrasse.
 */
export function CadeadoConjunto() {
  const sincronizado = useKitStore((s) => s.design.sincronizado);
  const toggle = useKitStore((s) => s.toggleSincronizar);

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition',
        sincronizado
          ? 'border-primary bg-primary/10 text-primary'
          : 'bg-card text-muted-foreground hover:bg-accent',
      )}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-md',
          sincronizado ? 'bg-primary text-primary-foreground' : 'border bg-background',
        )}
      >
        {sincronizado ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold leading-tight">
          {sincronizado ? 'Peças sincronizadas' : 'Peças independentes'}
        </span>
        <span className="block text-[11px] leading-tight opacity-80">
          {sincronizado
            ? 'Cores e estampa acompanham nas três'
            : 'Cada peça muda sozinha'}
        </span>
      </span>
    </button>
  );
}

/** Painel de cores: zonas da peça + uma entrada por camada da estampa. */
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
        {estampa.camadas.map((camada) => (
          <Swatch
            key={camada.id}
            label={camada.nome}
            /* o crachá repete a letra do rótulo: é o que distingue, de
               relance, uma camada da estampa de uma zona da peça */
            marca={camada.nome.replace('Camada ', '')}
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
  marca,
  onChange,
}: {
  label: string;
  cor: string;
  /** Letra da camada. As zonas da peça não a têm — é o que as separa. */
  marca?: string;
  onChange: (cor: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="relative">
        <SeletorCor cor={cor} onChange={onChange} title={label} className="h-10 w-10" />
        {marca && (
          <span className="pointer-events-none absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-foreground px-1 text-[9px] font-bold text-background">
            {marca}
          </span>
        )}
      </span>
      <span className="max-w-[72px] truncate text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
