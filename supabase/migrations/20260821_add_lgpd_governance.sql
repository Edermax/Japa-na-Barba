-- Estruturas iniciais de governança e atendimento à LGPD.
create table if not exists public.privacy_requests (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null,
    requester_id uuid not null default auth.uid(),
    requester_name text not null,
    requester_email text not null,
    request_type text not null check (request_type in ('access', 'correction', 'deletion', 'portability', 'revocation', 'objection', 'information')),
    details text not null default '',
    status text not null default 'received' check (status in ('received', 'in_review', 'completed', 'rejected')),
    response_notes text not null default '',
    due_at timestamptz not null default (now() + interval '15 days'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists privacy_requests_business_status_idx
on public.privacy_requests (barbershop_id, status, created_at desc);

create table if not exists public.privacy_acknowledgements (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null,
    user_id uuid not null default auth.uid(),
    document_type text not null check (document_type in ('privacy_notice', 'terms')),
    document_version text not null,
    acknowledged_at timestamptz not null default now(),
    unique (user_id, document_type, document_version)
);

create table if not exists public.data_retention_settings (
    barbershop_id uuid primary key,
    inactive_client_months integer not null default 24 check (inactive_client_months between 6 and 120),
    appointment_history_months integer not null default 60 check (appointment_history_months between 12 and 120),
    audit_log_months integer not null default 24 check (audit_log_months between 12 and 120),
    legal_hold boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.data_audit_logs (
    id bigint generated always as identity primary key,
    barbershop_id uuid not null,
    actor_id uuid,
    table_name text not null,
    record_id uuid,
    action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
    changed_fields text[] not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists data_audit_logs_business_created_idx
on public.data_audit_logs (barbershop_id, created_at desc);

alter table public.privacy_requests enable row level security;
alter table public.privacy_acknowledgements enable row level security;
alter table public.data_retention_settings enable row level security;
alter table public.data_audit_logs enable row level security;

grant select, insert, update on public.privacy_requests to authenticated;
grant select, insert on public.privacy_acknowledgements to authenticated;
grant select, insert, update on public.data_retention_settings to authenticated;
grant select on public.data_audit_logs to authenticated;

create policy "Users create their privacy requests" on public.privacy_requests
for insert to authenticated with check (
    requester_id = auth.uid() and public.belongs_to_barbershop(barbershop_id)
    and lower(requester_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
create policy "Users view their privacy requests" on public.privacy_requests
for select to authenticated using (
    requester_id = auth.uid() or public.is_business_manager(barbershop_id)
);
create policy "Business team handles privacy requests" on public.privacy_requests
for update to authenticated using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));

create policy "Users register privacy acknowledgement" on public.privacy_acknowledgements
for insert to authenticated with check (
    user_id = auth.uid() and public.belongs_to_barbershop(barbershop_id)
);
create policy "Users view privacy acknowledgement" on public.privacy_acknowledgements
for select to authenticated using (
    user_id = auth.uid() or public.is_business_manager(barbershop_id)
);

create policy "Business team manages retention" on public.data_retention_settings
for all to authenticated using (public.is_business_manager(barbershop_id))
with check (public.is_business_manager(barbershop_id));
create policy "Business team views audit logs" on public.data_audit_logs
for select to authenticated using (public.is_business_manager(barbershop_id));

create or replace function public.log_personal_data_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    target_business uuid;
    target_record uuid;
    fields text[] := '{}';
begin
    if tg_op = 'DELETE' then
        target_business := old.barbershop_id;
        target_record := old.id;
    else
        target_business := new.barbershop_id;
        target_record := new.id;
    end if;
    if tg_op = 'UPDATE' then
        select coalesce(array_agg(key), '{}') into fields
        from jsonb_each(to_jsonb(new)) n
        where (to_jsonb(old) -> n.key) is distinct from n.value
          and n.key not in ('updated_at');
    end if;
    insert into public.data_audit_logs (barbershop_id, actor_id, table_name, record_id, action, changed_fields)
    values (target_business, auth.uid(), tg_table_name, target_record, tg_op, fields);
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;

revoke all on function public.log_personal_data_change() from public;

drop trigger if exists audit_business_clients on public.business_clients;
create trigger audit_business_clients after insert or update or delete on public.business_clients
for each row execute function public.log_personal_data_change();
drop trigger if exists audit_business_appointments on public.business_appointments;
create trigger audit_business_appointments after insert or update or delete on public.business_appointments
for each row execute function public.log_personal_data_change();

drop trigger if exists privacy_requests_set_updated_at on public.privacy_requests;
create trigger privacy_requests_set_updated_at before update on public.privacy_requests
for each row execute function public.ogritech_set_updated_at();
drop trigger if exists retention_settings_set_updated_at on public.data_retention_settings;
create trigger retention_settings_set_updated_at before update on public.data_retention_settings
for each row execute function public.ogritech_set_updated_at();
