-- Pedidos (sem preço/cobrança — orçamento a combinar com a KYPZL).
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer jsonb not null,   -- { name, email, phone?, club?, notes? }
  items jsonb not null,      -- OrderItem[]: { productId, productName, design, preview }
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Anon pode CRIAR pedidos, mas não LER (contêm dados pessoais).
-- A KYPZL consulta os pedidos pelo dashboard do Supabase (service role).
create policy "orders_public_insert" on public.orders
  for insert to anon, authenticated with check (true);
