alter table public.business_settings
  add column if not exists public_slug text,
  add column if not exists public_booking_enabled boolean not null default false;

alter table public.business_appointments
  add column if not exists client_phone text not null default '',
  add column if not exists public_reference text,
  add column if not exists public_token_hash text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_source text;

create unique index if not exists business_settings_public_slug_key
  on public.business_settings(lower(public_slug)) where public_slug is not null;
create unique index if not exists business_appointments_public_reference_key
  on public.business_appointments(public_reference) where public_reference is not null;

create or replace function public.get_public_booking_settings(target_barbershop_id uuid)
returns jsonb language sql stable security invoker set search_path=pg_catalog,public
as $$ select jsonb_build_object('slug',public_slug,'enabled',public_booking_enabled) from public.business_settings where barbershop_id=target_barbershop_id and public.belongs_to_barbershop(barbershop_id) $$;
create or replace function public.set_public_booking_settings(target_barbershop_id uuid,target_slug text,target_enabled boolean)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public
as $$ declare clean_slug text:=lower(trim(target_slug)); begin
  if not public.is_business_manager(target_barbershop_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
  if clean_slug!~'^[a-z0-9][a-z0-9-]{2,47}$' then raise exception 'Endereço inválido' using errcode='22023'; end if;
  insert into public.business_settings(barbershop_id,display_name,segment,public_slug,public_booking_enabled)
  select id,name,segment,clean_slug,target_enabled from public.barbershops where id=target_barbershop_id
  on conflict(barbershop_id) do update set public_slug=excluded.public_slug,public_booking_enabled=excluded.public_booking_enabled;
  if not found then raise exception 'Negócio inválido' using errcode='22023'; end if;
  return jsonb_build_object('slug',clean_slug,'enabled',target_enabled);
exception when unique_violation then raise exception 'Este endereço já está em uso' using errcode='23505'; end; $$;
revoke all on function public.get_public_booking_settings(uuid),public.set_public_booking_settings(uuid,text,boolean) from public,anon;
grant execute on function public.get_public_booking_settings(uuid),public.set_public_booking_settings(uuid,text,boolean) to authenticated;

create table if not exists private.public_booking_attempts (
  id bigint generated always as identity primary key,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  contact_hash text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);
create index if not exists public_booking_attempts_rate_idx
  on private.public_booking_attempts(contact_hash, attempted_at desc);
revoke all on table private.public_booking_attempts from public, anon, authenticated;
revoke all on sequence private.public_booking_attempts_id_seq from public, anon, authenticated;

create or replace function private.public_booking_page(target_slug text)
returns jsonb language plpgsql stable security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare settings public.business_settings; result jsonb;
begin
  select bs.* into settings from public.business_settings bs
  join public.barbershops b on b.id=bs.barbershop_id
  where lower(bs.public_slug)=lower(trim(target_slug)) and bs.public_booking_enabled
    and b.active and b.deleted_at is null;
  if settings.barbershop_id is null then raise exception 'Agenda pública indisponível' using errcode='22023'; end if;
  select jsonb_build_object(
    'business', jsonb_build_object('name',settings.display_name,'segment',settings.segment,'slug',settings.public_slug,'timezone',settings.timezone,'minimum_notice_minutes',settings.minimum_notice_minutes),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',s.description,'duration_minutes',s.duration_minutes,'price',s.price) order by s.name) from public.services s where s.barbershop_id=settings.barbershop_id and s.active),'[]'::jsonb),
    'professionals', coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'name',e.name,'specialty',e.specialty,'service_ids',coalesce((select jsonb_agg(es.service_id) from public.employee_services es where es.employee_id=e.id),(select jsonb_agg(s.id) from public.services s where s.barbershop_id=e.barbershop_id and s.active))) order by e.name) from public.employees e where e.barbershop_id=settings.barbershop_id and e.active),'[]'::jsonb)
  ) into result;
  return result;
end; $$;

create or replace function public.public_booking_page(target_slug text)
returns jsonb language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select private.public_booking_page(target_slug) $$;

