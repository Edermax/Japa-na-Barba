-- Operacoes de agenda consistentes: maquina de estados, auditoria imutavel e
-- notificacoes criadas na mesma transacao do agendamento.
-- clock_timestamp garante uma versao monotonicamente nova mesmo quando duas
-- alteracoes ocorrem dentro da mesma transacao (now() e fixo por transacao).
create or replace function public.ogritech_set_updated_at()
returns trigger language plpgsql security invoker
set search_path = ''
as $$ begin new.updated_at = pg_catalog.clock_timestamp(); return new; end; $$;
revoke all on function public.ogritech_set_updated_at() from public, anon, authenticated;

create table public.appointment_status_events (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null references public.business_appointments(id) on delete cascade,
  from_status text check (from_status is null or from_status in ('requested','confirmed','completed','cancelled','no_show')),
  to_status text not null check (to_status in ('requested','confirmed','completed','cancelled','no_show')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  source text not null check (source in ('public_booking','public_link','panel','system')),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now()
);

create index appointment_status_events_appointment_idx
  on public.appointment_status_events(appointment_id, created_at desc);
create index appointment_status_events_business_idx
  on public.appointment_status_events(barbershop_id, created_at desc);

create table public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null references public.business_appointments(id) on delete cascade,
  event_id uuid not null references public.appointment_status_events(id) on delete cascade,
  audience text not null check (audience in ('business','client')),
  channel text not null check (channel in ('in_app','email')),
  recipient text not null default '',
  event_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('unread','read','queued','sent','failed','cancelled')),
  read_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  constraint appointment_notifications_channel_status_check check (
    (channel = 'in_app' and status in ('unread','read','cancelled'))
    or (channel = 'email' and status in ('queued','sent','failed','cancelled'))
  )
);

create index appointment_notifications_business_unread_idx
  on public.appointment_notifications(barbershop_id, created_at desc)
  where audience = 'business' and channel = 'in_app' and status = 'unread';
create index appointment_notifications_email_queue_idx
  on public.appointment_notifications(created_at, id)
  where channel = 'email' and status in ('queued','failed');

alter table public.appointment_status_events enable row level security;
alter table public.appointment_notifications enable row level security;

revoke all on public.appointment_status_events, public.appointment_notifications from public, anon, authenticated;
grant select on public.appointment_status_events, public.appointment_notifications to authenticated;

create policy "Business team views appointment audit"
  on public.appointment_status_events for select to authenticated
  using ((select public.is_business_team(barbershop_id)));

create policy "Business team views appointment notifications"
  on public.appointment_notifications for select to authenticated
  using ((select public.is_business_team(barbershop_id)));

create function private.record_appointment_operation()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  event_row public.appointment_status_events;
  resolved_source text;
  resolved_role text;
  resolved_note text;
  status_label text;
  notification_title text;
  notification_body text;
begin
  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  if tg_op = 'UPDATE' and not (
    (old.status = 'requested' and new.status in ('confirmed','cancelled'))
    or (old.status = 'confirmed' and new.status in ('completed','no_show','cancelled'))
  ) then
    raise exception 'Transicao de status invalida: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  select p.role into resolved_role
  from public.profiles p
  where p.id = (select auth.uid()) and p.active;

  resolved_source := case
    when tg_op = 'INSERT' and new.created_by = 'public' then 'public_booking'
    when tg_op = 'UPDATE' and new.cancellation_source = 'public_link' then 'public_link'
    else coalesce(nullif(current_setting('ogritech.operation_source', true), ''), 'panel')
  end;
  resolved_note := left(coalesce(current_setting('ogritech.operation_note', true), ''), 500);
  status_label := case new.status
    when 'requested' then 'solicitado'
    when 'confirmed' then 'confirmado'
    when 'completed' then 'concluido'
    when 'cancelled' then 'cancelado'
    when 'no_show' then 'marcado como nao compareceu'
  end;
  notification_title := case new.status
    when 'requested' then 'Novo agendamento solicitado'
    when 'confirmed' then 'Agendamento confirmado'
    when 'completed' then 'Atendimento concluido'
    when 'cancelled' then 'Agendamento cancelado'
    when 'no_show' then 'Cliente nao compareceu'
  end;
  notification_body := format('%s - %s em %s as %s', new.client_name, new.service,
    to_char(new.appointment_date, 'DD/MM/YYYY'), to_char(new.appointment_time, 'HH24:MI'));

  insert into public.appointment_status_events(
    barbershop_id, appointment_id, from_status, to_status, actor_id,
    actor_role, source, note
  ) values (
    new.barbershop_id, new.id,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status, (select auth.uid()), resolved_role, resolved_source, resolved_note
  ) returning * into event_row;

  insert into public.appointment_notifications(
    barbershop_id, appointment_id, event_id, audience, channel, event_type,
    title, body, payload, status
  ) values (
    new.barbershop_id, new.id, event_row.id, 'business', 'in_app',
    'appointment.' || new.status, notification_title, notification_body,
    jsonb_build_object('appointment_id', new.id, 'status', new.status), 'unread'
  );

  if coalesce(trim(new.client_email), '') <> '' then
    insert into public.appointment_notifications(
      barbershop_id, appointment_id, event_id, audience, channel, recipient,
      event_type, title, body, payload, status
    ) values (
      new.barbershop_id, new.id, event_row.id, 'client', 'email', lower(trim(new.client_email)),
      'appointment.' || new.status, notification_title, notification_body,
      jsonb_build_object(
        'appointment_id', new.id, 'reference', new.public_reference,
        'client_name', new.client_name, 'service', new.service,
        'professional', new.professional, 'date', new.appointment_date,
        'time', new.appointment_time, 'status', new.status
      ), 'queued'
    );
  end if;

  return new;
