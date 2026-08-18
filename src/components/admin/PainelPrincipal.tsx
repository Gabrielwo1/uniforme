import { PainelKpis, Espera, Falha, useLeads } from './PainelKpis';
import { TabelaLeads } from './TabelaLeads';

/**
 * O painel: números em cima, leads em baixo — no mesmo ecrã.
 *
 * Estavam em separadores diferentes e obrigavam a saltar entre eles para
 * ligar um número a uma pessoa ("dois esta semana" → quem?). Vivem da mesma
 * leitura, que é feita AQUI uma só vez e distribuída pelos dois: em
 * separado eram duas chamadas à função de servidor a pedir a mesma coisa.
 */
export function PainelPrincipal() {
  const { leads, aCarregar, erro } = useLeads();

  if (aCarregar) return <Espera />;
  if (erro) return <Falha mensagem={erro} />;

  return (
    <div className="space-y-6">
      <PainelKpis leads={leads} />

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Leads</h2>
        <TabelaLeads leads={leads} />
      </section>
    </div>
  );
}
