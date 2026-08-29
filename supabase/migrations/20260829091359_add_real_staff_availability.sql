-- Disponibilidade real por profissional e serviço.
alter table public.business_settings
  add column if not exists timezone text not null default 'America/Sao_Paulo';

create table if not exists public.employee_services (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (employee_id, service_id)
);

create table if not exists public.employee_working_hours (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_working_hours_valid_range check (end_time > start_time),
  constraint employee_working_hours_unique_start unique (employee_id, weekday, start_time)
);

create table if not exists public.employee_time_off (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  starts_at timestamp not null,
  ends_at timestamp not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint employee_time_off_valid_range check (ends_at > starts_at)
);

create index if not exists employee_services_shop_idx on public.employee_services(barbershop_id, service_id, employee_id);
create index if not exists employee_working_hours_lookup_idx on public.employee_working_hours(employee_id, weekday, start_time, end_time);
create index if not exists employee_time_off_lookup_idx on public.employee_time_off(employee_id, starts_at, ends_at);

alter table public.employee_services enable row level security;
alter table public.employee_working_hours enable row level security;
alter table public.employee_time_off enable row level security;

grant select, insert, update, delete on public.employee_services, public.employee_working_hours, public.employee_time_off to authenticated;

create policy "Business users view employee services" on public.employee_services
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
create policy "Business managers create employee services" on public.employee_services
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update employee services" on public.employee_services
for update to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete employee services" on public.employee_services
for delete to authenticated using (public.is_business_manager(barbershop_id));

create policy "Business users view working hours" on public.employee_working_hours
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
create policy "Business managers create working hours" on public.employee_working_hours
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update working hours" on public.employee_working_hours
for update to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete working hours" on public.employee_working_hours
for delete to authenticated using (public.is_business_manager(barbershop_id));

create policy "Business team views time off" on public.employee_time_off
for select to authenticated using (public.is_business_team(barbershop_id));
create policy "Business managers create time off" on public.employee_time_off
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update time off" on public.employee_time_off
for update to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete time off" on public.employee_time_off
for delete to authenticated using (public.is_business_manager(barbershop_id));

drop trigger if exists employee_working_hours_set_updated_at on public.employee_working_hours;
create trigger employee_working_hours_set_updated_at before update on public.employee_working_hours
for each row execute function public.ogritech_set_updated_at();

-- Mantém compatibilidade: enquanto um profissional não tiver configuração própria,
-- a disponibilidade usa o expediente geral da empresa.
create or replace function private.list_available_slots(
  target_barbershop_id uuid,
  target_service_id uuid,
  target_employee_id uuid,
  target_date date
) returns table(slot_time time)
language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
declare
  selected_service public.services;
  selected_employee public.employees;
  settings public.business_settings;
  weekday_number smallint := extract(dow from target_date)::smallint;
