-- B.O.T.D. Supabase security-advisor hardening.
-- Validated first in staging on 2026-11-04.
-- Preserve trigger/event-trigger behavior while removing client RPC access.

revoke execute on function public.handle_new_auth_user()
  from public, anon, authenticated;
grant execute on function public.handle_new_auth_user()
  to service_role;

revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated;
grant execute on function public.rls_auto_enable()
  to service_role;

drop policy if exists "Backend only - deny direct client access"
  on public.processed_webhook_events;

create policy "Backend only - deny direct client access"
on public.processed_webhook_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
