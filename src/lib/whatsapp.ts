import { estampaDemoPorId } from './kitDemo';
import { fontePorId, localPorId } from './kitLocais';
import { PECAS_KIT, PECA_LABEL } from '@/types/kit';
import type { KitOrderItem } from '@/types/kitOrder';
import type { OrderCustomer } from '@/types/order';

/**
 * Resumo do pedido para o WhatsApp da KYPZL.
 *
 * O `wa.me` só ABRE a conversa com o texto escrito — quem carrega em enviar
 * é sempre a pessoa. O texto tem de chegar sozinho: quando o Supabase não
 * está configurado, esta mensagem é o único registo que a equipa recebe.
 *
 * Fica deliberadamente curto. O URL tem limite prático (~2000 caracteres) e
 * um pedido com muitas personalizações passa-o à vontade; por isso vai o que
 * a equipa precisa para responder — quem, o quê, e as aplicações — e a ficha
 * completa com todos os hex fica no painel de administração.
 */

/** Número da KYPZL, só dígitos, com indicativo. */
export const WHATSAPP_KYPZL = '351912300289';

/** Além disto o WhatsApp começa a truncar em alguns clientes. */
const LIMITE = 1600;

function linhasDoConjunto(item: KitOrderItem): string[] {
  const linhas = [`▪️ ${item.quantidade}× ${item.nome}`];

  for (const peca of PECAS_KIT) {
    const config = item.design.pecas[peca];
    if (!config) continue;
    const estampa = estampaDemoPorId(peca, config.estampaId);
    const cores = [
      ...estampa.camadas.map((c) => config.cores[c.id] ?? c.corPadrao),
      config.coresZonas.corpo ?? estampa.corBasePadrao,
    ];
    // as cores repetem-se muito entre camadas: mostrar a mesma três vezes
    // só gasta caracteres
    const unicas = [...new Set(cores.map((c) => c.toUpperCase()))];
    linhas.push(`   ${PECA_LABEL[peca]}: ${estampa.nome} · ${unicas.join(' ')}`);
  }

  for (const a of item.design.aplicacoes ?? []) {
    const onde = localPorId(a.localId)?.nome ?? a.localId;
    linhas.push(
      a.tipo === 'logo'
        ? `   Logo em ${onde}: ${a.nomeFicheiro ?? 'imagem enviada à parte'}`
        : `   ${onde}: "${a.texto}" (${fontePorId(a.fonteId).nome})`,
    );
  }

  return linhas;
}

export function mensagemDoPedido(cliente: OrderCustomer, itens: KitOrderItem[]): string {
  const cabecalho = [
    'Olá KYPZL! Montei um conjunto no simulador.',
    '',
    `Nome: ${cliente.name}`,
    cliente.club ? `Clube: ${cliente.club}` : '',
    `E-mail: ${cliente.email}`,
    cliente.phone ? `Telefone: ${cliente.phone}` : '',
    '',
  ].filter(Boolean);

  const corpo = itens.flatMap(linhasDoConjunto);
  const rodape = cliente.notes ? ['', `Notas: ${cliente.notes}`] : [];

  const texto = [...cabecalho, ...corpo, ...rodape].join('\n');
  return texto.length > LIMITE
    ? `${texto.slice(0, LIMITE)}\n… (detalhe completo no pedido registado)`
    : texto;
}

/** Link que abre a conversa com o resumo já escrito. */
export function linkWhatsApp(cliente: OrderCustomer, itens: KitOrderItem[]): string {
  const texto = encodeURIComponent(mensagemDoPedido(cliente, itens));
  return `https://wa.me/${WHATSAPP_KYPZL}?text=${texto}`;
}
