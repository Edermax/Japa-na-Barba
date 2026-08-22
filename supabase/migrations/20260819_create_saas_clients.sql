create table if not exists public.saas_clients (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    segment text not null,
    contact_name text not null,
    origin text not null default 'Demonstração',
    plan text not null default 'Pro',
    monthly_fee numeric(10,2) not null default 0,
    status text not null default 'Ativo',
    created_at timestamptz not null default now()
);

alter table public.saas_clients enable row level security;

grant select, insert, update, delete on public.saas_clients to authenticated;

drop policy if exists "Ogritech owner can view SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can insert SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can update SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can delete SaaS clients" on public.saas_clients;

create policy "Ogritech owner can view SaaS clients"
on public.saas_clients for select to authenticated
using (false);

create policy "Ogritech owner can insert SaaS clients"
on public.saas_clients for insert to authenticated
with check (false);

create policy "Ogritech owner can update SaaS clients"
on public.saas_clients for update to authenticated
using (false)
with check (false);

create policy "Ogritech owner can delete SaaS clients"
on public.saas_clients for delete to authenticated
using (false);

-- Dados comerciais e demonstrações são carregados por supabase/seed.sql.
