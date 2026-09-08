begin;

-- This Supabase project is staging-only. Refuse live Stripe records at the
-- database layer in addition to the Worker runtime safety checks.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_staging_only'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_staging_only check (livemode = false);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'webhook_events_staging_only'
      and conrelid = 'public.processed_webhook_events'::regclass
  ) then
    alter table public.processed_webhook_events
      add constraint webhook_events_staging_only check (livemode = false);
  end if;
end
$$;

commit;
