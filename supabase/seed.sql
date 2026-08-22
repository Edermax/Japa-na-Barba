-- Seed estritamente fictício para desenvolvimento local.
insert into public.saas_clients
    (name, segment, contact_name, owner_email, phone, origin, plan, monthly_fee, status)
values
    ('Barbearia Exemplo', 'Barbearia', 'Responsável Exemplo', 'owner@example.invalid', '(00) 00000-0000', 'Demonstração', 'Pro', 249, 'Ativo')
on conflict (name) do nothing;
