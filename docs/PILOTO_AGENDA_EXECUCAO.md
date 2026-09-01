# Piloto operacional da agenda — Ogritech

Status em 01/09/2026: **preparação técnica concluída; empresa piloto real pendente de definição**.

> Importante: `Japa na Barba` é uma empresa demonstrativa. Ela pode ser usada em homologação, mas não deve ser considerada o piloto comercial real.

## Simulação automatizada antes do piloto real

Enquanto não houver uma empresa real, execute `npm run test:agenda-bot`. O bot opera somente no projeto de staging e interrompe a execução se a URL configurada não for exatamente a de staging. Ele usa a massa sintética `Ogritech Agenda Bot` e valida página pública, disponibilidade, criação, rejeição de dupla reserva sequencial e simultânea, consentimento obrigatório, honeypot, isolamento por token, consulta e cancelamento. Cada reserva recebe nome e e-mail sintéticos únicos e termina cancelada para liberar o horário.

O bot valida o funcionamento técnico, mas não substitui a validação humana de usabilidade, comunicação com clientes, rotina da equipe e aderência às regras de um negócio real.

Para simular uma jornada operacional com vários clientes, execute `npm run test:agenda-pilot-day`. O cenário cria seis reservas em horários diferentes, consulta cada uma com seu token, comprova que o token de um cliente não acessa a reserva de outro, mede a latência das chamadas e cancela todas as reservas em uma etapa de limpeza obrigatória. Essa execução representa um ensaio assistido, não uma aprovação para produção.

### Evidência do ensaio assistido — 01/09/2026

O primeiro dia operacional sintético foi aprovado no staging: seis clientes independentes geraram seis reservas em horários distintos; todas foram consultadas com seus próprios tokens; o cruzamento entre token e referência de clientes diferentes não retornou dados; e as seis reservas foram canceladas pela limpeza automática. Foram medidas 21 chamadas, com p95 de 1.122 ms. Nenhuma reserva ativa foi intencionalmente mantida pelo ensaio.

### Ciclo sintético de 14 dias

Enquanto não existir uma empresa-piloto real, o workflow `pilot-agenda-synthetic.yml` executa diariamente, de 01 a 14/09/2026, o ensaio com seis clientes no staging. Cada dia gera um relatório JSON arquivado por 30 dias. Uma falha abre ou atualiza um único issue com a label `synthetic-agenda-pilot`; a primeira execução saudável posterior registra a recuperação e encerra o incidente. Fora da janela, a execução agendada permanece inerte; execuções manuais continuam disponíveis para diagnóstico.

Cada execução saudável também atualiza o issue único `Diário operacional da agenda — 14 dias`, com a label `synthetic-agenda-pilot-log`. O diário registra reservas criadas e canceladas, isolamento, limpeza, quantidade de requisições, p95 e link para a evidência. No último dia da janela ele registra o encerramento do ciclo e fecha o diário para a avaliação técnica.

Este ciclo comprova estabilidade técnica repetida, mas não libera produção nem substitui validação humana. A decisão final continua bloqueada até existir beta fechado com pessoas reais, mesmo que sejam apenas o responsável pela Ogritech e dois ou três convidados.

### Gate único e monitoramento funcional

Execute `npm run validate:agenda-pilot` para rodar as verificações estáticas, testes automatizados e a jornada pública real no staging. O comando falha se qualquer contrato local quebrar ou se a agenda não conseguir criar, proteger, consultar, cancelar e limpar suas reservas sintéticas.

O workflow `monitor-agenda-staging.yml` executa esse gate a cada seis horas e também pode ser iniciado manualmente. Em falha, mantém um único issue aberto com a label `staging-agenda-monitor`; quando a jornada normaliza, registra a recuperação e encerra o incidente. Ele é independente do monitor de telemetria de produção e está travado no projeto de staging pelo próprio bot.

### Evidência da operação interna — 01/09/2026

A simulação transacional de gestor e funcionário no staging foi aprovada nos seguintes cenários:

- Gestor cria, confirma e conclui um agendamento.
- Gestor confirma e marca um não comparecimento.
- Gestor cancela um agendamento.
- Gestor agenda para outro profissional da empresa.
- Funcionário não visualiza a agenda de outro profissional.
- Funcionário não cria agendamento para outro profissional.
- Funcionário cria e confirma um agendamento da própria agenda.

