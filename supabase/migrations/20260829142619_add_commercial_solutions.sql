-- Modelagem multiempresa para Landing Pages, Orcamento Online e Cardapio Online.
-- Os fluxos publicos de captacao/solicitacao/pedido serao expostos posteriormente
-- por RPCs ou Edge Functions validadas. Nenhuma tabela aceita acesso direto de anon.

-- -----------------------------------------------------------------------------
-- Landing Pages
-- -----------------------------------------------------------------------------

create table public.landing_pages (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    slug text not null,
    title text not null,
    subtitle text not null default '',
    logo_url text,
    cover_image_url text,
    primary_color text not null default '#111827'
        check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
    accent_color text not null default '#2563EB'
        check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
    contact_email text,
    contact_phone text,
    whatsapp_phone text,
    address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
    social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
    seo_title text,
    seo_description text,
    published boolean not null default false,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (barbershop_id),
    check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
    check ((published and published_at is not null) or not published)
);

create unique index landing_pages_slug_key on public.landing_pages (lower(slug));

create table public.landing_page_sections (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    landing_page_id uuid not null,
    section_type text not null check (section_type in (
        'hero', 'about', 'services', 'testimonials', 'gallery', 'faq', 'contact', 'custom'
    )),
    title text not null default '',
    content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
    sort_order integer not null default 0 check (sort_order >= 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (landing_page_id, sort_order),
    foreign key (landing_page_id, barbershop_id)
        references public.landing_pages(id, barbershop_id) on delete cascade
);

create index landing_page_sections_tenant_idx
    on public.landing_page_sections (barbershop_id, landing_page_id, active, sort_order);

create table public.landing_page_leads (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    landing_page_id uuid not null,
    name text not null,
    email text not null default '',
    phone text not null default '',
    message text not null default '',
    source text not null default 'landing_page',
    status text not null default 'new'
        check (status in ('new', 'contacted', 'qualified', 'converted', 'discarded')),
    consent_at timestamptz not null,
    handled_by uuid references auth.users(id) on delete set null,
    handled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    foreign key (landing_page_id, barbershop_id)
        references public.landing_pages(id, barbershop_id) on delete restrict,
    check (length(trim(name)) between 2 and 150),
    check (email <> '' or phone <> '')
);

create index landing_page_leads_tenant_status_idx
    on public.landing_page_leads (barbershop_id, status, created_at desc);

-- -----------------------------------------------------------------------------
-- Orcamento Online
-- -----------------------------------------------------------------------------

create table public.quote_requests (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    landing_page_id uuid,
    public_reference text not null default upper(encode(gen_random_bytes(6), 'hex')),
    client_name text not null,
    client_email text not null default '',
    client_phone text not null default '',
    company_name text not null default '',
    service_interest text not null,
    briefing jsonb not null default '{}'::jsonb check (jsonb_typeof(briefing) = 'object'),
    desired_deadline date,
    budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
    budget_max numeric(12,2) check (budget_max is null or budget_max >= 0),
    status text not null default 'received' check (status in (
        'received', 'under_review', 'awaiting_information', 'proposal_sent',
        'negotiating', 'accepted', 'rejected', 'cancelled', 'expired'
    )),
    consent_at timestamptz not null,
    assigned_to uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (public_reference),
    foreign key (landing_page_id, barbershop_id)
        references public.landing_pages(id, barbershop_id) on delete set null (landing_page_id),
    check (length(trim(client_name)) between 2 and 150),
    check (client_email <> '' or client_phone <> ''),
    check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create index quote_requests_tenant_status_idx
    on public.quote_requests (barbershop_id, status, created_at desc);

create table public.quote_proposals (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    quote_request_id uuid not null,
    version integer not null default 1 check (version > 0),
    title text not null,
    introduction text not null default '',
    scope text not null default '',
    terms text not null default '',
    currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
    subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    total_amount numeric(12,2) generated always as (subtotal - discount_amount) stored,
    valid_until date,
    status text not null default 'draft'
        check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'cancelled')),
    sent_at timestamptz,
    viewed_at timestamptz,
    responded_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (quote_request_id, version),
    foreign key (quote_request_id, barbershop_id)
        references public.quote_requests(id, barbershop_id) on delete cascade,
    check (discount_amount <= subtotal),
    check ((status = 'draft' and sent_at is null) or status <> 'draft')
);

create index quote_proposals_tenant_status_idx
    on public.quote_proposals (barbershop_id, status, created_at desc);

create table public.quote_proposal_items (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    proposal_id uuid not null,
    description text not null,
    quantity numeric(12,3) not null default 1 check (quantity > 0),
    unit_price numeric(12,2) not null check (unit_price >= 0),
    line_total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
    sort_order integer not null default 0 check (sort_order >= 0),
    created_at timestamptz not null default now(),
    unique (id, barbershop_id),
    foreign key (proposal_id, barbershop_id)
        references public.quote_proposals(id, barbershop_id) on delete set null (proposal_id)
);

