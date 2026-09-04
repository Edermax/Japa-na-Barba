# Jornada oficial do cliente — Ogritech Agenda

Fonte de verdade funcional registrada em 04/09/2026. O nome oficial do produto é **Ogritech Agenda**. Esta jornada orienta produto, atendimento, implantação, automações, interface e testes. Quando houver conflito com materiais anteriores, prevalece este documento, sujeito às regras de segurança, privacidade e legislação aplicáveis.

## 1. Canais que iniciam o atendimento

O cliente do estabelecimento inicia o contato pelo WhatsApp do próprio estabelecimento, obtido por QR Code ou número anotado manualmente. A IA só responde depois de existir a primeira mensagem entre as partes, em um dos dois caminhos:

1. o cliente envia a primeira mensagem e ativa o atendimento; ou
2. o estabelecimento envia a primeira mensagem e a IA é ativada quando o cliente responde.

O remetente e o estabelecimento de destino devem ser verificados pelo backend. O cliente só pode consultar ou alterar agendamentos vinculados ao seu próprio número e ao estabelecimento correto.

## 2. Conduta obrigatória da IA

A IA deve dizer o mínimo necessário e permanecer no assunto central: agendamentos com o estabelecimento. O tom é cortês, profissional e gentil, mas inflexível diante de tentativas de sair do escopo. Ela pode consultar catálogo, preços, promoções, profissionais e disponibilidade; criar, consultar, remarcar, cancelar ou adicionar agendamentos; pedir confirmação antes de qualquer alteração; e encaminhar para atendimento humano quando necessário.

Resposta-padrão fora do escopo: “Posso ajudar somente com seu agendamento neste estabelecimento. Você quer agendar, consultar, remarcar ou cancelar?”

## 3. Dados indispensáveis para concluir um agendamento

Um atendimento só pode ser finalizado depois de obter e confirmar:

- nome do cliente;
- número de celular, proveniente do remetente verificado no WhatsApp;
- profissional escolhido, inclusive a opção “qualquer profissional”;
- ao menos um serviço, permitindo múltiplos serviços;
- data completa: dia, mês, ano, hora e minuto;
- confirmação explícita do resumo final.

Cancelar, alterar ou adicionar outro agendamento começa por uma nova conversa e reaplica as mesmas regras de identidade, escopo e confirmação.

## 4. Atendimento sem celular e encaixe presencial

Se o cliente não quiser ou não puder usar celular, o estabelecimento pode criar o agendamento manualmente apenas com o nome e marcar a origem **sem celular**. Esse registro inicia uma sequência própria de coleta complementar e permite medir a taxa de pessoas que agendam sem telefone, sem impedir o atendimento.

Para quem chega presencialmente e aguarda o próximo profissional disponível, a equipe deve:

- pedir autorização para cadastrar, quando for a primeira visita; ou
- localizar o cadastro pelo nome completo ou final do telefone, quando já for cliente;
- registrar o atendimento, profissional, serviços e valores para manter faturamento, frequência e preferências atualizados;
- registrar separadamente o consentimento para mensagens de retorno.

Mensagens programadas de retorno só podem ser disparadas quando o cliente tiver concordado com esse contato. O consentimento deve ser comprovável e revogável.

## 5. Configuração do estabelecimento

O responsável informa e mantém:

- colaboradores, quantidade, nomes e serviços que cada um pode realizar;
- dias e horários disponíveis por colaborador;
- lista de serviços, preços e duração;
- horários de funcionamento;
- promoções vigentes;
- observações gerais opcionais.

A disponibilidade apresentada ao cliente deve ser calculada a partir desses dados reais e dos agendamentos já existentes.

## 6. Migração de ferramenta anterior

Quando já existir outro software de agendamento, a implantação deve solicitar exportação ou relatório de todo o período disponível, contendo, quando existirem:

- cadastros e contatos de clientes;
- colaboradores e suas especialidades;
- serviços, preços e durações;
- atendimentos realizados, futuros, cancelados e remarcados;
- horários de funcionamento, bloqueios e indisponibilidades;
- consentimentos e preferências de contato que possam ser comprovados.

Antes da virada, a Ogritech deve validar integridade, duplicidades, vínculo entre registros, datas, fusos, status e quantidade total. Agendamentos futuros precisam ser conciliados para que nenhum cliente deixe de ser atendido durante a transição.

Como pesquisa comercial opcional, registrar: nome do software anterior, valor pago, como o estabelecimento o conheceu, pontos a melhorar e disposição para experimentar uma nova solução. Essas respostas não são requisito para a migração nem para o atendimento.

## 7. Jornada comercial no site da Ogritech

A jornada do interessado começa ao usar um botão de WhatsApp, e-mail, solicitação de ligação ou ao contatar diretamente o WhatsApp oficial da Ogritech. Solicitações vindas do site devem gerar um lead com canal preferido e notificar o WhatsApp oficial configurado exclusivamente como segredo de backend. O número nunca deve ser enviado ao navegador, incluído no código público ou exibido no site.

As páginas públicas de aquisição exibem um avatar flutuante, com fundo transparente, que acompanha a rolagem e oferece ajuda. O assistente comercial responde apenas sobre aquisição, implantação e uso da Ogritech Agenda. De forma breve e educada, pode apresentar:

- valores e planos, sem inventar preço não configurado;
- disponibilidade do período gratuito de teste;
- benefícios do produto;
- formas de pagamento;
- cancelamento sem taxa;
- solicitação de retorno por telefone, WhatsApp ou e-mail para contato@ogritech.com.br.

## 8. Requisitos de dados e métricas

Além dos registros operacionais, a solução deve permitir apurar origem do agendamento (WhatsApp, equipe, presencial/encaixe ou sem celular), taxa de clientes sem celular, comparecimento, cancelamento, recorrência, frequência, faturamento por serviço/profissional e adesão ou revogação de mensagens de retorno.

## 9. Pendências de configuração

- ativação do provedor de notificações para o WhatsApp oficial já definido em segredo local;
- valores e composição final dos planos;
- duração e regras do período gratuito;
- formas de pagamento habilitadas;
- política de antecedência, tolerância e cancelamento de cada estabelecimento;
- provedor e homologação da integração oficial do WhatsApp.

Nenhuma pendência autoriza o produto ou a IA a inventar informações.
