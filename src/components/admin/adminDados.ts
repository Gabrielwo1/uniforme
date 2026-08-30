import type { LeadRow } from '@/lib/api';
import type { KitDesign } from '@/types/kit';

/**
 * Leitura dos leads para o painel.
 *
 * A tabela `orders` serve DOIS fluxos: o simulador de conjuntos (items são
 * `KitOrderItem`, com `design.pecas`) e o editor antigo (items são
 * `OrderItem`, com `productId`). O painel tem de mostrar os dois sem
 * rebentar num nem inventar dados no outro, por isso o formato é detetado
 * por peça em vez de assumido.
 */

export interface ArtigoDoLead {
  nome: string;
  quantidade: number;
  /** Desenho do conjunto, quando o pedido vem do simulador. */
  design?: KitDesign;
}

interface ItemKit {
  nome?: string;
  quantidade?: number;
  /** Linhas do orçamento por peça (formato novo, 2026-08): a quantidade do
      conjunto passa a ser a maior linha incluída. */
  linhas?: Record<string, { incluida?: boolean; quantidade?: number }>;
  design?: KitDesign;
}

function quantidadeDoKit(item: ItemKit): number {
  const incluidas = Object.values(item.linhas ?? {}).filter((l) => l.incluida !== false);
  if (incluidas.length === 0) return item.quantidade ?? 1;
  return Math.max(...incluidas.map((l) => l.quantidade ?? 1));
}

interface ItemAntigo {
  productName?: string;
  productId?: string;
  quantity?: number;
}

function eDoSimulador(item: unknown): item is ItemKit {
  return (
    typeof item === 'object' && item !== null
    && 'design' in item
    && typeof (item as ItemKit).design?.pecas === 'object'
  );
}

export function artigosDoLead(lead: LeadRow): ArtigoDoLead[] {
  return (lead.items ?? []).map((item) => {
    if (eDoSimulador(item)) {
      return {
        nome: item.nome ?? 'Conjunto',
        quantidade: quantidadeDoKit(item),
        design: item.design,
      };
    }
    const antigo = (item ?? {}) as ItemAntigo;
    return {
      nome: antigo.productName ?? antigo.productId ?? 'Artigo',
      quantidade: antigo.quantity ?? 1,
    };
  });
}

/** Um lead do simulador tem conjuntos; um do editor antigo tem peças soltas.
    Serve para separar as duas origens nos KPIs. */
export function doSimulador(lead: LeadRow): boolean {
  return (lead.items ?? []).some(eDoSimulador);
}

export function pecasPedidas(lead: LeadRow): number {
  return artigosDoLead(lead).reduce((n, a) => n + a.quantidade, 0);
}

/* ------------------------------------------------------------------ KPIs -- */

export interface Kpis {
  leads: number;
  leads7: number;
  leads30: number;
  pecas: number;
  /** Percentagem dos leads que veio do simulador novo. */
  pctSimulador: number;
  /** Temas mais pedidos, do mais ao menos. */
  temas: { nome: string; n: number }[];
  /** Leads por dia nos últimos 30 dias, do mais antigo ao mais recente. */
  serie: { dia: string; n: number }[];
}

const DIA = 86_400_000;

export function calcularKpis(leads: LeadRow[], agora = Date.now()): Kpis {
  const desde = (dias: number) =>
    leads.filter((l) => agora - new Date(l.created_at).getTime() <= dias * DIA).length;

  const contagem = new Map<string, number>();
  for (const lead of leads) {
    for (const a of artigosDoLead(lead)) {
      contagem.set(a.nome, (contagem.get(a.nome) ?? 0) + a.quantidade);
    }
  }

  // 30 casas, uma por dia, para o gráfico não ter buracos nos dias sem leads
  const serie: { dia: string; n: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(agora - i * DIA);
    const dia = d.toISOString().slice(0, 10);
    serie.push({
      dia,
      n: leads.filter((l) => l.created_at.slice(0, 10) === dia).length,
    });
  }

  const doSim = leads.filter(doSimulador).length;

  return {
    leads: leads.length,
    leads7: desde(7),
    leads30: desde(30),
    pecas: leads.reduce((n, l) => n + pecasPedidas(l), 0),
    pctSimulador: leads.length ? Math.round((doSim / leads.length) * 100) : 0,
    temas: [...contagem.entries()]
      .map(([nome, n]) => ({ nome, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6),
    serie,
  };
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ------------------------------------------------------------ CONTACTO -- */

/**
 * Link de WhatsApp para responder ao lead, já com a mensagem escrita.
 *
 * Devolve `null` quando o telefone não serve. Vale a pena verificar: o campo
 * é livre no formulário e chegam lá coisas que não são números — um botão
 * que abre uma conversa com um número inventado é pior do que um botão
 * desligado que diz porquê.
 */
export function whatsappDoLead(lead: LeadRow): string | null {
  const digitos = (lead.customer?.phone ?? '').replace(/\D/g, '');
  if (digitos.length < 9) return null;

  // 9 dígitos é um número português sem indicativo; com mais, assume-se que
  // o indicativo já lá está (o formulário não o pede em separado)
  const numero = digitos.length === 9 ? `351${digitos}` : digitos;

  const artigos = artigosDoLead(lead)
    .map((a) => `${a.quantidade}× ${a.nome}`)
    .join(', ');
  const texto =
    `Olá ${lead.customer?.name ?? ''}! Aqui é a KYPZL. `
    + `Recebemos o seu pedido${artigos ? ` (${artigos})` : ''} e já estamos a prepará-lo. `
    + 'Podemos falar sobre tamanhos e prazos?';

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
