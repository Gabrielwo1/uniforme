import { useState } from 'react';
import { Check } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import type { Aplicacao } from '@/types/kit';
import { cn } from '@/lib/utils';
import { CalcaoIcone, CamisolaIcone, MarcaTexto } from './IconesPeca';
import { SeletorCor } from './SeletorCor';

/**
 * Painel de NOME e NÚMERO — DOIS CARTÕES, Frente e Costas, com todas as
 * opções À VISTA desde o início (pedido do cliente, 2026-09-04). O
 * cliente só muda CORES: o texto é a mostra fixa "NOME"/"10" e a letra é
 * a da casa — nomes, números e tipos reais combinam-se no orçamento.
 *
 *   FRENTE: número no peito, esquerda/centro/direita (clicar no ativo
 *   desliga) + cores.
 *   COSTAS: só número, ou nome por cima/por baixo do número (idem) +
 *   cores de nome e número.
 *   Calção: número numa das coxas + cores.
 */

const LOCAIS_NOME = ['nome-costas', 'costas-baixo'];
const LOCAIS_NUM_FRENTE = ['peito-esq', 'peito-centro', 'peito-dir'];
const LOCAIS_NUM_CALCAO = ['coxa-esq', 'coxa-dir'];

export function PainelNomeNumero() {
  const [peca, setPeca] = useState<'camisola' | 'calcao'>('camisola');
  const aplicacoes = useKitStore((s) => s.design.aplicacoes) ?? [];
  const addAplicacao = useKitStore((s) => s.addAplicacao);
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  const removerAplicacao = useKitStore((s) => s.removerAplicacao);
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);

  const nome = aplicacoes.find((a) => a.tipo === 'texto' && LOCAIS_NOME.includes(a.localId));
  const numVerso = aplicacoes.find((a) => a.tipo === 'numero' && a.localId === 'numero-costas');
  const numFrente = aplicacoes.find(
    (a) => a.tipo === 'numero' && LOCAIS_NUM_FRENTE.includes(a.localId),
  );
  const numCalcao = aplicacoes.find(
    (a) => a.tipo === 'numero' && LOCAIS_NUM_CALCAO.includes(a.localId),
  );

  /** Clicar numa posição: ativa-a; na posição JÁ ativa: desliga. */
  const escolher = (atual: Aplicacao | undefined, localId: string) => {
    if (atual && atual.localId === localId) {
      removerAplicacao(atual.id);
      return;
    }
    if (atual) setAplicacao(atual.id, { localId });
    else addAplicacao('numero', localId);
    setLocalEmFoco(localId);
  };

  /** As COSTAS são um estado só: sem nada, só número, ou nome+número com
      o nome por cima ou por baixo. Clicar no ativo desliga tudo. */
  const estadoCostas = !numVerso && !nome ? null : nome ? nome.localId : 'so-numero';
  const setCostas = (opcao: 'so-numero' | 'nome-costas' | 'costas-baixo') => {
    if (opcao === estadoCostas) {
      if (nome) removerAplicacao(nome.id);
      if (numVerso) removerAplicacao(numVerso.id);
      return;
    }
    if (!numVerso) addAplicacao('numero', 'numero-costas');
    if (opcao === 'so-numero') {
      if (nome) removerAplicacao(nome.id);
    } else if (nome) {
      setAplicacao(nome.id, { localId: opcao });
    } else {
      addAplicacao('texto', opcao);
    }
    setLocalEmFoco('numero-costas');
  };

  return (
    <div className="space-y-3" onMouseLeave={() => setLocalEmFoco(null)}>
      {/* separador por peça, como o Jersey/Calção do concorrente */}
      <div className="grid grid-cols-2 rounded-lg border bg-card p-1">
        {(['camisola', 'calcao'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeca(p)}
            className={cn(
              'rounded-md py-1.5 text-xs font-bold transition',
              peca === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {p === 'camisola' ? 'Camisola' : 'Calção'}
          </button>
        ))}
      </div>

      {peca === 'camisola' ? (
        <>
          <Seccao titulo="Frente — número">
            <div className="flex flex-wrap gap-2">
              {LOCAIS_NUM_FRENTE.map((localId) => (
                <OpcaoSlot
                  key={localId}
                  ativa={numFrente?.localId === localId}
                  onClick={() => escolher(numFrente, localId)}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={{
                    'peito-esq': 'Peito esquerdo',
                    'peito-centro': 'Ao centro',
                    'peito-dir': 'Peito direito',
                  }[localId]}
                  legenda={{
                    'peito-esq': 'Esquerda',
                    'peito-centro': 'Centro',
                    'peito-dir': 'Direita',
                  }[localId]}
                >
                  <IconeCamisola
                    numero={{ 'peito-esq': 'esq', 'peito-centro': 'centro', 'peito-dir': 'dir' }[
                      localId
                    ] as 'esq' | 'centro' | 'dir'}
                  />
                </OpcaoSlot>
              ))}
            </div>
            <FilaCores
              pares={[
                { rotulo: 'Cor número', aplicacao: numFrente, campo: 'cor' },
                { rotulo: 'Cor borda', aplicacao: numFrente, campo: 'corContorno' },
              ]}
            />
          </Seccao>

          <Seccao titulo="Costas — nome e número">
            <div className="flex flex-wrap gap-2">
              <OpcaoSlot
                ativa={estadoCostas === 'so-numero'}
                onClick={() => setCostas('so-numero')}
                onFocoLocal={() => setLocalEmFoco('numero-costas')}
                titulo="Só o número"
                legenda="Só número"
              >
                <IconeCamisola verso numero="costas" />
              </OpcaoSlot>
              <OpcaoSlot
                ativa={estadoCostas === 'nome-costas'}
                onClick={() => setCostas('nome-costas')}
                onFocoLocal={() => setLocalEmFoco('nome-costas')}
                titulo="Nome por cima do número"
                legenda="Nome cima"
              >
                <IconeCamisola verso nome="cima" numero="costas" />
              </OpcaoSlot>
              <OpcaoSlot
                ativa={estadoCostas === 'costas-baixo'}
                onClick={() => setCostas('costas-baixo')}
                onFocoLocal={() => setLocalEmFoco('costas-baixo')}
                titulo="Nome por baixo do número"
                legenda="Nome baixo"
              >
                <IconeCamisola verso nome="baixo" numero="costas" />
              </OpcaoSlot>
            </div>
            <FilaCores
              pares={[
                { rotulo: 'Cor nome', aplicacao: nome, campo: 'cor' },
                { rotulo: 'Borda nome', aplicacao: nome, campo: 'corContorno' },
                { rotulo: 'Cor número', aplicacao: numVerso, campo: 'cor' },
                { rotulo: 'Borda número', aplicacao: numVerso, campo: 'corContorno' },
              ]}
            />
          </Seccao>
        </>
      ) : (
        <Seccao titulo="Número no calção">
          <div className="flex flex-wrap gap-2">
            {LOCAIS_NUM_CALCAO.map((localId) => (
              <OpcaoSlot
                key={localId}
                ativa={numCalcao?.localId === localId}
                onClick={() => escolher(numCalcao, localId)}
                onFocoLocal={() => setLocalEmFoco(localId)}
                titulo={localId === 'coxa-esq' ? 'Coxa esquerda' : 'Coxa direita'}
                legenda={localId === 'coxa-esq' ? 'Esquerda' : 'Direita'}
              >
                <IconeCalcao perna={localId === 'coxa-esq' ? 'esq' : 'dir'} />
              </OpcaoSlot>
            ))}
          </div>
          <FilaCores
            pares={[
              { rotulo: 'Cor número', aplicacao: numCalcao, campo: 'cor' },
              { rotulo: 'Cor borda', aplicacao: numCalcao, campo: 'corContorno' },
            ]}
          />
        </Seccao>
      )}
    </div>
  );
}

