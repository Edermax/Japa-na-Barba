-- Dados operacionais multiempresa da Ogritech.
create table if not exists public.business_clients (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null,
    name text not null,
    phone text not null default '',
    email text not null default '',
    birthday date,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists business_clients_barbershop_idx
on public.business_clients (barbershop_id);

create table if not exists public.business_appointments (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null,
    client_name text not null,
    client_email text not null default '',
    service text not null,
    professional text not null,
    appointment_date date not null,
    appointment_time time not null,
    status text not null default 'requested'
        check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
    created_by text not null default 'owner',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists business_appointments_barbershop_date_idx
on public.business_appointments (barbershop_id, appointment_date);

create unique index if not exists business_appointments_active_slot_key
on public.business_appointments (barbershop_id, appointment_date, appointment_time, professional)
where status <> 'cancelled';

do $$ begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'financial_entries_appointment_fk'
          and conrelid = 'public.financial_entries'::regclass
    ) then
        alter table public.financial_entries
            add constraint financial_entries_appointment_fk
            foreign key (appointment_id) references public.business_appointments(id)
            on delete set null not valid;
    end if;
end $$;

alter table public.business_clients enable row level security;
alter table public.business_appointments enable row level security;
grant select, insert, update, delete on public.business_clients, public.business_appointments to authenticated;

create or replace function public.belongs_to_barbershop(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and active = true and barbershop_id = target_id
    );
$$;

revoke all on function public.belongs_to_barbershop(uuid) from public;
grant execute on function public.belongs_to_barbershop(uuid) to authenticated;

create or replace function public.is_business_team(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and active = true and barbershop_id = target_id
          and role in ('owner', 'admin', 'employee')
    );
$$;
revoke all on function public.is_business_team(uuid) from public;
grant execute on function public.is_business_team(uuid) to authenticated;

create or replace function public.is_business_manager(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and active = true
        and barbershop_id = target_id and role in ('owner', 'admin'));
$$;
revoke all on function public.is_business_manager(uuid) from public;
grant execute on function public.is_business_manager(uuid) to authenticated;

create or replace function public.current_profile_name()
returns text language sql stable security definer set search_path = public as $$
    select full_name from public.profiles where id = auth.uid() and active = true;
$$;
revoke all on function public.current_profile_name() from public;
grant execute on function public.current_profile_name() to authenticated;

drop policy if exists "Business team manages clients" on public.business_clients;
drop policy if exists "Business team views clients" on public.business_clients;
drop policy if exists "Business managers create clients" on public.business_clients;
drop policy if exists "Business managers update clients" on public.business_clients;
drop policy if exists "Business managers delete clients" on public.business_clients;
create policy "Business team views clients" on public.business_clients for select to authenticated using (public.is_business_team(barbershop_id));
create policy "Business managers create clients" on public.business_clients for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update clients" on public.business_clients for update to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete clients" on public.business_clients for delete to authenticated using (public.is_business_manager(barbershop_id));

drop policy if exists "Business users view appointments" on public.business_appointments;
create policy "Business users view appointments" on public.business_appointments
for select to authenticated
using (
    public.belongs_to_barbershop(barbershop_id)
    and (
        public.is_business_manager(barbershop_id)
        or (public.is_business_team(barbershop_id) and professional = public.current_profile_name())
        or lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
);

drop policy if exists "Business users create appointments" on public.business_appointments;
create policy "Business users create appointments" on public.business_appointments
for insert to authenticated
with check (
    public.belongs_to_barbershop(barbershop_id)
    and (
        public.is_business_manager(barbershop_id)
        or (public.is_business_team(barbershop_id) and professional = public.current_profile_name())
        or lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
);

drop policy if exists "Business users update appointments" on public.business_appointments;
drop policy if exists "Business team updates appointments" on public.business_appointments;
create policy "Business team updates appointments" on public.business_appointments
for update to authenticated
using (
    public.is_business_manager(barbershop_id)
    or (public.is_business_team(barbershop_id) and professional = public.current_profile_name())
)
with check (
    public.is_business_manager(barbershop_id)
    or (public.is_business_team(barbershop_id) and professional = public.current_profile_name())
);

create or replace function public.cancel_my_appointment(appointment_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
    update public.business_appointments set status = 'cancelled', updated_at = now()
    where id = appointment_id
      and lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and public.belongs_to_barbershop(barbershop_id)
      and status in ('requested', 'confirmed');
    return found;
end;
$$;
revoke all on function public.cancel_my_appointment(uuid) from public;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

drop trigger if exists business_clients_set_updated_at on public.business_clients;
create trigger business_clients_set_updated_at before update on public.business_clients
for each row execute function public.ogritech_set_updated_at();

drop trigger if exists business_appointments_set_updated_at on public.business_appointments;
create trigger business_appointments_set_updated_at before update on public.business_appointments
for each row execute function public.ogritech_set_updated_at();
