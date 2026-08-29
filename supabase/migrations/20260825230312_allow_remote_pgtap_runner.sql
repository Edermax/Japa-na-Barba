-- The hosted CLI connects through this restricted login role when running pgTAP.
-- Grant schema visibility only; no application-table privileges are added.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'cli_login_postgres') then
    grant usage on schema extensions to cli_login_postgres;
  end if;
end
$$;
