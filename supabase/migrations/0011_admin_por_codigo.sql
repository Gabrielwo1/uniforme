-- A administração passou a entrar por CÓDIGO, verificado na Edge Function
-- `admin` (supabase/functions/admin). Já não há conta de utilizador, por
-- isso as políticas que dependiam de sessão iniciada ficaram mortas.
--
-- Deixá-las era pior do que removê-las: qualquer utilizador que viesse a
-- ser criado no futuro, por qualquer motivo, passaria a ler todos os
-- pedidos sem que ninguém tivesse decidido isso.

drop policy if exists "orders_authenticated_select" on public.orders;
drop policy if exists "kit_templates_admin_all" on public.kit_templates;

-- Fica só: `orders` insert para anon (o simulador grava o pedido) e
-- `kit_templates` select público dos ativos (o simulador desenha os temas).
-- Tudo o resto passa pela Edge Function, com a chave de serviço.
