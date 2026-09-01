-- Defesa em profundidade: mesmo que uma permissão seja concedida por engano,
-- nenhuma função de usuário pode acessar diretamente a trilha antiabuso.
create policy "Deny direct platform contact attempt access"
on private.platform_contact_attempts
for all to public
using (false)
with check (false);
