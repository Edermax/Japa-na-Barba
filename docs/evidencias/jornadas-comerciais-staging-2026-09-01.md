# Evidência — jornadas comerciais públicas no staging

- Data: 2026-09-01
- Ambiente: Supabase staging `fuesdztsvrkkgnbqhcxi`
- Empresa: fixture sintética `bot-commercial-20260901`
- Produção: não acessada nem ativada

## Cobertura ponta a ponta

- Carregamento da página comercial publicada e catálogo de serviços.
- Captação de lead com consentimento.
- Solicitação pública de orçamento.
- Consulta autenticada por referência e token de proposta enviada.
- Aceite público da proposta e atualização transacional do status.
- Carregamento do cardápio, categorias, item e preço.
- Criação de pedido com preço calculado no servidor.
- Acompanhamento do pedido por referência e token secreto.
- Recusa de lead sem consentimento.
- Recusa de pedido com honeypot preenchido.

## Resultado

Todos os nove contratos públicos foram aprovados pelo bot usando exclusivamente
a chave publicável de staging. As tabelas continuaram inacessíveis diretamente
ao papel anônimo; as mutações ocorreram somente pelas RPCs limitadas.

## Limpeza

Após o ensaio foram removidos, pelo UUID exato da empresa sintética, históricos,
itens, propostas, orçamentos, leads, pedidos, cardápio, página, serviço e a própria
empresa. A consulta final confirmou zero empresas com o slug da fixture.

## Decisão

**Jornadas comerciais aprovadas tecnicamente em staging.** Esta evidência não
autoriza publicação comercial em produção nem substitui decisões de atendimento,
retenção, preço, cobrança, fiscal e jurídico.
