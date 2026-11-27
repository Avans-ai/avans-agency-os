-- Avans OS operational persistence and role-scoped access.
-- Additive migration: apply only after restoring the Avans Supabase project
-- and validating the existing schema in a non-production environment.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id and om.user_id = auth.uid()
  );
$$;

create or replace function private.member_has_role(target_organization_id uuid, allowed public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.role = any(allowed)
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.member_has_role(uuid, public.member_role[]) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.member_has_role(uuid, public.member_role[]) to authenticated, service_role;

alter table public.clients add column if not exists slug text;
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists bubble text;
create unique index if not exists clients_organization_slug_uidx on public.clients (organization_id, slug) where slug is not null;

create table if not exists public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  service_id text,
  assignment_role text not null default 'member',
  can_manage boolean not null default false,
  can_edit boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists client_assignments_unique_idx
  on public.client_assignments (client_id, user_id, coalesce(service_id, ''));

create table if not exists public.client_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id text not null,
  label text not null,
  scope_summary text,
  cadence text,
  deliverables jsonb not null default '[]'::jsonb,
  compliance text not null default 'pendiente',
  compliance_alert text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, service_id)
);

create table if not exists public.client_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  value text not null,
  kind text not null check (kind in ('web', 'social', 'platform')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_financials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade unique,
  monthly_fee numeric(14,2),
  billing_status text,
  margin_percent numeric(6,2),
  contract_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  positioning text,
  channels text,
  state text not null default 'nueva',
  last_scanned_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, name)
);

create table if not exists public.benchmark_scan_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade unique,
  enabled boolean not null default false,
  cadence text not null default 'biweekly',
  next_run_at timestamptz,
  source_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.benchmark_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  competitor_id uuid references public.client_competitors(id) on delete cascade,
  captured_at timestamptz not null default now(),
  source_url text,
  source_excerpt text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id text not null,
  title text not null,
  rationale text,
  source_type text not null default 'manual',
  source_id uuid,
  priority text not null default 'media',
  status text not null default 'nueva',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_change_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  field_path text not null,
  before_value jsonb,
  proposed_value jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_report_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id text,
  report_type text not null check (report_type in ('weekly', 'monthly', 'biweekly')),
  enabled boolean not null default false,
  next_run_at timestamptz,
  template_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists client_report_schedules_unique_idx
  on public.client_report_schedules (client_id, coalesce(service_id, ''), report_type);

alter table public.documents add column if not exists source text;
alter table public.documents add column if not exists mime_type text;
alter table public.documents add column if not exists size_bytes bigint;
alter table public.documents add column if not exists checksum text;
alter table public.documents add column if not exists uploaded_by uuid references public.profiles(id) on delete set null;
alter table public.documents add column if not exists processing_status text not null default 'pending';
alter table public.documents add column if not exists processed_at timestamptz;

alter table public.projects add column if not exists service_id text;
alter table public.tasks add column if not exists service_id text;
alter table public.tasks add column if not exists owner_role text;
alter table public.tasks add column if not exists completed_at timestamptz;
alter table public.tasks add column if not exists archived_at timestamptz;
alter table public.tasks add column if not exists external_key text;
create index if not exists tasks_archive_idx on public.tasks (organization_id, archived_at, completed_at);

create or replace function private.is_client_assigned(target_client_id uuid, target_service_id text default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.client_assignments ca
    where ca.client_id = target_client_id
      and ca.user_id = auth.uid()
      and ca.active
      and (ca.service_id is null or target_service_id is null or ca.service_id = target_service_id)
  );
$$;

create or replace function private.can_manage_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and (
        private.member_has_role(c.organization_id, array['admin'::public.member_role])
        or exists (
          select 1 from public.client_assignments ca
          where ca.client_id = c.id and ca.user_id = auth.uid() and ca.active and ca.can_manage
        )
      )
  );
$$;

create or replace function private.can_edit_service(target_client_id uuid, target_service_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and (
        private.member_has_role(c.organization_id, array['admin'::public.member_role])
        or exists (
          select 1 from public.client_assignments ca
          where ca.client_id = c.id
            and ca.user_id = auth.uid()
            and ca.active and ca.can_edit
            and (ca.service_id is null or ca.service_id = target_service_id)
        )
      )
  );
$$;

