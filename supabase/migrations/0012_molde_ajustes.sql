-- Ajustes finos da prancheta (editor de camadas do admin).
--
-- Cada lado (frente/verso) tem UM documento com o deslocamento de cada camada
-- da prancheta — jogador, botas e as zonas de cada peça — em píxeis da tela
-- comum (1520×2460). O que o simulador lê é `publicado`; `rascunho` é o que
-- o admin está a afinar e ainda não foi para o ar.
--
-- A leitura é pública (o simulador tem de a fazer, e um deslocamento de
-- camada não é segredo). Escrever só a Edge Function `admin`, com a chave de
-- serviço, depois de conferir o código.

create table if not exists public.molde_ajustes (
  lado text primary key check (lado in ('frente', 'verso')),
  publicado jsonb not null default '{}'::jsonb,
  rascunho jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.molde_ajustes enable row level security;

drop policy if exists "molde_ajustes_select_publico" on public.molde_ajustes;
create policy "molde_ajustes_select_publico"
  on public.molde_ajustes for select
  to anon, authenticated
  using (true);

insert into public.molde_ajustes (lado) values ('frente'), ('verso')
  on conflict (lado) do nothing;

-- Histórico de publicações: dá para voltar a qualquer versão anterior.
-- Sem políticas: só a Edge Function, com a chave de serviço, lê e escreve.
create table if not exists public.molde_ajustes_hist (
  id bigint generated always as identity primary key,
  lado text not null check (lado in ('frente', 'verso')),
  dados jsonb not null,
  nota text,
  criado_em timestamptz not null default now()
);

alter table public.molde_ajustes_hist enable row level security;

create index if not exists molde_ajustes_hist_lado_idx
  on public.molde_ajustes_hist (lado, criado_em desc);
