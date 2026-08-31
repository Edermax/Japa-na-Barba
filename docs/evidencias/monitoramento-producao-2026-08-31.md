# Evidência — monitoramento operacional de produção

- Data: 2026-08-31
- Workflow: `Monitor production`
- Frequência: a cada 15 minutos
- Janela consultada: 20 minutos
- Fonte: Supabase Management API, unified logs

## Sinais e limites iniciais

- Qualquer resposta 5xx.
- Cinco respostas 429 na janela.
- Cinco falhas de autenticação na janela.
- Latência p95 acima de 1.500 ms, com no mínimo 20 amostras.

Quando um limite é excedido ou a coleta falha, o workflow falha e cria ou
atualiza um único issue com a label `production-monitor`. O issue é encerrado
automaticamente após a normalização.

## Validação real

- Execução inicial autenticada: `33385092003`.
- Execução com cobertura de API: `33385647572`.
- Execução final com Auth sintético: `33385757714`.
- Foram realizadas 25 chamadas públicas somente leitura à RPC
  `public_booking_page`; todas responderam HTTP 200.
- Foi feita uma única tentativa de Auth sintética inválida, com domínio
  `example.invalid`; o endpoint respondeu HTTP 400, sem dados pessoais reais.
- Coleta final: 26 logs de borda, um log de Auth, zero 5xx, zero 429, uma falha
  sintética de Auth, 26 amostras de latência e p95 de 455,75 ms.
- A falha sintética ficou abaixo do limiar e não abriu incidente, como esperado.
- Dezesseis testes locais aprovados, incluindo limites, normalização numérica e
  amostra mínima de p95.

## Credencial e limitação residual

O token está armazenado somente como secret `SUPABASE_ACCESS_TOKEN` no ambiente
GitHub `production` e expira em 30/09/2026. O arquivo temporário e a área de
transferência foram limpos após o cadastro. No plano Free, o token pessoal é
amplo; sua rotação ou substituição por OAuth restrito é obrigatória antes da
expansão do piloto. Demais limitações e o gate preventivo estão em
`docs/LIMITACOES_SUPABASE_FREE.md`.
