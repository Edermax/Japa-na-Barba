-- Fila corporativa de contatos da Ogritech. A API anônima é limitada à RPC;
-- a tabela só pode ser consultada e administrada por platform admins.

create table public.platform_contact_leads (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(name) between 2 and 150),
    company_name text not null default '' check (length(company_name) <= 150),
    phone text not null check (length(phone) between 10 and 15),
    email text not null check (length(email) <= 320),
    location text not null default '' check (length(location) <= 160),
    preferred_contact text not null check (preferred_contact in ('WhatsApp','E-mail','Ligação')),
    business_type text not null default '' check (length(business_type) <= 150),
    employee_range text not null default '' check (length(employee_range) <= 80),
    customer_source text not null default '' check (length(customer_source) <= 120),
    current_solution text not null default '' check (length(current_solution) <= 120),
    current_tool text not null default '' check (length(current_tool) <= 200),
    interests text[] not null default '{}',
    goals text[] not null default '{}',
    timeline text not null default '' check (length(timeline) <= 100),
    investment_range text not null default '' check (length(investment_range) <= 100),
    challenge text not null default '' check (length(challenge) <= 4000),
    adaptive_answers jsonb not null default '{}'::jsonb check (jsonb_typeof(adaptive_answers) = 'object'),
    status text not null default 'new' check (status in ('new','reviewing','contacted','qualified','discarded')),
    source text not null default 'website_contact',
    consent_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index platform_contact_leads_status_created_idx
    on public.platform_contact_leads(status, created_at desc);

alter table public.platform_contact_leads enable row level security;
revoke all on table public.platform_contact_leads from public, anon, authenticated;
grant select, update, delete on table public.platform_contact_leads to authenticated;

create policy "Platform admins view contact leads"
on public.platform_contact_leads for select to authenticated
using ((select public.is_platform_admin()));

create policy "Platform admins update contact leads"
on public.platform_contact_leads for update to authenticated
using ((select public.is_platform_admin()))
with check ((select public.is_platform_admin()));

create policy "Platform admins delete contact leads"
on public.platform_contact_leads for delete to authenticated
using ((select public.is_platform_admin()));

create table private.platform_contact_attempts (
    id bigint generated always as identity primary key,
    contact_hash text not null,
    attempted_at timestamptz not null default now(),
    succeeded boolean not null default false
);

create index platform_contact_attempts_rate_idx
    on private.platform_contact_attempts(contact_hash, attempted_at desc);
alter table private.platform_contact_attempts enable row level security;
revoke all on table private.platform_contact_attempts from public, anon, authenticated;
revoke all on sequence private.platform_contact_attempts_id_seq from public, anon, authenticated;

