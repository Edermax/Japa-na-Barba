# Beta fechado da agenda — Ogritech

Status: **preparado, mas bloqueado até a aprovação técnica do ciclo sintético de 14 dias**.

## Objetivo

Validar com três convidados se uma pessoa comum entende a página, encontra um horário, conclui a reserva, consulta o agendamento e cancela sem ajuda. O beta não é lançamento comercial, não exige uma empresa parceira e não deve ser divulgado publicamente.

## Condições para iniciar

- Diário sintético encerrado como `APROVADO TECNICAMENTE`.
- Nenhum issue aberto com as labels `synthetic-agenda-pilot` ou `staging-agenda-monitor`.
- Link privado revisado pelo responsável da Ogritech.
- Agendamento público mantido desativado até o início da janela combinada.
- Dados, serviço, profissional e horários identificados claramente como beta.
- Plano de interrupção disponível: desativar o agendamento público e orientar contato manual.

## Papéis mínimos

| Papel | Quantidade | Responsabilidade |
|---|---:|---|
| Operador Ogritech | 1 | Abrir e fechar a janela, acompanhar reservas e registrar problemas |
| Convidado cliente | 3 | Executar a jornada sem receber instruções durante o teste |
| Observador | 1 opcional | Anotar dúvidas e comportamento sem interferir |

O operador pode ser o próprio responsável pela Ogritech. Os convidados podem ser pessoas conhecidas; não precisam representar uma empresa.

## Convite pronto

> Estou testando, em um ambiente fechado, a agenda online da Ogritech. O teste leva cerca de 10 minutos e consiste em escolher um serviço e horário, criar uma reserva, consultar os dados e cancelar. Não há compra nem cobrança. Use apenas os dados de contato que você concordar em informar. Se aceitar participar, enviarei um link individual e o período disponível.

## Roteiro do convidado

1. Abrir o link recebido no celular.
2. Escolher serviço, profissional, data e horário.
3. Ler o aviso de privacidade e decidir se concorda.
4. Criar a reserva sem ajuda do operador.
5. Guardar a referência e abrir o link privado de gestão.
6. Confirmar se data, horário, serviço e status estão corretos.
7. Cancelar a reserva pelo próprio link.
8. Responder às cinco perguntas de feedback.

## Perguntas de feedback

1. Em qual parte você teve dúvida?
2. Você entendeu o que aconteceria depois de confirmar?
3. A mensagem de sucesso deixou claro como consultar ou cancelar?
4. Algum texto pareceu técnico, inseguro ou confuso?
5. De 0 a 10, qual a chance de você concluir essa reserva sem ajuda?

## Registro por participante

| Campo | Registro |
|---|---|
| Identificador | BETA-01, BETA-02 ou BETA-03 |
| Dispositivo e navegador | PENDENTE |
| Data e hora | PENDENTE |
| Reserva criada | PENDENTE |
| Consulta por token | PENDENTE |
| Cancelamento | PENDENTE |
| Ajuda solicitada | PENDENTE |
| Nota de facilidade | PENDENTE |
| Problema observado | PENDENTE |
| Evidência | PENDENTE |

Não registrar senha, token completo, dados desnecessários ou gravação de tela sem consentimento.

## Critérios de aprovação

- Três de três convidados criam, consultam e cancelam a reserva.
- Nenhuma dupla reserva ou exposição de dados.
- Nenhum convidado precisa de intervenção para concluir a jornada.
- Nota média de facilidade igual ou superior a 8.
- Nenhum incidente crítico ou alto permanece aberto.
- Todas as reservas do beta terminam canceladas ou concluídas conforme o roteiro.

## Interrupção imediata

Interromper o beta e desativar o link público diante de dupla reserva, acesso a dados de outro convidado, horário incorreto, falha persistente no cancelamento ou indisponibilidade que impeça a operação. Preservar apenas as evidências necessárias ao diagnóstico e seguir o plano de resposta a incidentes.

## Sequência de ativação

1. Selecionar três convidados e registrar apenas `BETA-01` a `BETA-03` no controle.
2. Definir uma janela única de até duas horas.
3. Ativar temporariamente o agendamento público.
4. Enviar o link individualmente; não publicar em redes sociais.
5. Acompanhar o painel sem orientar a navegação.
6. Encerrar a janela, desativar o agendamento público e conferir as reservas.
7. Consolidar feedback e classificar incidentes.
8. Decidir entre corrigir e repetir, ou preparar a primeira ativação comercial.

## Gate final

O beta fechado não autoriza lançamento automático. A abertura comercial exige decisão explícita do responsável pela Ogritech, checklist sem bloqueios críticos, plano de suporte e definição de quem operará a agenda diariamente.
