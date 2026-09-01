# Evidência — auditoria pública automatizada

Data: 01/09/2026  
Alvo: `https://ogritech.com.br`  
Resultado inicial: **NÃO APROVADO PARA GO-LIVE**

Resultado após correção: **APROVADO NA AUDITORIA PÚBLICA**

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

O bloqueio técnico foi mantido até a correção. Não considerar a presença das diretivas no arquivo local `_headers` como prova de entrega pelo domínio.

## Correção e nova verificação

Em 01/09/2026 foi criada no Cloudflare a regra ativa **Ogritech security response headers**, aplicável às respostas públicas da zona. Ela define estaticamente:

- `Content-Security-Policy`, incluindo `frame-ancestors 'none'`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.

O comando `npm run audit:public` foi repetido contra o tráfego real. Os quatro cabeçalhos foram recebidos por HTTP, HSTS e `nosniff` permaneceram presentes, as nove rotas foram aprovadas e o resultado foi `APROVADO`, sem falhas ou ressalvas. A produção comercial continua dependendo dos demais gates de operação; esta aprovação resolve somente o bloqueio de cabeçalhos.