export function Seccao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 rounded-lg border bg-card p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}

/** Cartão-opção com a miniatura da configuração e o check do escolhido. */
export function OpcaoSlot({
  ativa,
  onClick,
  onFocoLocal,
  titulo,
  legenda,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  onFocoLocal: () => void;
  titulo?: string;
  /** Rótulo curto por baixo do ícone (ex.: "Frente"). */
  legenda?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onFocoLocal}
      onFocus={onFocoLocal}
      title={titulo}
      className={cn(
        'relative rounded-lg border-2 bg-background p-1.5 transition hover:border-muted-foreground/50',
        ativa ? 'border-primary' : 'border-border',
      )}
    >
      {children}
      {legenda && (
        <span
          className={cn(
            'block pb-0.5 text-center text-[10px] font-semibold',
            ativa ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {legenda}
        </span>
      )}
      {ativa && (
        <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/** Fila de cores do cartão — TODAS à vista: as de aplicações desligadas
    aparecem esbatidas e inertes (fantasma), em vez de sumirem. */
function FilaCores({
  pares,
}: {
  pares: Array<{ rotulo: string; aplicacao?: Aplicacao; campo: 'cor' | 'corContorno' }>;
}) {
  return (
    <div className="flex flex-wrap gap-4">
      {pares.map(({ rotulo, aplicacao, campo }) =>
        aplicacao ? (
          <CorCampo key={rotulo} rotulo={rotulo} aplicacao={aplicacao} campo={campo} />
        ) : (
          <div key={rotulo} className="flex flex-col items-center gap-1 opacity-35" aria-hidden>
            <span className="h-9 w-9 rounded-md border-2 border-border bg-muted" />
            <span className="text-[10px] text-muted-foreground">{rotulo}</span>
          </div>
        ),
      )}
    </div>
  );
}

/** Quadrado de cor com rótulo por baixo — a borda aceita "sem cor" (X). */
function CorCampo({
  rotulo,
  aplicacao: a,
  campo,
}: {
  rotulo: string;
  aplicacao: Aplicacao;
  campo: 'cor' | 'corContorno';
}) {
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  return (
    <div className="flex flex-col items-center gap-1">
      <SeletorCor
        cor={a[campo]}
        onChange={(cor) => setAplicacao(a.id, { [campo]: cor })}
        podeLimpar={campo === 'corContorno'}
        alinhar="esquerda"
        title={rotulo}
        className="h-9 w-9"
      />
      <span className="text-[10px] text-muted-foreground">{rotulo}</span>
    </div>
  );
}

/* ------------------------------------------- miniaturas da configuração -- */

/** Camisolinha de traço com o NOME/número desenhados onde a opção os põe. */
function IconeCamisola({
  verso = false,
  nome,
  numero,
}: {
  verso?: boolean;
  nome?: 'cima' | 'baixo';
  numero?: 'costas' | 'esq' | 'centro' | 'dir';
}) {
  return (
    <CamisolaIcone verso={verso}>
      {nome === 'cima' && <MarcaTexto x={30} y={26} corpo="NOME" tamanho={6} />}
      {nome === 'baixo' && <MarcaTexto x={30} y={48} corpo="NOME" tamanho={6} />}
      {numero === 'costas' && (
        <MarcaTexto x={30} y={nome === 'baixo' ? 39 : 41} corpo="10" tamanho={13} />
      )}
      {/* esq/dir afastados da borda: o corpo da camisolinha vai de x≈18
          a 42 e o "10" a 21/39 tocava a costura */}
      {numero === 'esq' && <MarcaTexto x={24} y={30} corpo="10" tamanho={8} />}
      {numero === 'centro' && <MarcaTexto x={30} y={34} corpo="10" tamanho={11} />}
      {numero === 'dir' && <MarcaTexto x={36} y={30} corpo="10" tamanho={8} />}
    </CamisolaIcone>
  );
}

/** Calçãozinho com o número na coxa escolhida. */
function IconeCalcao({ perna }: { perna: 'esq' | 'dir' }) {
  return (
    <CalcaoIcone>
      <MarcaTexto x={perna === 'esq' ? 20 : 40} y={38} corpo="10" tamanho={9} />
    </CalcaoIcone>
  );
}