create or replace function private.can_view_financials(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.member_has_role(target_organization_id, array['admin'::public.member_role, 'finance'::public.member_role]);
$$;

revoke all on function private.is_client_assigned(uuid, text) from public, anon;
revoke all on function private.can_manage_client(uuid) from public, anon;
revoke all on function private.can_edit_service(uuid, text) from public, anon;
revoke all on function private.can_view_financials(uuid) from public, anon;
grant execute on function private.is_client_assigned(uuid, text) to authenticated, service_role;
grant execute on function private.can_manage_client(uuid) to authenticated, service_role;
grant execute on function private.can_edit_service(uuid, text) to authenticated, service_role;
grant execute on function private.can_view_financials(uuid) to authenticated, service_role;

-- Replace organization-wide mutation policies on critical operational data.
drop policy if exists clients_org_access on public.clients;
drop policy if exists projects_org_access on public.projects;
drop policy if exists tasks_org_access on public.tasks;
drop policy if exists documents_org_access on public.documents;
drop policy if exists reports_org_access on public.reports;

create policy clients_select_members on public.clients
  for select to authenticated using (private.is_org_member(organization_id));
create policy clients_insert_managers on public.clients
  for insert to authenticated with check (
    private.member_has_role(organization_id, array['admin'::public.member_role, 'project_manager'::public.member_role])
  );
create policy clients_update_assigned_managers on public.clients
  for update to authenticated using (private.can_manage_client(id)) with check (private.can_manage_client(id));
create policy clients_delete_admins on public.clients
  for delete to authenticated using (private.member_has_role(organization_id, array['admin'::public.member_role]));

create policy projects_select_members on public.projects
  for select to authenticated using (private.is_org_member(organization_id));
create policy projects_insert_service_editors on public.projects
  for insert to authenticated with check (private.can_edit_service(client_id, coalesce(service_id, '')));
create policy projects_update_service_editors on public.projects
  for update to authenticated using (private.can_edit_service(client_id, coalesce(service_id, '')))
  with check (private.can_edit_service(client_id, coalesce(service_id, '')));
create policy projects_delete_service_editors on public.projects
  for delete to authenticated using (private.can_edit_service(client_id, coalesce(service_id, '')));

create policy tasks_select_members on public.tasks
  for select to authenticated using (private.is_org_member(organization_id));
create policy tasks_insert_service_editors on public.tasks
  for insert to authenticated with check (
    client_id is not null and private.can_edit_service(client_id, coalesce(service_id, ''))
  );
create policy tasks_update_service_editors on public.tasks
  for update to authenticated using (
    client_id is not null and private.can_edit_service(client_id, coalesce(service_id, ''))
  ) with check (
    client_id is not null and private.can_edit_service(client_id, coalesce(service_id, ''))
  );
create policy tasks_delete_service_editors on public.tasks
  for delete to authenticated using (
    client_id is not null and private.can_edit_service(client_id, coalesce(service_id, ''))
  );

create policy documents_select_members on public.documents
  for select to authenticated using (private.is_org_member(organization_id));
create policy documents_insert_managers on public.documents
  for insert to authenticated with check (client_id is not null and private.can_manage_client(client_id));
create policy documents_update_managers on public.documents
  for update to authenticated using (client_id is not null and private.can_manage_client(client_id))
  with check (client_id is not null and private.can_manage_client(client_id));
create policy documents_delete_managers on public.documents
  for delete to authenticated using (client_id is not null and private.can_manage_client(client_id));

create policy reports_select_members on public.reports
  for select to authenticated using (private.is_org_member(organization_id));
create policy reports_insert_managers on public.reports
  for insert to authenticated with check (private.can_manage_client(client_id));
create policy reports_update_managers on public.reports
  for update to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy reports_delete_managers on public.reports
  for delete to authenticated using (private.can_manage_client(client_id));

revoke all on table public.clients, public.projects, public.tasks, public.documents, public.reports from anon;
grant select, insert, update, delete on table public.clients, public.projects, public.tasks, public.documents, public.reports to authenticated;

create or replace function public.set_task_completion_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'completada'::public.task_status and old.status is distinct from new.status then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completada'::public.task_status then
    new.completed_at := null;
    new.archived_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_tasks_completion_timestamp on public.tasks;
create trigger set_tasks_completion_timestamp
  before update of status on public.tasks
  for each row execute function public.set_task_completion_timestamp();

update public.tasks
set completed_at = coalesce(updated_at, created_at)
where status = 'completada'::public.task_status and completed_at is null;

create or replace function public.archive_completed_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  update public.tasks
  set archived_at = now(), updated_at = now()
  where status = 'completada'::public.task_status
    and archived_at is null
    and completed_at <= now() - interval '30 days';
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.archive_completed_tasks() from public, anon, authenticated;
grant execute on function public.archive_completed_tasks() to service_role;

-- Updated-at triggers for new mutable tables.
drop trigger if exists set_client_assignments_updated_at on public.client_assignments;
create trigger set_client_assignments_updated_at before update on public.client_assignments for each row execute function public.set_updated_at();
drop trigger if exists set_client_services_updated_at on public.client_services;
create trigger set_client_services_updated_at before update on public.client_services for each row execute function public.set_updated_at();
drop trigger if exists set_client_channels_updated_at on public.client_channels;
create trigger set_client_channels_updated_at before update on public.client_channels for each row execute function public.set_updated_at();
drop trigger if exists set_client_financials_updated_at on public.client_financials;
create trigger set_client_financials_updated_at before update on public.client_financials for each row execute function public.set_updated_at();
drop trigger if exists set_client_competitors_updated_at on public.client_competitors;
create trigger set_client_competitors_updated_at before update on public.client_competitors for each row execute function public.set_updated_at();
drop trigger if exists set_benchmark_scan_configs_updated_at on public.benchmark_scan_configs;
create trigger set_benchmark_scan_configs_updated_at before update on public.benchmark_scan_configs for each row execute function public.set_updated_at();
drop trigger if exists set_service_recommendations_updated_at on public.service_recommendations;
create trigger set_service_recommendations_updated_at before update on public.service_recommendations for each row execute function public.set_updated_at();
drop trigger if exists set_document_change_proposals_updated_at on public.document_change_proposals;
create trigger set_document_change_proposals_updated_at before update on public.document_change_proposals for each row execute function public.set_updated_at();
drop trigger if exists set_client_report_schedules_updated_at on public.client_report_schedules;
create trigger set_client_report_schedules_updated_at before update on public.client_report_schedules for each row execute function public.set_updated_at();

-- Explicit API grants are required for tables created after 30 Oct 2026.
revoke all on table public.client_assignments, public.client_services, public.client_channels,
  public.client_financials, public.client_competitors, public.benchmark_scan_configs,
  public.benchmark_snapshots, public.service_recommendations, public.document_change_proposals,
  public.client_report_schedules from anon;
grant select, insert, update, delete on table public.client_assignments, public.client_services,
  public.client_channels, public.client_competitors, public.benchmark_scan_configs,
  public.benchmark_snapshots, public.service_recommendations, public.document_change_proposals,
  public.client_report_schedules to authenticated;
grant select, insert, update, delete on table public.client_financials to authenticated;
grant all on table public.client_assignments, public.client_services, public.client_channels,
  public.client_financials, public.client_competitors, public.benchmark_scan_configs,
  public.benchmark_snapshots, public.service_recommendations, public.document_change_proposals,
  public.client_report_schedules to service_role;

alter table public.client_assignments enable row level security;
alter table public.client_services enable row level security;
alter table public.client_channels enable row level security;
alter table public.client_financials enable row level security;
alter table public.client_competitors enable row level security;
alter table public.benchmark_scan_configs enable row level security;
alter table public.benchmark_snapshots enable row level security;
alter table public.service_recommendations enable row level security;
alter table public.document_change_proposals enable row level security;
alter table public.client_report_schedules enable row level security;

create policy client_assignments_select on public.client_assignments for select to authenticated using (private.is_org_member(organization_id));
create policy client_assignments_manage on public.client_assignments for all to authenticated
  using (private.member_has_role(organization_id, array['admin'::public.member_role, 'project_manager'::public.member_role]))
  with check (private.member_has_role(organization_id, array['admin'::public.member_role, 'project_manager'::public.member_role]));

create policy client_services_select on public.client_services for select to authenticated using (private.is_org_member(organization_id));
create policy client_services_manage on public.client_services for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy client_channels_select on public.client_channels for select to authenticated using (private.is_org_member(organization_id));
create policy client_channels_manage on public.client_channels for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy client_financials_select on public.client_financials for select to authenticated using (private.can_view_financials(organization_id));
create policy client_financials_manage on public.client_financials for all to authenticated
  using (private.member_has_role(organization_id, array['admin'::public.member_role, 'finance'::public.member_role]))
  with check (private.member_has_role(organization_id, array['admin'::public.member_role, 'finance'::public.member_role]));

create policy client_competitors_select on public.client_competitors for select to authenticated using (private.is_org_member(organization_id));
create policy client_competitors_manage on public.client_competitors for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy benchmark_scan_configs_select on public.benchmark_scan_configs for select to authenticated using (private.is_org_member(organization_id));
create policy benchmark_scan_configs_manage on public.benchmark_scan_configs for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy benchmark_snapshots_select on public.benchmark_snapshots for select to authenticated using (private.is_org_member(organization_id));
create policy benchmark_snapshots_manage on public.benchmark_snapshots for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy service_recommendations_select on public.service_recommendations for select to authenticated using (private.is_org_member(organization_id));
create policy service_recommendations_manage on public.service_recommendations for all to authenticated
  using (private.can_edit_service(client_id, service_id)) with check (private.can_edit_service(client_id, service_id));

create policy document_change_proposals_select on public.document_change_proposals for select to authenticated using (private.is_org_member(organization_id));
create policy document_change_proposals_manage on public.document_change_proposals for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create policy client_report_schedules_select on public.client_report_schedules for select to authenticated using (private.is_org_member(organization_id));
create policy client_report_schedules_manage on public.client_report_schedules for all to authenticated
  using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));

create index if not exists client_assignments_lookup_idx on public.client_assignments (client_id, user_id, service_id) where active;
create index if not exists client_services_lookup_idx on public.client_services (client_id, service_id) where active;
create index if not exists client_channels_order_idx on public.client_channels (client_id, sort_order);
create index if not exists client_competitors_scan_idx on public.client_competitors (client_id, last_scanned_at desc);
create index if not exists benchmark_snapshots_lookup_idx on public.benchmark_snapshots (client_id, competitor_id, captured_at desc);
create index if not exists service_recommendations_lookup_idx on public.service_recommendations (client_id, service_id, status, created_at desc);
create index if not exists document_change_proposals_lookup_idx on public.document_change_proposals (client_id, status, created_at desc);
