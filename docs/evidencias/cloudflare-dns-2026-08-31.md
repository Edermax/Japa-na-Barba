# Evidência — Cloudflare, DNS e HTTPS de produção

- Data: 2026-08-31
- Domínio: `ogritech.com.br`
- CDN e DNS autoritativo: Cloudflare, plano Free

## Delegação e zona DNS

- Nameservers publicados e propagados: `pam.ns.cloudflare.com` e
  `yichun.ns.cloudflare.com`.
- Zona Cloudflare ativa com 12 registros.
- Quatro registros A do apex e o CNAME `www` para GitHub Pages estão com proxy
  Cloudflare ativo.
- Os três MX do Zoho foram preservados como DNS only, com prioridades 10, 20 e
  50.
- SPF publicado com `include:zohomail.com`.
- DKIM publicado em `zmail._domainkey`.
- DMARC publicado em `_dmarc` com `p=none`, alinhamento estrito e relatório para
  `adm@ogritech.com.br`.

## TLS e cabeçalhos

- Certificado Universal SSL ativo para `ogritech.com.br` e
  `*.ogritech.com.br`.
- Modo SSL/TLS: Full (Strict).
- `Always Use HTTPS` ativo; HTTP respondeu 301 para a URL HTTPS.
- TLS mínimo definido como 1.2 e TLS 1.3 ativo.
- Automatic HTTPS Rewrites ativo.
- HSTS ativo com `max-age=15552000` (seis meses), sem `includeSubDomains` e sem
  preload.
- `X-Content-Type-Options: nosniff` ativo.

## Verificação externa

- `https://ogritech.com.br/` respondeu HTTP 200 através da Cloudflare.
- `https://ogritech.com.br/agendar/` respondeu HTTP 200 através da Cloudflare.
- As duas respostas HTTPS apresentaram
  `Strict-Transport-Security: max-age=15552000` e
  `X-Content-Type-Options: nosniff`.
- A preservação dos MX, SPF, DKIM e DMARC foi confirmada na zona Cloudflare; MX,
  SPF e DMARC também foram consultados externamente no resolvedor `1.1.1.1`.

## Decisão conservadora

`includeSubDomains` e preload permaneceram desativados para evitar bloquear
subdomínios atuais ou futuros antes de uma auditoria completa de HTTPS em todos
eles. A CSP continua sendo aplicada pela própria aplicação, pois o GitHub Pages
não interpreta arquivos `_headers`.
