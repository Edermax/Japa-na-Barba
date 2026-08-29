begin;
set local search_path = public, extensions;
select extensions.plan(108);
select extensions.has_table('public', 'barbershops', 'barbershops existe');
select extensions.has_table('public', 'profiles', 'profiles existe');
select extensions.has_table('public', 'business_appointments', 'agenda existe');
select extensions.has_table('public', 'business_settings', 'configurações existem');
select extensions.has_table('public', 'employee_services', 'vínculo entre profissional e serviço existe');
select extensions.has_table('public', 'employee_working_hours', 'jornada individual existe');
select extensions.has_table('public', 'employee_time_off', 'bloqueios e folgas existem');
select extensions.has_table('public', 'platform_admin_events', 'auditoria administrativa existe');
select extensions.has_table('public', 'landing_pages', 'landing pages existem');
select extensions.has_table('public', 'landing_page_sections', 'seções da landing page existem');
select extensions.has_table('public', 'landing_page_leads', 'leads da landing page existem');
select extensions.has_table('public', 'quote_requests', 'solicitações de orçamento existem');
select extensions.has_table('public', 'quote_proposals', 'propostas comerciais existem');
select extensions.has_table('public', 'quote_proposal_items', 'itens de proposta existem');
select extensions.has_table('public', 'quote_status_history', 'histórico de negociação existe');
select extensions.has_table('public', 'online_menus', 'cardápios online existem');
select extensions.has_table('public', 'menu_categories', 'categorias do cardápio existem');
select extensions.has_table('public', 'menu_items', 'itens do cardápio existem');
select extensions.has_table('public', 'menu_item_prices', 'preços do cardápio existem');
select extensions.has_table('public', 'menu_orders', 'pedidos do cardápio existem');
select extensions.has_table('public', 'menu_order_items', 'itens dos pedidos existem');
select extensions.has_function('public', 'create_appointment', array['uuid','uuid','uuid','date','time without time zone','text','text'], 'RPC de agenda existe');
select extensions.has_function('public', 'is_platform_admin', array[]::text[], 'helper master existe');
select extensions.has_function('public', 'current_profile_employee_id', array[]::text[], 'helper de vínculo do funcionário existe');
select extensions.has_function('public', 'list_available_slots', array['uuid','uuid','uuid','date'], 'consulta de disponibilidade existe');
select extensions.has_function('public', 'save_staff_availability', array['uuid','uuid','uuid[]','jsonb','jsonb'], 'salvamento transacional de disponibilidade existe');
select extensions.has_function('public', 'public_booking_page', array['text'], 'catálogo público existe');
select extensions.has_function('public', 'public_available_slots', array['text','uuid','uuid','date'], 'horários públicos existem');
select extensions.has_function('public', 'public_create_appointment', array['text','uuid','uuid','date','time without time zone','text','text','text','boolean','text'], 'criação pública existe');
select extensions.has_function('public', 'public_get_appointment', array['text','text'], 'consulta pública protegida existe');
select extensions.has_function('public', 'public_cancel_appointment', array['text','text'], 'cancelamento público protegido existe');
select extensions.has_function('public', 'public_landing_page', array['text'], 'consulta pública da landing page existe');
select extensions.has_function('public', 'public_submit_landing_lead', array['text','text','text','text','text','boolean','text'], 'captura pública de lead existe');
select extensions.has_function('public', 'public_submit_quote_request', array['text','text','text','text','text','text','jsonb','date','numeric','numeric','boolean','text'], 'solicitação pública de orçamento existe');
select extensions.has_function('public', 'send_quote_proposal', array['uuid'], 'envio autenticado de proposta existe');
select extensions.has_function('public', 'public_get_quote_proposal', array['text','text'], 'consulta protegida de proposta existe');
select extensions.has_function('public', 'public_respond_quote_proposal', array['text','text','text'], 'resposta protegida à proposta existe');
select extensions.has_function('public', 'public_menu', array['text'], 'consulta pública do cardápio existe');
select extensions.has_function('public', 'public_create_menu_order', array['text','text','text','text','text','jsonb','text','jsonb','boolean','text'], 'criação pública de pedido existe');
select extensions.has_function('public', 'public_get_menu_order', array['text','text'], 'consulta protegida do pedido existe');
select extensions.has_function('public', 'platform_archive_business', array['uuid'], 'arquivamento transacional de negócio existe');
select extensions.has_schema('private', 'schema privado de funções privilegiadas existe');
select extensions.ok(exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_id_fkey' and contype='f'), 'perfil referencia auth.users');
select extensions.ok(exists(select 1 from pg_constraint where conrelid='public.services'::regclass and conname='services_barbershop_id_fkey' and contype='f'), 'serviço referencia empresa');
select extensions.ok(exists(select 1 from pg_constraint where conrelid='public.employees'::regclass and conname='employees_barbershop_id_fkey' and contype='f'), 'profissional referencia empresa');
select extensions.ok(exists(select 1 from pg_constraint where conrelid='public.business_appointments'::regclass and conname='business_appointments_barbershop_fk' and contype='f'), 'agenda referencia empresa');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.business_appointments'::regclass), true, 'RLS ativa na agenda');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.employee_working_hours'::regclass), true, 'RLS ativa na jornada');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.employee_time_off'::regclass), true, 'RLS ativa nas folgas');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.platform_admin_events'::regclass), true, 'RLS ativa na auditoria master');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.business_clients'::regclass), true, 'RLS ativa em clientes');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.financial_entries'::regclass), true, 'RLS ativa no financeiro');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.privacy_requests'::regclass), true, 'RLS ativa em pedidos LGPD');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.platform_invoices'::regclass), true, 'RLS ativa em faturas');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.platform_payments'::regclass), true, 'RLS ativa em pagamentos');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.landing_pages'::regclass), true, 'RLS ativa em landing pages');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.landing_page_sections'::regclass), true, 'RLS ativa nas seções da landing page');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.landing_page_leads'::regclass), true, 'RLS ativa nos leads');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.quote_requests'::regclass), true, 'RLS ativa nas solicitações de orçamento');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.quote_proposals'::regclass), true, 'RLS ativa nas propostas');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.quote_proposal_items'::regclass), true, 'RLS ativa nos itens de proposta');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.quote_status_history'::regclass), true, 'RLS ativa no histórico de negociação');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.online_menus'::regclass), true, 'RLS ativa nos cardápios');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.menu_categories'::regclass), true, 'RLS ativa nas categorias do cardápio');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.menu_items'::regclass), true, 'RLS ativa nos itens do cardápio');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.menu_item_prices'::regclass), true, 'RLS ativa nos preços do cardápio');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.menu_orders'::regclass), true, 'RLS ativa nos pedidos');
select extensions.is((select relrowsecurity from pg_class where oid = 'public.menu_order_items'::regclass), true, 'RLS ativa nos itens dos pedidos');
select extensions.ok(not exists(
    select 1 from information_schema.role_table_grants
    where table_schema='public' and grantee='anon'
      and table_name in (
        'landing_pages','landing_page_sections','landing_page_leads','quote_requests',
        'quote_proposals','quote_proposal_items','quote_status_history','online_menus',
        'menu_categories','menu_items','menu_item_prices','menu_orders','menu_order_items'
      )
), 'anon não recebe grants diretos nas soluções comerciais');
select extensions.ok((
    select count(*) = 14
    from pg_constraint con
    join pg_class rel on rel.oid=con.conrelid
    join pg_namespace n on n.oid=rel.relnamespace
    where n.nspname='public' and con.contype='f' and array_length(con.conkey,1)=2
      and rel.relname in (
        'landing_page_sections','landing_page_leads','quote_requests','quote_proposals',
        'quote_proposal_items','quote_status_history','menu_categories','menu_items',
        'menu_item_prices','menu_orders','menu_order_items'
      )
), 'relações comerciais possuem 14 FKs compostas com isolamento por empresa');

