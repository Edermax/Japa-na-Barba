-- APIs transacionais e limitadas para os fluxos comerciais públicos.

alter table public.quote_proposals
    add column public_token_hash text;
alter table public.menu_orders
    add column public_token_hash text;

create table private.public_commercial_attempts (
    id bigint generated always as identity primary key,
    barbershop_id uuid not null references public.barbershops(id) on delete cascade,
    flow text not null check (flow in ('lead','quote','order')),
    contact_hash text not null,
    attempted_at timestamptz not null default now(),
    succeeded boolean not null default false
);
create index public_commercial_attempts_rate_idx
    on private.public_commercial_attempts (flow, contact_hash, attempted_at desc);
create index public_commercial_attempts_barbershop_idx
    on private.public_commercial_attempts (barbershop_id);
alter table private.public_commercial_attempts enable row level security;
revoke all on table private.public_commercial_attempts from public, anon, authenticated;
revoke all on sequence private.public_commercial_attempts_id_seq from public, anon, authenticated;

create function private.register_commercial_attempt(
    target_barbershop_id uuid,
    target_flow text,
    supplied_contact text,
    hourly_limit integer
) returns bigint
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    clean_contact text := lower(trim(supplied_contact));
    attempt_id bigint;
begin
    if target_flow not in ('lead','quote','order') or hourly_limit not between 1 and 100 then
        raise exception 'Parâmetros de controle inválidos' using errcode='22023';
    end if;
    if length(clean_contact) < 5 then
        raise exception 'Contato inválido' using errcode='22023';
    end if;

    delete from private.public_commercial_attempts
    where attempted_at < now() - interval '48 hours';

    if (
        select count(*) from private.public_commercial_attempts
        where flow=target_flow
          and contact_hash=encode(digest(clean_contact,'sha256'),'hex')
          and attempted_at > now() - interval '1 hour'
    ) >= hourly_limit then
        raise exception 'Muitas tentativas. Aguarde antes de tentar novamente' using errcode='P0001';
    end if;

    insert into private.public_commercial_attempts(barbershop_id,flow,contact_hash)
    values(target_barbershop_id,target_flow,encode(digest(clean_contact,'sha256'),'hex'))
    returning id into attempt_id;
    return attempt_id;
end;
$$;

create function private.public_landing_page(target_slug text)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
declare page public.landing_pages;
begin
    select lp.* into page
    from public.landing_pages lp
    join public.barbershops b on b.id=lp.barbershop_id
    where lower(lp.slug)=lower(trim(target_slug))
      and lp.published and b.active and b.deleted_at is null;
    if page.id is null then
        raise exception 'Página indisponível' using errcode='22023';
    end if;
    return jsonb_build_object(
        'page', jsonb_build_object(
            'slug',page.slug,'title',page.title,'subtitle',page.subtitle,
            'logo_url',page.logo_url,'cover_image_url',page.cover_image_url,
            'primary_color',page.primary_color,'accent_color',page.accent_color,
            'contact_email',page.contact_email,'contact_phone',page.contact_phone,
            'whatsapp_phone',page.whatsapp_phone,'address',page.address,
            'social_links',page.social_links
        ),
        'sections', coalesce((
            select jsonb_agg(jsonb_build_object(
                'type',s.section_type,'title',s.title,'content',s.content
            ) order by s.sort_order)
            from public.landing_page_sections s
            where s.landing_page_id=page.id and s.barbershop_id=page.barbershop_id and s.active
        ),'[]'::jsonb),
        'services', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id',sv.id,'name',sv.name,'description',sv.description,
                'duration_minutes',sv.duration_minutes,'price',sv.price
            ) order by sv.name)
            from public.services sv where sv.barbershop_id=page.barbershop_id and sv.active
        ),'[]'::jsonb)
    );
end;
$$;

