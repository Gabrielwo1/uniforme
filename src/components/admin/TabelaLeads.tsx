import { useMemo, useState } from 'react';
import { ChevronDown, Download, Mail, Phone, Search } from 'lucide-react';
import { downloadText } from '@/lib/download';
import { cn } from '@/lib/utils';
import type { LeadRow } from '@/lib/api';
import { Button } from '../ui/button';
import { KitPreview } from '../kit/KitPreview';
import { Espera, Falha, useLeads } from './PainelKpis';
import { artigosDoLead, dataCurta, pecasPedidas } from './adminDados';

/**
 * Tabela de leads: quem pediu, o quê e quando.
 *
 * A linha abre para mostrar o conjunto DESENHADO — não uma imagem gravada,
 * mas o mesmo motor do simulador a compor o `design` guardado. É o que
 * permite à produção ver exatamente o que o cliente montou, meses depois,
 * sem depender de nenhum ficheiro à parte.
 */
export function TabelaLeads() {
  const { leads, aCarregar, erro } = useLeads();
  const [procura, setProcura] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = procura.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.customer?.name, l.customer?.email, l.customer?.club, l.customer?.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [leads, procura]);

  if (aCarregar) return <Espera />;
  if (erro) return <Falha mensagem={erro} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={procura}
            onChange={(e) => setProcura(e.target.value)}
            placeholder="Procurar por nome, e-mail ou clube"
            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus:border-foreground"
          />
        </label>
        <span className="text-xs text-muted-foreground">
          {filtrados.length} de {leads.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => exportarCsv(filtrados)}>
          <Download />
          CSV
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          {leads.length === 0 ? 'Ainda não há pedidos.' : 'Nada corresponde à procura.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 font-bold">Cliente</th>
                <th className="hidden p-3 font-bold sm:table-cell">Contacto</th>
                <th className="hidden p-3 font-bold md:table-cell">Clube</th>
                <th className="p-3 text-right font-bold">Peças</th>
                <th className="hidden p-3 text-right font-bold lg:table-cell">Data</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((lead) => (
                <Linha
                  key={lead.id}
                  lead={lead}
                  aberta={aberto === lead.id}
                  onAlternar={() => setAberto(aberto === lead.id ? null : lead.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Linha({
  lead,
  aberta,
  onAlternar,
}: {
  lead: LeadRow;
  aberta: boolean;
  onAlternar: () => void;
}) {
  const artigos = artigosDoLead(lead);
  const c = lead.customer ?? { name: '', email: '' };

  return (
    <>
      <tr
        onClick={onAlternar}
        className={cn('cursor-pointer border-b transition hover:bg-accent/50', aberta && 'bg-accent/40')}
      >
        <td className="p-3">
          <p className="font-semibold">{c.name || '—'}</p>
          <p className="text-[11px] text-muted-foreground sm:hidden">{c.email}</p>
        </td>
        <td className="hidden p-3 sm:table-cell">
          <a
            href={`mailto:${c.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs hover:underline"
          >
            <Mail className="h-3 w-3 shrink-0 text-muted-foreground" />
            {c.email}
          </a>
          {c.phone && (
            <a
              href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
            >
              <Phone className="h-3 w-3 shrink-0" />
              {c.phone}
            </a>
          )}
        </td>
        <td className="hidden p-3 text-xs md:table-cell">{c.club || '—'}</td>
        <td className="p-3 text-right font-bold tabular-nums">{pecasPedidas(lead)}</td>
        <td className="hidden p-3 text-right text-xs text-muted-foreground lg:table-cell">
          {dataCurta(lead.created_at)}
        </td>
        <td className="p-3">
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition', aberta && 'rotate-180')}
          />
        </td>
      </tr>

      {aberta && (
        <tr className="border-b bg-muted/30">
          <td colSpan={6} className="p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex flex-wrap gap-3">
                {artigos.map((a, i) => (
                  <div key={i} className="rounded-lg border bg-card p-2">
                    <p className="mb-1 text-xs font-bold">
                      {a.quantidade}× {a.nome}
                    </p>
                    {a.design ? (
                      <div className="flex gap-1 rounded-md bg-[url(/moldes/fundo-campo.jpg)] bg-cover bg-center p-1">
                        <KitPreview design={a.design} lado="frente" className="h-40" />
                        <KitPreview design={a.design} lado="verso" className="h-40" />
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Pedido do editor antigo — sem conjunto para desenhar.
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <dl className="space-y-1.5 text-xs">
                <Campo rotulo="Recebido" valor={dataCurta(lead.created_at)} />
                <Campo rotulo="E-mail" valor={c.email} />
                <Campo rotulo="Telefone" valor={c.phone} />
                <Campo rotulo="Clube" valor={c.club} />
                <Campo rotulo="Notas" valor={c.notes} />
              </dl>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 text-muted-foreground">{rotulo}</dt>
      <dd className="min-w-0 flex-1 break-words">{valor || '—'}</dd>
    </div>
  );
}

/** CSV para quem quiser trabalhar os leads noutro lado. Só os contactos e o
    resumo — o desenho não cabe numa célula. */
function exportarCsv(leads: LeadRow[]) {
  const escapar = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [
    ['Data', 'Nome', 'E-mail', 'Telefone', 'Clube', 'Peças', 'Artigos', 'Notas'].join(','),
    ...leads.map((l) =>
      [
        l.created_at,
        l.customer?.name,
        l.customer?.email,
        l.customer?.phone,
        l.customer?.club,
        pecasPedidas(l),
        artigosDoLead(l).map((a) => `${a.quantidade}x ${a.nome}`).join(' | '),
        l.customer?.notes,
      ]
        .map(escapar)
        .join(','),
    ),
  ];
  // BOM: sem ele o Excel abre os acentos trocados
  downloadText('﻿' + linhas.join('\n'), `leads-kypzl-${Date.now()}.csv`);
}
