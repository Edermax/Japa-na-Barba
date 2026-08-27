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

- [ ] Criar projeto Supabase de staging sem dados reais.
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

- [ ] Configurar `https://ogritech.com.br` como Site URL do Auth.
- [ ] Autorizar somente redirects HTTPS utilizados pela aplicação.
- [ ] Configurar SMTP próprio e testar entrega, SPF, DKIM e DMARC.
- [ ] Habilitar confirmação de e-mail e revisar validade de OTP.
- [ ] Exigir MFA para administradores da organização e da plataforma.
- [ ] Habilitar SSL Enforcement e revisar Network Restrictions.
- [ ] Publicar a Edge Function usando segredos do ambiente Supabase.
- [ ] Confirmar CSP, HSTS e demais cabeçalhos no host/CDN real.
- [ ] Configurar alertas para 5xx, 429, falhas de Auth e latência p95.
- [ ] Definir backup, retenção, RPO e RTO.
- [ ] Restaurar um backup em projeto isolado e registrar o resultado.

## Operação, jurídico e atendimento

- [ ] Preencher razão social, CNPJ, endereço e representantes nos contratos.
- [ ] Obter revisão jurídica dos Termos, Privacidade e acordo operador-controlador.
- [ ] Provisionar e testar `contato@`, `suporte@`, `financeiro@` e `privacidade@ogritech.com.br`.
- [ ] Definir responsável e escala para incidentes e pedidos LGPD.
- [ ] Definir SLA de suporte e procedimento de escalonamento.
- [ ] Escolher emissão fiscal e, se necessário, gateway de pagamentos.

## Aprovação do go-live

- Projeto Supabase:
- Commit implantado:
- Data e hora:
- Responsável técnico:
- Responsável de negócio:
- Backup/restauração testados em:
- Resultado do smoke test:
- Decisão: `APROVADO` / `REPROVADO`
