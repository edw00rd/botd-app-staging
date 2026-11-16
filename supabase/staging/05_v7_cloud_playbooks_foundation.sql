-- B.O.T.D. V7 private multi-playbook foundation.
-- Apply to staging first; do not deploy to production without acceptance.
-- All editable play content is owner-only. Team access never grants JSON access.
begin;

create table if not exists public.botd_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists botd_teams_owner_idx on public.botd_teams(owner_id);

create table if not exists public.botd_team_memberships (
  team_id uuid not null references public.botd_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('head_coach','assistant_coach','player','parent','manager')),
  status text not null default 'invited' check (status in ('invited','active','suspended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (team_id,user_id)
);
create index if not exists botd_team_member_user_idx on public.botd_team_memberships(user_id,status);

create table if not exists public.botd_playbooks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 180),
  description text not null default '' check (char_length(description)<=2048),
  revision integer not null default 1 check (revision>0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists botd_playbooks_owner_updated_idx
  on public.botd_playbooks(owner_id,updated_at desc);

create table if not exists public.botd_plays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  kind text not null default 'play' check (kind in ('play','drill')),
  content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text)<=262144),
  revision integer not null default 1 check (revision>0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists botd_plays_owner_updated_idx
  on public.botd_plays(owner_id,updated_at desc);

create table if not exists public.botd_playbook_entries (
  playbook_id uuid not null references public.botd_playbooks(id) on delete cascade,
  play_id uuid not null references public.botd_plays(id) on delete cascade,
  sort_order integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playbook_id,play_id)
);
create index if not exists botd_playbook_entries_play_idx on public.botd_playbook_entries(play_id);

-- Future publication eligibility. This table does NOT authorize raw JSON access to players.
create table if not exists public.botd_playbook_team_access (
  playbook_id uuid not null references public.botd_playbooks(id) on delete cascade,
  team_id uuid not null references public.botd_teams(id) on delete cascade,
  access_level text not null default 'published_video_only'
    check (access_level='published_video_only'),
  created_at timestamptz not null default now(),
  primary key(playbook_id,team_id)
);

-- Immutable version snapshots and many-to-many remix provenance.
-- Publishing/signing APIs will be added in a separate reviewed release.
create table if not exists public.botd_play_versions (
  id uuid primary key default gen_random_uuid(),
  play_id uuid not null references public.botd_plays(id) on delete cascade,
  version_number integer not null check (version_number>0),
  authored_by uuid not null references auth.users(id) on delete restrict,
  content jsonb not null check (jsonb_typeof(content)='object'),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  signature text,
  created_at timestamptz not null default now(),
  unique(play_id,version_number)
);
create index if not exists botd_play_versions_play_idx on public.botd_play_versions(play_id,version_number desc);

create table if not exists public.botd_play_sources (
  derived_play_id uuid not null references public.botd_plays(id) on delete cascade,
  source_version_id uuid not null references public.botd_play_versions(id) on delete restrict,
  contribution text not null default '' check (char_length(contribution)<=500),
  created_at timestamptz not null default now(),
  primary key (derived_play_id,source_version_id)
);

create or replace function public.botd_coach_entitled()
returns boolean language sql stable security invoker set search_path=''
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id=(select auth.uid()) and e.entitlement='coach_pro'
      and e.active is true and (e.expires_at is null or e.expires_at>now())
  );
$$;
revoke all on function public.botd_coach_entitled() from public,anon;
grant execute on function public.botd_coach_entitled() to authenticated;

do $triggers$
begin
  if not exists (select 1 from pg_trigger where tgname='botd_teams_updated_at') then
    create trigger botd_teams_updated_at before update on public.botd_teams
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='botd_playbooks_updated_at') then
    create trigger botd_playbooks_updated_at before update on public.botd_playbooks
      for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname='botd_plays_updated_at') then
    create trigger botd_plays_updated_at before update on public.botd_plays
      for each row execute function public.set_updated_at();
  end if;
end $triggers$;

alter table public.botd_teams enable row level security;
alter table public.botd_team_memberships enable row level security;
alter table public.botd_playbooks enable row level security;
alter table public.botd_plays enable row level security;
alter table public.botd_playbook_entries enable row level security;
alter table public.botd_playbook_team_access enable row level security;
alter table public.botd_play_versions enable row level security;
alter table public.botd_play_sources enable row level security;

revoke all on public.botd_teams, public.botd_team_memberships, public.botd_playbooks,
  public.botd_plays, public.botd_playbook_entries, public.botd_playbook_team_access,
  public.botd_play_versions, public.botd_play_sources from public,anon,authenticated;
grant select,insert,update on public.botd_teams to authenticated;
grant select,insert,update on public.botd_team_memberships to authenticated;
grant select,insert,update on public.botd_playbooks to authenticated;
grant select,insert,update on public.botd_plays to authenticated;
grant select,insert,delete on public.botd_playbook_entries to authenticated;
grant select,insert,delete on public.botd_playbook_team_access to authenticated;
grant select on public.botd_play_versions, public.botd_play_sources to authenticated;
grant all on public.botd_teams,public.botd_team_memberships,public.botd_playbooks,
  public.botd_plays,public.botd_playbook_entries,public.botd_playbook_team_access,
  public.botd_play_versions,public.botd_play_sources to service_role;

create policy botd_team_owner_read on public.botd_teams for select to authenticated
  using ((select auth.uid())=owner_id);
