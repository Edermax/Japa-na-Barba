-- Schema-base necessário para reproduzir a Ogritech em um projeto Supabase vazio.
create extension if not exists pgcrypto;

create table if not exists public.barbershops (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    segment text not null default 'Barbearia',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    barbershop_id uuid references public.barbershops(id) on delete restrict,
    full_name text not null,
    role text not null check (role in ('owner', 'admin', 'employee', 'client')),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_barbershop_role_idx
on public.profiles (barbershop_id, role) where active = true;

-- Helpers mínimos existem desde o início porque migrations de LGPD/financeiro
-- são aplicadas antes da expansão operacional. A central master os amplia depois.
create or replace function public.belongs_to_barbershop(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and active and barbershop_id = target_id);
$$;
create or replace function public.is_business_team(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and active and barbershop_id = target_id and role in ('owner','admin','employee'));
$$;
create or replace function public.is_business_manager(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
    select exists (select 1 from public.profiles where id = auth.uid() and active and barbershop_id = target_id and role in ('owner','admin'));
$$;
revoke all on function public.belongs_to_barbershop(uuid), public.is_business_team(uuid), public.is_business_manager(uuid) from public;
grant execute on function public.belongs_to_barbershop(uuid), public.is_business_team(uuid), public.is_business_manager(uuid) to authenticated;

create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    name text not null,
    description text not null default '',
    duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
    price numeric(10,2) not null default 0 check (price >= 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists services_barbershop_active_idx
on public.services (barbershop_id, active, name);

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    name text not null,
    specialty text not null default 'Atendimento geral',
    commission_percentage numeric(5,2) not null default 0 check (commission_percentage between 0 and 100),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists employees_barbershop_active_idx
on public.employees (barbershop_id, active, name);

alter table public.barbershops enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.employees enable row level security;

grant select on public.barbershops, public.profiles, public.services, public.employees to authenticated;

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "Users view own business" on public.barbershops;
create policy "Users view own business" on public.barbershops
for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.barbershop_id = barbershops.id)
);

drop policy if exists "Users view own business services" on public.services;
create policy "Users view own business services" on public.services
for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.barbershop_id = services.barbershop_id)
);

drop policy if exists "Users view own business employees" on public.employees;
create policy "Users view own business employees" on public.employees
for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.barbershop_id = employees.barbershop_id)
);
