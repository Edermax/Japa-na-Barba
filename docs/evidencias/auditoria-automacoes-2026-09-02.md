# Evidência — auditoria das automações operacionais

- Data: 2026-09-02
- Escopo: piloto sintético, monitor de staging, monitor de produção, backup,
  restauração, gate e publicação de artefatos
- Produção comercial: não ativada

## Estado verificado

- Backup diário de produção concluído na execução `33606336713`.
- Monitor de staging concluído na execução `33591613029`.
- Primeiro dia do piloto sintético registrado e issue diária aberta.
- Pipelines de validação, evidências e publicação concluídos com sucesso nos
  commits anteriores.

## Correções preventivas

- O backup passou a ter permissão mínima `issues: write` e agora abre ou atualiza
  uma issue `production-backup` quando falha.
- Quando o backup volta ao normal, a mesma automação registra a recuperação e
  fecha o incidente, evitando duplicidade.
- `upload-artifact` foi atualizado para v7 e `download-artifact` para v8, conforme
  os releases oficiais consultados em 02/09/2026.
- `supabase/setup-cli` foi atualizado para v3 após o ensaio apontar a dependência
  depreciada do runtime Node 20 na versão v1.
- A CLI instalada pelo npm e pelos workflows foi alinhada na versão estável
  `2.116.0`; a auditoria npm permaneceu com zero vulnerabilidades.
- Todos os workflows passaram a usar `checkout` e `setup-node` v5.
- O gate passou a executar em todo push da branch principal, sem filtro que
  pudesse deixar mudanças de aplicação ou banco sem novo pacote de evidências.
- Incidentes abertos de piloto, staging, monitor de produção e backup agora são
  somados pelo gate e impedem aprovação operacional.
- O diário do piloto tornou-se idempotente por data: reexecuções continuam
  exercitando a jornada, mas não criam comentários diários duplicados.

## Verificação

- Testes locais: 33/33 aprovados.
- Há testes de contrato específicos para alerta/resolução do backup e para
  impedir regressão às gerações antigas das Actions de artefato.
- O backup `ogritech-production-20260902T080147Z`, da execução `33606336713`,
  foi restaurado e validado integralmente em banco efêmero pela execução
  `33614660543`; arquivos descriptografados e banco descartável foram removidos.
- A execução manual `33615418378` aprovou a cadeia atualizada completa: CLI
  `2.116.0` via `setup-cli@v3`, dumps, criptografia, checksum, upload v7 e passo
  de publicação/resolução de incidente.
- Após tornar o diário idempotente, o segundo dia não precisou aguardar o cron:
  a execução `33616264662` foi
  antecipada com segurança e registrou 6/6 reservas criadas/canceladas,
  isolamento e limpeza aprovados e p95 de 235 ms. O ciclo está em 2/14 dias.

## Decisão

**Automações aprovadas com alerta de falha reforçado.** Falhas futuras de backup
deixam de depender apenas das notificações genéricas do GitHub e passam a integrar
o inventário operacional de incidentes do projeto.