select extensions.ok(not has_function_privilege('anon', 'public.is_platform_admin()', 'EXECUTE'), 'anon não executa helper master');
select extensions.ok(not has_function_privilege('anon', 'public.platform_create_business(text,text,text,text,text,text,numeric,text,text)', 'EXECUTE'), 'anon não cria negócios');
select extensions.ok(not has_function_privilege('anon', 'public.platform_record_payment(uuid,text,numeric,numeric,text,text)', 'EXECUTE'), 'anon não registra pagamentos');
select extensions.ok(not has_function_privilege('anon', 'public.create_appointment(uuid,uuid,uuid,date,time without time zone,text,text)', 'EXECUTE'), 'anon não chama RPC autenticada de agenda');
select extensions.ok(has_function_privilege('authenticated', 'public.create_appointment(uuid,uuid,uuid,date,time without time zone,text,text)', 'EXECUTE'), 'authenticated chama RPC de agenda');
select extensions.ok(not has_function_privilege('anon', 'public.current_profile_employee_id()', 'EXECUTE'), 'anon não consulta vínculo de funcionário');
select extensions.ok(has_function_privilege('authenticated', 'public.current_profile_employee_id()', 'EXECUTE'), 'authenticated consulta o próprio vínculo de funcionário');
select extensions.ok(not has_function_privilege('anon', 'public.platform_archive_business(uuid)', 'EXECUTE'), 'anon não arquiva negócio');
select extensions.ok(not has_function_privilege('anon', 'public.save_staff_availability(uuid,uuid,uuid[],jsonb,jsonb)', 'EXECUTE'), 'anon não altera disponibilidade');
select extensions.ok(has_function_privilege('authenticated', 'public.save_staff_availability(uuid,uuid,uuid[],jsonb,jsonb)', 'EXECUTE'), 'gestor autenticado pode chamar configuração de disponibilidade');
select extensions.ok(has_function_privilege('anon', 'public.public_create_appointment(text,uuid,uuid,date,time without time zone,text,text,text,boolean,text)', 'EXECUTE'), 'visitante pode solicitar agendamento pela RPC limitada');
select extensions.ok(has_function_privilege('anon', 'private.public_create_appointment(text,uuid,uuid,date,time without time zone,text,text,text,boolean,text)', 'EXECUTE'), 'wrapper público alcança implementação no schema não exposto');
select extensions.ok(not has_table_privilege('anon', 'private.public_booking_attempts', 'SELECT'), 'visitante não lê controle antiabuso');
select extensions.ok(not has_function_privilege('anon', 'public.get_public_booking_settings(uuid)', 'EXECUTE'), 'visitante não lê configuração administrativa');
select extensions.ok(has_function_privilege('authenticated', 'public.set_public_booking_settings(uuid,text,boolean)', 'EXECUTE'), 'gestor autenticado configura agenda pública');
select extensions.ok(not has_function_privilege('anon', 'public.send_quote_proposal(uuid)', 'EXECUTE'), 'visitante não envia proposta comercial');
select extensions.ok((select count(*)=8 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('public_landing_page','public_submit_landing_lead',
      'public_submit_quote_request','public_get_quote_proposal','public_respond_quote_proposal',
      'public_menu','public_create_menu_order','public_get_menu_order')
      and has_function_privilege('anon',p.oid,'EXECUTE')), 'visitante executa somente os oito endpoints comerciais limitados');
