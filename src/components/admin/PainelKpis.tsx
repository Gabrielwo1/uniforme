import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { fetchLeads, type LeadRow } from '@/lib/api';
import { calcularKpis, type Kpis } from './adminDados';

/**
 * Resumo do funil.
 *
 * Só mostra o que os dados sustentam: pedidos recebidos, peças pedidas e
 * temas escolhidos. Não há "taxa de conversão" nem "visitantes" porque não
 * há analítica ligada — inventar uma métrica que não se mede é pior do que
 * não a ter.
 */
export function PainelKpis() {
  const { leads, aCarregar, erro } = useLeads();
  if (aCarregar) return <Espera />;
  if (erro) return <Falha mensagem={erro} />;

  const k = calcularKpis(leads);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Pedidos" valor={k.leads} nota="desde sempre" />
        <Cartao rotulo="Últimos 7 dias" valor={k.leads7} nota="pedidos novos" />
        <Cartao rotulo="Últimos 30 dias" valor={k.leads30} nota="pedidos novos" />
        <Cartao rotulo="Peças pedidas" valor={k.pecas} nota="somando quantidades" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Grafico serie={k.serie} />
        <Temas temas={k.temas} pctSimulador={k.pctSimulador} />
      </div>
    </div>
  );
}

export function useLeads() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetchLeads()
      .then((l) => vivo && setLeads(l))
      .catch((e: Error) => vivo && setErro(e.message))
      .finally(() => vivo && setACarregar(false));
    return () => {
      vivo = false;
    };
  }, []);

  return { leads, aCarregar, erro };
}

export function Espera() {
  return (
    <div className="grid place-items-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function Falha({ mensagem }: { mensagem: string }) {
  return (
    <div className="mx-auto flex max-w-md items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <span>{mensagem}</span>
    </div>
  );
}

function Cartao({ rotulo, valor, nota }: { rotulo: string; valor: number; nota: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p>
      <p className="text-[11px] text-muted-foreground">{nota}</p>
    </div>
  );
}

/** Barras dos últimos 30 dias. Puro SVG — um gráfico de 30 valores não
    justifica uma biblioteca de gráficos no bundle. */
function Grafico({ serie }: { serie: Kpis['serie'] }) {
  const maximo = Math.max(1, ...serie.map((d) => d.n));
  const largura = 100 / serie.length;

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Pedidos por dia · 30 dias
      </p>

      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-32 w-full">
        {serie.map((d, i) => (
          <rect
            key={d.dia}
            x={i * largura + largura * 0.15}
            y={30 - (d.n / maximo) * 29}
            width={largura * 0.7}
            height={Math.max(d.n ? 0.6 : 0, (d.n / maximo) * 29)}
            rx={0.4}
            className="fill-primary"
          >
            <title>{`${d.dia}: ${d.n}`}</title>
          </rect>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{serie[0]?.dia}</span>
        <span>máx. {maximo}/dia</span>
        <span>{serie[serie.length - 1]?.dia}</span>
      </div>
    </div>
  );
}

function Temas({ temas, pctSimulador }: { temas: Kpis['temas']; pctSimulador: number }) {
  const maximo = Math.max(1, ...temas.map((t) => t.n));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Mais pedidos
      </p>

      {temas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Ainda sem pedidos.</p>
      ) : (
        <ul className="space-y-2">
          {temas.map((t) => (
            <li key={t.nome}>
              <div className="flex justify-between text-xs">
                <span className="truncate font-semibold">{t.nome}</span>
                <span className="tabular-nums text-muted-foreground">{t.n}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(t.n / maximo) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t pt-3 text-[11px] text-muted-foreground">
        {pctSimulador}% dos pedidos vieram do simulador de conjuntos; o resto
        é do editor antigo.
      </p>
    </div>
  );
}
