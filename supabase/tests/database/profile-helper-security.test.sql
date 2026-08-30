begin;
set local search_path = public, private, extensions;

select extensions.plan(10);

select extensions.ok(
  not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_barbershop_id'
      and p.pronargs = 0
  ),
  'helper de empresa não fica exposto no schema public'
);
select extensions.ok(
  not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_user_role'
      and p.pronargs = 0
  ),
  'helper de função não fica exposto no schema public'
);
select extensions.ok(
  exists(
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'current_barbershop_id'
      and p.pronargs = 0
  ),
  'helper de empresa existe no schema private'
);
select extensions.ok(
  exists(
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'current_user_role'
      and p.pronargs = 0
  ),
  'helper de função existe no schema private'
);
select extensions.ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_barbershop_id' and p.pronargs = 0),
  'helper privado de empresa mantém SECURITY DEFINER'
);
select extensions.ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_user_role' and p.pronargs = 0),
  'helper privado de função mantém SECURITY DEFINER'
);
select extensions.ok(
  (select has_function_privilege('authenticated', p.oid, 'EXECUTE')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_barbershop_id' and p.pronargs = 0),
  'authenticated executa o helper privado de empresa para avaliação de RLS'
);
select extensions.ok(
  (select has_function_privilege('authenticated', p.oid, 'EXECUTE')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_user_role' and p.pronargs = 0),
  'authenticated executa o helper privado de função para avaliação de RLS'
);
select extensions.ok(
  (select not has_function_privilege('anon', p.oid, 'EXECUTE')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_barbershop_id' and p.pronargs = 0),
  'anon não executa o helper privado de empresa'
);
select extensions.ok(
  (select not has_function_privilege('anon', p.oid, 'EXECUTE')
   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'current_user_role' and p.pronargs = 0),
  'anon não executa o helper privado de função'
);

select * from extensions.finish();
rollback;
