// Supabase Edge Function: gera a foto de UM jogador vestindo TODAS as
// peças personalizadas do pedido (camisola + calção + meia, o que estiver
// no carrinho) numa única imagem, via API de imagem da OpenAI (gpt-image-1).
//
// Recebe o `AIPortraitInput` montado por src/lib/aiPortrait.ts
// (buildAIPortraitInput) — uma peça por artigo do pedido, cada uma com a
// sua própria imagem de referência — e devolve um `AIPortraitResult`. Se
// OPENAI_API_KEY não estiver configurada como secret do projeto, responde
// 501 com uma mensagem explicativa em vez de falhar sem contexto.
//
// gpt-image-1 aceita várias imagens de referência numa só chamada de edição
// (campo `image[]` repetido) — cada peça do pedido entra como uma imagem,
// e o prompt descreve como combiná-las no mesmo jogador.
//
// Redeploy: supabase functions deploy generate-model-photo
// Secret:   supabase secrets set OPENAI_API_KEY=sk-...

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AIPortraitPiece {
  orderItemId: string;
  productName: string;
  pieceLabel: string;
  flatDesign: string;
}

interface AIPortraitInput {
  cacheKey: string;
  pieces: AIPortraitPiece[];
  prompt: string;
  [key: string]: unknown;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!OPENAI_API_KEY) {
    return json(
      { error: 'OPENAI_API_KEY não configurada neste projeto Supabase (ver comentário no topo do arquivo).' },
      501,
    );
  }

  try {
    const input = (await req.json()) as AIPortraitInput;
    if (!input?.prompt || !input?.pieces?.length) {
      return json({ error: 'Input inválido: prompt e pieces (pelo menos 1 peça) são obrigatórios.' }, 400);
    }

    // 1) uma imagem de referência por peça do pedido (camisola, calção, meia…)
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', input.prompt);
    form.append('size', '1024x1536'); // retrato, corpo inteiro
    for (let i = 0; i < input.pieces.length; i++) {
      const blob = await dataUrlToBlob(input.pieces[i].flatDesign);
      form.append('image[]', blob, `peca-${i}.png`);
    }

    // 2) chamada à API da OpenAI (image edit com múltiplas imagens de referência)
    const aiRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json({ error: `Falha na API de imagem: ${errText}` }, 502);
    }

    const aiJson = await aiRes.json();
    const b64 = aiJson?.data?.[0]?.b64_json as string | undefined;
    if (!b64) return json({ error: 'Resposta da IA sem imagem.' }, 502);

    // 3) sobe o resultado ao Storage (bucket público "ai-portraits")
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const path = `${input.cacheKey}-${Date.now()}.png`;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from('ai-portraits')
      .upload(path, bytes, { contentType: 'image/png', upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data: pub } = supabase.storage.from('ai-portraits').getPublicUrl(path);

    return json({
      cacheKey: input.cacheKey,
      imageUrl: pub.publicUrl,
      provider: 'openai',
      model: 'gpt-image-1',
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
