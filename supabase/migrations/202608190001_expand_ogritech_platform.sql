create table if not exists public.platform_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

insert into public.platform_admins (user_id)
values ('852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid)
on conflict (user_id) do nothing;

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.platform_admins
        where user_id = auth.uid()
    );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Platform admins can view themselves" on public.platform_admins;
create policy "Platform admins can view themselves"
on public.platform_admins for select to authenticated
using (user_id = auth.uid());

create table if not exists public.saas_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    monthly_fee numeric(10,2) not null,
    description text not null,
    features jsonb not null default '[]'::jsonb,
    featured boolean not null default false,
    active boolean not null default true,
    display_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.saas_plans enable row level security;
grant select, insert, update, delete on public.saas_plans to authenticated;

drop policy if exists "Authenticated users can view plans" on public.saas_plans;
drop policy if exists "Platform admins manage plans" on public.saas_plans;
create policy "Authenticated users can view plans" on public.saas_plans
for select to authenticated using (true);
create policy "Platform admins manage plans" on public.saas_plans
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

insert into public.saas_plans (name, monthly_fee, description, features, featured, display_order)
values
    ('Essencial', 149, 'Para profissionais que estão começando a organizar o atendimento.', '["Agenda online", "Cadastro de clientes", "Serviços e profissionais", "Suporte por e-mail"]', false, 1),
    ('Pro', 249, 'Gestão completa para negócios em crescimento.', '["Tudo do Essencial", "Financeiro e indicadores", "Lembretes de agendamento", "Até 10 profissionais"]', true, 2),
    ('Premium', 399, 'Operação avançada para equipes e múltiplas unidades.', '["Tudo do Pro", "Usuários ilimitados", "Relatórios avançados", "Suporte prioritário"]', false, 3)
on conflict (name) do update set
    monthly_fee = excluded.monthly_fee, description = excluded.description,
    features = excluded.features, featured = excluded.featured, display_order = excluded.display_order;

alter table public.saas_clients
    add column if not exists owner_email text,
    add column if not exists phone text,
    add column if not exists notes text,
    add column if not exists invite_status text not null default 'Pendente',
    add column if not exists user_count integer not null default 0,
    add column if not exists client_count integer not null default 0,
    add column if not exists appointment_count integer not null default 0,
    add column if not exists business_revenue numeric(12,2) not null default 0,
    add column if not exists updated_at timestamptz not null default now();

create unique index if not exists saas_clients_owner_email_key
on public.saas_clients (lower(owner_email)) where owner_email is not null;

create or replace function public.ogritech_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists saas_clients_set_updated_at on public.saas_clients;
create trigger saas_clients_set_updated_at before update on public.saas_clients
for each row execute function public.ogritech_set_updated_at();

drop policy if exists "Ogritech owner can view SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can insert SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can update SaaS clients" on public.saas_clients;
drop policy if exists "Ogritech owner can delete SaaS clients" on public.saas_clients;
drop policy if exists "Platform admins manage SaaS clients" on public.saas_clients;
create policy "Platform admins manage SaaS clients" on public.saas_clients
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

update public.saas_clients set
    owner_email = case name
        when 'Japa na Barba' then 'ederogrizio@gmail.com'
        when 'Studio Bella Forma' then 'camila@example.com'
        when 'Nail Art Boutique' then 'bianca@example.com'
        when 'Sol Dourado Bronze' then 'mariana@example.com'
        when 'Acorde Vivo' then 'marcelo@example.com'
        when 'Prime Fit Coach' then 'natalia@example.com'
        else owner_email end,
    phone = coalesce(phone, '(11) 99999-0000'),
    user_count = case when name = 'Japa na Barba' then 3 else 1 end,
    client_count = case when name = 'Japa na Barba' then 86 else 0 end,
    appointment_count = case when name = 'Japa na Barba' then 142 else 0 end,
    business_revenue = case when name = 'Japa na Barba' then 4850 else 0 end,
    invite_status = case when name = 'Japa na Barba' then 'Ativo' else 'Pendente' end;