As duas identidades administrativas existentes foram usadas apenas como sujeitos temporários da política RLS, sem alteração de senha. Seus perfis e privilégios foram restaurados antes do commit. A massa interna e o segundo profissional sintético foram removidos; a verificação final retornou zero reservas internas remanescentes.

### Evidência de autenticação real — 01/09/2026

Uma conta descartável foi cadastrada no Auth público do staging com senha aleatória mantida apenas na memória do processo. Foram aprovados: exigência de confirmação de e-mail, confirmação administrativa da fixture, login real por senha, emissão de JWT, acesso autenticado à RPC protegida `list_services_catalog` e logout global. Ao final, sessões, perfil e usuário foram removidos e a verificação retornou ausência dos três registros.

O teste comprova o contrato técnico de Auth e autorização. A experiência visual do formulário e o redirecionamento no navegador ainda devem integrar a futura validação humana de usabilidade.

### Evidência visual no navegador — 01/09/2026

O fluxo visual foi aprovado em sessão isolada do Microsoft Edge: a página `login.html?env=staging` exibiu formulário, links legais e selo de staging; a conta fixture autenticou; o sistema redirecionou para `/painel/?env=staging`; o painel mostrou `Ogritech Agenda Bot`, o usuário `BOT Visual Agenda` e o papel `Proprietário`; a navegação abriu a seção `Agenda` com o controle `+ Novo agendamento`; e o logout retornou para `/login/?env=staging`. Não foram observados erros ou avisos no console durante a jornada.

Como o SMTP atingiu o limite temporário de e-mails, a identidade confirmada foi criada diretamente no Auth de staging para este teste e não representa o processo de convite usado em produção. Após o logout, usuário, identidade, perfil e sessões foram removidos e tiveram ausência confirmada no banco. A sessão administrativa que já estava aberta no navegador interno foi preservada.

### Evidência visual da agenda pública móvel — 01/09/2026

A jornada pública foi aprovada no Microsoft Edge com viewport de celular (390 × 844): carregamento da empresa sintética, escolha de serviço, profissional, data e horário, preenchimento de contato sintético, consentimento, resumo, criação da reserva, tela de sucesso, referência pública e consulta pelo link de gestão. O token permaneceu no fragmento privado do link e o banco confirmou que somente seu hash foi armazenado.

O cancelamento visual também foi aprovado: a tela apresentou `Cancelado` e a mensagem de sucesso; o banco registrou status `cancelled`, `cancelled_at`, origem `public_link` e devolveu 09:00 à lista de horários disponíveis. A reserva sintética foi removida após a comprovação, a aba foi fechada e o viewport foi restaurado. Não foram observados erros ou avisos no console durante a jornada.

## Objetivo do primeiro ciclo

Colocar uma única empresa real operando a agenda por 14 dias, com escopo controlado, suporte próximo e evidências suficientes para decidir a expansão. O primeiro ciclo não inclui cardápio, propostas, financeiro avançado ou novas integrações.

## Responsáveis

| Papel | Responsabilidade | Nome |
|---|---|---|
| Dono do piloto | Aprovar regras, equipe, serviços e abertura ao público | PENDENTE |
| Operador principal | Acompanhar agenda e resolver exceções diariamente | PENDENTE |
| Suporte Ogritech | Configurar, testar, monitorar e registrar incidentes | PENDENTE |
| Substituto | Assumir a operação quando o operador estiver ausente | PENDENTE |

## Dados obrigatórios da empresa piloto

- Razão/nome público, segmento, telefone e e-mail operacional.
- Slug público definitivo, sem dados pessoais.
- Profissionais ativos e respectivos serviços.
- Serviços com nome, duração, preço e status ativo.
- Jornada semanal de cada profissional, intervalos e folgas já conhecidas.
- Antecedência mínima, horizonte máximo e regra de cancelamento.
- Texto de consentimento e links de privacidade/termos aprovados.
- Um telefone e um e-mail reais para os testes de ponta a ponta.

Nenhum link público deve ser divulgado antes de todos os itens acima estarem preenchidos e homologados.

## Caminho de ativação

### Fase 1 — Preparação (dias 1 e 2)

- [ ] Definir a empresa piloto real e os quatro responsáveis.
- [ ] Criar ou revisar a conta do gestor e validar o perfil correto.
- [ ] Cadastrar somente os serviços que entrarão no piloto.
- [ ] Cadastrar profissionais e vincular cada serviço atendido.
- [ ] Configurar expediente, disponibilidade individual, intervalos e folgas.
- [ ] Definir slug, mas manter `Agendamento público` desativado.
- [ ] Registrar os dados reais na ficha de homologação abaixo.

