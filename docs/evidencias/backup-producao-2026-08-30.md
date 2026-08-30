# Evidência — primeiro backup lógico de produção

- Data: 2026-08-30
- Projeto: Ogritech / produção
- Workflow: `Backup production database`
- Execução: `#3` / GitHub Actions run `33334370195`
- Commit executado: `5888f2e`
- Resultado: sucesso
- Duração total: 1m51s
- Artefato: `ogritech-production-20260830T204344Z`
- Tamanho informado pelo GitHub: 41,9 KB
- Digest do artefato: `sha256:4358910451814694910f8208b69da997b6406d761a270ce91fb5bb799d4931ef`
- Retenção configurada: 7 dias

O workflow gerou dumps lógicos de roles customizadas, schema e dados da
aplicação; compactou o conteúdo; criptografou-o com AES-256-CBC/PBKDF2 antes do
upload; gerou o checksum do arquivo criptografado; e publicou ambos no artefato
do GitHub Actions.

Os valores de `SUPABASE_DB_URL` e `BACKUP_ENCRYPTION_PASSPHRASE` permanecem em
secrets do environment `production` e não foram registrados nesta evidência.

## Limitações e próximo gate

- O dump do Supabase CLI exclui schemas gerenciados, incluindo `auth` e
  `storage`.
- A existência do artefato não comprova restauração.
- O piloto somente atende ao gate de recuperação depois que este backup for
  descriptografado e restaurado em projeto isolado, com smoke test aprovado.

## Complemento

O artefato inicial revelou metadados incompatíveis do schema gerenciado
`storage`. O workflow foi corrigido para permitir somente dados de `public` e
`private`, e um novo artefato foi restaurado com sucesso. Evidência conclusiva:
`docs/evidencias/restauracao-backup-producao-2026-08-30.md`.
