-- A Ogritech ainda está em pré-operação: todos os cadastros atuais são fictícios.
-- Preserva dados e históricos, mas remove qualquer indicação de operação real.
update public.saas_clients set
    origin = 'Demonstração',
    user_count = 0,
    client_count = 0,
    appointment_count = 0,
    business_revenue = 0,
    updated_at = now();