create function private.public_submit_landing_lead(
    target_slug text,
    supplied_name text,
    supplied_email text,
    supplied_phone text,
    supplied_message text,
    accepted_privacy boolean,
    website text default ''
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    page public.landing_pages;
    clean_name text := trim(supplied_name);
    clean_email text := lower(trim(supplied_email));
    clean_phone text := regexp_replace(supplied_phone,'\D','','g');
    clean_message text := trim(coalesce(supplied_message,''));
    attempt_id bigint;
    result public.landing_page_leads;
begin
    if coalesce(trim(website),'')<>'' then raise exception 'Não foi possível enviar' using errcode='22023'; end if;
    if not accepted_privacy then raise exception 'É necessário aceitar o aviso de privacidade' using errcode='22023'; end if;
    if length(clean_name) not between 2 and 150
       or (clean_email<>'' and (length(clean_email)>320 or clean_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
       or (clean_phone<>'' and length(clean_phone) not between 10 and 15)
       or (clean_email='' and clean_phone='') or length(clean_message)>4000 then
        raise exception 'Dados de contato inválidos' using errcode='22023';
    end if;
    select lp.* into page from public.landing_pages lp join public.barbershops b on b.id=lp.barbershop_id
    where lower(lp.slug)=lower(trim(target_slug)) and lp.published and b.active and b.deleted_at is null;
    if page.id is null then raise exception 'Página indisponível' using errcode='22023'; end if;
    attempt_id := private.register_commercial_attempt(page.barbershop_id,'lead',coalesce(nullif(clean_email,''),clean_phone),5);
    insert into public.landing_page_leads(
        barbershop_id,landing_page_id,name,email,phone,message,consent_at
    ) values(page.barbershop_id,page.id,clean_name,clean_email,clean_phone,clean_message,now())
    returning * into result;
    update private.public_commercial_attempts set succeeded=true where id=attempt_id;
    return jsonb_build_object('id',result.id,'status',result.status,'created_at',result.created_at);
end;
$$;

create function private.public_submit_quote_request(
    target_slug text,
    supplied_name text,
    supplied_email text,
    supplied_phone text,
    supplied_company text,
    supplied_service text,
    supplied_briefing jsonb,
    supplied_deadline date,
    supplied_budget_min numeric,
    supplied_budget_max numeric,
    accepted_privacy boolean,
    website text default ''
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    page public.landing_pages;
    clean_name text := trim(supplied_name);
    clean_email text := lower(trim(supplied_email));
    clean_phone text := regexp_replace(supplied_phone,'\D','','g');
    clean_company text := trim(coalesce(supplied_company,''));
    clean_service text := trim(supplied_service);
    attempt_id bigint;
    result public.quote_requests;
begin
    if coalesce(trim(website),'')<>'' then raise exception 'Não foi possível enviar' using errcode='22023'; end if;
    if not accepted_privacy then raise exception 'É necessário aceitar o aviso de privacidade' using errcode='22023'; end if;
    if length(clean_name) not between 2 and 150 or length(clean_company)>150
       or length(clean_service) not between 2 and 200
       or jsonb_typeof(coalesce(supplied_briefing,'{}'::jsonb))<>'object'
       or pg_column_size(coalesce(supplied_briefing,'{}'::jsonb))>32768
       or (clean_email<>'' and (length(clean_email)>320 or clean_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
       or (clean_phone<>'' and length(clean_phone) not between 10 and 15)
       or (clean_email='' and clean_phone='')
       or supplied_budget_min<0 or supplied_budget_max<0
       or supplied_budget_min>100000000 or supplied_budget_max>100000000
       or (supplied_budget_min is not null and supplied_budget_max is not null and supplied_budget_max<supplied_budget_min)
       or supplied_deadline<current_date then
        raise exception 'Dados do orçamento inválidos' using errcode='22023';
    end if;
    select lp.* into page from public.landing_pages lp join public.barbershops b on b.id=lp.barbershop_id
    where lower(lp.slug)=lower(trim(target_slug)) and lp.published and b.active and b.deleted_at is null;
    if page.id is null then raise exception 'Página indisponível' using errcode='22023'; end if;
    attempt_id := private.register_commercial_attempt(page.barbershop_id,'quote',coalesce(nullif(clean_email,''),clean_phone),5);
    insert into public.quote_requests(
        barbershop_id,landing_page_id,client_name,client_email,client_phone,company_name,
        service_interest,briefing,desired_deadline,budget_min,budget_max,consent_at
    ) values(
        page.barbershop_id,page.id,clean_name,clean_email,clean_phone,clean_company,
        clean_service,coalesce(supplied_briefing,'{}'::jsonb),supplied_deadline,
        supplied_budget_min,supplied_budget_max,now()
    ) returning * into result;
    update private.public_commercial_attempts set succeeded=true where id=attempt_id;
    return jsonb_build_object('reference',result.public_reference,'status',result.status,'created_at',result.created_at);
end;
$$;

create function public.send_quote_proposal(target_proposal_id uuid)
returns jsonb
language plpgsql security invoker
set search_path = pg_catalog, public, extensions
as $$
declare proposal public.quote_proposals; secret_token text; calculated_subtotal numeric(12,2);
begin
    select * into proposal from public.quote_proposals where id=target_proposal_id;
    if proposal.id is null or not public.is_business_manager(proposal.barbershop_id) then
        raise exception 'Acesso negado' using errcode='42501';
    end if;
    if proposal.status<>'draft' then raise exception 'A proposta não está em rascunho' using errcode='22023'; end if;
    if proposal.valid_until is not null and proposal.valid_until<current_date then raise exception 'Validade inválida' using errcode='22023'; end if;
    select coalesce(sum(line_total),0) into calculated_subtotal
    from public.quote_proposal_items where proposal_id=proposal.id and barbershop_id=proposal.barbershop_id;
    if calculated_subtotal<=0 or proposal.discount_amount>calculated_subtotal then raise exception 'Itens ou desconto inválidos' using errcode='22023'; end if;
    secret_token := encode(gen_random_bytes(24),'hex');
    update public.quote_proposals set subtotal=calculated_subtotal,status='sent',sent_at=now(),
        public_token_hash=encode(digest(secret_token,'sha256'),'hex') where id=proposal.id;
    update public.quote_requests set status='proposal_sent' where id=proposal.quote_request_id;
    insert into public.quote_status_history(barbershop_id,quote_request_id,proposal_id,from_status,to_status,note,changed_by)
    values(proposal.barbershop_id,proposal.quote_request_id,proposal.id,'draft','sent','Proposta enviada',auth.uid());
    return jsonb_build_object('reference',(select public_reference from public.quote_requests where id=proposal.quote_request_id),'token',secret_token);
end;
$$;

create function private.public_get_quote_proposal(target_reference text,target_token text)
returns jsonb
language sql stable security definer
set search_path = pg_catalog, public, private, extensions
as $$
    select jsonb_build_object(
        'reference',r.public_reference,'client_name',r.client_name,'service_interest',r.service_interest,
        'proposal',jsonb_build_object('id',p.id,'version',p.version,'title',p.title,
            'introduction',p.introduction,'scope',p.scope,'terms',p.terms,'currency',p.currency,
            'subtotal',p.subtotal,'discount_amount',p.discount_amount,'total_amount',p.total_amount,
            'valid_until',p.valid_until,'status',p.status,'sent_at',p.sent_at),
        'items',coalesce((select jsonb_agg(jsonb_build_object('description',i.description,'quantity',i.quantity,
            'unit_price',i.unit_price,'line_total',i.line_total) order by i.sort_order)
            from public.quote_proposal_items i where i.proposal_id=p.id),'[]'::jsonb)
    )
    from public.quote_requests r join public.quote_proposals p on p.quote_request_id=r.id
    where r.public_reference=upper(trim(target_reference))
      and p.public_token_hash=encode(digest(target_token,'sha256'),'hex')
      and p.status in ('sent','viewed','accepted','rejected','expired')
    order by p.version desc limit 1
$$;

create function private.public_respond_quote_proposal(target_reference text,target_token text,target_decision text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare proposal public.quote_proposals; new_status text; old_status text;
begin
    new_status := lower(trim(target_decision));
    if new_status not in ('accepted','rejected') then raise exception 'Resposta inválida' using errcode='22023'; end if;
    select p.* into proposal from public.quote_proposals p join public.quote_requests r on r.id=p.quote_request_id
    where r.public_reference=upper(trim(target_reference))
      and p.public_token_hash=encode(digest(target_token,'sha256'),'hex')
      and p.status in ('sent','viewed') order by p.version desc limit 1 for update of p;
    if proposal.id is null then return false; end if;
    if proposal.valid_until is not null and proposal.valid_until<current_date then
        update public.quote_proposals set status='expired' where id=proposal.id; return false;
    end if;
    old_status:=proposal.status;
    update public.quote_proposals set status=new_status,responded_at=now() where id=proposal.id;
    update public.quote_requests set status=case new_status when 'accepted' then 'accepted' else 'rejected' end
    where id=proposal.quote_request_id;
    insert into public.quote_status_history(barbershop_id,quote_request_id,proposal_id,from_status,to_status,note)
    values(proposal.barbershop_id,proposal.quote_request_id,proposal.id,old_status,new_status,'Resposta do cliente');
    return true;
end;
$$;

create function private.public_menu(target_slug text)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
declare menu public.online_menus;
begin
    select m.* into menu from public.online_menus m join public.barbershops b on b.id=m.barbershop_id
    where lower(m.slug)=lower(trim(target_slug)) and m.published and b.active and b.deleted_at is null;
    if menu.id is null then raise exception 'Cardápio indisponível' using errcode='22023'; end if;
    return jsonb_build_object(
        'menu',jsonb_build_object('slug',menu.slug,'title',menu.title,'description',menu.description,
            'currency',menu.currency,'accepts_pickup',menu.accepts_pickup,'accepts_delivery',menu.accepts_delivery,
            'minimum_order',menu.minimum_order,'delivery_fee',menu.delivery_fee,'estimated_minutes',menu.estimated_minutes),
        'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'description',c.description,
            'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'description',i.description,
                'image_url',i.image_url,'metadata',i.metadata,'prices',coalesce((select jsonb_agg(jsonb_build_object(
                    'id',pr.id,'label',pr.label,'price',pr.price,'promotional_price',pr.promotional_price) order by pr.sort_order)
                    from public.menu_item_prices pr where pr.menu_item_id=i.id and pr.active),'[]'::jsonb)) order by i.sort_order)
                from public.menu_items i where i.category_id=c.id and i.active and i.available),'[]'::jsonb)) order by c.sort_order)
            from public.menu_categories c where c.menu_id=menu.id and c.active),'[]'::jsonb)
    );
