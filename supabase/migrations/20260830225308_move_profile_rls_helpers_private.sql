create schema if not exists private;

do $$
begin
  if to_regprocedure('private.current_barbershop_id()') is null
     and to_regprocedure('public.current_barbershop_id()') is not null then
    execute 'alter function public.current_barbershop_id() set schema private';
  end if;

  if to_regprocedure('private.current_user_role()') is null
     and to_regprocedure('public.current_user_role()') is not null then
    execute 'alter function public.current_user_role() set schema private';
  end if;
end
$$;

create or replace function private.current_barbershop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select barbershop_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

revoke all on function
  private.current_barbershop_id(),
  private.current_user_role()
from public, anon, service_role;

grant usage on schema private to authenticated;
grant execute on function
  private.current_barbershop_id(),
  private.current_user_role()
to authenticated;
