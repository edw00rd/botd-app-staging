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

commit;
