// Supabase Edge Function: gera a foto do jogador vestindo um item
// personalizado, via API de imagem da OpenAI (gpt-image-1).
//
// ⚠️ NÃO IMPLANTADA/ATIVA — falta configurar o secret OPENAI_API_KEY no
// projeto Supabase. Até lá, o app usa o compositor sintético local
// (src/lib/modelPreview.ts) como preview gratuito e instantâneo.
//
// Recebe o `AIPortraitInput` montado por src/lib/aiPortrait.ts
// (buildAIPortraitInput) e devolve um `AIPortraitResult`.
//
// Deploy: supabase functions deploy generate-model-photo
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface AIPortraitInput {
  orderItemId: string;
  product: { id: string; name: string; category: string; modality: string };
  images: { flatDesign: string; itemPhoto: string };
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
    if (!input?.prompt || !input?.images?.flatDesign) {
      return json({ error: 'Input inválido: prompt e images.flatDesign são obrigatórios.' }, 400);
    }

    // 1) dataURL -> Blob (a imagem do design finalizado, referência principal)
    const designBlob = await dataUrlToBlob(input.images.flatDesign);

    // 2) chamada à API da OpenAI (image edit/generate com imagem de referência)
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', input.prompt);
    form.append('size', '1024x1536'); // retrato
    form.append('image', designBlob, 'design.png');

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
    const path = `${input.orderItemId}-${Date.now()}.png`;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from('ai-portraits')
      .upload(path, bytes, { contentType: 'image/png', upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data: pub } = supabase.storage.from('ai-portraits').getPublicUrl(path);

    return json({
      orderItemId: input.orderItemId,
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
