-- Indices de cobertura na mesma ordem das chaves estrangeiras.
-- Evitam varreduras integrais durante validacoes e alteracoes dos registros pai.

create index landing_page_leads_handled_by_fkey_idx
    on public.landing_page_leads (handled_by);
create index landing_page_leads_page_tenant_fkey_idx
    on public.landing_page_leads (landing_page_id, barbershop_id);
create index landing_page_sections_page_tenant_fkey_idx
    on public.landing_page_sections (landing_page_id, barbershop_id);
create index menu_categories_menu_tenant_fkey_idx
    on public.menu_categories (menu_id, barbershop_id);
create index menu_item_prices_item_tenant_fkey_idx
    on public.menu_item_prices (menu_item_id, barbershop_id);
create index menu_items_category_tenant_fkey_idx
    on public.menu_items (category_id, barbershop_id);
create index menu_order_items_item_tenant_fkey_idx
    on public.menu_order_items (menu_item_id, barbershop_id);
create index menu_order_items_price_tenant_fkey_idx
    on public.menu_order_items (menu_item_price_id, barbershop_id);
create index menu_order_items_order_tenant_fkey_idx
    on public.menu_order_items (order_id, barbershop_id);
create index menu_orders_menu_tenant_fkey_idx
    on public.menu_orders (menu_id, barbershop_id);
create index quote_proposal_items_proposal_tenant_fkey_idx
    on public.quote_proposal_items (proposal_id, barbershop_id);
create index quote_proposals_created_by_fkey_idx
    on public.quote_proposals (created_by);
create index quote_proposals_request_tenant_fkey_idx
    on public.quote_proposals (quote_request_id, barbershop_id);
create index quote_requests_assigned_to_fkey_idx
    on public.quote_requests (assigned_to);
create index quote_requests_page_tenant_fkey_idx
    on public.quote_requests (landing_page_id, barbershop_id);
create index quote_status_history_changed_by_fkey_idx
    on public.quote_status_history (changed_by);
create index quote_status_history_proposal_tenant_fkey_idx
    on public.quote_status_history (proposal_id, barbershop_id);
create index quote_status_history_request_tenant_fkey_idx
    on public.quote_status_history (quote_request_id, barbershop_id);
