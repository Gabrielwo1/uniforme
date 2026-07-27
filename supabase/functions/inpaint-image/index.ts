// Supabase Edge Function: inpainting genérico via OpenAI (gpt-image-1 images/edits
// com máscara) — usado para limpar fotos reais de produto antes de cadastrá-las no
// catálogo (ex.: apagar nome/número impresso e reconstruir a estampa por baixo).
//
// Recebe { image: dataURL, mask: dataURL, prompt: string, size? }. `mask` é um PNG
// do mesmo tamanho de `image` com alpha=0 na região a regenerar e alpha=255 no
// resto — a API preserva os pixels opacos exatamente e só gera conteúdo novo na
// área transparente. Devolve { imageUrl } (Storage, bucket "ai-portraits").
//
// Redeploy: supabase functions deploy inpaint-image
// Secret:   supabase secrets set OPENAI_API_KEY=sk-... (já configurada no projeto)

import { createClient } from 'jsr:@supabase/supabase-js@2';

interface InpaintInput {
  image: string;
  mask?: string;
  prompt: string;
  size?: string;
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
    return json({ error: 'OPENAI_API_KEY não configurada neste projeto Supabase.' }, 501);
  }

  try {
    const input = (await req.json()) as InpaintInput;
    if (!input?.image || !input?.prompt) {
      return json({ error: 'Input inválido: image e prompt são obrigatórios.' }, 400);
    }

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', input.prompt);
    form.append('image', await dataUrlToBlob(input.image), 'image.png');
    if (input.mask) form.append('mask', await dataUrlToBlob(input.mask), 'mask.png');
    if (input.size) form.append('size', input.size);

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const path = `inpaint/${Date.now()}.png`;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const { error: uploadError } = await supabase.storage
      .from('ai-portraits')
      .upload(path, bytes, { contentType: 'image/png', upsert: false });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data: pub } = supabase.storage.from('ai-portraits').getPublicUrl(path);
    return json({ imageUrl: pub.publicUrl });
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