create index quote_proposal_items_tenant_proposal_idx
    on public.quote_proposal_items (barbershop_id, proposal_id, sort_order);

create table public.quote_status_history (
    id bigint generated always as identity primary key,
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    quote_request_id uuid not null,
    proposal_id uuid,
    from_status text,
    to_status text not null,
    note text not null default '',
    changed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    foreign key (quote_request_id, barbershop_id)
        references public.quote_requests(id, barbershop_id) on delete cascade,
    foreign key (proposal_id, barbershop_id)
        references public.quote_proposals(id, barbershop_id) on delete cascade
);

create index quote_status_history_tenant_request_idx
    on public.quote_status_history (barbershop_id, quote_request_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Cardapio Online
-- -----------------------------------------------------------------------------

create table public.online_menus (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    slug text not null,
    title text not null,
    description text not null default '',
    currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
    accepts_pickup boolean not null default true,
    accepts_delivery boolean not null default false,
    minimum_order numeric(12,2) not null default 0 check (minimum_order >= 0),
    delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
    estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
    published boolean not null default false,
    published_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (barbershop_id),
    check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
    check (accepts_pickup or accepts_delivery),
    check ((published and published_at is not null) or not published)
);

create unique index online_menus_slug_key on public.online_menus (lower(slug));

create table public.menu_categories (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    menu_id uuid not null,
    name text not null,
    description text not null default '',
    sort_order integer not null default 0 check (sort_order >= 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (menu_id, name),
    foreign key (menu_id, barbershop_id)
        references public.online_menus(id, barbershop_id) on delete cascade
);

create index menu_categories_tenant_menu_idx
    on public.menu_categories (barbershop_id, menu_id, active, sort_order);

create table public.menu_items (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    category_id uuid not null,
    name text not null,
    description text not null default '',
    image_url text,
    sku text,
    active boolean not null default true,
    available boolean not null default true,
    sort_order integer not null default 0 check (sort_order >= 0),
    metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    foreign key (category_id, barbershop_id)
        references public.menu_categories(id, barbershop_id) on delete restrict
);

create index menu_items_tenant_category_idx
    on public.menu_items (barbershop_id, category_id, active, available, sort_order);
create unique index menu_items_tenant_sku_key
    on public.menu_items (barbershop_id, sku) where sku is not null;

create table public.menu_item_prices (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    menu_item_id uuid not null,
    label text not null default 'Padrao',
    price numeric(12,2) not null check (price >= 0),
    promotional_price numeric(12,2)
        check (promotional_price is null or promotional_price >= 0),
    active boolean not null default true,
    sort_order integer not null default 0 check (sort_order >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (menu_item_id, label),
    foreign key (menu_item_id, barbershop_id)
        references public.menu_items(id, barbershop_id) on delete cascade,
    check (promotional_price is null or promotional_price <= price)
);

create index menu_item_prices_tenant_item_idx
    on public.menu_item_prices (barbershop_id, menu_item_id, active, sort_order);

create table public.menu_orders (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    menu_id uuid not null,
    public_reference text not null default upper(encode(gen_random_bytes(6), 'hex')),
    customer_name text not null,
    customer_email text not null default '',
    customer_phone text not null,
    fulfillment_type text not null check (fulfillment_type in ('pickup', 'delivery')),
    delivery_address jsonb check (delivery_address is null or jsonb_typeof(delivery_address) = 'object'),
    notes text not null default '',
    status text not null default 'received' check (status in (
        'received', 'confirmed', 'preparing', 'ready', 'out_for_delivery',
        'completed', 'cancelled', 'rejected'
    )),
    payment_status text not null default 'pending'
        check (payment_status in ('pending', 'paid', 'refunded', 'failed')),
    payment_method text,
    currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
    subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
    delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
    discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
    total_amount numeric(12,2) generated always as (subtotal + delivery_fee - discount_amount) stored,
    consent_at timestamptz not null,
    confirmed_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (id, barbershop_id),
    unique (public_reference),
    foreign key (menu_id, barbershop_id)
        references public.online_menus(id, barbershop_id) on delete restrict,
    check (length(trim(customer_name)) between 2 and 150),
    check (fulfillment_type <> 'delivery' or delivery_address is not null),
    check (discount_amount <= subtotal + delivery_fee)
);

create index menu_orders_tenant_status_idx
    on public.menu_orders (barbershop_id, status, created_at desc);

create table public.menu_order_items (
    id uuid primary key default gen_random_uuid(),
    barbershop_id uuid not null references public.barbershops(id) on delete restrict,
    order_id uuid not null,
    menu_item_id uuid,
    menu_item_price_id uuid,
    item_name text not null,
    price_label text not null default '',
    quantity integer not null check (quantity > 0),
    unit_price numeric(12,2) not null check (unit_price >= 0),
    line_total numeric(12,2) generated always as (quantity * unit_price) stored,
    notes text not null default '',
    created_at timestamptz not null default now(),
    unique (id, barbershop_id),
    foreign key (order_id, barbershop_id)
        references public.menu_orders(id, barbershop_id) on delete cascade,
    foreign key (menu_item_id, barbershop_id)
        references public.menu_items(id, barbershop_id) on delete set null (menu_item_id),
    foreign key (menu_item_price_id, barbershop_id)
        references public.menu_item_prices(id, barbershop_id) on delete set null (menu_item_price_id)
);

create index menu_order_items_tenant_order_idx
    on public.menu_order_items (barbershop_id, order_id);

-- -----------------------------------------------------------------------------
-- Timestamps
-- -----------------------------------------------------------------------------

do $triggers$
declare table_name text;
begin
    foreach table_name in array array[
        'landing_pages', 'landing_page_sections', 'landing_page_leads',
        'quote_requests', 'quote_proposals', 'online_menus', 'menu_categories',
        'menu_items', 'menu_item_prices', 'menu_orders'
    ] loop
        execute format(
            'create trigger %I before update on public.%I for each row execute function public.ogritech_set_updated_at()',
            table_name || '_set_updated_at', table_name
        );
    end loop;
end
$triggers$;

-- -----------------------------------------------------------------------------
-- Grants e Row Level Security
-- -----------------------------------------------------------------------------

revoke all on table
    public.landing_pages, public.landing_page_sections, public.landing_page_leads,
    public.quote_requests, public.quote_proposals, public.quote_proposal_items,
    public.quote_status_history, public.online_menus, public.menu_categories,
    public.menu_items, public.menu_item_prices, public.menu_orders,
    public.menu_order_items
from anon, authenticated;

grant select, insert, update, delete on table
    public.landing_pages, public.landing_page_sections, public.landing_page_leads,
    public.quote_requests, public.quote_proposals, public.quote_proposal_items,
    public.quote_status_history, public.online_menus, public.menu_categories,
    public.menu_items, public.menu_item_prices, public.menu_orders,
    public.menu_order_items
to authenticated;

grant usage, select on sequence public.quote_status_history_id_seq to authenticated;

alter table public.landing_pages enable row level security;
alter table public.landing_page_sections enable row level security;
alter table public.landing_page_leads enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_proposals enable row level security;
alter table public.quote_proposal_items enable row level security;
alter table public.quote_status_history enable row level security;
alter table public.online_menus enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_prices enable row level security;
alter table public.menu_orders enable row level security;
alter table public.menu_order_items enable row level security;

-- Configuracoes e catalogos: toda a equipe visualiza; apenas gestores alteram.
do $policies$
declare table_name text;
begin
    foreach table_name in array array[
        'landing_pages', 'landing_page_sections', 'online_menus',
        'menu_categories', 'menu_items', 'menu_item_prices'
    ] loop
        execute format(
            'create policy %I on public.%I for select to authenticated using (public.is_business_team(barbershop_id))',
            'Business team views ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for insert to authenticated with check (public.is_business_manager(barbershop_id))',
            'Business managers create ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for update to authenticated using (public.is_business_manager(barbershop_id)) with check (public.is_business_manager(barbershop_id))',
            'Business managers update ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for delete to authenticated using (public.is_business_manager(barbershop_id))',
            'Business managers delete ' || table_name, table_name
        );
    end loop;
end
$policies$;

-- Dados operacionais: equipe visualiza e opera; exclusao fica restrita a gestores.
do $policies$
declare table_name text;
begin
    foreach table_name in array array[
        'landing_page_leads', 'quote_requests', 'quote_proposals',
        'quote_proposal_items', 'menu_orders', 'menu_order_items'
    ] loop
        execute format(
            'create policy %I on public.%I for select to authenticated using (public.is_business_team(barbershop_id))',
            'Business team views ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for insert to authenticated with check (public.is_business_team(barbershop_id))',
            'Business team creates ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for update to authenticated using (public.is_business_team(barbershop_id)) with check (public.is_business_team(barbershop_id))',
            'Business team updates ' || table_name, table_name
        );
        execute format(
            'create policy %I on public.%I for delete to authenticated using (public.is_business_manager(barbershop_id))',
            'Business managers delete ' || table_name, table_name
        );
    end loop;
end
$policies$;

-- O historico de negociacao e append-only para preservar a trilha de auditoria.
create policy "Business team views quote_status_history"
on public.quote_status_history for select to authenticated
using (public.is_business_team(barbershop_id));

create policy "Business team creates quote_status_history"
on public.quote_status_history for insert to authenticated
with check (public.is_business_team(barbershop_id));

comment on column public.quote_requests.briefing is
    'Respostas versionaveis do formulario publico; o backend deve validar seu schema.';
comment on column public.menu_order_items.unit_price is
    'Snapshot do preco no momento do pedido; nao depende de alteracoes futuras no cardapio.';
comment on table public.quote_status_history is
    'Trilha de negociacao de solicitacoes e propostas, incluindo mudancas feitas pelo backend.';
