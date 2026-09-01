# Checklist de lançamento

Use este documento como evidência de aprovação. Não marque uma etapa somente por
ter executado o comando: registre o projeto, a data, o responsável e o resultado.

## Concluído no repositório

- [x] Testes estáticos e de segurança executáveis com `npm run validate`.
- [x] CI executa validação JavaScript e banco limpo.
- [x] Supabase CLI fixado em `2.115.0` no CI.
- [x] Node.js mínimo atualizado para 22.
- [x] Migração de reparo geral para negócios sem unidade operacional.
- [x] `EXECUTE` implícito removido das funções privilegiadas.
- [x] Permissões do Data API autenticado declaradas explicitamente e protegidas por RLS.
- [x] Testes pgTAP cobrem estrutura, RLS, permissões de funções e Data API.

## Staging — bloqueia produção

- [x] Executar homologação interna integral com duas empresas e dados sintéticos,
  incluindo limpeza comprovada. Evidência:
  `docs/evidencias/homologacao-interna-staging-2026-08-31.md`.
- [x] Criar projeto Supabase de staging sem dados reais. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Configurar Site URL e redirects de staging. Evidência: `docs/evidencias/staging-2026-08-26.md`, complemento de 2026-08-27.
- [x] Aplicar todas as migrations em banco vazio. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Executar `supabase test db` e salvar o log da execução. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Executar Security Advisor e Performance Advisor sem alertas críticos. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Publicar `platform-users` com `ALLOWED_ORIGINS` exato. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Validar owner, admin, employee, client e platform admin. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Validar duas empresas distintas e provar ausência de acesso cruzado. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Validar convite, recuperação de senha, bloqueio e reativação. Convite entregue pelo SMTP Zoho e aceito por `contato@ogritech.com.br`; confirmação e primeiro login verificados no Auth. Evidência: `docs/evidencias/staging-2026-08-26.md`, complemento de 2026-08-27.
- [x] Validar criação simultânea do mesmo horário; somente uma deve vencer. Evidência: `docs/evidencias/staging-2026-08-26.md`.
- [x] Validar cobrança, pagamento, estorno e trilha de auditoria. Evidência: `docs/evidencias/staging-2026-08-26.md`.

## Produção — infraestrutura

- [x] Configurar `https://ogritech.com.br` como Site URL do Auth. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Autorizar somente redirects HTTPS utilizados pela aplicação. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Configurar SMTP próprio e testar entrega, SPF, DKIM e DMARC. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Habilitar confirmação de e-mail e revisar validade de OTP. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Exigir MFA para administradores da organização e da plataforma. Conta proprietária protegida com dois fatores TOTP independentes; enforcement organizacional indisponível no plano Free. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Habilitar SSL Enforcement e revisar Network Restrictions. SSL habilitado; restrição de rede mantida aberta para o piloto por ausência de IP administrativo fixo. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Publicar a Edge Function usando segredos do ambiente Supabase. Evidência: `docs/evidencias/producao-2026-08-29.md`.
- [x] Restabelecer e confirmar no domínio público CSP por cabeçalho,
  `X-Frame-Options` ou `frame-ancestors`, `Referrer-Policy` e
  `Permissions-Policy`. A auditoria de 01/09/2026 confirmou HSTS e `nosniff`,
  e detectou regressão nos demais cabeçalhos. A regra Cloudflare foi implantada
  e a repetição da auditoria aprovou todos os controles. Evidência:
  `docs/evidencias/auditoria-publica-2026-09-01.md`.
- [x] Configurar alertas para 5xx, 429, falhas de Auth e latência p95.
  Evidência: `docs/evidencias/monitoramento-producao-2026-08-31.md`.
- [x] Definir backup, retenção, RPO e RTO. Metas do piloto: RPO de 24 horas,
  RTO de 4 horas úteis e retenção-alvo de sete cópias diárias. A implantação e
  o ensaio continuam bloqueadores. Plano: `docs/PLANO_CONTINUIDADE_PILOTO.md`.
- [x] Executar o primeiro backup lógico criptografado de produção. Evidência:
  `docs/evidencias/backup-producao-2026-08-30.md`.
- [x] Restaurar um backup em projeto isolado e registrar o resultado. Evidência:
  `docs/evidencias/restauracao-backup-producao-2026-08-30.md`.

## Operação, jurídico e atendimento

- [ ] Preencher razão social, CNPJ, endereço e representantes nos contratos.
- [ ] Obter revisão jurídica dos Termos, Privacidade e acordo operador-controlador.
- [ ] Provisionar e testar `contato@`, `suporte@`, `financeiro@` e `privacidade@ogritech.com.br`.
- [ ] Definir responsável e escala para incidentes e pedidos LGPD.
- [x] Definir SLA interno de suporte e procedimento de escalonamento para o
  piloto. A ativação depende de responsáveis e canais testados; não constitui
  garantia comercial. Documento: `docs/SLA_SUPORTE_ESCALONAMENTO.md`.
- [ ] Escolher emissão fiscal e, se necessário, gateway de pagamentos.

## Aprovação do go-live

- Projeto Supabase:
- Commit implantado:
- Data e hora:
- Responsável técnico:
- Responsável de negócio:
- Backup/restauração testados em: 2026-08-30, execução `33339937024`.
- Resultado do smoke test: aprovado, 72 testes operacionais.
- Decisão: `APROVADO` / `REPROVADO`