end;
$$;

create function private.public_create_menu_order(
    target_slug text,supplied_name text,supplied_email text,supplied_phone text,
    target_fulfillment_type text,supplied_address jsonb,supplied_notes text,
    supplied_items jsonb,accepted_privacy boolean,website text default ''
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
    menu public.online_menus; result public.menu_orders; item jsonb; selected_price public.menu_item_prices;
    selected_item public.menu_items; clean_name text:=trim(supplied_name); clean_email text:=lower(trim(supplied_email));
    clean_phone text:=regexp_replace(supplied_phone,'\D','','g'); fulfillment text:=lower(trim(target_fulfillment_type));
    running_subtotal numeric(12,2):=0; effective_price numeric(12,2); qty integer; attempt_id bigint;
    secret_token text;
begin
    if coalesce(trim(website),'')<>'' then raise exception 'Não foi possível concluir o pedido' using errcode='22023'; end if;
    if not accepted_privacy then raise exception 'É necessário aceitar o aviso de privacidade' using errcode='22023'; end if;
    if length(clean_name) not between 2 and 150 or length(clean_phone) not between 10 and 15
       or (clean_email<>'' and (length(clean_email)>320 or clean_email!~'^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'))
       or jsonb_typeof(supplied_items)<>'array' or jsonb_array_length(supplied_items) not between 1 and 50
       or length(coalesce(supplied_notes,''))>2000 then raise exception 'Dados do pedido inválidos' using errcode='22023'; end if;
    select m.* into menu from public.online_menus m join public.barbershops b on b.id=m.barbershop_id
    where lower(m.slug)=lower(trim(target_slug)) and m.published and b.active and b.deleted_at is null;
    if menu.id is null then raise exception 'Cardápio indisponível' using errcode='22023'; end if;
    if (fulfillment='pickup' and not menu.accepts_pickup) or (fulfillment='delivery' and not menu.accepts_delivery)
       or fulfillment not in ('pickup','delivery') or (fulfillment='delivery' and jsonb_typeof(supplied_address)<>'object') then
        raise exception 'Forma de entrega inválida' using errcode='22023';
    end if;
    attempt_id:=private.register_commercial_attempt(menu.barbershop_id,'order',clean_phone,10);
    secret_token:=encode(gen_random_bytes(24),'hex');
    insert into public.menu_orders(barbershop_id,menu_id,customer_name,customer_email,customer_phone,
        fulfillment_type,delivery_address,notes,currency,delivery_fee,consent_at,public_token_hash)
    values(menu.barbershop_id,menu.id,clean_name,clean_email,clean_phone,fulfillment,
        case when fulfillment='delivery' then supplied_address else null end,trim(coalesce(supplied_notes,'')),
        menu.currency,case when fulfillment='delivery' then menu.delivery_fee else 0 end,now(),encode(digest(secret_token,'sha256'),'hex'))
    returning * into result;
    for item in select value from jsonb_array_elements(supplied_items) loop
        begin qty:=(item->>'quantity')::integer; exception when others then raise exception 'Quantidade inválida' using errcode='22023'; end;
        if qty not between 1 and 100 then raise exception 'Quantidade inválida' using errcode='22023'; end if;
        select pr.* into selected_price from public.menu_item_prices pr join public.menu_items i on i.id=pr.menu_item_id
        join public.menu_categories c on c.id=i.category_id
        where pr.id=(item->>'menu_item_price_id')::uuid and pr.barbershop_id=menu.barbershop_id
          and pr.active and i.active and i.available and c.active and c.menu_id=menu.id;
        if selected_price.id is null then raise exception 'Item indisponível' using errcode='22023'; end if;
        select * into selected_item from public.menu_items where id=selected_price.menu_item_id;
        effective_price:=coalesce(selected_price.promotional_price,selected_price.price);
        running_subtotal:=running_subtotal+(effective_price*qty);
        if running_subtotal>1000000 then raise exception 'Valor do pedido inválido' using errcode='22023'; end if;
        insert into public.menu_order_items(barbershop_id,order_id,menu_item_id,menu_item_price_id,item_name,
            price_label,quantity,unit_price,notes)
        values(menu.barbershop_id,result.id,selected_item.id,selected_price.id,selected_item.name,selected_price.label,
            qty,effective_price,left(coalesce(item->>'notes',''),500));
    end loop;
    if running_subtotal<menu.minimum_order then raise exception 'Pedido abaixo do valor mínimo' using errcode='22023'; end if;
    update public.menu_orders set subtotal=running_subtotal where id=result.id returning * into result;
    update private.public_commercial_attempts set succeeded=true where id=attempt_id;
    return jsonb_build_object('reference',result.public_reference,'token',secret_token,'status',result.status,
        'subtotal',result.subtotal,'delivery_fee',result.delivery_fee,'total_amount',result.total_amount);
exception when invalid_text_representation then raise exception 'Item inválido' using errcode='22023';
end;
$$;

create function private.public_get_menu_order(target_reference text,target_token text)
returns jsonb
language sql stable security definer
set search_path = pg_catalog, public, private, extensions
as $$
    select jsonb_build_object('reference',o.public_reference,'customer_name',o.customer_name,
        'fulfillment_type',o.fulfillment_type,'status',o.status,'payment_status',o.payment_status,
        'currency',o.currency,'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,
        'discount_amount',o.discount_amount,'total_amount',o.total_amount,'created_at',o.created_at,
        'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.item_name,'label',i.price_label,
            'quantity',i.quantity,'unit_price',i.unit_price,'line_total',i.line_total) order by i.created_at)
            from public.menu_order_items i where i.order_id=o.id),'[]'::jsonb))
    from public.menu_orders o where o.public_reference=upper(trim(target_reference))
      and o.public_token_hash=encode(digest(target_token,'sha256'),'hex')
