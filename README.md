# Ogritech

Plataforma de gestão para negócios de atendimento.

## Estrutura de marca

- **Ogritech** é a plataforma.
- **Japa na Barba** é a primeira barbearia atendida.
- Cada barbearia é isolada por `barbershop_id` e pelas políticas RLS do Supabase.

## Estado atual

- autenticação real com Supabase Auth;
- perfis `owner`, `admin`, `employee` e `client`;
- recuperação de senha;
- banco PostgreSQL com RLS;
- painel administrativo e área do cliente;
- vitrine comercial com demonstrações adaptadas a dez segmentos em `demonstracoes.html`;
- acessos demonstrativos de gestor, funcionário e cliente personalizados por segmento;
- clientes e agenda persistidos no Supabase, com isolamento por empresa via RLS;
- `localStorage` reservado aos ambientes demonstrativos e à importação única de dados antigos.

## Segurança

O frontend contém somente a chave pública do Supabase. Nunca inclua no repositório:

- secret key;
- `service_role`;
- senha do banco;
- credenciais pessoais.

## Privacidade e LGPD

- política de privacidade e termos versionados;
- canal autenticado para solicitações dos titulares;
- registro de ciência do aviso de privacidade;
- trilha de auditoria para alterações em clientes e agendamentos;
- parâmetros de retenção por empresa;
- acesso mínimo por função, aplicado por RLS;
- canal público: `privacidade@ogritech.com.br` (o endereço deve estar provisionado antes da publicação).

Esses controles apoiam a adequação, mas não substituem revisão jurídica, contratos com controladores e operadores, inventário de tratamentos e processos internos de resposta a incidentes.

## Próximas etapas

1. Carregar identidade e configurações de cada barbearia pelo banco.
2. Migrar Serviços e Profissionais para o Supabase.
3. Publicar a plataforma em `ogritech.com.br`.

## Central master

O usuário registrado em `platform_admins` possui uma central exclusiva em `admin.html`. Nela é possível:

- criar, editar, suspender e excluir negócios;
- convidar proprietários, gestores, funcionários e clientes finais;
- ativar, desativar e remover acessos;
- entrar no contexto de qualquer negócio pelo botão **Operar**;
- administrar clientes, agenda, serviços, equipe, financeiro e configurações usando o painel operacional existente.

Para ativar a central em um projeto Supabase, aplique as migrations e publique a Edge Function `platform-users`. A função usa `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente seguro do Supabase; essa chave nunca deve ser colocada no frontend.
