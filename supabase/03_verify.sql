with target_tables(table_name) as (
  values
    ('profiles'),
    ('billing_customers'),
    ('subscriptions'),
    ('entitlements'),
    ('processed_webhook_events')
)
select
  t.table_name,
  c.relrowsecurity as rls_enabled,
  count(p.policyname)::int as policy_count,
  coalesce(string_agg(p.policyname, ', ' order by p.policyname), 'none') as policy_names
from target_tables t
join pg_namespace n on n.nspname = 'public'
join pg_class c
  on c.relnamespace = n.oid
 and c.relname = t.table_name
 and c.relkind = 'r'
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = t.table_name
group by t.table_name, c.relrowsecurity
order by t.table_name;

select
  conrelid::regclass::text as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in ('subscriptions_staging_only', 'webhook_events_staging_only')
order by conname;

select
  c.column_name,
  c.data_type
from information_schema.columns as c
where c.table_schema = 'public'
  and c.table_name = 'subscriptions'
  and c.column_name in (
    'last_stripe_observed_at',
    'last_stripe_event_id',
    'last_stripe_event_created',
    'last_invoice_id',
    'last_invoice_created',
    'last_invoice_state',
    'last_invoice_event_id',
    'last_invoice_event_created'
  )
order by c.column_name;

select
  p.proname as function_name,
  has_function_privilege(
    'service_role',
    'public.apply_stripe_subscription_state(text,uuid,text,text,text,text,timestamptz,boolean,boolean,timestamptz,text,bigint,text,bigint,text,timestamptz)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_function_privilege(
    'authenticated',
    'public.apply_stripe_subscription_state(text,uuid,text,text,text,text,timestamptz,boolean,boolean,timestamptz,text,bigint,text,bigint,text,timestamptz)',
    'EXECUTE'
  ) as authenticated_can_execute
from pg_proc as p
join pg_namespace as n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_stripe_subscription_state';
