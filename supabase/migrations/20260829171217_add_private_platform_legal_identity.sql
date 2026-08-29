create table private.platform_legal_identity (
  singleton boolean primary key default true check (singleton),
  legal_name text not null check (length(trim(legal_name)) between 2 and 200),
  tax_document text not null check (tax_document ~ '^[0-9]{14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table private.platform_legal_identity is
  'Identidade fiscal privada da operadora da plataforma; nunca expor pela Data API.';

revoke all on table private.platform_legal_identity from public, anon, authenticated;
grant select, insert, update on table private.platform_legal_identity to service_role;

create trigger platform_legal_identity_set_updated_at
before update on private.platform_legal_identity
for each row execute function public.ogritech_set_updated_at();
