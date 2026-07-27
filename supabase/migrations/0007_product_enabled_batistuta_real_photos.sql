-- Fase piloto: só a Camisola Batistuta fica visível no catálogo (agora com
-- fotos reais do produto, estilo "ghost mannequin"). Os demais produtos
-- continuam guardados na base — só ficam ocultos da seleção.
alter table public.products add column if not exists enabled boolean not null default true;

update public.products
set base_images = '{"front":"/products/batistuta-front.png","back":"/products/batistuta-back.png"}'::jsonb
where id = 'batistuta';

update public.products set enabled = false where id <> 'batistuta';
