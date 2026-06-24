insert into public.products (id, name, category, template, regions, sort_order) values
(
  'shirt-classic', 'Camisa Clássica', 'camisa', 'shirt',
  '[{"key":"body","label":"Corpo","defaultColor":"#1e88e5"},{"key":"sleeves","label":"Mangas","defaultColor":"#1565c0"},{"key":"collar","label":"Gola","defaultColor":"#ffffff"}]'::jsonb,
  1
),
(
  'shorts-pro', 'Calção Pro', 'calcao', 'shorts',
  '[{"key":"body","label":"Corpo","defaultColor":"#222831"},{"key":"waist","label":"Cós","defaultColor":"#e0e0e0"},{"key":"stripe","label":"Faixa lateral","defaultColor":"#ff5722"}]'::jsonb,
  2
)
on conflict (id) do nothing;
