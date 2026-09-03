import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
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
const LOCAIS_PATROCINIO = ['barriga', 'costas-baixo'];
const LOCAIS_CALCAO = ['coxa-esq', 'coxa-dir'];
const LOCAIS_MEIAO = ['meia-esq', 'meia-dir'];

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
  const patrocinios = LOCAIS_PATROCINIO.map((l) => logoEm([l]));
  const noCalcao = logoEm(LOCAIS_CALCAO);
  const noMeiao = logoEm(LOCAIS_MEIAO);

  /** Um clique no slot ativo desliga; noutro slot do grupo, muda; sem
      nenhum, cria — a mesma regra do painel de nome/número. */
  const alternar = (atual: Aplicacao | undefined, localId: string) => {
    if (atual && atual.localId === localId) {
      removerAplicacao(atual.id);
      return;
    }
    if (atual) setAplicacao(atual.id, { localId });
    else addAplicacao('logo', localId);
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
            {escudo && <LinhaImagem aplicacao={escudo} rotulo="Ficheiro do escudo" />}
          </Seccao>

          <Seccao titulo="Patrocínio — defina as posições">
            <div className="flex flex-wrap gap-2">
              {LOCAIS_PATROCINIO.map((localId, i) => (
                <OpcaoSlot
                  key={localId}
                  ativa={!!patrocinios[i]}
                  onClick={() => alternar(patrocinios[i], localId)}
                  onFocoLocal={() => setLocalEmFoco(localId)}
                  titulo={localId === 'barriga' ? 'Barriga (frente)' : 'Costas em baixo'}
                >
                  <CamisolaIcone verso={localId === 'costas-baixo'}>
                    <MarcaBarra cx={30} cy={localId === 'barriga' ? 37 : 46} />
                  </CamisolaIcone>
                </OpcaoSlot>
              ))}
            </div>
            {patrocinios.map(
              (a, i) =>
                a && (
                  <LinhaImagem
                    key={a.id}
                    aplicacao={a}
                    rotulo={
                      LOCAIS_PATROCINIO[i] === 'barriga'
                        ? 'Patrocínio da frente'
                        : 'Patrocínio das costas'
                    }
                  />
                ),
            )}
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
          {noCalcao && <LinhaImagem aplicacao={noCalcao} rotulo="Ficheiro do logo" />}
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
          {noMeiao && <LinhaImagem aplicacao={noMeiao} rotulo="Ficheiro do logo" />}
        </Seccao>
      )}
    </div>
  );
}

/** Ficheiro + tamanho de um logo ativo. A imagem fica em data URL — nunca
    sai do browser antes de haver pedido. */
function LinhaImagem({ aplicacao: a, rotulo }: { aplicacao: Aplicacao; rotulo: string }) {
  const setAplicacao = useKitStore((s) => s.setAplicacao);
  const ficheiro = useRef<HTMLInputElement>(null);

  const carregar = (f: File | undefined) => {
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () =>
      setAplicacao(a.id, { imagem: String(leitor.result), nomeFicheiro: f.name });
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
              setAplicacao(a.id, { escala: Math.min(1.5, Math.max(0.5, n / 100)) });
            }}
            title="Tamanho (%)"
            className="h-7 w-14 rounded-md border bg-background px-1 text-center text-xs font-bold outline-none focus:border-foreground"
          />
        </div>
      </div>
    </div>
  );
}
