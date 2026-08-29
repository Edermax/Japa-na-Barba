-- Salva toda a disponibilidade de um profissional em uma única transação.
create or replace function public.save_staff_availability(
  target_barbershop_id uuid,
  target_employee_id uuid,
  target_service_ids uuid[],
  target_working_hours jsonb,
  target_time_off jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  work_item jsonb;
  time_off_item jsonb;
begin
  if not public.is_business_manager(target_barbershop_id) then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.employees
    where id = target_employee_id and barbershop_id = target_barbershop_id and active
  ) then
    raise exception 'Profissional inválido' using errcode = '22023';
  end if;

  if coalesce(cardinality(target_service_ids), 0) = 0 then
    raise exception 'Selecione ao menos um serviço' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(target_service_ids) service_id
    where not exists (
      select 1 from public.services
      where id = service_id and barbershop_id = target_barbershop_id and active
    )
  ) then
    raise exception 'Serviço inválido' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(target_working_hours, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(target_working_hours, '[]'::jsonb)) > 21 then
    raise exception 'Jornada inválida' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(target_time_off, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(target_time_off, '[]'::jsonb)) > 100 then
    raise exception 'Lista de bloqueios inválida' using errcode = '22023';
  end if;

  delete from public.employee_services where employee_id = target_employee_id;
  insert into public.employee_services(barbershop_id, employee_id, service_id)
  select target_barbershop_id, target_employee_id, service_id
  from (select distinct unnest(target_service_ids) service_id) selected;

  delete from public.employee_working_hours where employee_id = target_employee_id;
  for work_item in select value from jsonb_array_elements(coalesce(target_working_hours, '[]'::jsonb)) loop
    if (work_item->>'weekday')::int not between 0 and 6
       or (work_item->>'start_time')::time >= (work_item->>'end_time')::time then
      raise exception 'Período de trabalho inválido' using errcode = '22023';
    end if;
    insert into public.employee_working_hours(barbershop_id, employee_id, weekday, start_time, end_time)
    values (
      target_barbershop_id,
      target_employee_id,
      (work_item->>'weekday')::smallint,
      (work_item->>'start_time')::time,
      (work_item->>'end_time')::time
    );
  end loop;

  if exists (
    select 1
    from public.employee_working_hours first_range
    join public.employee_working_hours second_range
      on second_range.employee_id = first_range.employee_id
     and second_range.weekday = first_range.weekday
     and second_range.id > first_range.id
     and second_range.start_time < first_range.end_time
     and first_range.start_time < second_range.end_time
    where first_range.employee_id = target_employee_id
  ) then
    raise exception 'A jornada contém horários sobrepostos' using errcode = '22023';
  end if;

  delete from public.employee_time_off where employee_id = target_employee_id;
  for time_off_item in select value from jsonb_array_elements(coalesce(target_time_off, '[]'::jsonb)) loop
    if (time_off_item->>'starts_at')::timestamp >= (time_off_item->>'ends_at')::timestamp then
      raise exception 'Bloqueio inválido' using errcode = '22023';
    end if;
    insert into public.employee_time_off(barbershop_id, employee_id, starts_at, ends_at, reason)
    values (
      target_barbershop_id,
      target_employee_id,
      (time_off_item->>'starts_at')::timestamp,
      (time_off_item->>'ends_at')::timestamp,
      left(coalesce(time_off_item->>'reason', ''), 240)
    );
  end loop;

  return jsonb_build_object(
    'employee_id', target_employee_id,
    'services', (select count(*) from public.employee_services where employee_id = target_employee_id),
    'working_hours', (select count(*) from public.employee_working_hours where employee_id = target_employee_id),
    'time_off', (select count(*) from public.employee_time_off where employee_id = target_employee_id)
  );
exception
  when invalid_text_representation or datetime_field_overflow or null_value_not_allowed then
    raise exception 'Dados de disponibilidade inválidos' using errcode = '22023';
end;
$$;

revoke all on function public.save_staff_availability(uuid,uuid,uuid[],jsonb,jsonb) from public, anon;
grant execute on function public.save_staff_availability(uuid,uuid,uuid[],jsonb,jsonb) to authenticated;
