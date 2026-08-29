# Cronograma de produção — Agenda Ogritech

Início: 29/08/2026. Objetivo: colocar a Agenda Ogritech em piloto assistido com uma empresa real, preservando segurança, rastreabilidade e possibilidade de rollback.

## Fase A — Base reproduzível (29 a 30/08)

- Integrar migrations, testes, lockfile e configuração do CI que já foram validados em staging.
- Garantir que `main`, checkout local e staging tenham o mesmo histórico de migrations.
- Corrigir o pipeline até obter validação estática e de banco aprovadas.
- Marcar os três pilares não disponíveis como `Em breve`.

Critério de aceite: CI verde em um checkout limpo e `supabase db push --linked --dry-run` sem divergência no staging.

## Fase B — Disponibilidade real (31/08 a 03/09)

- Modelar jornada semanal, intervalos, bloqueios, folgas e fuso horário por empresa.
- Vincular profissionais aos serviços que executam.
- Criar RPC de consulta de horários disponíveis baseada na duração do serviço.
- Trocar horários fixos do frontend por disponibilidade calculada pelo banco.
- Cobrir concorrência, limites de horário e bloqueios com pgTAP.

Critério de aceite: cliente só visualiza horários realmente reserváveis; duas tentativas simultâneas nunca ocupam o mesmo intervalo.

## Fase C — Agendamento público (04 a 07/09)

- Criar endereço público por empresa, sem exigir senha do consumidor.
- Capturar nome, WhatsApp, e-mail e consentimento mínimo.
- Aplicar limitação de frequência, proteção antiabuso e política de antecedência.
- Criar links seguros para consulta e cancelamento.
- Remover qualquer identidade demonstrativa das contas reais.

Critério de aceite: uma pessoa sem conta consegue agendar pelo celular e recebe uma referência segura sem acessar dados de terceiros.

## Fase D — Operação confiável (08 a 10/09)

- Substituir atualizações em lote por RPCs transacionais de confirmação, conclusão, ausência e cancelamento.
- Aplicar máquina de estados e auditoria no banco.
- Enviar notificações de solicitação, confirmação e cancelamento; preparar lembrete.
- Instrumentar erros de API, autenticação, conflitos e latência.

Critério de aceite: todas as mudanças de estado são atômicas, auditáveis e notificadas.

## Fase E — Produção e piloto (11 a 15/09)

- Aplicar migrations no projeto de produção com backup e plano de rollback.
- Configurar Auth, SMTP, Edge Functions, cabeçalhos, MFA e alertas.
- Executar smoke test completo com dados fictícios.
- Cadastrar a primeira empresa, treinar o responsável e operar o piloto assistido.
- Registrar incidentes, métricas e decisão de ampliação.

Critério de aceite: sete dias de piloto sem perda de dados, acesso cruzado, conflito de agenda ou falha crítica sem tratamento.

## Ordem de liberação comercial

- Agenda online: `Disponível` somente após a Fase E.
- Landing pages: `Em breve`.
- Orçamento online: `Em breve`.
- Cardápio online: `Em breve`.

As datas são metas de execução e podem avançar se um critério de aceite não for comprovado. Qualidade e segurança bloqueiam promoção para a fase seguinte.
