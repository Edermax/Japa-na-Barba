-- Completa serviços e equipe para operação financeira real.
alter table public.services
    add column if not exists category text not null default 'Geral',
    add column if not exists cost numeric(10,2) not null default 0 check (cost >= 0);

create unique index if not exists services_business_name_key
on public.services (barbershop_id, lower(name));
create unique index if not exists employees_business_name_key
on public.employees (barbershop_id, lower(name));

insert into public.services (barbershop_id, name, description, duration_minutes, price, cost, category, active)
select b.id, seed.name, seed.description, seed.duration, seed.price, seed.cost, seed.category, true
from public.barbershops b
cross join (values
    ('Corte masculino', 'Corte tradicional ou moderno.', 45, 45::numeric, 12::numeric, 'Cabelo'),
    ('Corte + Barba', 'Combo completo para renovar o visual.', 75, 75::numeric, 22::numeric, 'Combos'),
    ('Barba', 'Acabamento e alinhamento da barba.', 35, 35::numeric, 8::numeric, 'Barba'),
    ('Platinado', 'Transformação completa do visual.', 120, 120::numeric, 38::numeric, 'Química')
) as seed(name, description, duration, price, cost, category)
where b.name = 'Japa na Barba'
on conflict (barbershop_id, (lower(name))) do update set
    description = excluded.description, duration_minutes = excluded.duration_minutes,
    price = excluded.price, cost = excluded.cost, category = excluded.category, active = true;

insert into public.employees (barbershop_id, name, specialty, commission_percentage, active)
select b.id, seed.name, seed.specialty, seed.commission, true
from public.barbershops b
cross join (values
    ('Carlos', 'Cabelo e barba', 40::numeric),
    ('Rafael', 'Cabelo, barba e química', 40::numeric)
) as seed(name, specialty, commission)
where b.name = 'Japa na Barba'
on conflict (barbershop_id, (lower(name))) do update set
    specialty = excluded.specialty, commission_percentage = excluded.commission_percentage, active = true;
