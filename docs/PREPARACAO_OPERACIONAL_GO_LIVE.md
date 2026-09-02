# Preparação operacional antecipada — Agenda Ogritech

Este pacote deixa o lançamento preenchível e auditável sem inventar nomes, dados societários ou decisões comerciais. A fonte de verdade é `config/operational-readiness.json`.

## Matriz de papéis

| Papel | Responsabilidade | Cobertura proposta | Titular | Substituto |
|---|---|---|---|---|
| Dono do piloto | Autorizar regras, escopo e interrupção | Dias úteis, 09h–18h BRT | `[PREENCHER]` | `[PREENCHER]` |
| Operador principal | Abrir agenda, conferir reservas e executar rotina diária | Dias úteis, 09h–18h BRT | `[PREENCHER]` | `[PREENCHER]` |
| Suporte técnico | Tratar falhas, preservar evidências e coordenar recuperação | S1 imediato; demais conforme SLA | `[PREENCHER]` | `[PREENCHER]` |
| Privacidade/LGPD | Triar direitos de titulares e incidentes de dados | Dias úteis, 09h–18h BRT | `[PREENCHER]` | `[PREENCHER]` |
| Financeiro | Cobrança, conciliação e documentos fiscais | Dias úteis, 09h–18h BRT | `[PREENCHER]` | `[PREENCHER]` |

## Sequência de preenchimento

1. Informar titulares e substitutos usando apenas o arquivo privado de operação; não publicar telefones pessoais no repositório.
2. Criar ou confirmar os quatro canais oficiais e testar envio, recebimento e resposta.
3. Entregar ao jurídico o checklist e as minutas existentes.
4. Selecionar um cenário na planilha de preços e registrar método de cobrança e emissão fiscal.
5. Marcar as seis aprovações do gate; publicação exige responsáveis técnico e de negócio.
6. Ativar a proteção contra senhas vazadas somente como última ação, conforme decisão registrada.

## Critério de segurança

O script `npm run check:operations` pode ser executado a qualquer momento. Por padrão ele relata bloqueios sem falhar o CI; no go-live, `REQUIRE_OPERATIONAL_APPROVAL=true` transforma qualquer pendência em falha.
