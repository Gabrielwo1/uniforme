import { useState } from 'react';
import { Check } from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { FONTES } from '@/lib/kitLocais';
import type { Aplicacao } from '@/types/kit';
import { cn } from '@/lib/utils';
import { CalcaoIcone, CamisolaIcone, MarcaTexto } from './IconesPeca';
import { SeletorCor } from './SeletorCor';

/**
 * Painel de NOME e NÚMERO, LIMITADO ao formato do concorrente (pedido do
 * cliente, 2026-09-01): nada de lista livre de aplicações — cada peça tem
 * os seus slots fixos, escolhidos por ÍCONES-miniatura que mostram a
 * configuração (camisola com NOME/10 no sítio), com o check no escolhido.
 *
 *   Camisola: nome nas costas (em cima OU em baixo do número), número nas
 *   costas e, opcionalmente, número na frente (esquerda/centro/direita).
 *   Calção: número numa das coxas.
 *
 * Por baixo, "Personalizar": texto, letra, tamanho e cores (com a borda a
 * aceitar "sem cor" — o X do concorrente). Os slots continuam a ser
 * aplicações normais do design; só o painel é que ficou fechado.
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
  const numeros = [numVerso, numFrente, numCalcao].filter(Boolean) as Aplicacao[];
  const numeroTexto = numeros[0]?.texto ?? '10';

  /** O número é UM: escrever num sítio escreve em todos os slots. */
  const setNumero = (texto: string) => {
    const limpo = texto.replace(/\D/g, '').slice(0, 3);
    for (const a of numeros) setAplicacao(a.id, { texto: limpo });
  };

  const criarNumero = (localId: string) => {
    const nova = addAplicacao('numero', localId);
    setAplicacao(nova.id, { texto: numeroTexto });
    setLocalEmFoco(localId);
  };

  const alternar = (atual: Aplicacao | undefined, localId: string, tipo: 'texto' | 'numero') => {
    if (atual && atual.localId === localId) {
      removerAplicacao(atual.id);
    } else if (atual) {
      setAplicacao(atual.id, { localId });
      setLocalEmFoco(localId);
    } else if (tipo === 'numero') {
      criarNumero(localId);
    } else {
      addAplicacao('texto', localId);
      setLocalEmFoco(localId);
    }
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
          <Seccao titulo="Nome (costas)">
            <div className="flex flex-wrap gap-2">
              {LOCAIS_NOME.map((localId) => (
                <OpcaoSlot
                  key={localId}
                  ativa={nome?.localId === localId}
                  onClick={() => alternar(nome, localId, 'texto')}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={localId === 'nome-costas' ? 'Nome por cima' : 'Nome por baixo'}
                >
                  <IconeCamisola
                    verso
                    nome={localId === 'nome-costas' ? 'cima' : 'baixo'}
                    numero="costas"
                  />
                </OpcaoSlot>
              ))}
            </div>
          </Seccao>

          <Seccao titulo="Número">
            <div className="flex flex-wrap gap-2">
              <OpcaoSlot
                ativa={!!numVerso}
                onClick={() => alternar(numVerso, 'numero-costas', 'numero')}
                onFocoLocal={() => setLocalEmFoco('numero-costas')}
                titulo="Número nas costas"
              >
                <IconeCamisola verso numero="costas" />
              </OpcaoSlot>
              {LOCAIS_NUM_FRENTE.map((localId) => (
                <OpcaoSlot
                  key={localId}
                  ativa={numFrente?.localId === localId}
                  onClick={() => alternar(numFrente, localId, 'numero')}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={{
                    'peito-esq': 'Número no peito esquerdo',
                    'peito-centro': 'Número ao centro',
                    'peito-dir': 'Número no peito direito',
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
          </Seccao>

          {nome && (
            <Seccao titulo="Personalizar nome">
              <input
                value={nome.texto ?? ''}
                onChange={(e) =>
                  setAplicacao(nome.id, { texto: e.target.value.toUpperCase().slice(0, 20) })
                }
                placeholder="JOGADOR"
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm font-bold tracking-wide outline-none focus:border-foreground"
              />
              <LinhaLetraTamanho aplicacao={nome} />
              <div className="flex gap-4">
                <CorCampo rotulo="Cor nome" aplicacao={nome} campo="cor" />
                <CorCampo rotulo="Cor borda" aplicacao={nome} campo="corContorno" />
              </div>
            </Seccao>
          )}

          {numeros.length > 0 && (
            <Seccao titulo="Personalizar número">
              <input
                value={numeroTexto}
                onChange={(e) => setNumero(e.target.value)}
                inputMode="numeric"
                placeholder="10"
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm font-bold tracking-wide outline-none focus:border-foreground"
              />
              {numVerso && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Costas
                  </p>
                  <LinhaLetraTamanho aplicacao={numVerso} />
                  <div className="flex gap-4">
                    <CorCampo rotulo="Cor núm. costas" aplicacao={numVerso} campo="cor" />
                    <CorCampo rotulo="Cor borda" aplicacao={numVerso} campo="corContorno" />
                  </div>
                </>
              )}
              {numFrente && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Frente
                  </p>
                  <LinhaLetraTamanho aplicacao={numFrente} />
                  <div className="flex gap-4">
                    <CorCampo rotulo="Cor núm. frente" aplicacao={numFrente} campo="cor" />
                    <CorCampo rotulo="Cor borda" aplicacao={numFrente} campo="corContorno" />
                  </div>
                </>
              )}
            </Seccao>
          )}
        </>
      ) : (
        <>
          <Seccao titulo="Número no calção">
            <div className="flex flex-wrap gap-2">
              {LOCAIS_NUM_CALCAO.map((localId) => (
                <OpcaoSlot
                  key={localId}
                  ativa={numCalcao?.localId === localId}
                  onClick={() => alternar(numCalcao, localId, 'numero')}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={localId === 'coxa-esq' ? 'Coxa esquerda' : 'Coxa direita'}
                >
                  <IconeCalcao perna={localId === 'coxa-esq' ? 'esq' : 'dir'} />
                </OpcaoSlot>
              ))}
            </div>
          </Seccao>

          {numCalcao && (
            <Seccao titulo="Personalizar número">
              <input
                value={numeroTexto}
                onChange={(e) => setNumero(e.target.value)}
                inputMode="numeric"
                placeholder="10"
                className="h-9 w-full rounded-md border bg-background px-2.5 text-sm font-bold tracking-wide outline-none focus:border-foreground"
              />
              <LinhaLetraTamanho aplicacao={numCalcao} />
              <div className="flex gap-4">
                <CorCampo rotulo="Cor número" aplicacao={numCalcao} campo="cor" />
                <CorCampo rotulo="Cor borda" aplicacao={numCalcao} campo="corContorno" />
              </div>
            </Seccao>
          )}
        </>
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
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  onFocoLocal: () => void;
  titulo?: string;
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
      {ativa && (
        <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

/** Letra + tamanho (%) de uma aplicação, numa linha. */
function LinhaLetraTamanho({ aplicacao: a }: { aplicacao: Aplicacao }) {
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  return (
    <div className="flex gap-2">
      <select
        value={a.fonteId}
        onChange={(e) => setAplicacao(a.id, { fonteId: e.target.value })}
        className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-xs outline-none focus:border-foreground"
      >
        {FONTES.map((f) => (
          <option key={f.id} value={f.id} style={{ fontFamily: f.css }}>
            {f.nome}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={50}
        max={150}
        step={5}
        value={Math.round(a.escala * 100)}
        onChange={(e) => {
          const n = Number(e.target.value) || 100;
          setAplicacao(a.id, { escala: Math.min(1.5, Math.max(0.5, n / 100)) });
        }}
        title="Tamanho (%)"
        className="h-8 w-16 rounded-md border bg-background px-1.5 text-center text-xs font-bold outline-none focus:border-foreground"
      />
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
      {numero === 'esq' && <MarcaTexto x={21} y={30} corpo="10" tamanho={9} />}
      {numero === 'centro' && <MarcaTexto x={30} y={34} corpo="10" tamanho={11} />}
      {numero === 'dir' && <MarcaTexto x={39} y={30} corpo="10" tamanho={9} />}
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
