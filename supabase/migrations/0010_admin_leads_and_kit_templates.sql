-- Painel de administração da KYPZL: ler os pedidos e inserir modelos novos.

-- ---------------------------------------------------------------- LEADS --
-- Os pedidos continuam FECHADOS ao público (têm nome, e-mail e telefone).
-- Passa a haver leitura para quem está AUTENTICADO — é a conta de
-- administração, criada pela KYPZL no painel do Supabase (Authentication →
-- Users). Não há registo aberto: sem utilizador criado à mão, ninguém lê.
create policy "orders_authenticated_select" on public.orders
  for select to authenticated using (true);

-- --------------------------------------------------------------- MODELOS --
-- Um modelo é a arte de UMA peça, convertida em camadas de cor.
-- O conjunto junta-se pelo `cod_modelo`: as três peças com o mesmo código
-- são o mesmo tema, e é isso que o cadeado do simulador sincroniza. Uma peça
-- sem modelo próprio fica com a cor base — não parte nada.
create table public.kit_templates (
  id uuid primary key default gen_random_uuid(),
  cod_modelo text not null,              -- "007": junta as peças num tema
  nome text not null,                    -- "Aston Vila"
  peca text not null check (peca in ('camisola', 'calcao', 'meiao')),
  lado text not null default 'frente' check (lado in ('frente', 'verso')),
  quadro jsonb not null,                 -- { x, y, w, h } — caixa do molde
  cor_fundo text,                        -- null = usa a cor base da peça
  camadas jsonb not null,                -- [{ id, cor, svg }]
  enabled boolean not null default true,
  created_at timestamptz not null default now(),

  -- a mesma peça do mesmo tema não pode entrar duas vezes: sem isto, um
  -- envio repetido punha duas artes sobrepostas na mesma camisola
  unique (cod_modelo, peca, lado)
);

create index kit_templates_ativos on public.kit_templates (cod_modelo)
  where enabled;

alter table public.kit_templates enable row level security;

-- O simulador é público: qualquer visitante tem de conseguir LER os modelos
-- ativos. Escrever é só para a conta de administração.
create policy "kit_templates_public_select" on public.kit_templates
  for select to anon, authenticated using (enabled);

create policy "kit_templates_admin_all" on public.kit_templates
  for all to authenticated using (true) with check (true);
