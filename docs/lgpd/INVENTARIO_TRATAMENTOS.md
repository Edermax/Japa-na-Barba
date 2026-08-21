# Inventário inicial de tratamentos

| Processo | Titulares | Dados | Finalidade | Base a validar | Compartilhamento | Retenção inicial |
|---|---|---|---|---|---|---|
| Autenticação | usuários | nome, e-mail, credenciais gerenciadas | acesso e segurança | contrato / legítimo interesse | Supabase | duração da conta + registros necessários |
| Cadastro de cliente | clientes | nome, telefone, e-mail, aniversário opcional, observações | administrar relacionamento e atendimento | contrato / procedimentos preliminares | Ogritech e Supabase | 24 meses de inatividade, configurável |
| Agendamento | clientes | identificação, serviço, profissional, data, hora, status | solicitar e executar atendimento | contrato / procedimentos preliminares | estabelecimento, Ogritech e Supabase | 60 meses, configurável |
| Auditoria | usuários e clientes | ator, registro, ação, data | segurança, prevenção a fraude e responsabilização | legítimo interesse / exercício regular de direitos | Ogritech e Supabase | 24 meses, configurável |
| Direitos do titular | solicitantes | identidade, e-mail, pedido, resposta | cumprir direitos e demonstrar atendimento | obrigação legal | controlador e Ogritech | prazo necessário à obrigação e defesa |
| Demonstração | visitantes | dados fictícios no navegador | demonstrar funcionalidades | legítimo interesse | sem envio ao Supabase | até limpeza do navegador |

## Pendências de validação

- confirmar razão social e CNPJ das partes;
- confirmar região e transferências internacionais do Supabase;
- documentar todos os suboperadores;
- validar bases legais com cada estabelecimento;
- definir retenções específicas por setor;
- impedir uso de observações para dados sensíveis;
- revisar integrações futuras antes da ativação.
