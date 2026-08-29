create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Preserve each privileged implementation and its dependency OID while moving
-- it outside the schemas exposed by PostgREST.
alter function public.belongs_to_barbershop(uuid) set schema private;
alter function public.cancel_my_appointment(uuid) set schema private;
alter function public.create_appointment(uuid,uuid,uuid,date,time,text,text) set schema private;
alter function public.current_profile_employee_id() set schema private;
alter function public.current_profile_name() set schema private;
alter function public.is_business_manager(uuid) set schema private;
alter function public.is_business_team(uuid) set schema private;
alter function public.is_platform_admin() set schema private;
alter function public.list_services_catalog(uuid) set schema private;
alter function public.platform_archive_business(uuid) set schema private;
alter function public.platform_check_rate_limit(text,integer) set schema private;
alter function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) set schema private;
alter function public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text) set schema private;
alter function public.platform_record_payment(uuid,text,numeric,numeric,text,text) set schema private;
alter function public.platform_register_refund(uuid,numeric,text,text) set schema private;

-- Public API wrappers retain the existing RPC contract but execute with the
-- caller's privileges. Privilege escalation remains confined to private.*.
create function public.belongs_to_barbershop(target_id uuid)
returns boolean language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.belongs_to_barbershop(target_id) $$;

create function public.cancel_my_appointment(appointment_id uuid)
returns boolean language sql security invoker
set search_path = pg_catalog, public, private
as $$ select private.cancel_my_appointment(appointment_id) $$;

create function public.create_appointment(
    target_barbershop_id uuid,
    target_service_id uuid,
    target_employee_id uuid,
    target_date date,
    target_time time,
    supplied_client_name text default null,
    supplied_client_email text default null
) returns public.business_appointments
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.create_appointment(
        target_barbershop_id, target_service_id, target_employee_id,
        target_date, target_time, supplied_client_name, supplied_client_email
    )
$$;

create function public.current_profile_employee_id()
returns uuid language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.current_profile_employee_id() $$;

create function public.current_profile_name()
returns text language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.current_profile_name() $$;

create function public.is_business_manager(target_id uuid)
returns boolean language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_business_manager(target_id) $$;

create function public.is_business_team(target_id uuid)
returns boolean language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_business_team(target_id) $$;

create function public.is_platform_admin()
returns boolean language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.is_platform_admin() $$;

create function public.list_services_catalog(target_barbershop_id uuid)
returns table(
    id uuid, name text, description text, duration_minutes integer,
    price numeric, cost numeric, category text, active boolean
)
language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.list_services_catalog(target_barbershop_id) $$;

create function public.platform_archive_business(target_shop_id uuid)
returns boolean language sql security invoker
set search_path = pg_catalog, public, private
as $$ select private.platform_archive_business(target_shop_id) $$;

create function public.platform_check_rate_limit(action_name text, max_actions integer default 30)
returns boolean language sql security invoker
set search_path = pg_catalog, public, private
as $$ select private.platform_check_rate_limit(action_name, max_actions) $$;

create function public.platform_create_business(
    business_name text, business_segment text, responsible_name text,
    responsible_email text, business_phone text, plan_name text,
    plan_price numeric, business_origin text, business_notes text
) returns public.saas_clients
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.platform_create_business(
        business_name, business_segment, responsible_name, responsible_email,
        business_phone, plan_name, plan_price, business_origin, business_notes
    )
$$;

create function public.platform_create_invoice(
    target_saas_client_id uuid,
    invoice_due_date date,
    invoice_items jsonb,
    invoice_discount numeric default 0,
    invoice_credit numeric default 0,
    invoice_notes text default ''
) returns public.platform_invoices
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.platform_create_invoice(
        target_saas_client_id, invoice_due_date, invoice_items,
        invoice_discount, invoice_credit, invoice_notes
    )
$$;

create function public.platform_record_payment(
    target_invoice_id uuid,
    payment_method text,
    payment_amount numeric,
    payment_fee numeric default 0,
    payment_provider text default 'manual',
    external_id text default null
) returns public.platform_payments
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.platform_record_payment(
        target_invoice_id, payment_method, payment_amount,
        payment_fee, payment_provider, external_id
    )
$$;

create function public.platform_register_refund(
    target_payment_id uuid,
    refund_amount numeric,
    refund_kind text,
    refund_reason text
) returns public.platform_refunds
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.platform_register_refund(
        target_payment_id, refund_amount, refund_kind, refund_reason
    )
$$;

-- New functions receive PUBLIC execute by default, so close that window and
-- explicitly expose only the authenticated wrappers used by the application.
revoke all on function
    public.belongs_to_barbershop(uuid),
    public.cancel_my_appointment(uuid),
    public.create_appointment(uuid,uuid,uuid,date,time,text,text),
    public.current_profile_employee_id(),
    public.current_profile_name(),
    public.is_business_manager(uuid),
    public.is_business_team(uuid),
    public.is_platform_admin(),
    public.list_services_catalog(uuid),
    public.platform_archive_business(uuid),
    public.platform_check_rate_limit(text,integer),
    public.platform_create_business(text,text,text,text,text,text,numeric,text,text),
    public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text),
    public.platform_record_payment(uuid,text,numeric,numeric,text,text),
    public.platform_register_refund(uuid,numeric,text,text)
from public, anon;

grant execute on function
    public.belongs_to_barbershop(uuid),
    public.cancel_my_appointment(uuid),
    public.create_appointment(uuid,uuid,uuid,date,time,text,text),
    public.current_profile_employee_id(),
    public.current_profile_name(),
    public.is_business_manager(uuid),
    public.is_business_team(uuid),
    public.is_platform_admin(),
    public.list_services_catalog(uuid),
    public.platform_archive_business(uuid),
    public.platform_check_rate_limit(text,integer),
    public.platform_create_business(text,text,text,text,text,text,numeric,text,text),
    public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text),
    public.platform_record_payment(uuid,text,numeric,numeric,text,text),
    public.platform_register_refund(uuid,numeric,text,text)
to authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