$$;

-- Wrappers security invoker: a implementação privilegiada permanece fora do schema exposto.
create function public.public_landing_page(target_slug text) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public,private
as $$ select private.public_landing_page(target_slug) $$;
create function public.public_submit_landing_lead(target_slug text,supplied_name text,supplied_email text,supplied_phone text,supplied_message text,accepted_privacy boolean,website text default '') returns jsonb
language sql security invoker set search_path=pg_catalog,public,private
as $$ select private.public_submit_landing_lead(target_slug,supplied_name,supplied_email,supplied_phone,supplied_message,accepted_privacy,website) $$;
create function public.public_submit_quote_request(target_slug text,supplied_name text,supplied_email text,supplied_phone text,supplied_company text,supplied_service text,supplied_briefing jsonb,supplied_deadline date,supplied_budget_min numeric,supplied_budget_max numeric,accepted_privacy boolean,website text default '') returns jsonb
language sql security invoker set search_path=pg_catalog,public,private
as $$ select private.public_submit_quote_request(target_slug,supplied_name,supplied_email,supplied_phone,supplied_company,supplied_service,supplied_briefing,supplied_deadline,supplied_budget_min,supplied_budget_max,accepted_privacy,website) $$;
create function public.public_get_quote_proposal(target_reference text,target_token text) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public,private
as $$ select private.public_get_quote_proposal(target_reference,target_token) $$;
create function public.public_respond_quote_proposal(target_reference text,target_token text,target_decision text) returns boolean
language sql security invoker set search_path=pg_catalog,public,private
as $$ select private.public_respond_quote_proposal(target_reference,target_token,target_decision) $$;
create function public.public_menu(target_slug text) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public,private
as $$ select private.public_menu(target_slug) $$;
create function public.public_create_menu_order(target_slug text,supplied_name text,supplied_email text,supplied_phone text,target_fulfillment_type text,supplied_address jsonb,supplied_notes text,supplied_items jsonb,accepted_privacy boolean,website text default '') returns jsonb
language sql security invoker set search_path=pg_catalog,public,private
as $$ select private.public_create_menu_order(target_slug,supplied_name,supplied_email,supplied_phone,target_fulfillment_type,supplied_address,supplied_notes,supplied_items,accepted_privacy,website) $$;
create function public.public_get_menu_order(target_reference text,target_token text) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public,private
as $$ select private.public_get_menu_order(target_reference,target_token) $$;