select extensions.is((select relrowsecurity from pg_class where oid='private.public_commercial_attempts'::regclass), true, 'RLS ativa no rate limit comercial');
select extensions.ok(not has_table_privilege('anon','private.public_commercial_attempts','SELECT'), 'visitante não lê rate limit comercial');
select extensions.ok((select count(*)=8 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('public_landing_page','public_submit_landing_lead',
      'public_submit_quote_request','public_get_quote_proposal','public_respond_quote_proposal',
      'public_menu','public_create_menu_order','public_get_menu_order') and not p.prosecdef),
    'wrappers comerciais públicos são SECURITY INVOKER');

select extensions.ok(not has_function_privilege('authenticated', 'public.ogritech_set_updated_at()', 'EXECUTE'), 'cliente não executa trigger de updated_at');
select extensions.ok(not has_function_privilege('authenticated', 'public.log_personal_data_change()', 'EXECUTE'), 'cliente não executa trigger de auditoria');
select extensions.ok(not has_function_privilege('authenticated', 'public.platform_sync_client_subscription()', 'EXECUTE'), 'cliente não executa trigger de assinatura');
select extensions.ok(not has_function_privilege('authenticated', 'public.platform_ensure_billing_customer(uuid)', 'EXECUTE'), 'cliente não executa helper interno de faturamento');
select extensions.ok(not exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
), 'schema público não expõe SECURITY DEFINER a authenticated');
select extensions.ok((
    select count(*) >= 15
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prosecdef
), 'implementações privilegiadas permanecem isoladas no schema privado');
select extensions.ok(not exists(
    select 1
    from pg_policies, unnest(roles) as policy_role
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by schemaname, tablename, policy_role, cmd
    having count(*) > 1
), 'não existem políticas permissivas sobrepostas por tabela, papel e ação');

select extensions.ok(exists(select 1 from pg_policies where schemaname='public' and tablename='business_appointments' and cmd='SELECT'), 'agenda possui policy SELECT');
select extensions.ok(exists(select 1 from pg_policies where schemaname='public' and tablename='business_appointments' and cmd='UPDATE'), 'agenda possui policy UPDATE');
select extensions.ok(exists(select 1 from pg_policies where schemaname='public' and tablename='business_clients' and cmd='UPDATE' and with_check is not null), 'clientes possui WITH CHECK no UPDATE');
select extensions.ok((select count(*) = 2 from pg_policies where schemaname='public' and tablename='services' and cmd in ('INSERT','UPDATE') and with_check is not null), 'serviços possui WITH CHECK em INSERT e UPDATE');
select extensions.ok((select count(*) = 2 from pg_policies where schemaname='public' and tablename='employees' and cmd in ('INSERT','UPDATE') and with_check is not null), 'equipe possui WITH CHECK em INSERT e UPDATE');
select extensions.ok(has_table_privilege('authenticated', 'public.business_appointments', 'SELECT'), 'Data API autenticada acessa agenda sob RLS');
select extensions.ok(has_table_privilege('authenticated', 'public.business_clients', 'INSERT'), 'Data API autenticada insere clientes sob RLS');
select extensions.ok(not has_table_privilege('anon', 'public.platform_invoices', 'SELECT'), 'anon não acessa faturamento da plataforma');
select extensions.ok(not exists(
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
), 'todas as tabelas public possuem RLS');
select extensions.ok(exists(
    select 1 from pg_constraint
    where conrelid='public.business_appointments'::regclass
      and conname='business_appointments_no_employee_overlap'
      and contype='x'
), 'agenda possui constraint contra sobreposição por funcionário');
select extensions.col_type_is('public', 'business_appointments', 'appointment_period', 'tsrange', 'agenda materializa período do atendimento');
select * from extensions.finish();
rollback;
