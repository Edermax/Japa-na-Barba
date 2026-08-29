-- The platform-users Edge Function uses the project service role for its
-- privileged, server-side operations. BYPASSRLS does not replace SQL grants.
grant select, insert, update, delete on table
    public.profiles,
    public.barbershops,
    public.employees,
    public.business_clients,
    public.saas_clients,
    public.platform_admins,
    public.platform_admin_events
to service_role;

grant usage, select on sequence public.platform_admin_events_id_seq
to service_role;
