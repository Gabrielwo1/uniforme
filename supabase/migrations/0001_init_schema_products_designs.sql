-- Catálogo de produtos (metadados; o render SVG por cor fica no client).
create table public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('camisa','calcao')),
  template text not null,                       -- 'shirt' | 'shorts' -> render no client
  regions jsonb not null default '[]'::jsonb,   -- ColorRegion[]
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Designs / orçamentos salvos (DesignState completo em JSONB).
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Sem nome',
  state jsonb not null,                          -- DesignState
  preview text,                                  -- URL/dataURL do PNG (opcional)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index designs_created_at_idx on public.designs (created_at desc);

-- updated_at automático.
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger designs_set_updated_at
before update on public.designs
for each row execute function public.set_updated_at();

-- RLS habilitado. SEM AUTH (MVP): acesso público via role anon/authenticated.
-- Nota: políticas permissivas — endurecer ao adicionar autenticação.
alter table public.products enable row level security;
alter table public.designs  enable row level security;

create policy "products_public_all" on public.products
  for all to anon, authenticated using (true) with check (true);

create policy "designs_public_all" on public.designs
  for all to anon, authenticated using (true) with check (true);