revoke all on function private.register_commercial_attempt(uuid,text,text,integer),
    private.public_landing_page(text),private.public_submit_landing_lead(text,text,text,text,text,boolean,text),
    private.public_submit_quote_request(text,text,text,text,text,text,jsonb,date,numeric,numeric,boolean,text),
    private.public_get_quote_proposal(text,text),private.public_respond_quote_proposal(text,text,text),
    private.public_menu(text),private.public_create_menu_order(text,text,text,text,text,jsonb,text,jsonb,boolean,text),
    private.public_get_menu_order(text,text)
from public,anon,authenticated;
grant usage on schema private to anon,authenticated;
grant execute on function private.public_landing_page(text),private.public_submit_landing_lead(text,text,text,text,text,boolean,text),
    private.public_submit_quote_request(text,text,text,text,text,text,jsonb,date,numeric,numeric,boolean,text),
    private.public_get_quote_proposal(text,text),private.public_respond_quote_proposal(text,text,text),
    private.public_menu(text),private.public_create_menu_order(text,text,text,text,text,jsonb,text,jsonb,boolean,text),
    private.public_get_menu_order(text,text)
to anon,authenticated;

revoke all on function public.send_quote_proposal(uuid),public.public_landing_page(text),
    public.public_submit_landing_lead(text,text,text,text,text,boolean,text),
    public.public_submit_quote_request(text,text,text,text,text,text,jsonb,date,numeric,numeric,boolean,text),
    public.public_get_quote_proposal(text,text),public.public_respond_quote_proposal(text,text,text),
    public.public_menu(text),public.public_create_menu_order(text,text,text,text,text,jsonb,text,jsonb,boolean,text),
    public.public_get_menu_order(text,text)
from public;
grant execute on function public.send_quote_proposal(uuid) to authenticated;
grant execute on function public.public_landing_page(text),
    public.public_submit_landing_lead(text,text,text,text,text,boolean,text),
    public.public_submit_quote_request(text,text,text,text,text,text,jsonb,date,numeric,numeric,boolean,text),
    public.public_get_quote_proposal(text,text),public.public_respond_quote_proposal(text,text,text),
    public.public_menu(text),public.public_create_menu_order(text,text,text,text,text,jsonb,text,jsonb,boolean,text),
    public.public_get_menu_order(text,text)
to anon,authenticated;
