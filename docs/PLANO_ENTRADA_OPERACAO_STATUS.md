# Plano de entrada em operação — estado consolidado

Atualizado em: 01/09/2026  
Escopo: entrada controlada da Agenda Ogritech, sem liberar automaticamente os demais produtos.

## Leitura executiva

A base técnica, o staging, a infraestrutura de produção, backup, restauração e monitoramento estão preparados. A Agenda permanece em pré-operação porque o ciclo sintético de 14 dias e o beta fechado ainda não terminaram. Esse acompanhamento ocorre diariamente de forma automática e não impede o avanço das pendências operacionais, jurídicas e comerciais.

## Concluído

| Frente | Evidência | Estado |
|---|---|---|
| Base reproduzível, migrations e CI | `CRONOGRAMA_AGENDA_PRODUCAO.md` e workflows do repositório | CONCLUÍDO |
| Disponibilidade e proteção contra conflito | testes de agenda e homologação de staging | CONCLUÍDO |
| Agendamento público seguro | `/agendar/?empresa=...`, RPCs públicas e testes | CONCLUÍDO EM STAGING |
| Operação transacional e auditável | máquina de estados, eventos e fila de notificações | CONCLUÍDO EM STAGING |
| Homologação interna com dados sintéticos | `evidencias/homologacao-interna-staging-2026-08-31.md` | CONCLUÍDO |
| Infraestrutura de produção | HTTPS, DNS, Auth, SMTP e Edge Function preparados; cabeçalhos públicos reabertos pela auditoria de 01/09 | PARCIAL — CORREÇÃO DE CDN PENDENTE |
| Backup e restauração | `PLANO_CONTINUIDADE_PILOTO.md` e evidências datadas | CONCLUÍDO PARA O PILOTO |
| Monitoramento técnico | monitor de produção e monitores sintéticos de staging | CONCLUÍDO |
| SLA interno e escalonamento | `SLA_SUPORTE_ESCALONAMENTO.md` | DEFINIDO PARA O PILOTO |

## Em acompanhamento automático

| Frente | Estado | Liberação |
|---|---|---|
| Ciclo sintético da agenda | Execução diária de 01 a 14/09/2026 | Exige 14 datas únicas aprovadas e nenhum incidente aberto |
| Interface pública publicada | Verificação diária antes da simulação de reservas | Falha bloqueia o dia e abre incidente |
| Beta fechado | Preparado na issue #8 | Só inicia após aprovação técnica do ciclo e autorização dos convites |

Essas rotinas devem continuar em paralelo. Não é necessário interromper as outras frentes para aguardar cada execução diária.

## Pendente — exige decisão ou ação humana

| Prioridade | Pendência | Dependência para concluir |
|---|---|---|
| P0 | Nomear dono do piloto, operador principal, suporte e substituto | Nomes e disponibilidade reais |
| P0 | Definir três participantes do beta fechado | Apelidos/iniciais e autorização privada para contato |
| P0 | Provisionar e testar `contato@`, `suporte@`, `financeiro@` e `privacidade@ogritech.com.br` | Acesso administrativo ao provedor de e-mail |
| P0 | Restabelecer cabeçalhos de segurança no domínio público | Acesso administrativo ao Cloudflare/host |
| P0 | Preencher dados societários nos contratos | Razão social, CNPJ, endereço e representantes |
| P0 | Revisar Termos, Privacidade e acordo controlador-operador | Profissional jurídico responsável |
| P1 | Definir responsável por incidentes e pedidos LGPD | Nomeação e escala de cobertura |
| P1 | Escolher emissão fiscal e necessidade de gateway | Decisão contábil/comercial |
| P1 | Definir preço, cobrança e política comercial do piloto | Responsável de negócio |

## Sequência de avanço fora da agenda automática

1. Nomear os quatro papéis operacionais e a janela real de atendimento.
2. Provisionar e testar os quatro canais de e-mail.
3. Preencher os documentos com os dados societários.
4. Encaminhar o pacote jurídico para revisão externa.
5. Fechar decisão fiscal, cobrança e política comercial.
6. Após o ciclo técnico, executar o beta fechado com três pessoas.
7. Registrar responsáveis, commit, data e decisão no gate de go-live.

## Regra de liberação

Nenhuma conclusão técnica isolada libera produção. O go-live exige simultaneamente: ciclo sintético aprovado, beta fechado aprovado, papéis operacionais preenchidos, canais oficiais testados, pacote jurídico revisado, backup/restauração válidos e decisão conjunta dos responsáveis técnico e de negócio.
