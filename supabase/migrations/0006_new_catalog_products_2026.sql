-- Camisolas avulsas novas + equipamentos completos (Catálogo em desenvolvimento).
insert into public.products (id, name, category, template, regions, base_images, sort_order) values
('batistuta', 'Camisola Batistuta', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/batistuta.jpg","back":"/products/batistuta.jpg"}'::jsonb, 10),
('totti', 'Camisola Totti', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/totti.jpg","back":"/products/totti.jpg"}'::jsonb, 11),
('kit-champions', 'Equipamento Champions', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-champions.jpg","back":"/products/kit-champions.jpg"}'::jsonb, 12),
('kit-galatico', 'Equipamento Galático', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-galatico.jpg","back":"/products/kit-galatico.jpg"}'::jsonb, 13),
('kit-titan', 'Equipamento Titan', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-titan.jpg","back":"/products/kit-titan.jpg"}'::jsonb, 14),
('kit-olimpico-vermelho', 'Equipamento Olímpico Vermelho', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-olimpico-vermelho.jpg","back":"/products/kit-olimpico-vermelho.jpg"}'::jsonb, 15),
('kit-olimpico-verde', 'Equipamento Olímpico Verde', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-olimpico-verde.jpg","back":"/products/kit-olimpico-verde.jpg"}'::jsonb, 16),
('kit-olimpico-azul', 'Equipamento Olímpico Azul', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-olimpico-azul.jpg","back":"/products/kit-olimpico-azul.jpg"}'::jsonb, 17),
('kit-guarda-redes', 'Equipamento Guarda-Redes', 'jogo', 'image', '[]'::jsonb, '{"front":"/products/kit-guarda-redes.jpg","back":"/products/kit-guarda-redes.jpg"}'::jsonb, 18)
on conflict (id) do update set
  name = excluded.name, category = excluded.category, template = excluded.template,
  regions = excluded.regions, base_images = excluded.base_images, sort_order = excluded.sort_order;
