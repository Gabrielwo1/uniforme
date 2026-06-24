-- Bucket público para logos/patrocínios enviados pelos clientes.
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Políticas públicas (MVP sem auth) restritas ao bucket 'logos'.
-- Obs.: NÃO criamos policy de SELECT ampla — em bucket público a URL do objeto
-- já serve o arquivo, e uma SELECT ampla permitiria listar todos os arquivos.
create policy "logos_public_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'logos');

create policy "logos_public_update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'logos') with check (bucket_id = 'logos');

create policy "logos_public_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'logos');
