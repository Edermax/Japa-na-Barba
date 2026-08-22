-- Central master: relaciona a carteira comercial à operação e concede acesso
-- total somente aos usuários registrados em platform_admins.
alter table public.saas_clients add column if not exists barbershop_id uuid;
grant select, insert, update, delete on public.barbershops, public.profiles, public.services, public.employees to authenticated;
create unique index if not exists saas_clients_barbershop_key
on public.saas_clients (barbershop_id) where barbershop_id is not null;

update public.saas_clients sc set barbershop_id = b.id
from public.barbershops b
where sc.barbershop_id is null and lower(sc.name) = lower(b.name);

create or replace function public.is_business_team(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles where id = auth.uid() and active = true
          and barbershop_id = target_id and role in ('owner', 'admin', 'employee')
    );
$$;

create or replace function public.is_business_manager(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles where id = auth.uid() and active = true
          and barbershop_id = target_id and role in ('owner', 'admin')
    );
$$;

create or replace function public.belongs_to_barbershop(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles where id = auth.uid() and active = true and barbershop_id = target_id
    );
$$;

-- Tabelas que tinham políticas próprias sem usar os helpers acima.
drop policy if exists "Platform admins manage barbershops" on public.barbershops;
create policy "Platform admins manage barbershops" on public.barbershops
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Platform admins manage profiles" on public.profiles;
create policy "Platform admins manage profiles" on public.profiles
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Platform admins manage services" on public.services;
create policy "Platform admins manage services" on public.services
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Platform admins manage employees" on public.employees;
create policy "Platform admins manage employees" on public.employees
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Platform admins manage financial entries" on public.financial_entries;
create policy "Platform admins manage financial entries" on public.financial_entries
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "Platform admins manage privacy requests" on public.privacy_requests;
create policy "Platform admins manage privacy requests" on public.privacy_requests
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Cria a unidade operacional junto com o cadastro comercial.
create or replace function public.platform_create_business(
    business_name text, business_segment text, responsible_name text,
    responsible_email text, business_phone text, plan_name text,
    plan_price numeric, business_origin text, business_notes text
) returns public.saas_clients
language plpgsql security definer set search_path = public as $$
declare shop public.barbershops; result public.saas_clients;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
    insert into public.barbershops (name) values (business_name) returning * into shop;
    insert into public.saas_clients
        (name, segment, contact_name, owner_email, phone, plan, monthly_fee, origin, notes, invite_status, barbershop_id)
    values
        (business_name, business_segment, responsible_name, lower(responsible_email), nullif(business_phone,''),
         plan_name, plan_price, business_origin, nullif(business_notes,''), 'Pendente', shop.id)
    returning * into result;
    return result;
end;
$$;
revoke all on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) from public;
grant execute on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) to authenticated;
