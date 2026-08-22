-- Integridade referencial, configurações persistentes e agendamento transacional.
alter table public.saas_clients
    add column if not exists deleted_at timestamptz;

alter table public.profiles
    add column if not exists employee_id uuid references public.employees(id) on delete set null,
    add column if not exists client_record_id uuid references public.business_clients(id) on delete set null;

alter table public.barbershops
    add column if not exists segment text not null default 'Barbearia',
    add column if not exists active boolean not null default true,
    add column if not exists updated_at timestamptz not null default now(),
    add column if not exists deleted_at timestamptz;

create or replace function public.belongs_to_barbershop(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles p join public.barbershops b on b.id = p.barbershop_id
        where p.id = auth.uid() and p.active and p.barbershop_id = target_id and b.active and b.deleted_at is null
    );
$$;
create or replace function public.is_business_team(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles p join public.barbershops b on b.id = p.barbershop_id
        where p.id = auth.uid() and p.active and p.barbershop_id = target_id
          and p.role in ('owner','admin','employee') and b.active and b.deleted_at is null
    );
$$;
create or replace function public.is_business_manager(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select public.is_platform_admin() or exists (
        select 1 from public.profiles p join public.barbershops b on b.id = p.barbershop_id
        where p.id = auth.uid() and p.active and p.barbershop_id = target_id
          and p.role in ('owner','admin') and b.active and b.deleted_at is null
    );
$$;

grant insert, update on public.services, public.employees to authenticated;
drop policy if exists "Business managers manage services" on public.services;
create policy "Business managers manage services" on public.services for all to authenticated
using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
drop policy if exists "Business managers manage employees" on public.employees;
create policy "Business managers manage employees" on public.employees for all to authenticated
using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
drop policy if exists "Business managers update business" on public.barbershops;
create policy "Business managers update business" on public.barbershops for update to authenticated
using (public.is_business_manager(id)) with check (public.is_business_manager(id));
drop policy if exists "Business users view team profiles" on public.profiles;
create policy "Business users view team profiles" on public.profiles for select to authenticated
using (id = auth.uid() or public.belongs_to_barbershop(barbershop_id));

alter table public.business_appointments
    add column if not exists service_id uuid references public.services(id) on delete restrict,
    add column if not exists employee_id uuid references public.employees(id) on delete restrict,
    add column if not exists duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
    add column if not exists price_snapshot numeric(10,2) not null default 0 check (price_snapshot >= 0);

-- NOT VALID protege a implantação caso existam registros legados órfãos, mas
-- passa a validar todas as novas gravações. Cada constraint é idempotente.
do $$
declare item record;
begin
  for item in select * from (values
    ('profiles','profiles_barbershop_fk'), ('services','services_barbershop_fk'),
    ('employees','employees_barbershop_fk'), ('business_clients','business_clients_barbershop_fk'),
    ('business_appointments','business_appointments_barbershop_fk'), ('financial_entries','financial_entries_barbershop_fk'),
    ('privacy_requests','privacy_requests_barbershop_fk'), ('privacy_acknowledgements','privacy_acknowledgements_barbershop_fk'),
    ('data_retention_settings','data_retention_settings_barbershop_fk'), ('data_audit_logs','data_audit_logs_barbershop_fk')
  ) as constraints_to_add(table_name, constraint_name)
  loop
    if not exists (select 1 from pg_constraint where conname = item.constraint_name and conrelid = ('public.' || item.table_name)::regclass) then
      execute format('alter table public.%I add constraint %I foreign key (barbershop_id) references public.barbershops(id) on delete restrict not valid', item.table_name, item.constraint_name);
    end if;
  end loop;
end $$;

create table if not exists public.business_settings (
    barbershop_id uuid primary key references public.barbershops(id) on delete restrict,
    display_name text not null,
    segment text not null,
    open_time time not null default '09:00',
    close_time time not null default '18:00',
    slot_duration_minutes integer not null default 60 check (slot_duration_minutes between 5 and 480),
    minimum_notice_minutes integer not null default 60 check (minimum_notice_minutes between 0 and 43200),
    timezone text not null default 'America/Sao_Paulo',
    updated_at timestamptz not null default now(),
    check (close_time > open_time)
);

alter table public.business_settings enable row level security;
grant select, insert, update on public.business_settings to authenticated;
drop policy if exists "Business users view settings" on public.business_settings;
create policy "Business users view settings" on public.business_settings
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
drop policy if exists "Business managers manage settings" on public.business_settings;
create policy "Business managers manage settings" on public.business_settings
for all to authenticated using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at before update on public.business_settings
for each row execute function public.ogritech_set_updated_at();

insert into public.business_settings (barbershop_id, display_name, segment)
select id, name, segment from public.barbershops
on conflict (barbershop_id) do nothing;

update public.business_appointments a set service_id = s.id,
    duration_minutes = s.duration_minutes, price_snapshot = s.price
from public.services s
where a.service_id is null and s.barbershop_id = a.barbershop_id and lower(s.name) = lower(a.service);

update public.business_appointments a set employee_id = e.id
from public.employees e
where a.employee_id is null and e.barbershop_id = a.barbershop_id and lower(e.name) = lower(a.professional);

update public.profiles p set employee_id = e.id from public.employees e
where p.employee_id is null and p.role = 'employee' and e.barbershop_id = p.barbershop_id and lower(e.name) = lower(p.full_name);
update public.profiles p set client_record_id = c.id from public.business_clients c
where p.client_record_id is null and p.role = 'client' and c.barbershop_id = p.barbershop_id
  and lower(c.email) = lower(coalesce((select email from auth.users where id = p.id), ''));

-- Clientes não inserem linhas arbitrárias: usam create_appointment, que valida o servidor.
drop policy if exists "Business users create appointments" on public.business_appointments;
drop policy if exists "Business managers create appointments" on public.business_appointments;
create policy "Business managers create appointments" on public.business_appointments
for insert to authenticated with check (public.is_business_manager(barbershop_id));

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
    select * into caller from public.profiles where id = auth.uid() and active = true;
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
        effective_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    elsif caller.role in ('owner', 'admin') then
        effective_name := nullif(trim(supplied_client_name), '');
        effective_email := lower(coalesce(nullif(trim(supplied_client_email), ''), ''));
    elsif caller.role = 'employee' and lower(selected_employee.name) = lower(caller.full_name) then
        effective_name := nullif(trim(supplied_client_name), '');
        effective_email := lower(coalesce(nullif(trim(supplied_client_email), ''), ''));
    else
        raise exception 'Função sem permissão para criar agendamento' using errcode = '42501';
    end if;
    if effective_name is null or length(effective_name) > 150 or length(effective_email) > 320 then
        raise exception 'Cliente inválido' using errcode = '22023';
    end if;
    if exists (
        select 1 from public.business_appointments a
        where a.barbershop_id = target_barbershop_id
          and (a.employee_id = target_employee_id or (a.employee_id is null and lower(a.professional) = lower(selected_employee.name)))
          and a.appointment_date = target_date and a.status <> 'cancelled'
          and (a.appointment_date + a.appointment_time) < ends_at
          and (a.appointment_date + a.appointment_time + make_interval(mins => a.duration_minutes)) > starts_at
    ) then raise exception 'Horário indisponível' using errcode = '23505'; end if;

    insert into public.business_appointments
        (barbershop_id, client_name, client_email, service_id, employee_id, service, professional,
         appointment_date, appointment_time, duration_minutes, price_snapshot, status, created_by)
    values
        (target_barbershop_id, effective_name, effective_email, selected_service.id, selected_employee.id,
         selected_service.name, selected_employee.name, target_date, target_time,
         selected_service.duration_minutes, selected_service.price, 'requested', caller.role)
    returning * into result;
    return result;
end;
$$;
revoke all on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) from public;
grant execute on function public.create_appointment(uuid,uuid,uuid,date,time,text,text) to authenticated;

create or replace function public.list_services_catalog(target_barbershop_id uuid)
returns table (id uuid, name text, description text, duration_minutes integer, price numeric, cost numeric, category text, active boolean)
language sql stable security definer set search_path = public as $$
    select s.id, s.name, s.description, s.duration_minutes, s.price,
      case when public.is_business_manager(target_barbershop_id) then s.cost else null end,
      s.category, s.active
    from public.services s
    where s.barbershop_id = target_barbershop_id and s.active
      and public.belongs_to_barbershop(target_barbershop_id)
    order by s.name;
$$;
revoke all on function public.list_services_catalog(uuid) from public;
grant execute on function public.list_services_catalog(uuid) to authenticated;
revoke select on public.services from authenticated;

drop trigger if exists audit_business_clients on public.business_clients;
create trigger audit_business_clients after insert or update or delete on public.business_clients
for each row execute function public.log_personal_data_change();
drop trigger if exists audit_business_appointments on public.business_appointments;
create trigger audit_business_appointments after insert or update or delete on public.business_appointments
for each row execute function public.log_personal_data_change();

create index if not exists business_appointments_employee_date_idx
on public.business_appointments (employee_id, appointment_date, appointment_time)
where status <> 'cancelled';
