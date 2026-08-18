import { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useKitStore } from '@/store/useKitStore';
import { FONTES, fontePorId, locaisPara, localPorId } from '@/lib/kitLocais';
import {
  LADO_LABEL,
  PECA_LABEL,
  TIPO_APLICACAO_LABEL,
  type Aplicacao,
  type TipoAplicacao,
} from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

/**
 * Painel de NOME/NÚMERO e de ESCUDO/LOGOS.
 *
 * O mesmo componente serve os dois separadores do menu superior: só muda a
 * lista de tipos que oferece. Cada aplicação é um cartão com o conteúdo, o
 * local, o tamanho e o ajuste fino — e passar o rato por um cartão acende a
 * guia tracejada no visualizador, que é a forma mais direta de perceber
 * onde a coisa vai parar.
 */
export function PainelAplicacoes({ tipos }: { tipos: TipoAplicacao[] }) {
  const aplicacoes = useKitStore((s) => s.design.aplicacoes) ?? [];
  const addAplicacao = useKitStore((s) => s.addAplicacao);
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);

  const minhas = aplicacoes.filter((a) => tipos.includes(a.tipo));

  return (
    <div className="space-y-3" onMouseLeave={() => setLocalEmFoco(null)}>
      <div className="flex flex-wrap gap-2">
        {tipos.map((tipo) => (
          <Button
            key={tipo}
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setLocalEmFoco(addAplicacao(tipo).localId)}
          >
            {tipo === 'logo' ? <ImagePlus /> : <Plus />}
            {TIPO_APLICACAO_LABEL[tipo]}
          </Button>
        ))}
      </div>

      {minhas.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-4 text-center text-xs text-muted-foreground">
          {tipos.includes('logo')
            ? 'Ainda sem escudos ou logos. Carregue uma imagem PNG com fundo transparente.'
            : 'Ainda sem nomes nem números. Acrescente um e escolha onde fica.'}
        </p>
      ) : (
        minhas.map((a) => <CartaoAplicacao key={a.id} aplicacao={a} />)
      )}
    </div>
  );
}