create function private.public_submit_platform_contact(
    supplied_name text,
    supplied_company text,
    supplied_phone text,
    supplied_email text,
    supplied_location text,
    supplied_preference text,
    supplied_business_type text,
    supplied_employee_range text,
    supplied_customer_source text,
    supplied_current_solution text,
    supplied_current_tool text,
    supplied_interests text[],
    supplied_goals text[],
    supplied_timeline text,
    supplied_investment text,
    supplied_challenge text,
    supplied_adaptive_answers jsonb,
    accepted_privacy boolean,
    website text default ''
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    clean_name text := trim(coalesce(supplied_name,''));
    clean_company text := trim(coalesce(supplied_company,''));
    clean_phone text := regexp_replace(coalesce(supplied_phone,''),'\D','','g');
    clean_email text := lower(trim(coalesce(supplied_email,'')));
    clean_location text := trim(coalesce(supplied_location,''));
    clean_challenge text := trim(coalesce(supplied_challenge,''));
    clean_interests text[] := coalesce(supplied_interests,'{}');
    clean_goals text[] := coalesce(supplied_goals,'{}');
    clean_answers jsonb := coalesce(supplied_adaptive_answers,'{}'::jsonb);
    v_contact_hash text;
    attempt_id bigint;
    lead_id uuid;
begin
    if coalesce(trim(website),'') <> '' then
        raise exception 'Não foi possível enviar' using errcode='22023';
    end if;
    if not accepted_privacy then
        raise exception 'É necessário aceitar o aviso de privacidade' using errcode='22023';
    end if;
    if length(clean_name) not between 2 and 150
       or length(clean_company) > 150
       or length(clean_phone) not between 10 and 15
       or length(clean_email) > 320
       or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
       or length(clean_location) > 160
       or supplied_preference not in ('WhatsApp','E-mail','Ligação')
       or length(trim(coalesce(supplied_business_type,''))) > 150
       or length(trim(coalesce(supplied_employee_range,''))) > 80
       or length(trim(coalesce(supplied_customer_source,''))) > 120
       or length(trim(coalesce(supplied_current_solution,''))) > 120
       or length(trim(coalesce(supplied_current_tool,''))) > 200
       or cardinality(clean_interests) > 10
       or cardinality(clean_goals) > 3
       or exists (select 1 from unnest(clean_interests || clean_goals) value where length(value) > 120)
       or length(trim(coalesce(supplied_timeline,''))) > 100
       or length(trim(coalesce(supplied_investment,''))) > 100
       or length(clean_challenge) > 4000
       or jsonb_typeof(clean_answers) <> 'object'
       or pg_column_size(clean_answers) > 16384 then
        raise exception 'Dados de contato inválidos' using errcode='22023';
    end if;

    delete from private.platform_contact_attempts
    where attempted_at < now() - interval '48 hours';
    v_contact_hash := encode(digest(clean_email || ':' || clean_phone,'sha256'),'hex');
    if (select count(*) from private.platform_contact_attempts
        where platform_contact_attempts.contact_hash = v_contact_hash
          and attempted_at > now() - interval '1 hour') >= 5 then
        raise exception 'Muitas tentativas. Aguarde antes de tentar novamente' using errcode='P0001';
    end if;
    insert into private.platform_contact_attempts(contact_hash)
    values(v_contact_hash) returning id into attempt_id;

    insert into public.platform_contact_leads(
        name,company_name,phone,email,location,preferred_contact,business_type,
        employee_range,customer_source,current_solution,current_tool,interests,goals,
        timeline,investment_range,challenge,adaptive_answers,consent_at
    ) values (
        clean_name,clean_company,clean_phone,clean_email,clean_location,supplied_preference,
        trim(coalesce(supplied_business_type,'')),trim(coalesce(supplied_employee_range,'')),
        trim(coalesce(supplied_customer_source,'')),trim(coalesce(supplied_current_solution,'')),
        trim(coalesce(supplied_current_tool,'')),clean_interests,clean_goals,
        trim(coalesce(supplied_timeline,'')),trim(coalesce(supplied_investment,'')),
        clean_challenge,clean_answers,now()
    ) returning id into lead_id;
    update private.platform_contact_attempts set succeeded=true where id=attempt_id;
    return jsonb_build_object('id',lead_id,'status','new');
end;
$$;

create function public.public_submit_platform_contact(
    supplied_name text,supplied_company text,supplied_phone text,supplied_email text,
    supplied_location text,supplied_preference text,supplied_business_type text,
    supplied_employee_range text,supplied_customer_source text,supplied_current_solution text,
    supplied_current_tool text,supplied_interests text[],supplied_goals text[],
    supplied_timeline text,supplied_investment text,supplied_challenge text,
    supplied_adaptive_answers jsonb,accepted_privacy boolean,website text default ''
) returns jsonb
language sql security invoker
set search_path = pg_catalog, public, private
as $$
    select private.public_submit_platform_contact(
        supplied_name,supplied_company,supplied_phone,supplied_email,supplied_location,
        supplied_preference,supplied_business_type,supplied_employee_range,supplied_customer_source,
        supplied_current_solution,supplied_current_tool,supplied_interests,supplied_goals,
        supplied_timeline,supplied_investment,supplied_challenge,supplied_adaptive_answers,
        accepted_privacy,website
    )
$$;

revoke all on function private.public_submit_platform_contact(
    text,text,text,text,text,text,text,text,text,text,text,text[],text[],text,text,text,jsonb,boolean,text
) from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.public_submit_platform_contact(
    text,text,text,text,text,text,text,text,text,text,text,text[],text[],text,text,text,jsonb,boolean,text
) to anon,authenticated;

revoke all on function public.public_submit_platform_contact(
    text,text,text,text,text,text,text,text,text,text,text,text[],text[],text,text,text,jsonb,boolean,text
) from public;
grant execute on function public.public_submit_platform_contact(
    text,text,text,text,text,text,text,text,text,text,text,text[],text[],text,text,text,jsonb,boolean,text
) to anon,authenticated;
