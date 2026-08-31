# Limitações do Supabase Free — gate de planejamento

Revisão: 2026-08-31. Antes de sugerir ou executar uma mudança no Supabase,
confirmar novamente a documentação e o plano ativo; preços, cotas e recursos
podem mudar.

## Limitações que afetam a Ogritech

- Dois projetos Free ativos por conta proprietária/administradora; os projetos
  podem pausar após uma semana sem atividade.
- Banco entra em modo somente leitura ao exceder 500 MB de dados.
- Sem backups automáticos gerenciados e sem PITR. A contingência atual é o
  backup lógico criptografado diário no GitHub Actions, com restore drill.
- Logs de Auth têm retenção de uma hora e os demais logs do plano Free têm
  retenção curta. Consultas do monitor usam somente uma janela de 20 minutos.
- Log Drains e Metrics endpoint não estão disponíveis no Free. O monitor usa a
  Management API de logs como alternativa, sujeito a cotas e mudanças de API.
- Tokens pessoais do Dashboard são amplos; a tela atual não permite limitar um
  token a `analytics_logs_read`. O token do monitor expira em 30 dias e deve ser
  rotacionado ou substituído por OAuth/identidade restrita antes da expansão.
- Leaked Password Protection, sessão única, timeouts avançados e recursos
  avançados de segurança de Auth não estão disponíveis no Free.
- Não há papel Read-Only no Dashboard Free; os papéis disponíveis têm acesso
  mais amplo que o desejado para observabilidade.
- Sem Platform Audit Logs, SLA de uptime ou suporte por e-mail.
- Cotas relevantes: 50 mil MAU, 500 mil invocações de Edge Functions, 5 GB de
  egress, 1 GB de Storage, 200 conexões Realtime simultâneas e 2 milhões de
  mensagens Realtime por mês.
- Edge Functions: 150 s de duração máxima, 2 s de CPU por requisição, 256 MB de
  memória, 100 funções por projeto e bloqueio de conexões de saída nas portas
  25 e 587.

## Gate obrigatório antes de novas ações

1. Confirmar plano ativo e região do projeto-alvo.
2. Consultar changelog, documentação do recurso, disponibilidade por plano e
   custo/overage atuais.
3. Confirmar permissões reais da credencial exigida e sua expiração.
4. Preferir staging; definir rollback e evidência de validação.
5. Não propor recursos Pro/Team como executáveis no Free sem apresentar custo e
   alternativa compatível.
6. Registrar qualquer limitação residual que torne a validação parcial.

## Gatilhos para reavaliar upgrade

- Banco acima de 350 MB ou crescimento que possa alcançar 500 MB no piloto.
- Necessidade de backup gerenciado, PITR, proteção contra senhas vazadas,
  retenção maior de logs, Log Drains, Metrics endpoint ou acesso Read-Only.
- Primeiro cliente pagante ou dependência operacional que exija SLA e suporte.
- Token amplo de observabilidade não puder ser eliminado por OAuth restrito.
