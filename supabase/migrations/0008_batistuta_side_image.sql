-- Camisola Batistuta ganha a foto de perfil (lado), além de frente/verso.
-- `base_images.side` é opcional: só produtos com essa foto mostram a aba
-- "Lado" no editor (ver productSides em src/lib/products.ts).
update public.products
set base_images = base_images || '{"side":"/products/batistuta-side.png"}'::jsonb
where id = 'batistuta';
