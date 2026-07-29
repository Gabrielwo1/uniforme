-- Volta a mostrar todo o catálogo na listagem de modelos (demonstração ao
-- cliente). Para voltar à fase piloto só com a Batistuta:
--   update public.products set enabled = false where id <> 'batistuta';
update public.products set enabled = true;
