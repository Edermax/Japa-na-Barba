-- Cache request-scoped Auth helpers once per statement while preserving the
-- existing row-level authorization semantics.
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));

drop policy if exists "Users view own business" on public.barbershops;
create policy "Users view own business" on public.barbershops
for select to authenticated using (
    exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.active
          and p.barbershop_id = barbershops.id
    )
);

drop policy if exists "Users view own business services" on public.services;
create policy "Users view own business services" on public.services
for select to authenticated using (
    exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.active
          and p.barbershop_id = services.barbershop_id
    )
);

drop policy if exists "Users view own business employees" on public.employees;
create policy "Users view own business employees" on public.employees
for select to authenticated using (
    exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.active
          and p.barbershop_id = employees.barbershop_id
    )
);

drop policy if exists "Platform admins can view themselves" on public.platform_admins;
create policy "Platform admins can view themselves" on public.platform_admins
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users create their privacy requests" on public.privacy_requests;
create policy "Users create their privacy requests" on public.privacy_requests
for insert to authenticated with check (
    requester_id = (select auth.uid())
    and public.belongs_to_barbershop(barbershop_id)
    and lower(requester_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

drop policy if exists "Users view their privacy requests" on public.privacy_requests;
create policy "Users view their privacy requests" on public.privacy_requests
for select to authenticated using (
    requester_id = (select auth.uid())
    or public.is_business_manager(barbershop_id)
);

drop policy if exists "Users register privacy acknowledgement" on public.privacy_acknowledgements;
create policy "Users register privacy acknowledgement" on public.privacy_acknowledgements
for insert to authenticated with check (
    user_id = (select auth.uid())
    and public.belongs_to_barbershop(barbershop_id)
);

drop policy if exists "Users view privacy acknowledgement" on public.privacy_acknowledgements;
create policy "Users view privacy acknowledgement" on public.privacy_acknowledgements
for select to authenticated using (
    user_id = (select auth.uid())
    or public.is_business_manager(barbershop_id)
);

drop policy if exists "Business users view team profiles" on public.profiles;
create policy "Business users view team profiles" on public.profiles
for select to authenticated using (
    id = (select auth.uid())
    or public.belongs_to_barbershop(barbershop_id)
);

drop policy if exists "Business users view appointments" on public.business_appointments;
create policy "Business users view appointments" on public.business_appointments
for select to authenticated using (
    public.belongs_to_barbershop(barbershop_id)
    and (
        public.is_business_manager(barbershop_id)
        or employee_id = (select public.current_profile_employee_id())
        or lower(client_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
);

-- Only platform_create_invoice calls this helper. Keeping it out of the public
-- authenticated RPC surface removes an unnecessary privileged endpoint.
revoke all on function public.platform_ensure_billing_customer(uuid)
from public, anon, authenticated;
