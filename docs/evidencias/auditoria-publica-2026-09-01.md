# Evidência — auditoria pública automatizada

Data: 01/09/2026  
Alvo: `https://ogritech.com.br`  
Resultado: **NÃO APROVADO PARA GO-LIVE**

## Aprovado

- MX aponta para Zoho.
- SPF contém `include:zohomail.com`.
- DMARC está publicado com alinhamento estrito e política de monitoramento.
- DKIM `zmail` está publicado.
- Nove rotas públicas responderam e apresentaram título, H1, idioma, viewport e elemento principal.
- HSTS está presente com `max-age=15552000`.
- `X-Content-Type-Options: nosniff` está presente.
- Jornada sintética separada aprovou criação, rejeição de duplicidade, consentimento, honeypot, consulta por token, isolamento, cancelamento e concorrência.

## Reprovado ou limitado

- CSP é entregue por `<meta>`, não por cabeçalho HTTP.
- `X-Frame-Options` não foi entregue.
- `frame-ancestors` em CSP via `<meta>` não fornece a proteção HTTP necessária contra enquadramento.
- `Referrer-Policy` não foi entregue como cabeçalho.
- `Permissions-Policy` não foi entregue como cabeçalho.
- Registros DNS não comprovam que as quatro caixas postais existem, recebem e respondem; esse teste permanece humano/autenticado.

## Decisão

Manter produção comercial bloqueada. Corrigir as regras de resposta no Cloudflare ou migrar a entrega para um host que processe `_headers`. Depois, repetir `npm run audit:public` e anexar nova evidência. Não considerar a presença das diretivas no arquivo local `_headers` como prova de entrega pelo domínio.
