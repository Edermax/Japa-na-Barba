-- Reparo compatível para o cadastro legado do Studio Bella Forma.
-- A migration seguinte generaliza o mesmo reparo para qualquer negócio ainda
-- desvinculado. Esta etapa permanece idempotente porque pode já ter sido aplicada
-- em staging antes da generalização.
alter table public.barbershops add column if not exists slug text;

do $$
declare
    client record;
    shop_id uuid;
    shop_slug text;
begin
    for client in
        select id, name
        from public.saas_clients
        where lower(trim(name)) = lower('Studio Bella Forma')
          and barbershop_id is null
          and deleted_at is null
          and status <> 'Arquivado'
        order by created_at, id
        for update
    loop
        -- Reaproveita uma unidade de mesmo nome quando ela já existe.
        select id into shop_id
        from public.barbershops
        where lower(trim(name)) = lower(trim(client.name))
        order by created_at, id
        limit 1;

        if shop_id is null then
            shop_slug := 'studio-bella-forma';
            if exists (select 1 from public.barbershops where slug = shop_slug) then
                shop_slug := shop_slug || '-' || left(client.id::text, 8);
            end if;

            insert into public.barbershops (name, slug)
            values (client.name, shop_slug)
            returning id into shop_id;
        end if;

        update public.saas_clients
        set barbershop_id = shop_id
        where id = client.id;

        shop_id := null;
    end loop;
end;
$$;
