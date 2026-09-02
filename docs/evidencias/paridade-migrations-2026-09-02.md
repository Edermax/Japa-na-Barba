# Auditoria de paridade das migrations — 02/09/2026

## Resultado

- Repositório: 39 migrations versionadas.
- Staging (`fuesdztsvrkkgnbqhcxi`): 39 migrations lógicas, na mesma ordem e com os mesmos nomes.
- Produção (`mvzcoaiiwytycdqcvydf`): 36 migrations aplicadas; as três seguintes permanecem conscientemente retidas.
- Nenhuma alteração foi aplicada em produção nesta auditoria.

## Exceção de versão no staging

As três migrations mais recentes foram registradas pelo ambiente remoto com timestamps diferentes dos nomes de arquivo locais, embora preservem nome e ordem:

| Migration | Versão local | Versão registrada no staging |
|---|---:|---:|
| `platform_contact_leads` | `20260901214241` | `20260901214935` |
| `deny_platform_contact_attempt_reads` | `20260901215201` | `20260901215227` |
| `index_remaining_foreign_keys` | `20260901220712` | `20260901220744` |

Por isso, a paridade lógica é aferida por nome e ordem. Alterar apenas a tabela de histórico para igualar timestamps não é necessário e criaria risco sem benefício operacional.

## Retenção intencional em produção

| Migration | Motivo |
|---|---|
| `platform_contact_leads` | A captação comercial continua desativada até a decisão de negócio e o go-live. |
| `deny_platform_contact_attempt_reads` | Endurecimento inseparável da entrega comercial ainda não promovida. |
| `index_remaining_foreign_keys` | Promoção conjunta com o lote validado, evitando fragmentação da entrega. |

## Proteção adicionada

O comando `npm run audit:migrations`, incorporado a `npm run validate`, exige que toda migration esteja explicitamente classificada. Uma migration nova passa a falhar no CI até que seja incluída na expectativa de staging e classificada como aplicada ou retida para produção com justificativa.

A política auditável está em `config/migration-release-policy.json`. A checagem não contém credenciais e não promove schema.

## Advisors após a auditoria

- Segurança: staging e produção apresentam somente o aviso de proteção contra senhas vazadas desativada; não houve alerta de RLS ou exposição de tabelas.
- Performance no staging: 20 índices ainda sem uso, resultado compatível com um ambiente sintético de baixo volume; remoção agora seria prematura.
- Performance em produção: 7 chaves estrangeiras sem índice, 8 avisos de `auth_rls_initplan`, 17 grupos de políticas permissivas múltiplas e 73 índices ainda sem uso.
- A migration retida `index_remaining_foreign_keys` já resolve as 7 chaves estrangeiras quando o lote for promovido. Os avisos de RLS precisam de uma migration corretiva independente, validada primeiro em staging. Índices sem uso serão reavaliados apenas com volume representativo.

O aviso de senhas vazadas exige habilitação na configuração do Auth e permanece como item de go-live. Referência: [Password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Fontes e método

- Inventário local: arquivos de `supabase/migrations/` no commit corrente.
- Inventários remotos: leitura da tabela de histórico por meio do conector Supabase em 02/09/2026.
- Referência operacional: documentação oficial do Supabase para migrations e gerenciamento de ambientes.
