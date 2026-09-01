# Evidência — captação corporativa no staging

- Data: 2026-09-01
- Ambiente de dados: Supabase staging `fuesdztsvrkkgnbqhcxi`
- Produção comercial: não ativada; o formulário mantém o fallback por e-mail
- Dados: exclusivamente sintéticos, identificados por marcador único

## Implementação

- Fila `platform_contact_leads` protegida por RLS e acessível somente a
  administradores da plataforma.
- Escrita anônima restrita à RPC `public_submit_platform_contact`.
- Implementação privilegiada isolada no schema `private`, com `search_path`
  explícito e permissões mínimas.
- Validação de campos, consentimento obrigatório, honeypot, limites de tamanho
  e rate limit de cinco tentativas por contato/hora.
- O navegador grava apenas quando `env=staging`; produção continua abrindo o
  e-mail endereçado a `contato@ogritech.com.br`.

## Resultado automatizado

- Cinco submissões válidas aceitas pela API pública anônima.
- Sexta submissão do mesmo contato bloqueada pelo rate limit.
- Submissão sem consentimento recusada.
- Submissão com honeypot preenchido recusada.
- Testes locais: 30/30 aprovados.
- Advisor de segurança: nenhum alerta novo da implementação; permanece apenas
  o warning conhecido de proteção contra senhas vazadas indisponível no plano.

## Limpeza

- Cinco leads sintéticos removidos pelo e-mail marcador exato.
- Cinco registros antiabuso correspondentes removidos pelo hash exato.
- Consulta posterior confirmou zero leads do ensaio no staging.

## Decisão

**Captação corporativa aprovada tecnicamente em staging.** A ativação da fila em
produção continua bloqueada até existir processo humano de atendimento,
responsável definido e decisão de retenção dos dados.
