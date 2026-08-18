// Supabase Edge Function: porta de entrada da administração da KYPZL.
//
// PORQUÊ UMA FUNÇÃO E NÃO UM CÓDIGO NO BROWSER
//
// A entrada é por código, não por e-mail e palavra-passe. Um código
// verificado no browser não protege nada: para o painel ler os pedidos, a
// tabela `orders` teria de abrir ao público, e a chave anónima vai dentro do
// JavaScript — qualquer pessoa leria os nomes, e-mails e telefones dos
// clientes, com ou sem código. O `if` no browser seria teatro.
//
// Aqui o código é comparado NO SERVIDOR e nunca sai daqui. A tabela
// continua fechada; é esta função, com a chave de serviço, que lê e escreve
// por conta do painel. O browser só recebe o resultado.
//
// LIMITE CONHECIDO: um código de 4 dígitos são 10 000 hipóteses. Há um
// atraso a cada tentativa falhada para tornar a força bruta lenta, mas quem
// quiser mesmo entrar consegue. Para um código mais longo basta trocar o
// secret — o painel não muda.
//
// Deploy: supabase functions deploy admin --no-verify-jwt
// Secret: supabase secrets set ADMIN_CODIGO=4554

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CODIGO = Deno.env.get('ADMIN_CODIGO') ?? '4554';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Comparação de tempo constante: um `===` devolve mais depressa quando o
    primeiro dígito falha, e isso mede-se. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta({ erro: 'Método não permitido.' }, 405);

  let corpo: { codigo?: string; acao?: string; dados?: Record<string, unknown> };
  try {
    corpo = await req.json();
  } catch {
    return resposta({ erro: 'Pedido inválido.' }, 400);
  }

  const { codigo = '', acao = '', dados = {} } = corpo;

  if (!iguais(codigo, CODIGO)) {
    // trava a força bruta sem devolver pistas sobre o que estava errado
    await espera(1200);
    return resposta({ erro: 'Código incorreto.' }, 401);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  try {
    switch (acao) {
      // só confirma o código — é o que o ecrã de entrada usa
      case 'entrar':
        return resposta({ ok: true });

      case 'leads': {
        const { data, error } = await db
          .from('orders')
          .select('id, customer, items, created_at')
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        return resposta({ leads: data ?? [] });
      }

      case 'modelos': {
        // inclui os desativados: o painel precisa de os ver para os voltar
        // a ligar, coisa que a leitura pública (filtrada por `enabled`) não dá
        const { data, error } = await db
          .from('kit_templates')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) throw error;
        return resposta({ modelos: data ?? [] });
      }

      case 'guardar-modelo': {
        const { error } = await db
          .from('kit_templates')
          .upsert({ ...dados, enabled: true }, { onConflict: 'cod_modelo,peca,lado' });
        if (error) throw error;
        return resposta({ ok: true });
      }

      case 'alternar-modelo': {
        const { error } = await db
          .from('kit_templates')
          .update({ enabled: dados.enabled })
          .eq('id', dados.id);
        if (error) throw error;
        return resposta({ ok: true });
      }

      case 'apagar-modelo': {
        const { error } = await db.from('kit_templates').delete().eq('id', dados.id);
        if (error) throw error;
        return resposta({ ok: true });
      }

      default:
        return resposta({ erro: `Ação desconhecida: ${acao}` }, 400);
    }
  } catch (e) {
    console.error('[admin]', acao, e);
    return resposta({ erro: (e as Error).message ?? 'Erro inesperado.' }, 500);
  }
});