**Gate de saída:** o painel deve apresentar empresa, serviços e profissionais sem cadastros incompletos ou duplicados.

### Fase 2 — Homologação em staging (dias 3 e 4)

Executar e registrar as seis jornadas:

1. Gestor cria um agendamento interno e o horário deixa de aparecer como livre.
2. Cliente cria uma reserva pública com consentimento aceito.
3. Duas tentativas para o mesmo profissional e horário não geram duplicidade.
4. Gestor confirma, conclui e marca não comparecimento nos cenários de teste.
5. Cliente consulta e cancela a própria reserva usando referência e token.
6. Funcionário visualiza apenas a operação permitida pelo seu perfil.

Também validar:

- [ ] Limites de abertura e fechamento.
- [ ] Duração real de cada serviço.
- [ ] Intervalos, folgas e indisponibilidades.
- [ ] Celular Android e iPhone, além de computador.
- [ ] Mensagens de erro compreensíveis e ausência de dados sensíveis em tela/log.
- [ ] `npm run validate` e `npm run check:agenda` aprovados.

**Gate de saída:** seis jornadas aprovadas, zero conflito de horário e nenhuma falha crítica aberta.

### Fase 3 — Ativação controlada (dias 5 e 6)

- [ ] Repetir em produção uma reserva sintética identificada como teste.
- [ ] Cancelar/remover o dado sintético conforme a política definida.
- [ ] Confirmar que a agenda interna recebeu a reserva.
- [ ] Confirmar plano de contingência: contato manual e bloqueio do link público.
- [ ] Ativar `Agendamento público` somente após aprovação do dono do piloto.
- [ ] Divulgar primeiro para um grupo pequeno de clientes.

**Rollback:** diante de conflito de horário, exposição indevida de dados ou indisponibilidade persistente, desativar `Agendamento público`, preservar os registros para diagnóstico e operar por contato manual até nova homologação.

### Fase 4 — Operação assistida (dias 7 a 14)

Rotina diária do operador:

- [ ] Conferir agenda na abertura e antes de encerrar o dia.
- [ ] Tratar pendências de confirmação e cancelamento.
- [ ] Registrar incidente, causa aparente, impacto e solução adotada.
- [ ] Conferir se novos serviços/profissionais têm disponibilidade válida.
- [ ] Informar ao suporte qualquer divergência sem corrigir diretamente no banco.

Rotina diária do suporte:

- [ ] Verificar disponibilidade da rota pública e erros reportados.
- [ ] Conferir duplicidades, sobreposições e reservas rejeitadas.
- [ ] Classificar incidentes em crítico, alto, médio ou baixo.
- [ ] Registrar mudança realizada, responsável e evidência de validação.

## Indicadores do piloto

| Indicador | Meta inicial | Regra de decisão |
|---|---:|---|
| Conflitos/dupla reserva | 0 | Qualquer ocorrência bloqueia expansão |
| Reservas concluídas tecnicamente | >= 98% | Abaixo da meta exige correção e novo ciclo |
| Incidentes críticos | 0 | Qualquer ocorrência desativa o fluxo público |
| Tempo de resposta a incidente alto | <= 2 horas úteis | Acima da meta exige reforço operacional |
| Adoção pelo operador | 100% dos dias | Falhas indicam necessidade de treinamento |

## Ficha de homologação

| Campo | Registro |
|---|---|
| Empresa piloto real | PENDENTE |
| Slug | PENDENTE |
| Gestor responsável | PENDENTE |
| Operador principal | PENDENTE |
| Data da homologação | PENDENTE |
| Evidências das seis jornadas | PENDENTE |
| Incidentes abertos | PENDENTE |
| Aprovação para produção | PENDENTE |
| Data de abertura ao público | PENDENTE |

## Itens pós-piloto, sem bloquear o início

- Configurar no provedor de hospedagem os mesmos cabeçalhos presentes em `_headers`, pois eles não estão sendo entregues pelo host atual.
- Habilitar proteção contra senhas comprometidas no Supabase Auth.
- Otimizar políticas RLS apontadas pelos advisors, sempre primeiro em staging.
- Tratar índices sem uso somente após observar carga real; não removê-los com base apenas no ambiente demonstrativo.
- Modularizar gradualmente `script.js` e `style.css`, sem reescrever a aplicação durante o piloto.
