# SaaS Ogritech

Plataforma SaaS de gestão para barbearias.

## Estrutura de marca

- **SaaS Ogritech** é a plataforma.
- **Japa na Barba** é a primeira barbearia atendida.
- Cada barbearia é isolada por `barbershop_id` e pelas políticas RLS do Supabase.

## Estado atual

- autenticação real com Supabase Auth;
- perfis `owner`, `admin`, `employee` e `client`;
- recuperação de senha;
- banco PostgreSQL com RLS;
- painel administrativo e área do cliente;
- vitrine comercial com demonstrações adaptadas a dez segmentos em `demonstracoes.html`;
- agenda integrada ainda armazenada localmente durante a migração gradual.

## Segurança

O frontend contém somente a chave pública do Supabase. Nunca inclua no repositório:

- secret key;
- `service_role`;
- senha do banco;
- credenciais pessoais.

## Próximas etapas

1. Carregar identidade e configurações de cada barbearia pelo banco.
2. Migrar Serviços para o Supabase.
3. Migrar Clientes e Profissionais.
4. Migrar Agendamentos e remover o `localStorage`.
5. Publicar a plataforma em `ogritech.com.br`.
