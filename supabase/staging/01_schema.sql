begin;

-- B.O.T.D. Hockey Playbook Studio staging billing schema
-- Copyright (c) 2026 FENRIR LLC. All rights reserved.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_price_id text not null,
  billing_interval text check (billing_interval in ('month', 'year')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_period_end timestamptz,
  last_stripe_observed_at timestamptz,
  last_stripe_event_id text,
  last_stripe_event_created bigint,
  last_invoice_id text,
  last_invoice_created bigint,
  last_invoice_state text,
  last_invoice_event_id text,
  last_invoice_event_created bigint,
  constraint subscriptions_invoice_state_valid check (
    last_invoice_state is null
    or last_invoice_state in ('failed', 'terminal', 'paid')
  ),
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  active boolean not null default false,
  expires_at timestamptz,
  source_subscription_id text
    references public.subscriptions(stripe_subscription_id)
    on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

create table if not exists public.processed_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  livemode boolean not null,
  processed_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);
create index if not exists subscriptions_customer_id_idx
  on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_status_idx
  on public.subscriptions (status);
create index if not exists entitlements_user_id_active_idx
  on public.entitlements (user_id, active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists billing_customers_set_updated_at on public.billing_customers;
create trigger billing_customers_set_updated_at
before update on public.billing_customers
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.processed_webhook_events enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.billing_customers from public, anon, authenticated;
revoke all on public.subscriptions from public, anon, authenticated;
revoke all on public.entitlements from public, anon, authenticated;
revoke all on public.processed_webhook_events from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;

grant all on public.profiles to service_role;
grant all on public.billing_customers to service_role;
grant all on public.subscriptions to service_role;
grant all on public.entitlements to service_role;
grant all on public.processed_webhook_events to service_role;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own billing customer" on public.billing_customers;
create policy "Users can view their own billing customer"
on public.billing_customers for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own subscriptions" on public.subscriptions;
create policy "Users can view their own subscriptions"
on public.subscriptions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own entitlements" on public.entitlements;
create policy "Users can view their own entitlements"
on public.entitlements for select to authenticated
using ((select auth.uid()) = user_id);


create or replace function public.apply_stripe_subscription_state(
  p_subscription_id text,
  p_user_id uuid,
  p_customer_id text,
  p_price_id text,
  p_billing_interval text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_livemode boolean,
  p_observed_at timestamptz,
  p_event_id text,
  p_event_created bigint,
  p_invoice_id text,
  p_invoice_created bigint,
  p_invoice_state text,
  p_grace_deadline timestamptz
)
returns table (
  snapshot_applied boolean,
  invoice_state_applied boolean,
  account_user_id uuid,
  effective_status text,
  effective_grace_period_end timestamptz,
  effective_invoice_state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_user_id uuid;
  v_existing_customer_id text;
  v_last_observed_at timestamptz;
  v_last_stripe_event_created bigint;
  v_existing_invoice_id text;
  v_existing_invoice_created bigint;
  v_existing_invoice_state text;
  v_existing_invoice_event_created bigint;
  v_existing_grace timestamptz;
  v_incoming_rank integer;
  v_existing_rank integer;
  v_apply_snapshot boolean := false;
  v_apply_invoice boolean := false;
  v_new_grace timestamptz;
begin
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'subscription id is required';
  end if;
  if p_user_id is null then
    raise exception 'user id is required';
  end if;
  if p_customer_id is null or btrim(p_customer_id) = '' then
    raise exception 'customer id is required';
  end if;
  if p_price_id is null or btrim(p_price_id) = '' then
    raise exception 'price id is required';
  end if;
  if p_billing_interval is not null
     and p_billing_interval not in ('month', 'year') then
    raise exception 'invalid billing interval: %', p_billing_interval;
  end if;
  if p_status is null or btrim(p_status) = '' then
    raise exception 'subscription status is required';
  end if;
  if p_livemode is true then
    raise exception 'staging refuses live subscription state';
  end if;
  if p_observed_at is null then
    raise exception 'Stripe observation time is required';
  end if;
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'event id is required';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'event creation time is required';
  end if;

  if p_invoice_state is not null then
    if p_invoice_state not in ('failed', 'terminal', 'paid') then
      raise exception 'invalid invoice state: %', p_invoice_state;
    end if;
    if p_invoice_id is null or btrim(p_invoice_id) = '' then
      raise exception 'invoice id is required when invoice state is present';
    end if;
    if p_invoice_created is null or p_invoice_created <= 0 then
      raise exception 'invoice creation time is required when invoice state is present';
    end if;
    if p_invoice_state = 'failed' and p_grace_deadline is null then
      raise exception 'failed invoice state requires a grace deadline';
    end if;
  end if;

  insert into public.subscriptions (
    stripe_subscription_id,
    user_id,
    stripe_customer_id,
    stripe_price_id,
    billing_interval,
    status,
    current_period_end,
    cancel_at_period_end,
    livemode
  )
  values (
    p_subscription_id,
    p_user_id,
    p_customer_id,
    p_price_id,
    p_billing_interval,
    p_status,
    p_current_period_end,
    coalesce(p_cancel_at_period_end, false),
    false
  )
  on conflict (stripe_subscription_id) do nothing;

  select
    s.user_id,
    s.stripe_customer_id,
    s.last_stripe_observed_at,
    s.last_stripe_event_created,
    s.last_invoice_id,
    s.last_invoice_created,
    s.last_invoice_state,
    s.last_invoice_event_created,
    s.grace_period_end
  into
    v_existing_user_id,
    v_existing_customer_id,
    v_last_observed_at,
    v_last_stripe_event_created,
    v_existing_invoice_id,
    v_existing_invoice_created,
    v_existing_invoice_state,
    v_existing_invoice_event_created,
    v_existing_grace
  from public.subscriptions as s
  where s.stripe_subscription_id = p_subscription_id
  for update;

  if not found then
    raise exception 'subscription not found after insert: %', p_subscription_id;
  end if;
  if v_existing_user_id is distinct from p_user_id then
    raise exception 'subscription user mapping mismatch for %', p_subscription_id;
  end if;
  if v_existing_customer_id is distinct from p_customer_id then
    raise exception 'subscription customer mapping mismatch for %', p_subscription_id;
  end if;

  v_apply_snapshot :=
    v_last_observed_at is null
    or p_observed_at > v_last_observed_at
    or (
      p_observed_at = v_last_observed_at
      and p_event_created >= coalesce(v_last_stripe_event_created, 0)
    );

  if v_apply_snapshot then
    update public.subscriptions as s
    set
      stripe_price_id = p_price_id,
      billing_interval = p_billing_interval,
      status = p_status,
      current_period_end = p_current_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
      livemode = false,
      last_stripe_observed_at = p_observed_at,
      last_stripe_event_id = p_event_id,
      last_stripe_event_created = p_event_created
    where s.stripe_subscription_id = p_subscription_id;
  end if;

  if p_invoice_state is not null then
    v_incoming_rank := case p_invoice_state
      when 'failed' then 1
      when 'terminal' then 2
      when 'paid' then 3
    end;
    v_existing_rank := case v_existing_invoice_state
      when 'failed' then 1
      when 'terminal' then 2
      when 'paid' then 3
      else 0
    end;

    v_apply_invoice :=
      v_existing_invoice_created is null
      or p_invoice_created > v_existing_invoice_created
      or (
        p_invoice_created = v_existing_invoice_created
        and (
          (
            p_invoice_id = v_existing_invoice_id
            and (
              v_incoming_rank > v_existing_rank
              or (
                v_incoming_rank = v_existing_rank
                and p_event_created >= coalesce(v_existing_invoice_event_created, 0)
              )
            )
          )
          or (
            p_invoice_id is distinct from v_existing_invoice_id
            and p_event_created > coalesce(v_existing_invoice_event_created, 0)
          )
        )
      );

    if v_apply_invoice then
      if p_invoice_state = 'failed' then
        if p_invoice_id is distinct from v_existing_invoice_id then
          v_new_grace := p_grace_deadline;
        else
          -- Replays and parallel deliveries for the same failed invoice must
          -- not extend a grace period that has already started.
          v_new_grace := coalesce(v_existing_grace, p_grace_deadline);
        end if;
      else
        -- A paid invoice or terminal invoice state ends failure grace.
        v_new_grace := null;
      end if;

      update public.subscriptions as s
      set
        grace_period_end = v_new_grace,
        last_invoice_id = p_invoice_id,
        last_invoice_created = p_invoice_created,
        last_invoice_state = p_invoice_state,
        last_invoice_event_id = p_event_id,
        last_invoice_event_created = p_event_created
      where s.stripe_subscription_id = p_subscription_id;
    end if;
  end if;

  return query
  select
    v_apply_snapshot,
    v_apply_invoice,
    s.user_id,
    s.status,
    s.grace_period_end,
    s.last_invoice_state
  from public.subscriptions as s
  where s.stripe_subscription_id = p_subscription_id;
end
$$;

revoke all on function public.apply_stripe_subscription_state(
  text,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  boolean,
  timestamptz,
  text,
  bigint,
  text,
  bigint,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_stripe_subscription_state(
  text,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean,
  boolean,
  timestamptz,
  text,
  bigint,
  text,
  bigint,
  text,
  timestamptz
) to service_role;

commit;
