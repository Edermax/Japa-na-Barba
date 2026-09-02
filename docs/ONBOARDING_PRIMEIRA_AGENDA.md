# Onboarding da primeira Agenda Ogritech

Este pacote permite preparar a configuração do primeiro cliente antes de existir uma empresa-piloto. A massa `Ogritech Agenda Modelo` é demonstrativa, usa contatos `.invalid`, permanece no staging e começa com o link público desligado.

## Fluxo operacional

1. Duplicar a planilha de onboarding e substituir somente as células marcadas como entrada.
2. Confirmar empresa, fuso horário, serviços, preços, profissionais e jornadas.
3. Exportar ou transcrever os dados aprovados para o painel do staging.
4. Executar `npm run check:onboarding` e o monitor sintético da agenda.
5. Corrigir qualquer item classificado como `BLOQUEADA`.
6. Somente depois da validação, cadastrar o primeiro cliente real e solicitar autorização explícita para publicar seu link.

## Regras contra retrabalho

- Nunca transformar a empresa-modelo em empresa real; criar um novo cadastro para cada cliente.
- Não usar e-mail, telefone ou nome de pessoa real no modelo.
- Não ativar o link público antes de validar serviços, vínculos e jornadas.
- Manter identificadores estáveis para evitar serviços e profissionais duplicados.
- Registrar alterações de preço e jornada com data e responsável.

## Gate “Agenda pronta”

O modelo só fica `PRONTA_PARA_SIMULACAO` quando possui empresa identificada, regras positivas, ao menos um serviço, ao menos um profissional, serviços vinculados e jornada válida para cada profissional. A publicação continua sendo uma decisão separada.
