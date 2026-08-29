-- PostgreSQL concede EXECUTE a PUBLIC por padrão. Como estas funções fazem parte
-- da superfície da Data API, remova o acesso implícito e conceda somente o mínimo
-- necessário. Funções de trigger não recebem concessão direta para clientes.

revoke all on function public.belongs_to_barbershop(uuid) from public, anon;
revoke all on function public.is_business_team(uuid) from public, anon;
revoke all on function public.is_business_manager(uuid) from public, anon;
revoke all on function public.current_profile_name() from public, anon;
revoke all on function public.cancel_my_appointment(uuid) from public, anon;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) from public, anon;
revoke all on function public.platform_check_rate_limit(text,integer) from public, anon;
revoke all on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) from public, anon;
revoke all on function public.list_services_catalog(uuid) from public, anon;
revoke all on function public.platform_ensure_billing_customer(uuid) from public, anon;
revoke all on function public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text) from public, anon;
revoke all on function public.platform_record_payment(uuid,text,numeric,numeric,text,text) from public, anon;
revoke all on function public.platform_register_refund(uuid,numeric,text,text) from public, anon;
revoke all on function public.ogritech_set_updated_at() from public, anon, authenticated;
revoke all on function public.log_personal_data_change() from public, anon, authenticated;
revoke all on function public.platform_sync_client_subscription() from public, anon, authenticated;

grant execute on function public.belongs_to_barbershop(uuid) to authenticated;
grant execute on function public.is_business_team(uuid) to authenticated;
grant execute on function public.is_business_manager(uuid) to authenticated;
grant execute on function public.current_profile_name() to authenticated;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) to authenticated;
grant execute on function public.platform_check_rate_limit(text,integer) to authenticated;
grant execute on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) to authenticated;
grant execute on function public.list_services_catalog(uuid) to authenticated;
grant execute on function public.platform_ensure_billing_customer(uuid) to authenticated;
grant execute on function public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text) to authenticated;
grant execute on function public.platform_record_payment(uuid,text,numeric,numeric,text,text) to authenticated;
grant execute on function public.platform_register_refund(uuid,numeric,text,text) to authenticated;

-- A exposição de tabelas novas ao Data API deixou de ser automática. Estas
-- concessões tornam o acesso autenticado explícito; as políticas RLS continuam
-- determinando quais linhas cada usuário pode ler ou alterar.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
    grant usage, select on sequences to authenticated;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
