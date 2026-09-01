-- Índices de suporte para as FKs sinalizadas pelo Performance Advisor.
create index if not exists public_booking_attempts_barbershop_fk_idx
    on private.public_booking_attempts(barbershop_id);
create index if not exists appointment_notifications_appointment_fk_idx
    on public.appointment_notifications(appointment_id);
create index if not exists appointment_notifications_event_fk_idx
    on public.appointment_notifications(event_id);
create index if not exists appointment_status_events_actor_fk_idx
    on public.appointment_status_events(actor_id);
create index if not exists employee_services_service_fk_idx
    on public.employee_services(service_id);
create index if not exists employee_time_off_barbershop_fk_idx
    on public.employee_time_off(barbershop_id);
create index if not exists employee_working_hours_barbershop_fk_idx
    on public.employee_working_hours(barbershop_id);
