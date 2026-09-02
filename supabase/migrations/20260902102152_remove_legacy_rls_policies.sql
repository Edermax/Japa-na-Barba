-- Remove policies from the superseded schema generation. Their effective
-- permissions are already represented by the consolidated policies created in
-- 20260826000705. Some clean installations no longer contain the legacy
-- appointments/clients tables, so both tables and policies are optional.

do $migration$
declare
    legacy record;
begin
    for legacy in
        select * from (values
            ('appointments', 'Clientes visualizam seus agendamentos'),
            ('appointments', 'Funcionários visualizam seus agendamentos'),
            ('appointments', 'Proprietários e administradores visualizam toda a agenda'),
            ('appointments', 'Funcionários atualizam seus agendamentos'),
            ('appointments', 'Proprietários e administradores atualizam agendamentos'),
            ('appointments', 'Usuários podem criar agendamentos permitidos'),
            ('appointments', 'Proprietários e administradores excluem agendamentos'),
            ('barbershops', 'Usuários podem visualizar sua barbearia'),
            ('barbershops', 'Proprietários e administradores podem atualizar a barbearia'),
            ('clients', 'Clientes podem visualizar o próprio cadastro'),
            ('clients', 'Equipe pode visualizar clientes da barbearia'),
            ('clients', 'Clientes podem atualizar o próprio cadastro'),
            ('clients', 'Equipe pode atualizar clientes'),
            ('clients', 'Equipe pode cadastrar clientes'),
            ('clients', 'Proprietários e administradores podem excluir clientes'),
            ('employees', 'Proprietários e administradores gerenciam funcionários'),
            ('employees', 'Usuários podem visualizar funcionários da sua barbearia'),
            ('profiles', 'Proprietários e administradores podem cadastrar perfis'),
            ('profiles', 'Proprietários e administradores podem visualizar perfis da bar'),
            ('profiles', 'Usuários podem visualizar o próprio perfil'),
            ('profiles', 'Proprietários e administradores podem atualizar perfis'),
            ('profiles', 'Usuários podem atualizar seus dados sem mudar acesso'),
            ('services', 'Proprietários e administradores gerenciam serviços'),
            ('services', 'Usuários podem visualizar serviços da sua barbearia')
        ) as policies(table_name, policy_name)
    loop
        if to_regclass(format('public.%I', legacy.table_name)) is not null then
            execute format(
                'drop policy if exists %I on public.%I',
                legacy.policy_name,
                legacy.table_name
            );
        end if;
    end loop;
end
$migration$;
