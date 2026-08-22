-- Execute manualmente no SQL Editor depois de criar o usuário no Supabase Auth.
-- Substitua o e-mail abaixo; não versiona UUIDs nem credenciais pessoais.
do $$
declare target_user_id uuid;
begin
    select id into target_user_id from auth.users where lower(email) = lower('ADMIN_EMAIL_AQUI') limit 1;
    if target_user_id is null then
        raise exception 'Usuário não encontrado no Supabase Auth';
    end if;
    insert into public.platform_admins (user_id) values (target_user_id) on conflict do nothing;
end $$;
