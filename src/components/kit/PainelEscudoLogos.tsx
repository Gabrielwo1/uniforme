import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
// a variante BRANCA (letras brancas, seta vermelha): a original é preta e
// desaparecia no peito escuro do tema padrão
import logoKypzl from '@/assets/kypzl-logo-branca.png';
import faixaCinza from '@/assets/faixa-patrocinio.png';
import { useKitStore } from '@/store/useKitStore';
import { localPorId } from '@/lib/kitLocais';
import type { Aplicacao } from '@/types/kit';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { CalcaoIcone, CamisolaIcone, MarcaBarra, MarcaEscudo, MeiaoIcone } from './IconesPeca';
import { OpcaoSlot, Seccao } from './PainelNomeNumero';

/**
 * Painel de ESCUDO e PATROCÍNIO, no MESMO formato fechado do de
 * nome/número (pedido do cliente, 2026-09-01, "escudo e logos o mesmo
 * formato"): separadores por peça e slots fixos escolhidos por
 * ícones-miniatura da configuração — como o "Escudo e Patrocínio" do
 * concorrente.
 *
 *   Camisola: escudo no peito (esquerda/centro/direita) e patrocínio
 *   (barriga na frente, costas em baixo — independentes).
 *   Calção: escudo/logo numa das coxas.
 *   Meião: logo numa das meias.
 *
 * Cada slot ativo tem o seu próprio ficheiro (PNG com fundo transparente)
 * e tamanho. Sem lista livre — os sítios são estes.
 */

const LOCAIS_ESCUDO = ['peito-esq', 'peito-centro', 'peito-dir'];
const LOCAIS_CALCAO = ['coxa-esq', 'coxa-dir'];
const LOCAIS_MEIAO = ['meia-esq', 'meia-dir'];

/** As posições de patrocínio do concorrente — cada opção pode cobrir um
    PAR de locais (topo do peito, mangas): entra tudo de uma vez, com a
    FAIXA CINZA de mostra até o cliente carregar o ficheiro. */
const OPCOES_PATROCINIO: {
  id: string;
  locais: string[];
  titulo: string;
  verso?: boolean;
  barras: Array<{ cx: number; cy: number; w?: number; h?: number }>;
}[] = [
  { id: 'barriga', locais: ['barriga'], titulo: 'Barriga (frente)',
    barras: [{ cx: 30, cy: 37 }] },
  { id: 'peito-topo', locais: ['ombro-esq', 'ombro-dir'], titulo: 'Topo do peito (os dois lados)',
    barras: [{ cx: 23, cy: 17, w: 9, h: 4 }, { cx: 37, cy: 17, w: 9, h: 4 }] },
  { id: 'mangas', locais: ['manga-esq', 'manga-dir'], titulo: 'Mangas (as duas)',
    barras: [{ cx: 12, cy: 20, w: 7, h: 4 }, { cx: 48, cy: 20, w: 7, h: 4 }] },
  { id: 'costas-topo', locais: ['costas-topo'], titulo: 'Costas no topo', verso: true,
    barras: [{ cx: 30, cy: 19, w: 22, h: 5 }] },
  { id: 'costas-baixo', locais: ['costas-baixo'], titulo: 'Costas em baixo', verso: true,
    barras: [{ cx: 30, cy: 46 }] },
];

