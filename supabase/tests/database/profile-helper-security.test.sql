begin;
set local search_path = public, private, extensions;

select extensions.plan(10);

select extensions.ok(
  to_regprocedure('public.current_barbershop_id()') is null,
  'helper de empresa não fica exposto no schema public'
);
select extensions.ok(
  to_regprocedure('public.current_user_role()') is null,
  'helper de função não fica exposto no schema public'
);
select extensions.ok(
  to_regprocedure('private.current_barbershop_id()') is not null,
  'helper de empresa existe no schema private'
);
select extensions.ok(
  to_regprocedure('private.current_user_role()') is not null,
  'helper de função existe no schema private'
);
select extensions.ok(
  (select prosecdef from pg_proc where oid = 'private.current_barbershop_id()'::regprocedure),
  'helper privado de empresa mantém SECURITY DEFINER'
);
select extensions.ok(
  (select prosecdef from pg_proc where oid = 'private.current_user_role()'::regprocedure),
  'helper privado de função mantém SECURITY DEFINER'
);
select extensions.ok(
  has_function_privilege('authenticated', 'private.current_barbershop_id()', 'EXECUTE'),
  'authenticated executa o helper privado de empresa para avaliação de RLS'
);
select extensions.ok(
  has_function_privilege('authenticated', 'private.current_user_role()', 'EXECUTE'),
  'authenticated executa o helper privado de função para avaliação de RLS'
);
select extensions.ok(
  not has_function_privilege('anon', 'private.current_barbershop_id()', 'EXECUTE'),
  'anon não executa o helper privado de empresa'
);
select extensions.ok(
  not has_function_privilege('anon', 'private.current_user_role()', 'EXECUTE'),
  'anon não executa o helper privado de função'
);

select * from extensions.finish();
rollback;
