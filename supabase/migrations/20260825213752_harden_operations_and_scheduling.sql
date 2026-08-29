-- Corrige concorrência de agenda, identidade de funcionários e índices de FKs.
create extension if not exists btree_gist with schema extensions;

alter table public.business_appointments
    add column if not exists appointment_period tsrange
    generated always as (
        tsrange(
            appointment_date + appointment_time,
            appointment_date + appointment_time + duration_minutes * interval '1 minute',
            '[)'
        )
    ) stored;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.business_appointments'::regclass
          and conname = 'business_appointments_no_employee_overlap'
    ) then
        alter table public.business_appointments
            add constraint business_appointments_no_employee_overlap
            exclude using gist (
                barbershop_id with =,
                employee_id with =,
                appointment_period with &&
            )
            where (status <> 'cancelled' and employee_id is not null);
    end if;
end $$;

create or replace function public.current_profile_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select employee_id
    from public.profiles
    where id = (select auth.uid()) and active and role = 'employee';
$$;
revoke all on function public.current_profile_employee_id() from public, anon;
grant execute on function public.current_profile_employee_id() to authenticated;

drop policy if exists "Business users view appointments" on public.business_appointments;
create policy "Business users view appointments" on public.business_appointments
for select to authenticated
using (
    public.belongs_to_barbershop(barbershop_id)
    and (
        public.is_business_manager(barbershop_id)
        or employee_id = public.current_profile_employee_id()
        or lower(client_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
);

drop policy if exists "Business team updates appointments" on public.business_appointments;
create policy "Business team updates appointments" on public.business_appointments
for update to authenticated
using (
    public.is_business_manager(barbershop_id)
    or employee_id = public.current_profile_employee_id()
)
with check (
    public.is_business_manager(barbershop_id)
    or employee_id = public.current_profile_employee_id()
);

create or replace function public.create_appointment(
    target_barbershop_id uuid,
    target_service_id uuid,
    target_employee_id uuid,
    target_date date,
    target_time time,
    supplied_client_name text default null,
    supplied_client_email text default null
) returns public.business_appointments
language plpgsql security definer set search_path = public as $$
declare
    caller public.profiles;
    selected_service public.services;
    selected_employee public.employees;
    settings public.business_settings;
    result public.business_appointments;
    effective_name text;
    effective_email text;
    starts_at timestamp;
    ends_at timestamp;
begin
    select * into caller from public.profiles where id = (select auth.uid()) and active = true;
    if caller.id is null or caller.barbershop_id is distinct from target_barbershop_id then
        raise exception 'Acesso negado' using errcode = '42501';
    end if;
    if not exists (select 1 from public.barbershops where id = target_barbershop_id and active and deleted_at is null) then
        raise exception 'Negócio indisponível' using errcode = '42501';
    end if;
    select * into selected_service from public.services
      where id = target_service_id and barbershop_id = target_barbershop_id and active;
    select * into selected_employee from public.employees
      where id = target_employee_id and barbershop_id = target_barbershop_id and active;
    if selected_service.id is null or selected_employee.id is null then
        raise exception 'Serviço ou profissional inválido' using errcode = '22023';
    end if;
    select * into settings from public.business_settings where barbershop_id = target_barbershop_id;
    starts_at := target_date + target_time;
    ends_at := starts_at + make_interval(mins => selected_service.duration_minutes);
    if target_date < current_date then raise exception 'Data inválida' using errcode = '22023'; end if;
    if settings.barbershop_id is not null and (target_time < settings.open_time or ends_at::time > settings.close_time) then
        raise exception 'Horário fora do expediente' using errcode = '22023';
    end if;
    if settings.barbershop_id is not null and starts_at < (now() at time zone settings.timezone) + make_interval(mins => settings.minimum_notice_minutes) then
        raise exception 'Antecedência mínima não atendida' using errcode = '22023';
    end if;
    if caller.role = 'client' then
        effective_name := caller.full_name;
        effective_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
    elsif caller.role in ('owner', 'admin') then
        effective_name := nullif(trim(supplied_client_name), '');
        effective_email := lower(coalesce(nullif(trim(supplied_client_email), ''), ''));
    elsif caller.role = 'employee' and caller.employee_id = selected_employee.id then
        effective_name := nullif(trim(supplied_client_name), '');
        effective_email := lower(coalesce(nullif(trim(supplied_client_email), ''), ''));
    else
        raise exception 'Função sem permissão para criar agendamento' using errcode = '42501';
    end if;
    if effective_name is null or length(effective_name) > 150 or length(effective_email) > 320 then
        raise exception 'Cliente inválido' using errcode = '22023';
    end if;

    insert into public.business_appointments
        (barbershop_id, client_name, client_email, service_id, employee_id, service, professional,
         appointment_date, appointment_time, duration_minutes, price_snapshot, status, created_by)
    values
        (target_barbershop_id, effective_name, effective_email, selected_service.id, selected_employee.id,
         selected_service.name, selected_employee.name, target_date, target_time,
         selected_service.duration_minutes, selected_service.price, 'requested', caller.role)
    returning * into result;
    return result;
exception
    when exclusion_violation or unique_violation then
        raise exception 'Horário indisponível' using errcode = '23505';
end;
$$;
revoke all on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) from public, anon;
grant execute on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) to authenticated;

create or replace function public.platform_archive_business(target_shop_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    archived_at timestamptz := now();
begin
    if not public.is_platform_admin() then
        raise exception 'Acesso negado' using errcode = '42501';
    end if;
    if not exists (select 1 from public.barbershops where id = target_shop_id) then
        raise exception 'Negócio não encontrado' using errcode = '22023';
    end if;
    update public.barbershops set active = false, deleted_at = archived_at where id = target_shop_id;
    update public.profiles set active = false where barbershop_id = target_shop_id;
    update public.saas_clients set status = 'Arquivado', deleted_at = archived_at where barbershop_id = target_shop_id;
    return true;
end;
$$;
revoke all on function public.platform_archive_business(uuid) from public, anon;
grant execute on function public.platform_archive_business(uuid) to authenticated;

-- Cria índices de cobertura para todas as FKs públicas que ainda não possuem
-- um índice cujo prefixo corresponda às colunas da constraint.
do $$
declare
    fk record;
    index_name text;
begin
    for fk in
        select con.conrelid, con.conname, con.conkey,
               n.nspname as schema_name, c.relname as table_name,
               string_agg(quote_ident(a.attname), ', ' order by k.ordinality) as columns_sql
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        cross join lateral unnest(con.conkey) with ordinality as k(attnum, ordinality)
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
        where con.contype = 'f' and n.nspname = 'public'
          and not exists (
              select 1 from pg_index i
              where i.indrelid = con.conrelid
                and (i.indkey::smallint[])[0:cardinality(con.conkey)-1] = con.conkey
          )
        group by con.conrelid, con.conname, con.conkey, n.nspname, c.relname
    loop
        index_name := left(fk.table_name || '_' || replace(fk.conname, fk.table_name || '_', '') || '_idx', 63);
        execute format('create index if not exists %I on %I.%I (%s)', index_name, fk.schema_name, fk.table_name, fk.columns_sql);
    end loop;
end $$;
