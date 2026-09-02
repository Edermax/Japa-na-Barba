# Correção do drift de políticas RLS — staging — 02/09/2026

## Diagnóstico

O histórico de migrations de produção e staging coincidia até `move_profile_rls_helpers_private`, mas o schema efetivo não. Produção ainda conserva políticas da geração legada nas tabelas `appointments`, `clients`, `barbershops`, `employees`, `profiles` e `services`. Essas políticas explicam 17 grupos de políticas permissivas sobrepostas e os 8 avisos de `auth_rls_initplan` do advisor de produção.

O staging já não possuía essas políticas antigas e retornava zero grupos sobrepostos. Isso caracteriza drift histórico de schema em produção, e não ausência da migration de consolidação no histórico.

## Correção preparada

A migration `remove_legacy_rls_policies` remove as 24 políticas antigas de modo idempotente. Ela verifica a existência de cada tabela, pois instalações limpas já não contêm `appointments` e `clients`.

A migration foi:

1. criada pelo Supabase CLI;
2. aplicada durante reconstrução integral do banco local;
3. validada por 190 testes pgTAP;
4. aplicada somente ao staging;
5. verificada pelos advisors e por consulta direta a `pg_policies`;
6. seguida de uma jornada sintética completa da Agenda.

## Resultado

- Staging: 40 migrations lógicas aplicadas.
- Políticas permissivas sobrepostas no staging: **0**.
- Alertas de segurança de banco/RLS: **0**.
- Advisor de performance: apenas 20 índices ainda sem uso, compatíveis com o baixo volume sintético.
- Jornada da Agenda: criação, conflito, privacidade, honeypot, isolamento por token, cancelamento e limpeza concorrente aprovados.
- Produção: nenhuma alteração realizada; migration permanece retida na política de promoção.

## Próxima decisão de promoção

Quando o lote de produção for autorizado, `remove_legacy_rls_policies` deve ser promovida junto das demais migrations retidas. Depois da promoção, os advisors de produção e os testes de isolamento devem ser executados novamente antes de liberar tráfego comercial.
