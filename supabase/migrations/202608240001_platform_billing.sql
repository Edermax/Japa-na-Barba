-- Faturamento da Ogritech para seus clientes SaaS.
-- Não processa nem registra pagamentos dos consumidores dos negócios clientes.

create sequence if not exists public.platform_invoice_number_seq start 1001;

create table if not exists public.billing_customers (
    id uuid primary key default gen_random_uuid(),
    saas_client_id uuid not null unique references public.saas_clients(id) on delete restrict,
    provider text not null default 'manual',
    provider_customer_id text,
    billing_email text not null,
    tax_document text not null default '',
    payment_method text not null default 'pix' check (payment_method in ('pix','credit_card','boleto','bank_transfer','manual')),
    billing_day integer not null default 10 check (billing_day between 1 and 28),
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_subscriptions (
    id uuid primary key default gen_random_uuid(),
    billing_customer_id uuid not null references public.billing_customers(id) on delete restrict,
    plan_id uuid references public.saas_plans(id) on delete set null,
    status text not null default 'pending_activation' check (status in ('trial','pending_activation','active','past_due','grace_period','suspended','cancelled')),
    billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
    base_amount numeric(12,2) not null check (base_amount >= 0),
    starts_on date not null default current_date,
    next_billing_on date,
    grace_days integer not null default 10 check (grace_days between 0 and 90),
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_service_orders (
    id uuid primary key default gen_random_uuid(),
    billing_customer_id uuid not null references public.billing_customers(id) on delete restrict,
    name text not null,
    description text not null default '',
    charge_type text not null default 'one_time' check (charge_type in ('one_time','recurring','quantity','quoted')),
    quantity numeric(10,2) not null default 1 check (quantity > 0),
    unit_amount numeric(12,2) not null check (unit_amount >= 0),
    status text not null default 'approved' check (status in ('draft','approved','invoiced','cancelled')),
    invoice_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.platform_discounts (
    id uuid primary key default gen_random_uuid(),
    billing_customer_id uuid references public.billing_customers(id) on delete cascade,
    code text,
    name text not null,
    discount_type text not null check (discount_type in ('percentage','fixed')),
    value numeric(12,2) not null check (value > 0),
    applies_to text not null default 'invoice' check (applies_to in ('implementation','subscription','service','invoice')),
    starts_on date not null default current_date,
    ends_on date,
    remaining_cycles integer check (remaining_cycles is null or remaining_cycles >= 0),
    active boolean not null default true,
    authorized_by uuid references auth.users(id) on delete set null,
    reason text not null default '',
    created_at timestamptz not null default now(),
    check (ends_on is null or ends_on >= starts_on),
    check (discount_type <> 'percentage' or value <= 100)
);

create table if not exists public.platform_invoices (
    id uuid primary key default gen_random_uuid(),
    invoice_number text not null unique default ('OGR-' || lpad(nextval('public.platform_invoice_number_seq')::text, 6, '0')),
    billing_customer_id uuid not null references public.billing_customers(id) on delete restrict,
    subscription_id uuid references public.platform_subscriptions(id) on delete set null,
    status text not null default 'draft' check (status in ('draft','open','paid','overdue','void','refunded','partially_refunded')),
    issue_date date not null default current_date,
    due_date date not null,
    subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
    discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
    credit_total numeric(12,2) not null default 0 check (credit_total >= 0),
    total numeric(12,2) not null default 0 check (total >= 0),
    paid_total numeric(12,2) not null default 0 check (paid_total >= 0),
    refunded_total numeric(12,2) not null default 0 check (refunded_total >= 0),
    provider_invoice_id text,
    notes text not null default '',
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (due_date >= issue_date),
    check (discount_total + credit_total <= subtotal)
);

alter table public.platform_service_orders drop constraint if exists platform_service_orders_invoice_fk;
alter table public.platform_service_orders
    add constraint platform_service_orders_invoice_fk foreign key (invoice_id) references public.platform_invoices(id) on delete set null;

create table if not exists public.platform_invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.platform_invoices(id) on delete cascade,
    item_type text not null check (item_type in ('implementation','subscription','additional_service','discount','credit','adjustment')),
    description text not null,
    quantity numeric(10,2) not null default 1 check (quantity > 0),
    unit_amount numeric(12,2) not null,
    line_total numeric(12,2) generated always as (round(quantity * unit_amount, 2)) stored,
    discount_id uuid references public.platform_discounts(id) on delete set null,
    service_order_id uuid references public.platform_service_orders(id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.platform_payments (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.platform_invoices(id) on delete restrict,
    provider text not null default 'manual',
    provider_payment_id text,
    method text not null check (method in ('pix','credit_card','boleto','bank_transfer','manual')),
    status text not null default 'pending' check (status in ('pending','approved','failed','cancelled','refunded','partially_refunded')),
    gross_amount numeric(12,2) not null check (gross_amount > 0),
    fee_amount numeric(12,2) not null default 0 check (fee_amount >= 0),
    net_amount numeric(12,2) generated always as (gross_amount - fee_amount) stored,
    installments integer not null default 1 check (installments between 1 and 24),
    paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (provider, provider_payment_id)
);

create table if not exists public.platform_refunds (
    id uuid primary key default gen_random_uuid(),
    payment_id uuid not null references public.platform_payments(id) on delete restrict,
    refund_type text not null check (refund_type in ('refund','chargeback','credit')),
    status text not null default 'approved' check (status in ('requested','approved','processed','rejected','failed')),
    amount numeric(12,2) not null check (amount > 0),
    reason text not null,
    provider_refund_id text,
    requested_by uuid references auth.users(id) on delete set null,
    approved_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    processed_at timestamptz
);

create table if not exists public.platform_customer_credits (
    id uuid primary key default gen_random_uuid(),
    billing_customer_id uuid not null references public.billing_customers(id) on delete restrict,
    source_refund_id uuid references public.platform_refunds(id) on delete set null,
    amount numeric(12,2) not null check (amount > 0),
    remaining_amount numeric(12,2) not null check (remaining_amount >= 0 and remaining_amount <= amount),
    reason text not null,
    expires_on date,
    created_at timestamptz not null default now()
);

create table if not exists public.platform_billing_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    provider_event_id text not null,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    processed_at timestamptz,
    error_message text,
    created_at timestamptz not null default now(),
    unique (provider, provider_event_id)
);

create table if not exists public.platform_billing_audit_log (
    id bigint generated always as identity primary key,
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id uuid,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists platform_invoices_customer_due_idx on public.platform_invoices (billing_customer_id, due_date desc);
create index if not exists platform_invoices_status_due_idx on public.platform_invoices (status, due_date);
create index if not exists platform_payments_invoice_idx on public.platform_payments (invoice_id, created_at desc);
create index if not exists platform_subscriptions_customer_idx on public.platform_subscriptions (billing_customer_id, status);

do $$ declare table_name text; begin
    foreach table_name in array array[
        'billing_customers','platform_subscriptions','platform_service_orders','platform_discounts',
        'platform_invoices','platform_invoice_items','platform_payments','platform_refunds',
        'platform_customer_credits','platform_billing_events','platform_billing_audit_log'
    ] loop
        execute format('alter table public.%I enable row level security', table_name);
        execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
        execute format('drop policy if exists "Platform admins manage %s" on public.%I', table_name, table_name);
        execute format('create policy "Platform admins manage %s" on public.%I for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin())', table_name, table_name);
    end loop;
end $$;
grant usage, select on sequence public.platform_invoice_number_seq to authenticated;

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
drop trigger if exists platform_subscriptions_set_updated_at on public.platform_subscriptions;
drop trigger if exists platform_service_orders_set_updated_at on public.platform_service_orders;
drop trigger if exists platform_invoices_set_updated_at on public.platform_invoices;
drop trigger if exists platform_payments_set_updated_at on public.platform_payments;
create trigger billing_customers_set_updated_at before update on public.billing_customers for each row execute function public.ogritech_set_updated_at();
create trigger platform_subscriptions_set_updated_at before update on public.platform_subscriptions for each row execute function public.ogritech_set_updated_at();
create trigger platform_service_orders_set_updated_at before update on public.platform_service_orders for each row execute function public.ogritech_set_updated_at();
create trigger platform_invoices_set_updated_at before update on public.platform_invoices for each row execute function public.ogritech_set_updated_at();
create trigger platform_payments_set_updated_at before update on public.platform_payments for each row execute function public.ogritech_set_updated_at();

create or replace function public.platform_ensure_billing_customer(target_saas_client_id uuid)
returns public.billing_customers language plpgsql security definer set search_path = public as $$
declare result public.billing_customers; client public.saas_clients;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
    select * into client from public.saas_clients where id = target_saas_client_id and deleted_at is null;
    if client.id is null then raise exception 'Cliente não encontrado'; end if;
    insert into public.billing_customers (saas_client_id, billing_email)
    values (client.id, coalesce(client.owner_email, ''))
    on conflict (saas_client_id) do update set billing_email = coalesce(nullif(billing_customers.billing_email, ''), excluded.billing_email)
    returning * into result;
    return result;
end $$;

create or replace function public.platform_create_invoice(
    target_saas_client_id uuid, invoice_due_date date, invoice_items jsonb,
    invoice_discount numeric default 0, invoice_credit numeric default 0, invoice_notes text default ''
) returns public.platform_invoices language plpgsql security definer set search_path = public as $$
declare customer public.billing_customers; result public.platform_invoices; item jsonb; credit_row record; subtotal_value numeric := 0; available_credit numeric := 0; credit_to_use numeric; credit_part numeric; discount_record_id uuid; service_order_record_id uuid;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
    if invoice_due_date < current_date then raise exception 'Vencimento inválido'; end if;
    if jsonb_typeof(invoice_items) <> 'array' or jsonb_array_length(invoice_items) = 0 then raise exception 'Informe ao menos um item'; end if;
    customer := public.platform_ensure_billing_customer(target_saas_client_id);
    for item in select * from jsonb_array_elements(invoice_items) loop
        if coalesce((item->>'quantity')::numeric, 0) <= 0 or coalesce((item->>'unit_amount')::numeric, -1) < 0 then raise exception 'Item inválido'; end if;
        subtotal_value := subtotal_value + round((item->>'quantity')::numeric * (item->>'unit_amount')::numeric, 2);
    end loop;
    if coalesce(invoice_discount,0) < 0 or coalesce(invoice_credit,0) < 0 or invoice_discount + invoice_credit > subtotal_value then raise exception 'Desconto ou crédito inválido'; end if;
    select coalesce(sum(remaining_amount),0) into available_credit from public.platform_customer_credits
    where billing_customer_id=customer.id and remaining_amount>0 and (expires_on is null or expires_on>=current_date);
    if invoice_credit > available_credit then raise exception 'Crédito maior que o saldo disponível'; end if;
    insert into public.platform_invoices (billing_customer_id,status,due_date,subtotal,discount_total,credit_total,total,notes)
    values (customer.id,'open',invoice_due_date,subtotal_value,invoice_discount,invoice_credit,subtotal_value-invoice_discount-invoice_credit,coalesce(invoice_notes,'')) returning * into result;
    for item in select * from jsonb_array_elements(invoice_items) loop
        service_order_record_id := null;
        if item->>'item_type'='additional_service' then
            insert into public.platform_service_orders(billing_customer_id,name,description,charge_type,quantity,unit_amount,status,invoice_id)
            values(customer.id,left(item->>'description',120),left(item->>'description',500),'one_time',(item->>'quantity')::numeric,(item->>'unit_amount')::numeric,'invoiced',result.id)
            returning id into service_order_record_id;
        end if;
        insert into public.platform_invoice_items (invoice_id,item_type,description,quantity,unit_amount,service_order_id)
        values (result.id, item->>'item_type', left(item->>'description',300), (item->>'quantity')::numeric, (item->>'unit_amount')::numeric,service_order_record_id);
    end loop;
    if invoice_discount > 0 then
        insert into public.platform_discounts(billing_customer_id,name,discount_type,value,applies_to,remaining_cycles,active,authorized_by,reason)
        values(customer.id,'Desconto comercial da fatura','fixed',invoice_discount,'invoice',0,false,auth.uid(),coalesce(nullif(invoice_notes,''),'Concessão registrada na fatura'))
        returning id into discount_record_id;
        insert into public.platform_invoice_items(invoice_id,item_type,description,quantity,unit_amount,discount_id)
        values(result.id,'discount','Desconto comercial',1,-invoice_discount,discount_record_id);
    end if;
    if invoice_credit > 0 then
        insert into public.platform_invoice_items(invoice_id,item_type,description,quantity,unit_amount)
        values(result.id,'credit','Crédito utilizado',1,-invoice_credit);
    end if;
    credit_to_use := invoice_credit;
    for credit_row in select id,remaining_amount from public.platform_customer_credits
        where billing_customer_id=customer.id and remaining_amount>0 and (expires_on is null or expires_on>=current_date)
        order by expires_on nulls last,created_at for update
    loop
        exit when credit_to_use <= 0;
        credit_part := least(credit_to_use,credit_row.remaining_amount);
        update public.platform_customer_credits set remaining_amount=remaining_amount-credit_part where id=credit_row.id;
        credit_to_use := credit_to_use-credit_part;
    end loop;
    insert into public.platform_billing_audit_log(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'invoice.created','invoice',result.id,jsonb_build_object('total',result.total));
    return result;
end $$;

create or replace function public.platform_record_payment(
    target_invoice_id uuid, payment_method text, payment_amount numeric,
    payment_fee numeric default 0, payment_provider text default 'manual', external_id text default null
) returns public.platform_payments language plpgsql security definer set search_path = public as $$
declare invoice public.platform_invoices; result public.platform_payments; new_paid numeric;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
    select * into invoice from public.platform_invoices where id = target_invoice_id for update;
    if invoice.id is null or invoice.status in ('void','refunded') then raise exception 'Fatura indisponível'; end if;
    if payment_amount <= 0 or payment_fee < 0 or payment_fee > payment_amount then raise exception 'Valor inválido'; end if;
    if invoice.paid_total + payment_amount > invoice.total then raise exception 'Pagamento excede o saldo da fatura'; end if;
    insert into public.platform_payments(invoice_id,provider,provider_payment_id,method,status,gross_amount,fee_amount,paid_at)
    values(invoice.id,coalesce(nullif(payment_provider,''),'manual'),nullif(external_id,''),payment_method,'approved',payment_amount,payment_fee,now()) returning * into result;
    new_paid := invoice.paid_total + payment_amount;
    update public.platform_invoices set paid_total=new_paid, status=case when new_paid=total then 'paid' else 'open' end, paid_at=case when new_paid=total then now() else null end where id=invoice.id;
    insert into public.platform_billing_audit_log(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'payment.approved','payment',result.id,jsonb_build_object('invoice_id',invoice.id,'amount',payment_amount,'fee',payment_fee));
    return result;
end $$;

create or replace function public.platform_register_refund(
    target_payment_id uuid, refund_amount numeric, refund_kind text, refund_reason text
) returns public.platform_refunds language plpgsql security definer set search_path = public as $$
declare payment public.platform_payments; invoice public.platform_invoices; result public.platform_refunds; refunded numeric;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
    select * into payment from public.platform_payments where id=target_payment_id and status in ('approved','partially_refunded') for update;
    if payment.id is null then raise exception 'Pagamento indisponível'; end if;
    select coalesce(sum(amount),0) into refunded from public.platform_refunds where payment_id=payment.id and status in ('approved','processed');
    if refund_amount <= 0 or refunded + refund_amount > payment.gross_amount then raise exception 'Valor de devolução inválido'; end if;
    insert into public.platform_refunds(payment_id,refund_type,status,amount,reason,requested_by,approved_by,processed_at)
    values(payment.id,refund_kind,'processed',refund_amount,left(trim(refund_reason),500),auth.uid(),auth.uid(),now()) returning * into result;
    if refund_kind='credit' then
        select * into invoice from public.platform_invoices where id=payment.invoice_id;
        insert into public.platform_customer_credits(billing_customer_id,source_refund_id,amount,remaining_amount,reason)
        values(invoice.billing_customer_id,result.id,refund_amount,refund_amount,refund_reason);
    end if;
    update public.platform_payments set status=case when refunded+refund_amount=gross_amount then 'refunded' else 'partially_refunded' end where id=payment.id;
    update public.platform_invoices set refunded_total=refunded_total+refund_amount,
        status=case when refunded_total+refund_amount>=paid_total then 'refunded' else 'partially_refunded' end where id=payment.invoice_id;
    insert into public.platform_billing_audit_log(actor_id,action,entity_type,entity_id,details)
    values(auth.uid(),'refund.processed','refund',result.id,jsonb_build_object('payment_id',payment.id,'amount',refund_amount,'type',refund_kind));
    return result;
end $$;

revoke all on function public.platform_ensure_billing_customer(uuid) from public;
revoke all on function public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text) from public;
revoke all on function public.platform_record_payment(uuid,text,numeric,numeric,text,text) from public;
revoke all on function public.platform_register_refund(uuid,numeric,text,text) from public;
grant execute on function public.platform_ensure_billing_customer(uuid) to authenticated;
grant execute on function public.platform_create_invoice(uuid,date,jsonb,numeric,numeric,text) to authenticated;
grant execute on function public.platform_record_payment(uuid,text,numeric,numeric,text,text) to authenticated;
grant execute on function public.platform_register_refund(uuid,numeric,text,text) to authenticated;

create or replace function public.platform_sync_client_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare customer public.billing_customers; selected_plan uuid;
begin
    if new.deleted_at is not null then return new; end if;
    insert into public.billing_customers(saas_client_id,billing_email)
    values(new.id,coalesce(new.owner_email,''))
    on conflict(saas_client_id) do update set billing_email=excluded.billing_email
    returning * into customer;
    select id into selected_plan from public.saas_plans where name=new.plan;
    if exists(select 1 from public.platform_subscriptions where billing_customer_id=customer.id and status<>'cancelled') then
        update public.platform_subscriptions set plan_id=selected_plan,base_amount=new.monthly_fee,
            status=case when new.status='Ativo' then 'active' when new.status='Suspenso' then 'suspended' else status end
        where billing_customer_id=customer.id and status<>'cancelled';
    else
        insert into public.platform_subscriptions(billing_customer_id,plan_id,status,base_amount,next_billing_on)
        values(customer.id,selected_plan,case when new.status='Ativo' then 'active' else 'pending_activation' end,new.monthly_fee,current_date+interval '1 month');
    end if;
    return new;
end $$;

drop trigger if exists saas_clients_sync_billing on public.saas_clients;
create trigger saas_clients_sync_billing after insert or update of plan,monthly_fee,status,owner_email,deleted_at on public.saas_clients
for each row execute function public.platform_sync_client_subscription();

-- Mantém a carteira comercial sincronizada com a visão de cobrança.
insert into public.billing_customers (saas_client_id,billing_email)
select id,coalesce(owner_email,'') from public.saas_clients where deleted_at is null
on conflict (saas_client_id) do nothing;

insert into public.platform_subscriptions(billing_customer_id,plan_id,status,base_amount,next_billing_on)
select bc.id,sp.id,case when sc.status='Ativo' then 'active' when sc.status='Suspenso' then 'suspended' else 'pending_activation' end,
       sc.monthly_fee,current_date+interval '1 month'
from public.billing_customers bc join public.saas_clients sc on sc.id=bc.saas_client_id
left join public.saas_plans sp on sp.name=sc.plan
where sc.deleted_at is null and not exists(select 1 from public.platform_subscriptions ps where ps.billing_customer_id=bc.id and ps.status<>'cancelled');
