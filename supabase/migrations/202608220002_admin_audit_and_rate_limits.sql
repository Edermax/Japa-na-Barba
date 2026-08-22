create table if not exists public.platform_admin_events (
    id bigint generated always as identity primary key,
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    target_id text,
    success boolean not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
create index if not exists platform_admin_events_actor_created_idx on public.platform_admin_events (actor_id, created_at desc);
alter table public.platform_admin_events enable row level security;
grant select on public.platform_admin_events to authenticated;
drop policy if exists "Platform admins view admin events" on public.platform_admin_events;
create policy "Platform admins view admin events" on public.platform_admin_events for select to authenticated using (public.is_platform_admin());
create or replace function public.platform_check_rate_limit(action_name text, max_actions integer default 30)
returns boolean language plpgsql security definer set search_path = public as $$
declare recent_count integer;
begin
    if not public.is_platform_admin() then return false; end if;
    select count(*) into recent_count from public.platform_admin_events
      where actor_id = auth.uid() and action = action_name and created_at > now() - interval '1 minute';
    return recent_count < greatest(1, least(max_actions, 100));
end;
$$;
revoke all on function public.platform_check_rate_limit(text,integer) from public;
grant execute on function public.platform_check_rate_limit(text,integer) to authenticated;
