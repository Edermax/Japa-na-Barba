-- Vincula todos os cadastros comerciais ativos que ainda não possuem unidade
-- operacional. Negócios já vinculados não são alterados.
do $$
declare
    client record;
    shop_id uuid;
    shop_slug text;
begin
    for client in
        select id, name, segment
        from public.saas_clients
        where barbershop_id is null
          and deleted_at is null
          and status <> 'Arquivado'
        order by created_at, id
        for update
    loop
        select id into shop_id
        from public.barbershops
        where lower(trim(name)) = lower(trim(client.name))
        order by created_at, id
        limit 1;

        if shop_id is null then
            shop_slug := trim(both '-' from regexp_replace(lower(trim(client.name)), '[^a-z0-9]+', '-', 'g'));
            if shop_slug = '' then shop_slug := 'negocio'; end if;
            shop_slug := left(shop_slug, 80) || '-' || left(client.id::text, 8);

            insert into public.barbershops (name, segment, slug)
            values (client.name, client.segment, shop_slug)
            returning id into shop_id;
        end if;

        update public.saas_clients
        set barbershop_id = shop_id
        where id = client.id;

        shop_id := null;
    end loop;
end;
$$;

-- Novos cadastros já nascem com unidade e slug, evitando novos vínculos vazios.
create or replace function public.platform_create_business(
    business_name text, business_segment text, responsible_name text,
    responsible_email text, business_phone text, plan_name text,
    plan_price numeric, business_origin text, business_notes text
) returns public.saas_clients
language plpgsql security definer set search_path = public as $$
declare
    shop public.barbershops;
    result public.saas_clients;
    new_shop_id uuid := gen_random_uuid();
    new_shop_slug text;
begin
    if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;

    new_shop_slug := trim(both '-' from regexp_replace(lower(trim(business_name)), '[^a-z0-9]+', '-', 'g'));
    if new_shop_slug = '' then new_shop_slug := 'negocio'; end if;
    new_shop_slug := left(new_shop_slug, 80) || '-' || left(new_shop_id::text, 8);

    insert into public.barbershops (id, name, segment, slug)
    values (new_shop_id, business_name, business_segment, new_shop_slug)
    returning * into shop;

    insert into public.saas_clients
        (name, segment, contact_name, owner_email, phone, plan, monthly_fee, origin, notes, invite_status, barbershop_id)
    values
        (business_name, business_segment, responsible_name, lower(responsible_email), nullif(business_phone,''),
         plan_name, plan_price, business_origin, nullif(business_notes,''), 'Pendente', shop.id)
    returning * into result;
    return result;
end;
$$;

revoke all on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) from public;
grant execute on function public.platform_create_business(text,text,text,text,text,text,numeric,text,text) to authenticated;
