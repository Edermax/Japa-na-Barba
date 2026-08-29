-- O event trigger protege novas tabelas, mas sua funcao nao e uma RPC da
-- aplicacao. Em projetos legados onde ela existe, remova qualquer caminho de
-- execucao pelo Data API sem alterar o event trigger que a referencia.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;
