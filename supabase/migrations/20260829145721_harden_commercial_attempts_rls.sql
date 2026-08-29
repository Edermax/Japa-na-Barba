create policy "Deny direct commercial attempt access"
on private.public_commercial_attempts
as restrictive
for all
to public
using (false)
with check (false);