begin
  if not private.belongs_to_barbershop(target_barbershop_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
  if target_date < current_date then return; end if;

  select * into selected_service from public.services
    where id = target_service_id and barbershop_id = target_barbershop_id and active;
  select * into selected_employee from public.employees
    where id = target_employee_id and barbershop_id = target_barbershop_id and active;
  if selected_service.id is null or selected_employee.id is null then
    raise exception 'Serviço ou profissional inválido' using errcode = '22023';
  end if;
  if exists(select 1 from public.employee_services where employee_id = target_employee_id)
     and not exists(select 1 from public.employee_services where employee_id = target_employee_id and service_id = target_service_id) then
    return;
  end if;
  select * into settings from public.business_settings where barbershop_id = target_barbershop_id;

  return query
  with work_ranges as (
    select h.start_time, h.end_time
    from public.employee_working_hours h
    where h.employee_id = target_employee_id and h.weekday = weekday_number
    union all
    select coalesce(settings.open_time, '09:00'::time), coalesce(settings.close_time, '18:00'::time)
    where not exists(select 1 from public.employee_working_hours where employee_id = target_employee_id)
  ), candidates as (
    select generated::time as candidate_time,
           target_date + generated::time as candidate_start,
           target_date + generated::time + make_interval(mins => selected_service.duration_minutes) as candidate_end
    from work_ranges wr
    cross join lateral generate_series(
      target_date + wr.start_time,
      target_date + wr.end_time - make_interval(mins => selected_service.duration_minutes),
      make_interval(mins => coalesce(settings.slot_duration_minutes, 30))
    ) generated
  )
  select c.candidate_time
  from candidates c
  where c.candidate_start >= (now() at time zone coalesce(settings.timezone, 'America/Sao_Paulo'))
          + make_interval(mins => coalesce(settings.minimum_notice_minutes, 0))
    and not exists (
      select 1 from public.employee_time_off t
      where t.employee_id = target_employee_id
        and tsrange(t.starts_at, t.ends_at, '[)') && tsrange(c.candidate_start, c.candidate_end, '[)')
    )
    and not exists (
      select 1 from public.business_appointments a
      where a.employee_id = target_employee_id and a.status <> 'cancelled'
        and a.appointment_period && tsrange(c.candidate_start, c.candidate_end, '[)')
    )
  order by c.candidate_time;
end;
$$;

create or replace function public.list_available_slots(
  target_barbershop_id uuid,
  target_service_id uuid,
  target_employee_id uuid,
  target_date date
) returns table(slot_time time)
language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.list_available_slots(target_barbershop_id, target_service_id, target_employee_id, target_date) $$;

revoke all on function private.list_available_slots(uuid,uuid,uuid,date) from public, anon;
grant execute on function private.list_available_slots(uuid,uuid,uuid,date) to authenticated;
revoke all on function public.list_available_slots(uuid,uuid,uuid,date) from public, anon;
grant execute on function public.list_available_slots(uuid,uuid,uuid,date) to authenticated;

create or replace function private.enforce_appointment_availability()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  weekday_number smallint := extract(dow from new.appointment_date)::smallint;
  appointment_start timestamp := new.appointment_date + new.appointment_time;
  appointment_end timestamp := new.appointment_date + new.appointment_time + make_interval(mins => new.duration_minutes);
begin
  if exists(select 1 from public.employee_services where employee_id = new.employee_id)
     and not exists(select 1 from public.employee_services where employee_id = new.employee_id and service_id = new.service_id) then
    raise exception 'Profissional não atende este serviço' using errcode = '22023';
  end if;
  if exists(select 1 from public.employee_working_hours where employee_id = new.employee_id)
     and not exists(
       select 1 from public.employee_working_hours h
       where h.employee_id = new.employee_id and h.weekday = weekday_number
         and new.appointment_time >= h.start_time and appointment_end::time <= h.end_time
     ) then
    raise exception 'Horário fora da jornada do profissional' using errcode = '22023';
  end if;
  if exists(
    select 1 from public.employee_time_off t
    where t.employee_id = new.employee_id
      and tsrange(t.starts_at, t.ends_at, '[)') && tsrange(appointment_start, appointment_end, '[)')
  ) then raise exception 'Profissional indisponível' using errcode = '22023'; end if;
  return new;
end;
$$;

drop trigger if exists business_appointments_enforce_availability on public.business_appointments;
create trigger business_appointments_enforce_availability
before insert or update of employee_id, service_id, appointment_date, appointment_time, duration_minutes, status
on public.business_appointments for each row
when (new.status <> 'cancelled') execute function private.enforce_appointment_availability();

revoke all on function private.enforce_appointment_availability() from public, anon, authenticated;

-- Liga os cadastros atuais sem restringir a operação já existente.
insert into public.employee_services(barbershop_id, employee_id, service_id)
select e.barbershop_id, e.id, s.id from public.employees e
join public.services s on s.barbershop_id = e.barbershop_id
where e.active and s.active
on conflict do nothing;
