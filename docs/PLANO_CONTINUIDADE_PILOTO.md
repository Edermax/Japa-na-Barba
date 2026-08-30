# Plano de continuidade — piloto da Agenda Online

Data da definição: 2026-08-30  
Escopo: Agenda Online da primeira empresa piloto.

## Objetivos aprovados para o MVP

- **RPO: 24 horas.** Em um desastre total, admite-se perder no máximo as
  alterações realizadas desde a última cópia diária concluída.
- **RTO: 4 horas úteis.** A meta é restabelecer a operação essencial da agenda
  em até quatro horas úteis após a confirmação do incidente.
- **Retenção-alvo: 7 cópias diárias.** As cópias devem permanecer criptografadas
  e fora do projeto Supabase de produção.

Esses valores são metas operacionais do piloto, não uma garantia contratual.
O SLA externo somente deve ser publicado depois de um ensaio de restauração
medir o tempo real.

## Decisão de implementação

O projeto está no plano Free. Conforme a documentação oficial da Supabase,
backups diários gerenciados estão disponíveis nos planos Pro, Team e Enterprise;
para o Free, a recomendação é realizar exportações regulares com
`supabase db dump` e mantê-las fora da plataforma.

Verificação no painel de produção em 2026-08-30: a página **Database Backups**
informa que o plano Free não inclui backups do projeto e o resumo do projeto
exibe **Last backup: No backups**. Nenhum mecanismo de backup está implantado
no momento desta verificação.

Antes de inserir dados reais do piloto, escolher e concluir uma destas opções:

1. **Preferida:** promover produção ao plano Pro e usar o backup diário gerenciado
   com retenção de sete dias.
2. **Alternativa enxuta escolhida para o período no Free:** executar diariamente
   um dump lógico, criptografá-lo e armazená-lo como artefato privado do GitHub
   Actions por sete dias. Implementação em
   `.github/workflows/backup-production.yml`.

PITR não é requisito do MVP. Ele somente será avaliado se o negócio exigir RPO
menor que 24 horas.

### Ativação da alternativa temporária

No environment `production` do GitHub, cadastrar estes secrets:

- `SUPABASE_DB_URL`: connection string do Session Pooler de produção, com senha
  percent-encoded. Nunca usar a chave `service_role` como substituta.
- `BACKUP_ENCRYPTION_PASSPHRASE`: frase aleatória exclusiva com pelo menos 32
  caracteres. Guardar também uma cópia no gerenciador de senhas; sem ela, o
  backup é irrecuperável.

Depois, executar manualmente o workflow **Backup production database**. O
agendamento subsequente ocorre diariamente às 03:20 UTC (00:20 no horário de
Brasília enquanto UTC-3). A implantação somente será considerada concluída
quando a execução manual produzir o artefato `.tar.gz.enc` e seu SHA-256.

O dump do CLI exclui schemas gerenciados pela Supabase, incluindo `auth` e
`storage`. A contingência temporária cobre roles customizadas, schema e dados da
aplicação, incluindo a Agenda, mas não preserva usuários do Auth nem objetos do
Storage. Essa limitação deve ser aceita apenas durante o piloto assistido e
eliminada com a migração para o plano Pro.

## Procedimento de recuperação

1. Declarar o incidente e suspender temporariamente novas marcações.
2. Registrar horário, impacto, último backup íntegro e responsável técnico.
3. Criar um projeto Supabase isolado; nunca ensaiar sobre produção.
4. Aplicar a versão exata das migrations implantadas.
5. Restaurar o último dump lógico válido ou clonar/restaurar o backup gerenciado.
6. Validar contagens essenciais, RLS, usuários, empresas, serviços, profissionais
   e agendamentos.
7. Executar o smoke test público e autenticado, incluindo tentativa simultânea
   sobre o mesmo horário.
8. Medir perda de dados e tempo total, registrar evidências e somente então
   decidir a troca de ambiente ou a reabertura de produção.

## Critérios para liberar o piloto

- [ ] Workflow temporário executado com os dois secrets de produção.
- [ ] Último backup identificado, íntegro e acessível ao responsável técnico.
- [ ] Segredos de acesso não estão no Git nem no artefato sem criptografia.
- [ ] Restauração concluída em projeto isolado.
- [ ] RPO observado menor ou igual a 24 horas.
- [ ] RTO observado menor ou igual a 4 horas úteis.
- [ ] Smoke test e isolamento entre empresas aprovados após a restauração.
- [ ] Evidência datada anexada em `docs/evidencias/`.

## Referências oficiais

- Supabase — Database Backups: https://supabase.com/docs/guides/platform/backups
- Supabase — Restore to a new project: https://supabase.com/docs/guides/platform/clone-project