end;
$$;

revoke all on function private.record_appointment_operation() from public, anon, authenticated;

create trigger business_appointments_record_operation
after insert or update of status on public.business_appointments
for each row execute function private.record_appointment_operation();

create function private.transition_appointment_status(
  target_appointment_id uuid,
  target_status text,
  expected_updated_at timestamptz,
  operation_note text default ''
) returns public.business_appointments
language plpgsql security definer
set search_path = ''
as $$
declare
  appointment_row public.business_appointments;
  caller_profile public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'Autenticacao obrigatoria' using errcode = '42501';
  end if;
  if target_status not in ('confirmed','completed','cancelled','no_show') then
    raise exception 'Status de destino invalido' using errcode = '22023';
  end if;
  if length(coalesce(operation_note, '')) > 500 then
    raise exception 'A observacao deve ter no maximo 500 caracteres' using errcode = '22023';
  end if;

  select * into appointment_row
  from public.business_appointments
  where id = target_appointment_id
  for update;

  if appointment_row.id is null then
    raise exception 'Agendamento nao encontrado' using errcode = 'P0002';
  end if;

  select * into caller_profile
  from public.profiles
  where id = (select auth.uid()) and active and barbershop_id = appointment_row.barbershop_id;

  if caller_profile.id is null
     or caller_profile.role not in ('owner','admin','employee')
     or (caller_profile.role = 'employee' and caller_profile.employee_id is distinct from appointment_row.employee_id) then
    raise exception 'Sem permissao para alterar este agendamento' using errcode = '42501';
  end if;

  if expected_updated_at is null or appointment_row.updated_at is distinct from expected_updated_at then
    raise exception 'Este agendamento foi alterado por outra pessoa. Atualize a agenda e tente novamente.'
      using errcode = '40001';
  end if;

  perform set_config('ogritech.operation_source', 'panel', true);
  perform set_config('ogritech.operation_note', coalesce(trim(operation_note), ''), true);

  update public.business_appointments
  set status = target_status,
      cancelled_at = case when target_status = 'cancelled' then now() else cancelled_at end,
      cancellation_source = case when target_status = 'cancelled' then 'panel' else cancellation_source end
  where id = appointment_row.id
  returning * into appointment_row;

  return appointment_row;
end;
$$;

create function public.transition_appointment_status(
  target_appointment_id uuid,
  target_status text,
  expected_updated_at timestamptz,
  operation_note text default ''
) returns public.business_appointments
language sql security invoker
set search_path = ''
as $$
  select private.transition_appointment_status(
    target_appointment_id, target_status, expected_updated_at, operation_note
  )
$$;

create function private.mark_appointment_notification_read(target_notification_id uuid)
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  update public.appointment_notifications n
  set status = 'read', read_at = now()
  where n.id = target_notification_id
    and n.audience = 'business' and n.channel = 'in_app' and n.status = 'unread'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.active
        and p.barbershop_id = n.barbershop_id
        and p.role in ('owner','admin','employee')
    );
  return found;
end;
$$;

create function public.mark_appointment_notification_read(target_notification_id uuid)
returns boolean language sql security invoker
set search_path = ''
as $$ select private.mark_appointment_notification_read(target_notification_id) $$;

revoke all on function
  private.transition_appointment_status(uuid,text,timestamptz,text),
  private.mark_appointment_notification_read(uuid)
from public, anon, authenticated;
grant execute on function
  private.transition_appointment_status(uuid,text,timestamptz,text),
  private.mark_appointment_notification_read(uuid)
to authenticated;

revoke all on function
  public.transition_appointment_status(uuid,text,timestamptz,text),
  public.mark_appointment_notification_read(uuid)
from public, anon;
grant execute on function
  public.transition_appointment_status(uuid,text,timestamptz,text),
  public.mark_appointment_notification_read(uuid)
to authenticated;
