-- Consolidate permissive policies by table/action. Each replacement is the
-- logical OR of the policies it supersedes.

-- barbershops
drop policy if exists "Platform admins manage barbershops" on public.barbershops;
drop policy if exists "Users view own business" on public.barbershops;
drop policy if exists "Business managers update business" on public.barbershops;
create policy "Authorized users view businesses" on public.barbershops
for select to authenticated using (public.belongs_to_barbershop(id));
create policy "Business managers update businesses" on public.barbershops
for update to authenticated
using (public.is_business_manager(id))
with check (public.is_business_manager(id));
create policy "Platform admins create businesses" on public.barbershops
for insert to authenticated with check ((select public.is_platform_admin()));
create policy "Platform admins delete businesses" on public.barbershops
for delete to authenticated using ((select public.is_platform_admin()));

-- business_settings
drop policy if exists "Business managers manage settings" on public.business_settings;
drop policy if exists "Business users view settings" on public.business_settings;
create policy "Business users view settings" on public.business_settings
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
create policy "Business managers create settings" on public.business_settings
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update settings" on public.business_settings
for update to authenticated
using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete settings" on public.business_settings
for delete to authenticated using (public.is_business_manager(barbershop_id));

-- employees
drop policy if exists "Business managers manage employees" on public.employees;
drop policy if exists "Platform admins manage employees" on public.employees;
drop policy if exists "Users view own business employees" on public.employees;
create policy "Business users view employees" on public.employees
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
create policy "Business managers create employees" on public.employees
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update employees" on public.employees
for update to authenticated
using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete employees" on public.employees
for delete to authenticated using (public.is_business_manager(barbershop_id));

-- financial_entries
drop policy if exists "Business managers manage finances" on public.financial_entries;
drop policy if exists "Platform admins manage financial entries" on public.financial_entries;
create policy "Business managers view finances" on public.financial_entries
for select to authenticated using (public.is_business_manager(barbershop_id));
create policy "Business managers create finances" on public.financial_entries
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update finances" on public.financial_entries
for update to authenticated
using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete finances" on public.financial_entries
for delete to authenticated using (public.is_business_manager(barbershop_id));

-- privacy_requests
drop policy if exists "Platform admins manage privacy requests" on public.privacy_requests;
drop policy if exists "Users create their privacy requests" on public.privacy_requests;
drop policy if exists "Users view their privacy requests" on public.privacy_requests;
drop policy if exists "Business team handles privacy requests" on public.privacy_requests;
create policy "Authorized users view privacy requests" on public.privacy_requests
for select to authenticated using (
    requester_id = (select auth.uid())
    or public.is_business_manager(barbershop_id)
);
create policy "Authorized users create privacy requests" on public.privacy_requests
for insert to authenticated with check (
    (select public.is_platform_admin())
    or (
        requester_id = (select auth.uid())
        and public.belongs_to_barbershop(barbershop_id)
        and lower(requester_email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    )
);
create policy "Business managers update privacy requests" on public.privacy_requests
for update to authenticated
using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Platform admins delete privacy requests" on public.privacy_requests
for delete to authenticated using ((select public.is_platform_admin()));

-- profiles
drop policy if exists "Platform admins manage profiles" on public.profiles;
drop policy if exists "Business users view team profiles" on public.profiles;
drop policy if exists "Users view own profile" on public.profiles;
create policy "Authorized users view profiles" on public.profiles
for select to authenticated using (
    id = (select auth.uid())
    or public.belongs_to_barbershop(barbershop_id)
);
create policy "Platform admins create profiles" on public.profiles
for insert to authenticated with check ((select public.is_platform_admin()));
create policy "Platform admins update profiles" on public.profiles
for update to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));
create policy "Platform admins delete profiles" on public.profiles
for delete to authenticated using ((select public.is_platform_admin()));

-- saas_plans
drop policy if exists "Platform admins manage plans" on public.saas_plans;
drop policy if exists "Authenticated users can view plans" on public.saas_plans;
create policy "Authenticated users view plans" on public.saas_plans
for select to authenticated using (true);
create policy "Platform admins create plans" on public.saas_plans
for insert to authenticated with check ((select public.is_platform_admin()));
create policy "Platform admins update plans" on public.saas_plans
for update to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));
create policy "Platform admins delete plans" on public.saas_plans
for delete to authenticated using ((select public.is_platform_admin()));

-- services
drop policy if exists "Business managers manage services" on public.services;
drop policy if exists "Platform admins manage services" on public.services;
drop policy if exists "Users view own business services" on public.services;
create policy "Business users view services" on public.services
for select to authenticated using (public.belongs_to_barbershop(barbershop_id));
create policy "Business managers create services" on public.services
for insert to authenticated with check (public.is_business_manager(barbershop_id));
create policy "Business managers update services" on public.services
for update to authenticated
using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Business managers delete services" on public.services
for delete to authenticated using (public.is_business_manager(barbershop_id));
