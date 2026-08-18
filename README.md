# Japa na Barba — Etapa 5: Agenda Integrada

Nesta etapa os agendamentos deixaram de existir isoladamente entre as telas.

## O que foi implementado

### Cliente
- solicita um novo agendamento;
- escolhe serviço;
- escolhe profissional;
- escolhe data e horário;
- não consegue reservar horário já ocupado;
- acompanha o status;
- pode cancelar um horário ainda ativo.

### Funcionário
- visualiza apenas os atendimentos vinculados ao seu profissional;
- confirma solicitações;
- conclui atendimentos;
- marca não comparecimento;
- cancela atendimentos;
- pode criar um atendimento manual.

### Proprietário
- visualiza a agenda completa;
- filtra por data, profissional e status;
- altera os mesmos status;
- cria agendamentos manualmente.

### Dashboard
Os agendamentos do dia agora são calculados a partir da agenda real do protótipo.

## Status disponíveis

- Solicitado
- Confirmado
- Concluído
- Cancelado
- Não compareceu

## Armazenamento

Todos os perfis usam a mesma chave:

`japaNaBarbaAppointments`

Ela fica no `localStorage` do navegador.

Isso permite demonstrar a integração enquanto o projeto ainda não possui backend.

## Credenciais de teste

### Proprietário
- E-mail: `admin@japanabarba.com`
- Senha: `123456`

### Funcionário
- E-mail: `funcionario@japanabarba.com`
- Senha: `123456`

### Cliente
- E-mail: `cliente@japanabarba.com`
- Senha: `123456`

## Teste recomendado

1. Entre como cliente.
2. Solicite um horário com Carlos.
3. Saia.
4. Entre como funcionário.
5. Abra Agenda.
6. O horário solicitado pelo cliente aparecerá.
7. Confirme o atendimento.
8. Saia.
9. Entre novamente como cliente.
10. O status aparecerá como Confirmado.

## Limitação atual

A integração ainda ocorre dentro do mesmo navegador/computador através de `localStorage`.

Para que cliente e barbearia usem celulares/computadores diferentes, a próxima grande etapa será implementar backend, banco de dados e autenticação real.