create or replace function private.public_available_slots(target_slug text,target_service_id uuid,target_employee_id uuid,target_date date)
returns table(slot_time time) language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
declare settings public.business_settings; selected_service public.services; selected_employee public.employees; weekday_number smallint:=extract(dow from target_date)::smallint;
begin
  select bs.* into settings from public.business_settings bs join public.barbershops b on b.id=bs.barbershop_id
  where lower(bs.public_slug)=lower(trim(target_slug)) and bs.public_booking_enabled and b.active and b.deleted_at is null;
  if settings.barbershop_id is null or target_date<current_date then return; end if;
  select * into selected_service from public.services where id=target_service_id and barbershop_id=settings.barbershop_id and active;
  select * into selected_employee from public.employees where id=target_employee_id and barbershop_id=settings.barbershop_id and active;
  if selected_service.id is null or selected_employee.id is null then return; end if;
  if exists(select 1 from public.employee_services where employee_id=target_employee_id)
    and not exists(select 1 from public.employee_services where employee_id=target_employee_id and service_id=target_service_id) then return; end if;
  return query with work_ranges as (
    select h.start_time,h.end_time from public.employee_working_hours h where h.employee_id=target_employee_id and h.weekday=weekday_number
    union all select settings.open_time,settings.close_time where not exists(select 1 from public.employee_working_hours where employee_id=target_employee_id)
  ), candidates as (
    select generated::time candidate_time,target_date+generated::time candidate_start,target_date+generated::time+make_interval(mins=>selected_service.duration_minutes) candidate_end
    from work_ranges wr cross join lateral generate_series(target_date+wr.start_time,target_date+wr.end_time-make_interval(mins=>selected_service.duration_minutes),make_interval(mins=>settings.slot_duration_minutes)) generated
  ) select c.candidate_time from candidates c
  where c.candidate_start >= (now() at time zone settings.timezone)+make_interval(mins=>settings.minimum_notice_minutes)
    and not exists(select 1 from public.employee_time_off t where t.employee_id=target_employee_id and tsrange(t.starts_at,t.ends_at,'[)')&&tsrange(c.candidate_start,c.candidate_end,'[)'))
    and not exists(select 1 from public.business_appointments a where a.employee_id=target_employee_id and a.status<>'cancelled' and a.appointment_period&&tsrange(c.candidate_start,c.candidate_end,'[)'))
  order by c.candidate_time;
end; $$;

create or replace function public.public_available_slots(target_slug text,target_service_id uuid,target_employee_id uuid,target_date date)
returns table(slot_time time) language sql stable security invoker
set search_path = pg_catalog, public, private
as $$ select * from private.public_available_slots(target_slug,target_service_id,target_employee_id,target_date) $$;