function CartaoAplicacao({ aplicacao: a }: { aplicacao: Aplicacao }) {
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  const removerAplicacao = useKitStore((s) => s.removerAplicacao);
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);
  const ficheiro = useRef<HTMLInputElement>(null);
  /** Encolhido, o cartão é uma linha-resumo. Vive no próprio cartão (a
      `key` é o id da aplicação), por isso um cartão novo nasce aberto e o
      estado dos outros não mexe. Com três nomes e dois escudos, a coluna
      sem isto era um rolo de deslize infinito. */
  const [aberto, setAberto] = useState(true);

  const local = localPorId(a.localId);
  const opcoes = locaisPara(a.tipo);

  /** O logo fica em data URL: nunca sai do browser antes de haver pedido, e
      viaja com o design para o carrinho sem depender de storage nenhum. */
  const carregarImagem = (f: File | undefined) => {
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () =>
      setAplicacao(a.id, { imagem: String(leitor.result), nomeFicheiro: f.name });
    leitor.readAsDataURL(f);
  };

  return (
    <div
      className="space-y-2.5 rounded-lg border bg-card p-3 shadow-sm"
      onMouseEnter={() => setLocalEmFoco(a.localId)}
      onFocus={() => setLocalEmFoco(a.localId)}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {TIPO_APLICACAO_LABEL[a.tipo]}
        </span>
        <button
          onClick={() => setAberto((v) => !v)}
          title={aberto ? 'Encolher' : 'Expandir'}
          className="ml-auto grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-accent"
        >
          {aberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => removerAplicacao(a.id)}
          title="Remover"
          className="grid h-6 w-6 place-items-center rounded text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* encolhido: o que é e onde está, num relance — clicar edita */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="flex w-full items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left transition hover:bg-accent"
        >
          {a.tipo === 'logo' ? (
            a.imagem ? (
              <img src={a.imagem} alt="" className="h-6 w-6 shrink-0 rounded border object-contain" />
            ) : (
              <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span
              className="shrink-0 text-base font-bold leading-none"
              style={{ fontFamily: fontePorId(a.fonteId).css }}
            >
              {a.texto || '—'}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {local ? `${PECA_LABEL[local.peca]} · ${LADO_LABEL[local.lado]} · ${local.nome}` : ''}
          </span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      )}

      {aberto && (
        <>

      {/* ---------------------------------------------------- conteúdo -- */}
      {a.tipo === 'logo' ? (
        <div className="flex items-center gap-2">
          <div className="xadrez grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md border">
            {a.imagem ? (
              <img src={a.imagem} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              ref={ficheiro}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => carregarImagem(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => ficheiro.current?.click()}
            >
              <Upload />
              {a.imagem ? 'Trocar imagem' : 'Carregar imagem'}
            </Button>
            <p className="mt-1 truncate text-[10px] text-muted-foreground">
              {a.nomeFicheiro ?? 'PNG com fundo transparente'}
            </p>
          </div>
        </div>
      ) : (
        <input
          value={a.texto ?? ''}
          onChange={(e) =>
            setAplicacao(a.id, {
              texto:
                a.tipo === 'numero'
                  ? e.target.value.replace(/\D/g, '').slice(0, 3)
                  : e.target.value.toUpperCase().slice(0, 20),
            })
          }
          inputMode={a.tipo === 'numero' ? 'numeric' : 'text'}
          placeholder={a.tipo === 'numero' ? '10' : 'NOME'}
          className="h-9 w-full rounded-md border bg-background px-2.5 text-sm font-bold tracking-wide outline-none focus:border-foreground"
        />
      )}

      {/* ------------------------------------------------------- local -- */}
      <Campo rotulo="Posição">
        <select
          value={a.localId}
          onChange={(e) => {
            setAplicacao(a.id, { localId: e.target.value });
            setLocalEmFoco(e.target.value);
          }}
          className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:border-foreground"
        >
          {(['camisola', 'calcao', 'meiao'] as const).map((peca) =>
            (['frente', 'verso'] as const).map((lado) => {
              const grupo = opcoes.filter((l) => l.peca === peca && l.lado === lado);
              if (grupo.length === 0) return null;
              return (
                <optgroup key={`${peca}-${lado}`} label={`${PECA_LABEL[peca]} · ${LADO_LABEL[lado]}`}>
                  {grupo.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </optgroup>
              );
            }),
          )}
        </select>
      </Campo>

      {/* ------------------------------------------- tipo de letra/cor -- */}
      {a.tipo !== 'logo' && (
        <>
          <Campo rotulo="Letra">
            <select
              value={a.fonteId}
              onChange={(e) => setAplicacao(a.id, { fonteId: e.target.value })}
              className="h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:border-foreground"
            >
              {FONTES.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.css }}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Cores">
            <div className="flex items-center gap-3">
              <Cor
                rotulo="Preenchimento"
                cor={a.cor}
                onChange={(cor) => setAplicacao(a.id, { cor })}
              />
              <Cor
                rotulo="Contorno"
                cor={a.corContorno || '#000000'}
                desligada={!a.corContorno}
                onChange={(corContorno) => setAplicacao(a.id, { corContorno })}
                onDesligar={() =>
                  setAplicacao(a.id, { corContorno: a.corContorno ? '' : '#111111' })
                }
              />
            </div>
          </Campo>
        </>
      )}

      {/* ------------------------------------------ tamanho e ajuste -- */}
      <Campo rotulo={`Tamanho ${Math.round(a.escala * 100)}%`}>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={a.escala}
          onChange={(e) => setAplicacao(a.id, { escala: Number(e.target.value) })}
          className="w-full accent-foreground"
        />
      </Campo>

      <Campo rotulo="Ajuste fino">
        <div className="flex items-center gap-1">
          <Seta Icone={ChevronLeft} onClick={() => setAplicacao(a.id, { dx: limite(a.dx - 0.05) })} />
          <Seta Icone={ChevronRight} onClick={() => setAplicacao(a.id, { dx: limite(a.dx + 0.05) })} />
          <Seta Icone={ChevronUp} onClick={() => setAplicacao(a.id, { dy: limite(a.dy - 0.05) })} />
          <Seta Icone={ChevronDown} onClick={() => setAplicacao(a.id, { dy: limite(a.dy + 0.05) })} />
          <button
            onClick={() => setAplicacao(a.id, { dx: 0, dy: 0, escala: 1 })}
            title="Centrar no local"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border text-muted-foreground transition hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </Campo>

          {local && (
            <p className="text-[10px] text-muted-foreground">
              {PECA_LABEL[local.peca]} · {LADO_LABEL[local.lado]} · {local.nome}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** O deslocamento é meia caixa para cada lado — o suficiente para acertar,
    pouco o bastante para a aplicação não fugir do sítio que a produção
    conhece. */
function limite(v: number): number {
  return Math.max(-0.5, Math.min(0.5, Number(v.toFixed(2))));
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

function Cor({
  rotulo,
  cor,
  desligada,
  onChange,
  onDesligar,
}: {
  rotulo: string;
  cor: string;
  desligada?: boolean;
  onChange: (cor: string) => void;
  onDesligar?: () => void;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="color"
        value={cor}
        onChange={(e) => onChange(e.target.value)}
        title={rotulo}
        className={cn(
          'h-8 w-8 cursor-pointer rounded-md border-2 bg-transparent p-0',
          desligada && 'opacity-30',
        )}
      />
      <span className="text-[10px] leading-tight text-muted-foreground">
        {rotulo}
        {onDesligar && (
          <>
            <br />
            <button onClick={onDesligar} className="underline transition hover:text-foreground">
              {desligada ? 'ligar' : 'desligar'}
            </button>
          </>
        )}
      </span>
    </span>
  );
}

function Seta({
  Icone,
  onClick,
}: {
  Icone: typeof ChevronLeft;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md border transition hover:bg-accent"
    >
      <Icone className="h-3.5 w-3.5" />
    </button>
  );
}

