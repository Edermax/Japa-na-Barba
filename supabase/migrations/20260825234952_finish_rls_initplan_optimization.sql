drop policy if exists "Users create their privacy requests" on public.privacy_requests;
create policy "Users create their privacy requests" on public.privacy_requests
for insert to authenticated with check (
    requester_id = (select auth.uid())
    and public.belongs_to_barbershop(barbershop_id)
    and lower(requester_email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
);

drop policy if exists "Business users view appointments" on public.business_appointments;
create policy "Business users view appointments" on public.business_appointments
for select to authenticated using (
    public.belongs_to_barbershop(barbershop_id)
    and (
        public.is_business_manager(barbershop_id)
        or employee_id = (select public.current_profile_employee_id())
        or lower(client_email) = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
    )
);