create or replace function private.public_create_appointment(
  target_slug text,target_service_id uuid,target_employee_id uuid,target_date date,target_time time,
  supplied_name text,supplied_email text,supplied_phone text,accepted_privacy boolean,website text default ''
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare settings public.business_settings; selected_service public.services; selected_employee public.employees; clean_name text:=trim(supplied_name); clean_email text:=lower(trim(supplied_email)); clean_phone text:=regexp_replace(supplied_phone,'\D','','g'); v_contact_hash text; secret_token text; booking_reference text; result public.business_appointments;
begin
  if coalesce(trim(website),'')<>'' then raise exception 'Não foi possível concluir a solicitação' using errcode='22023'; end if;
  if not accepted_privacy then raise exception 'É necessário aceitar o aviso de privacidade' using errcode='22023'; end if;
  if length(clean_name) not between 2 and 150 or clean_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(clean_email)>320 or length(clean_phone) not between 10 and 15 then raise exception 'Dados de contato inválidos' using errcode='22023'; end if;
  select bs.* into settings from public.business_settings bs join public.barbershops b on b.id=bs.barbershop_id
  where lower(bs.public_slug)=lower(trim(target_slug)) and bs.public_booking_enabled and b.active and b.deleted_at is null;
  if settings.barbershop_id is null then raise exception 'Agenda pública indisponível' using errcode='22023'; end if;
  v_contact_hash:=encode(digest(clean_email||'|'||clean_phone,'sha256'),'hex');
  delete from private.public_booking_attempts where attempted_at<now()-interval '48 hours';
  if (select count(*) from private.public_booking_attempts where contact_hash=v_contact_hash and attempted_at>now()-interval '1 hour')>=5 then raise exception 'Muitas tentativas. Aguarde antes de tentar novamente' using errcode='P0001'; end if;
  insert into private.public_booking_attempts(barbershop_id,contact_hash) values(settings.barbershop_id,v_contact_hash);
  select * into selected_service from public.services where id=target_service_id and barbershop_id=settings.barbershop_id and active;
  select * into selected_employee from public.employees where id=target_employee_id and barbershop_id=settings.barbershop_id and active;
  if selected_service.id is null or selected_employee.id is null then raise exception 'Serviço ou profissional inválido' using errcode='22023'; end if;
  if not exists(select 1 from private.public_available_slots(target_slug,target_service_id,target_employee_id,target_date) where slot_time=target_time) then raise exception 'Horário indisponível' using errcode='23505'; end if;
  secret_token:=encode(gen_random_bytes(24),'hex'); booking_reference:=upper(encode(gen_random_bytes(6),'hex'));
  insert into public.business_appointments(barbershop_id,client_name,client_email,client_phone,service_id,employee_id,service,professional,appointment_date,appointment_time,duration_minutes,price_snapshot,status,created_by,public_reference,public_token_hash)
  values(settings.barbershop_id,clean_name,clean_email,clean_phone,selected_service.id,selected_employee.id,selected_service.name,selected_employee.name,target_date,target_time,selected_service.duration_minutes,selected_service.price,'requested','public',booking_reference,encode(digest(secret_token,'sha256'),'hex')) returning * into result;
  update private.public_booking_attempts set succeeded=true where id=(select id from private.public_booking_attempts where contact_hash=v_contact_hash order by id desc limit 1);
  return jsonb_build_object('reference',result.public_reference,'token',secret_token,'status',result.status,'business',settings.display_name,'service',result.service,'professional',result.professional,'date',result.appointment_date,'time',result.appointment_time);
exception when exclusion_violation or unique_violation then raise exception 'Horário indisponível' using errcode='23505';
end; $$;

create or replace function public.public_create_appointment(target_slug text,target_service_id uuid,target_employee_id uuid,target_date date,target_time time,supplied_name text,supplied_email text,supplied_phone text,accepted_privacy boolean,website text default '')
returns jsonb language sql security invoker set search_path=pg_catalog,public,private
as $$ select private.public_create_appointment(target_slug,target_service_id,target_employee_id,target_date,target_time,supplied_name,supplied_email,supplied_phone,accepted_privacy,website) $$;

create or replace function private.public_get_appointment(target_reference text,target_token text)
returns jsonb language sql stable security definer set search_path=pg_catalog,public,private,extensions
as $$ select jsonb_build_object('reference',a.public_reference,'business',s.display_name,'service',a.service,'professional',a.professional,'date',a.appointment_date,'time',a.appointment_time,'status',a.status,'can_cancel',a.status in ('requested','confirmed') and a.appointment_date>=current_date) from public.business_appointments a join public.business_settings s on s.barbershop_id=a.barbershop_id where a.public_reference=upper(trim(target_reference)) and a.public_token_hash=encode(digest(target_token,'sha256'),'hex') $$;
create or replace function public.public_get_appointment(target_reference text,target_token text)
returns jsonb language sql stable security invoker set search_path=pg_catalog,public,private as $$ select private.public_get_appointment(target_reference,target_token) $$;

create or replace function private.public_cancel_appointment(target_reference text,target_token text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,private,extensions
as $$ begin update public.business_appointments set status='cancelled',cancelled_at=now(),cancellation_source='public_link' where public_reference=upper(trim(target_reference)) and public_token_hash=encode(digest(target_token,'sha256'),'hex') and status in ('requested','confirmed') and appointment_date>=current_date; return found; end; $$;
create or replace function public.public_cancel_appointment(target_reference text,target_token text)
returns boolean language sql security invoker set search_path=pg_catalog,public,private as $$ select private.public_cancel_appointment(target_reference,target_token) $$;

revoke all on function private.public_booking_page(text),private.public_available_slots(text,uuid,uuid,date),private.public_create_appointment(text,uuid,uuid,date,time,text,text,text,boolean,text),private.public_get_appointment(text,text),private.public_cancel_appointment(text,text) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.public_booking_page(text),private.public_available_slots(text,uuid,uuid,date),private.public_create_appointment(text,uuid,uuid,date,time,text,text,text,boolean,text),private.public_get_appointment(text,text),private.public_cancel_appointment(text,text) to anon,authenticated;
revoke all on function public.public_booking_page(text),public.public_available_slots(text,uuid,uuid,date),public.public_create_appointment(text,uuid,uuid,date,time,text,text,text,boolean,text),public.public_get_appointment(text,text),public.public_cancel_appointment(text,text) from public;
grant execute on function public.public_booking_page(text),public.public_available_slots(text,uuid,uuid,date),public.public_create_appointment(text,uuid,uuid,date,time,text,text,text,boolean,text),public.public_get_appointment(text,text),public.public_cancel_appointment(text,text) to anon,authenticated;
