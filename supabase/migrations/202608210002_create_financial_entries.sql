create table if not exists public.financial_entries (
    id uuid primary key default gen_random_uuid(), barbershop_id uuid not null,
    -- A FK é adicionada na migration operacional seguinte, depois que a tabela
    -- business_appointments passa a existir em instalações novas.
    appointment_id uuid,
    entry_type text not null check (entry_type in ('income','expense')),
    category text not null, description text not null, amount numeric(12,2) not null check (amount > 0),
    payment_method text not null default 'other', occurred_on date not null default current_date,
    status text not null default 'paid' check (status in ('paid','pending')),
    notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists financial_entries_business_date_idx on public.financial_entries (barbershop_id, occurred_on desc);
alter table public.financial_entries enable row level security;
grant select, insert, update, delete on public.financial_entries to authenticated;
drop policy if exists "Business managers manage finances" on public.financial_entries;
create policy "Business managers manage finances" on public.financial_entries for all to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id));
drop trigger if exists financial_entries_set_updated_at on public.financial_entries;
create trigger financial_entries_set_updated_at before update on public.financial_entries for each row execute function public.ogritech_set_updated_at();
drop trigger if exists audit_financial_entries on public.financial_entries;
create trigger audit_financial_entries after insert or update or delete on public.financial_entries for each row execute function public.log_personal_data_change();
