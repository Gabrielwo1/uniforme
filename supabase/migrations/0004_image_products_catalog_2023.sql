-- Produtos baseados em imagem (renders do Catálogo KYPZL 2023).
-- base_images: {front, back} — caminhos servidos pelo app (ou URLs absolutas).
alter table public.products add column if not exists base_images jsonb;

-- Categorias passam a seguir as seções do catálogo.
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('jogo','treino','saida','camisa','calcao'));

-- Remove os placeholders SVG; entra o catálogo real.
delete from public.products where id in ('shirt-classic','shorts-pro');

insert into public.products (id, name, category, template, regions, base_images, sort_order) values
('maradona',  'Camisola Maradona',  'jogo',   'image', '[]'::jsonb, '{"front":"/products/maradona.png","back":"/products/maradona.png"}'::jsonb, 1),
('garrincha', 'Camisola Garrincha', 'jogo',   'image', '[]'::jsonb, '{"front":"/products/garrincha.png","back":"/products/garrincha.png"}'::jsonb, 2),
('zenga',     'Camisola Zenga',     'jogo',   'image', '[]'::jsonb, '{"front":"/products/zenga.png","back":"/products/zenga.png"}'::jsonb, 3),
('taffarel',  'Camisola Taffarel',  'jogo',   'image', '[]'::jsonb, '{"front":"/products/taffarel.png","back":"/products/taffarel.png"}'::jsonb, 4),
('nene',      'Calção Nené',        'jogo',   'image', '[]'::jsonb, '{"front":"/products/nene.png","back":"/products/nene.png"}'::jsonb, 5),
('elite',     'Meia de Jogo Elite', 'jogo',   'image', '[]'::jsonb, '{"front":"/products/elite.png","back":"/products/elite.png"}'::jsonb, 6),
('socrates',  'T-shirt Sócrates',   'treino', 'image', '[]'::jsonb, '{"front":"/products/socrates.png","back":"/products/socrates.png"}'::jsonb, 7),
('zico',      'Calção Zico',        'treino', 'image', '[]'::jsonb, '{"front":"/products/zico.png","back":"/products/zico.png"}'::jsonb, 8),
('bebeto',    'Polo Técnico Bebeto','saida',  'image', '[]'::jsonb, '{"front":"/products/bebeto.png","back":"/products/bebeto.png"}'::jsonb, 9)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, template = excluded.template,
  regions = excluded.regions, base_images = excluded.base_images, sort_order = excluded.sort_order;
