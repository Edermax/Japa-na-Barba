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
using (auth.uid() = '852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid);

create policy "Ogritech owner can insert SaaS clients"
on public.saas_clients for insert to authenticated
with check (auth.uid() = '852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid);

create policy "Ogritech owner can update SaaS clients"
on public.saas_clients for update to authenticated
using (auth.uid() = '852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid)
with check (auth.uid() = '852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid);

create policy "Ogritech owner can delete SaaS clients"
on public.saas_clients for delete to authenticated
using (auth.uid() = '852ca2d2-6249-4c7c-9f9b-5550695121e5'::uuid);

insert into public.saas_clients
    (name, segment, contact_name, origin, plan, monthly_fee, status)
values
    ('Japa na Barba', 'Barbearia', 'Edermax', 'Cliente real', 'Pro', 249, 'Ativo'),
    ('Studio Bella Forma', 'Salão de beleza', 'Camila Rocha', 'Demonstração', 'Pro', 249, 'Ativo'),
    ('Nail Art Boutique', 'Manicure', 'Bianca Souza', 'Demonstração', 'Pro', 249, 'Ativo'),
    ('Sol Dourado Bronze', 'Bronzeamento', 'Mariana Costa', 'Demonstração', 'Pro', 249, 'Ativo'),
    ('Acorde Vivo', 'Professor de música', 'Marcelo Vieira', 'Demonstração', 'Pro', 249, 'Ativo'),
    ('Prime Fit Coach', 'Personal training', 'Natália Reis', 'Demonstração', 'Premium', 399, 'Ativo')
on conflict (name) do update set
    segment = excluded.segment,
    contact_name = excluded.contact_name,
    origin = excluded.origin,
    plan = excluded.plan,
    monthly_fee = excluded.monthly_fee,
    status = excluded.status;