create policy botd_team_owner_create on public.botd_teams for insert to authenticated
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));
create policy botd_team_owner_update on public.botd_teams for update to authenticated
  using ((select auth.uid())=owner_id and (select public.botd_coach_entitled()))
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));

create policy botd_member_read on public.botd_team_memberships for select to authenticated
  using ((select auth.uid())=user_id or exists(
    select 1 from public.botd_teams t where t.id=team_id and t.owner_id=(select auth.uid())
  ));
create policy botd_member_add on public.botd_team_memberships for insert to authenticated
  with check ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_teams t where t.id=team_id and t.owner_id=(select auth.uid())
  ));
create policy botd_member_update on public.botd_team_memberships for update to authenticated
  using ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_teams t where t.id=team_id and t.owner_id=(select auth.uid())
  ))
  with check ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_teams t where t.id=team_id and t.owner_id=(select auth.uid())
  ));

create policy botd_playbook_owner_read on public.botd_playbooks for select to authenticated
  using ((select auth.uid())=owner_id);
create policy botd_playbook_owner_create on public.botd_playbooks for insert to authenticated
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));
create policy botd_playbook_owner_update on public.botd_playbooks for update to authenticated
  using ((select auth.uid())=owner_id and (select public.botd_coach_entitled()))
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));

create policy botd_play_owner_read on public.botd_plays for select to authenticated
  using ((select auth.uid())=owner_id);
create policy botd_play_owner_create on public.botd_plays for insert to authenticated
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));
create policy botd_play_owner_update on public.botd_plays for update to authenticated
  using ((select auth.uid())=owner_id and (select public.botd_coach_entitled()))
  with check ((select auth.uid())=owner_id and (select public.botd_coach_entitled()));

create policy botd_entry_owner_read on public.botd_playbook_entries for select to authenticated
  using (exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ));
create policy botd_entry_owner_add on public.botd_playbook_entries for insert to authenticated
  with check ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ) and exists(
    select 1 from public.botd_plays p where p.id=play_id and p.owner_id=(select auth.uid())
  ));
create policy botd_entry_owner_remove on public.botd_playbook_entries for delete to authenticated
  using ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ));

create policy botd_grant_owner_read on public.botd_playbook_team_access for select to authenticated
  using (exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ));
create policy botd_grant_owner_add on public.botd_playbook_team_access for insert to authenticated
  with check ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ) and exists(
    select 1 from public.botd_teams t where t.id=team_id and t.owner_id=(select auth.uid())
  ));
create policy botd_grant_owner_remove on public.botd_playbook_team_access for delete to authenticated
  using ((select public.botd_coach_entitled()) and exists(
    select 1 from public.botd_playbooks b where b.id=playbook_id and b.owner_id=(select auth.uid())
  ));

create policy botd_version_owner_read on public.botd_play_versions for select to authenticated
  using (exists(
    select 1 from public.botd_plays p where p.id=play_id and p.owner_id=(select auth.uid())
  ));
create policy botd_source_owner_read on public.botd_play_sources for select to authenticated
  using (exists(
    select 1 from public.botd_plays p where p.id=derived_play_id and p.owner_id=(select auth.uid())
  ));

-- Transactional create: either the play and book association both exist, or neither does.
create or replace function public.botd_cloud_create_play(
  p_playbook_id uuid, p_title text, p_kind text, p_content jsonb
)
returns table(play_id uuid, revision integer, updated_at timestamptz)
language plpgsql security invoker set search_path=''
as $$
declare v_id uuid;
begin
  if not (select public.botd_coach_entitled()) then
    raise exception 'paid coach access required' using errcode='42501';
  end if;
  if not exists (
    select 1 from public.botd_playbooks b
    where b.id=p_playbook_id and b.owner_id=(select auth.uid()) and b.archived_at is null
  ) then
    raise exception 'playbook not found or not writable' using errcode='42501';
  end if;
  insert into public.botd_plays(owner_id,title,kind,content)
  values((select auth.uid()),p_title,p_kind,p_content)
  returning id into v_id;
  insert into public.botd_playbook_entries(playbook_id,play_id)
  values(p_playbook_id,v_id);
  return query select p.id,p.revision,p.updated_at from public.botd_plays p where p.id=v_id;
end;
$$;

-- Optimistic concurrency: stale editors cannot overwrite newer revisions.
create or replace function public.botd_cloud_update_play(
  p_play_id uuid, p_expected_revision integer, p_title text, p_content jsonb
)
returns table(play_id uuid, revision integer, updated_at timestamptz)
language plpgsql security invoker set search_path=''
as $$
begin
  if not (select public.botd_coach_entitled()) then
    raise exception 'paid coach access required' using errcode='42501';
  end if;
  return query
    update public.botd_plays p
    set title=p_title,content=p_content,revision=p.revision+1
    where p.id=p_play_id and p.owner_id=(select auth.uid())
      and p.revision=p_expected_revision and p.archived_at is null
    returning p.id,p.revision,p.updated_at;
end;
$$;
revoke all on function public.botd_cloud_create_play(uuid,text,text,jsonb) from public,anon;
revoke all on function public.botd_cloud_update_play(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.botd_cloud_create_play(uuid,text,text,jsonb) to authenticated;
grant execute on function public.botd_cloud_update_play(uuid,integer,text,jsonb) to authenticated;

commit;
