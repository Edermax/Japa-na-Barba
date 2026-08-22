# Operação de produção

## Sequência de publicação

1. Criar um projeto Supabase de staging sem dados.
2. Executar `supabase db reset` e `supabase test db` localmente.
3. Vincular o CLI ao staging e aplicar migrations.
   Como `202608180001_create_core_schema.sql` foi adicionada para tornar instalações limpas reproduzíveis, um projeto que já possua migrations posteriores pode exigir `supabase db push --include-all`; use essa opção somente em staging primeiro.
4. Configurar `ALLOWED_ORIGINS` com os domínios exatos, separados por vírgula.
5. Publicar `platform-users` e validar convite, bloqueio, reativação e arquivamento.
6. Validar owner, admin, employee, client e platform admin em empresas distintas.
7. Fazer backup do banco de produção e registrar o ponto de restauração.
8. Aplicar migrations em produção e fazer smoke test sem dados reais.

## Segurança

- Nunca versionar `service_role`, senha do banco ou token pessoal.
- Promover masters apenas pelo script administrativo, depois de validar identidade e MFA.
- Configurar CSP, HSTS, `nosniff`, política de referência, permissões e bloqueio de frames no host/CDN.
- Revisar mensalmente `platform_admins` e `platform_admin_events`.
- Rotacionar chaves após suspeita de exposição e revogar sessões afetadas.

## Backup e restauração

- Backup diário com retenção compatível com o plano contratado.
- Teste trimestral de restauração em projeto isolado.
- Registrar RPO, RTO, responsável, início, fim e resultado de cada teste.
- Não considerar backup válido sem teste de restauração.

## Monitoramento

- Alertar para erros 5xx/429 da Edge Function, falhas de convite e conflitos anormais de agenda.
- Acompanhar latência p95 da API, erros de autenticação e volume de eventos administrativos.
- Manter logs sem conteúdo de observações, tokens, senhas ou dados pessoais desnecessários.

## LGPD e retenção

- Arquivamento não equivale a eliminação imediata: respeitar retenção, obrigação legal e legal hold.
- Revisar solicitações abertas diariamente e seus prazos.
- Executar eliminação definitiva somente por procedimento aprovado, auditado e com alvo exato.
- Provisionar e testar `privacidade@ogritech.com.br` antes do lançamento.

## Rollback

- Preferir migrations aditivas e compatíveis com a versão anterior do frontend.
- Em falha, restaurar a versão anterior do frontend e pausar novas gravações se houver incompatibilidade.
- Não reverter migration destrutivamente; criar migration corretiva e restaurar backup quando necessário.
