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
