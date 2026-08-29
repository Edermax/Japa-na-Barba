create function private.enforce_atomic_appointment_status_change()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
     and coalesce(current_setting('ogritech.operation_source', true), '') = '' then
    raise exception 'Use a operacao atomica para alterar o status do agendamento'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_atomic_appointment_status_change() from public, anon, authenticated;

create trigger business_appointments_enforce_atomic_status
before update of status on public.business_appointments
for each row execute function private.enforce_atomic_appointment_status_change();

create or replace function private.public_cancel_appointment(target_reference text,target_token text)
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  perform set_config('ogritech.operation_source','public_link',true);
  perform set_config('ogritech.operation_note','Cancelado pelo link seguro do cliente',true);
  update public.business_appointments
  set status='cancelled',cancelled_at=now(),cancellation_source='public_link'
  where public_reference=upper(trim(target_reference))
    and public_token_hash=encode(extensions.digest(target_token,'sha256'),'hex')
    and status in ('requested','confirmed') and appointment_date>=current_date;
  return found;
end;
$$;

create or replace function private.cancel_my_appointment(appointment_id uuid)
returns boolean language plpgsql security definer
set search_path = ''
as $$
begin
  perform set_config('ogritech.operation_source','public_link',true);
  perform set_config('ogritech.operation_note','Cancelado pelo cliente autenticado',true);
  update public.business_appointments
  set status='cancelled',cancelled_at=now(),cancellation_source='public_link'
  where id=appointment_id
    and lower(client_email)=lower(coalesce((select auth.jwt()->>'email'),''))
    and private.belongs_to_barbershop(barbershop_id)
    and status in ('requested','confirmed');
  return found;
end;
$$;
