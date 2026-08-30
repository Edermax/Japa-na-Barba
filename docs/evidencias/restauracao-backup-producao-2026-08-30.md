# Evidência — restauração do backup lógico de produção

- Data: 2026-08-30
- Projeto de origem: Ogritech / produção
- Commit do workflow de backup: `39ef5a1`
- Execução do backup: `33339194047`
- Artefato: `ogritech-production-20260830T222945Z`
- ID do artefato: `9740015648`
- Tamanho: 40.666 bytes
- Digest: `sha256:3ec9f99bfc32f70c390e5b6f32eeb3b53bde849fc4bb49834a4573485e9b8419`
- Expiração informada pelo GitHub: 2026-09-06 22:29:46 UTC
- Execução final do restore drill: `33339937024`
- Commit do restore drill e fixtures: `ee205cf`
- Resultado: sucesso
- Duração do restore drill: 1m34s

## Escopo validado

O backup de dados usa uma allowlist explícita dos schemas `public` e `private`.
Dados gerenciados dos schemas `auth` e `storage` não integram esta contingência
temporária do plano Free. O artefato foi validado pelo SHA-256, descriptografado
somente no runner efêmero e restaurado em uma única transação sobre PostgreSQL
17.6 local e descartável.

Depois da restauração, o workflow confirmou que existem tabelas públicas, que
todas estão com RLS ativa e que a RPC crítica `public_create_appointment` está
presente. Os testes pgTAP de operações atômicas, isolamento multiempresa e fluxo
público totalizaram 72 testes, todos aprovados. Os arquivos descriptografados e
o banco efêmero foram removidos mesmo ao final da execução bem-sucedida.

## RPO e RTO observados

- RPO: o artefato usado foi criado imediatamente antes do ensaio e o workflow
  permanece agendado diariamente; atende à meta de até 24 horas para o piloto.
- RTO técnico medido: 1m34s para baixar, validar, descriptografar, iniciar o
  destino, restaurar, testar e limpar; atende à meta de até 4 horas úteis. O RTO
  real de incidente também inclui decisão humana, troca de configuração e DNS.

## Pendências que não invalidam este ensaio

O Security Advisor de produção ainda registra dois avisos de funções
`SECURITY DEFINER` executáveis por `authenticated` (`current_barbershop_id` e
`current_user_role`) e a proteção contra senhas vazadas permanece desativada.
Esses itens continuam como gates de hardening de produção e não foram ocultados
nem alterados durante o teste de restauração.