export function PainelEscudoLogos() {
  const [peca, setPeca] = useState<'camisola' | 'calcao' | 'meiao'>('camisola');
  const aplicacoes = useKitStore((s) => s.design.aplicacoes) ?? [];
  const addAplicacao = useKitStore((s) => s.addAplicacao);
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  const removerAplicacao = useKitStore((s) => s.removerAplicacao);
  const setLocalEmFoco = useKitStore((s) => s.setLocalEmFoco);

  const logoEm = (locais: string[]) =>
    aplicacoes.find((a) => a.tipo === 'logo' && locais.includes(a.localId));

  const escudo = logoEm(LOCAIS_ESCUDO);
  const noCalcao = logoEm(LOCAIS_CALCAO);
  const noMeiao = logoEm(LOCAIS_MEIAO);

  const doPatrocinio = (locais: string[]) =>
    aplicacoes.filter((a) => a.tipo === 'logo' && locais.includes(a.localId));

  /** Liga/desliga uma opção de patrocínio — TODOS os locais dela de uma
      vez, com a faixa cinza de mostra (igual à referência). */
  const alternarPatrocinio = (locais: string[]) => {
    const atuais = doPatrocinio(locais);
    if (atuais.length > 0) {
      for (const a of atuais) removerAplicacao(a.id);
      return;
    }
    for (const localId of locais) {
      const nova = addAplicacao('logo', localId);
      setAplicacao(nova.id, { imagem: faixaCinza, nomeFicheiro: 'Faixa de mostra' });
    }
    setLocalEmFoco(locais[0]);
  };

  /** Um clique no slot ativo desliga; noutro slot do grupo, muda; sem
      nenhum, cria — a mesma regra do painel de nome/número. O slot nasce
      com a LOGO KYPZL como imagem padrão (pedido do cliente): aparece
      logo qualquer coisa na peça, e o "Trocar" põe o escudo do clube. */
  const alternar = (atual: Aplicacao | undefined, localId: string) => {
    if (atual && atual.localId === localId) {
      removerAplicacao(atual.id);
      return;
    }
    if (atual) {
      setAplicacao(atual.id, { localId });
    } else {
      const nova = addAplicacao('logo', localId);
      setAplicacao(nova.id, { imagem: logoKypzl, nomeFicheiro: 'Logo KYPZL (padrão)' });
    }
    setLocalEmFoco(localId);
  };

  return (
    <div className="space-y-3" onMouseLeave={() => setLocalEmFoco(null)}>
      <div className="grid grid-cols-3 rounded-lg border bg-card p-1">
        {(['camisola', 'calcao', 'meiao'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeca(p)}
            className={cn(
              'rounded-md py-1.5 text-xs font-bold transition',
              peca === p ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {{ camisola: 'Camisola', calcao: 'Calção', meiao: 'Meião' }[p]}
          </button>
        ))}
      </div>

      {peca === 'camisola' && (
        <>
          <Seccao titulo="Escudo — defina a posição">
            <div className="flex flex-wrap gap-2">
              {LOCAIS_ESCUDO.map((localId) => (
                <OpcaoSlot
                  key={localId}
                  ativa={escudo?.localId === localId}
                  onClick={() => alternar(escudo, localId)}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={{
                    'peito-esq': 'Peito esquerdo',
                    'peito-centro': 'Peito ao centro',
                    'peito-dir': 'Peito direito',
                  }[localId]}
                >
                  <CamisolaIcone>
                    {/* afastado da borda, como os números do painel de
                        nome/número — a 21/39 o escudinho tocava a costura */}
                    <MarcaEscudo cx={{ 'peito-esq': 23, 'peito-centro': 30, 'peito-dir': 37 }[localId]!} cy={26} />
                  </CamisolaIcone>
                </OpcaoSlot>
              ))}
            </div>
            {escudo && <LinhaImagem aplicacoes={[escudo]} rotulo="Ficheiro do escudo" />}
          </Seccao>

          <Seccao titulo="Patrocínio — defina as posições">
            <div className="flex flex-wrap gap-2">
              {OPCOES_PATROCINIO.map(({ id, locais, titulo, verso, barras }) => (
                <OpcaoSlot
                  key={id}
                  ativa={doPatrocinio(locais).length > 0}
                  onClick={() => alternarPatrocinio(locais)}
                  onFocoLocal={() => setLocalEmFoco(locais[0])}
                  titulo={titulo}
                >
                  <CamisolaIcone verso={verso}>
                    {barras.map((b, i) => (
                      <MarcaBarra key={i} {...b} />
                    ))}
                  </CamisolaIcone>
                </OpcaoSlot>
              ))}
            </div>
            {OPCOES_PATROCINIO.map(({ id, locais, titulo }) => {
              const atuais = doPatrocinio(locais);
              if (atuais.length === 0) return null;
              return <LinhaImagem key={id} aplicacoes={atuais} rotulo={titulo} />;
            })}
          </Seccao>
        </>
      )}

      {peca === 'calcao' && (
        <Seccao titulo="Escudo / logo — defina a posição">
          <div className="flex flex-wrap gap-2">
            {LOCAIS_CALCAO.map((localId) => (
              <OpcaoSlot
                key={localId}
                ativa={noCalcao?.localId === localId}
                onClick={() => alternar(noCalcao, localId)}
                onFocoLocal={() => setLocalEmFoco(localId)}
                titulo={localId === 'coxa-esq' ? 'Coxa esquerda' : 'Coxa direita'}
              >
                <CalcaoIcone>
                  <MarcaEscudo cx={localId === 'coxa-esq' ? 20 : 40} cy={35} />
                </CalcaoIcone>
              </OpcaoSlot>
            ))}
          </div>
          {noCalcao && <LinhaImagem aplicacoes={[noCalcao]} rotulo="Ficheiro do logo" />}
        </Seccao>
      )}

      {peca === 'meiao' && (
        <Seccao titulo="Logo — defina a posição">
          <div className="flex flex-wrap gap-2">
            {LOCAIS_MEIAO.map((localId) => (
              <OpcaoSlot
                key={localId}
                ativa={noMeiao?.localId === localId}
                onClick={() => alternar(noMeiao, localId)}
                onFocoLocal={() => setLocalEmFoco(localId)}
                titulo={localId === 'meia-esq' ? 'Meia esquerda' : 'Meia direita'}
              >
                <MeiaoIcone>
                  <MarcaBarra cx={31} cy={22} w={10} h={6} />
                </MeiaoIcone>
              </OpcaoSlot>
            ))}
          </div>
          {noMeiao && <LinhaImagem aplicacoes={[noMeiao]} rotulo="Ficheiro do logo" />}
        </Seccao>
      )}
    </div>
  );
}

/** Ficheiro + tamanho de um logo ativo. A imagem fica em data URL — nunca
    sai do browser antes de haver pedido. */
function LinhaImagem({ aplicacoes, rotulo }: { aplicacoes: Aplicacao[]; rotulo: string }) {
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  const ficheiro = useRef<HTMLInputElement>(null);
  // as opções aos pares (mangas, topo do peito) partilham o ficheiro e o
  // tamanho: o que se muda aqui muda em TODAS as posições da opção
  const a = aplicacoes[0];

  const carregar = (f: File | undefined) => {
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      for (const ap of aplicacoes) {
        setAplicacao(ap.id, { imagem: String(leitor.result), nomeFicheiro: f.name });
      }
    };
    leitor.readAsDataURL(f);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-2">
      <div className="xadrez grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border">
        {a.imagem ? (
          <img src={a.imagem} alt="" className="h-full w-full object-contain" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[10px] font-semibold text-muted-foreground">
          {rotulo} · {localPorId(a.localId)?.nome ?? ''}
        </p>
        <div className="flex gap-1.5">
          <input
            ref={ficheiro}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => carregar(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => ficheiro.current?.click()}
          >
            <Upload />
            {a.imagem ? 'Trocar' : 'Carregar imagem'}
          </Button>
          <input
            type="number"
            min={50}
            max={150}
            step={5}
            value={Math.round(a.escala * 100)}
            onChange={(e) => {
              const n = Number(e.target.value) || 100;
              const escala = Math.min(1.5, Math.max(0.5, n / 100));
              for (const ap of aplicacoes) setAplicacao(ap.id, { escala });
            }}
            title="Tamanho (%)"
            className="h-7 w-14 rounded-md border bg-background px-1 text-center text-xs font-bold outline-none focus:border-foreground"
          />
        </div>
      </div>
    </div>
  );
}
