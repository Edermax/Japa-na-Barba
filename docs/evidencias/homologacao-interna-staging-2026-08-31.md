# Evidência — homologação interna integral no staging

- Data: 2026-08-31
- Ambiente: Supabase staging `fuesdztsvrkkgnbqhcxi`
- Produção: não acessada nem alterada durante o ensaio
- Dados: exclusivamente sintéticos, com e-mails `example.invalid`

## Gate anterior à execução

- Projeto staging confirmado como o único projeto vinculado ao CLI.
- Supabase CLI fixado em `2.115.0`.
- As 36 migrations locais e remotas estavam sincronizadas.
- `db push --dry-run` confirmou ausência de migrations pendentes.
- Limitações do plano Free revisadas conforme
  `docs/LIMITACOES_SUPABASE_FREE.md`.

## Cobertura

- Duas empresas sintéticas e isolamento RLS entre tenants.
- Papéis owner, admin, employee, client e platform-admin.
- Bloqueio de leitura, criação e alteração cruzada entre empresas.
- Serviços, profissional, jornadas, intervalo e folga.
- Agenda pública, catálogo limitado, disponibilidade e consentimento.
- Criação, consulta e cancelamento por referência e token secreto.
- Prevenção de conflito e sobreposição de horários.
- Transições operacionais atômicas, controle de versão e máquina de estados.
- Eventos imutáveis, notificações internas, leitura e fila de e-mail.
- Fatura, item, pagamento, taxa, estorno parcial e auditoria financeira.
- Segurança de helpers privados e bloqueio para `anon`.
- Estrutura completa, tipos, constraints, RLS, grants e índices.
- Frontend: seleção explícita de ambiente, console administrativo, service
  worker, RPCs públicas e ausência de credenciais privilegiadas.

## Resultados

- `staging-functional.test.sql`: 20/20.
- `staging-operations.test.sql`: 32/32.
- `appointment-operations.test.sql`: 20/20.
- `profile-helper-security.test.sql`: 10/10.
- `schema.test.sql`: 108/108.
- Testes remotos de banco: 190/190.
- Testes de frontend: 16/16.
- Total da homologação: 206/206 verificações aprovadas.
- Advisors: nenhum erro; um warning conhecido de Leaked Password Protection
  desativada, recurso indisponível no plano Free.

## Limpeza

Todas as fixtures foram criadas dentro de transações finalizadas com `ROLLBACK`.
A consulta posterior confirmou:

- zero empresas com slug de teste `staging-%`;
- zero usuários Auth com e-mail `example.invalid`;
- zero agendamentos com e-mail `example.invalid`.

## Decisão

**Homologação interna aprovada.** O software demonstrou prontidão técnica para
um smoke test sintético mínimo em produção. Esta aprovação não substitui um
piloto real: usabilidade diária, aderência comercial, suporte, jurídico e
operação humana continuam sem validação externa.
