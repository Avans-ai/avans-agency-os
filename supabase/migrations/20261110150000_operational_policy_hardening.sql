-- Follow-up hardening for the operational persistence migration.
-- Keeps all-client read access while preventing the client/module policies from
-- breaking legitimate non-client tasks, project documents and team profiles.

create or replace function private.shares_organization_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.organization_members self_membership
    join public.organization_members colleague_membership
      on colleague_membership.organization_id = self_membership.organization_id
    where self_membership.user_id = auth.uid()
      and colleague_membership.user_id = target_user_id
  );
$$;

create or replace function private.can_mutate_project(target_client_id uuid, target_service_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_service_id is null or btrim(target_service_id) = ''
      then private.can_manage_client(target_client_id)
    else private.can_edit_service(target_client_id, target_service_id)
  end;
$$;

create or replace function private.can_mutate_task(
  target_organization_id uuid,
  target_client_id uuid,
  target_service_id text,
  target_assigned_to uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    private.member_has_role(target_organization_id, array['admin'::public.member_role])
    or (
      target_client_id is not null
      and case
        when target_service_id is null or btrim(target_service_id) = ''
          then private.can_manage_client(target_client_id)
        else private.can_edit_service(target_client_id, target_service_id)
      end
    )
    or (
      target_client_id is null
      and (
        target_assigned_to = auth.uid()
        or private.member_has_role(
          target_organization_id,
          array['project_manager'::public.member_role, 'comercial'::public.member_role]
        )
      )
    )
  );
$$;

create or replace function private.can_manage_document(
  target_organization_id uuid,
  target_client_id uuid,
  target_project_id uuid,
  target_uploaded_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    private.member_has_role(target_organization_id, array['admin'::public.member_role])
    or (target_client_id is not null and private.can_manage_client(target_client_id))
    or (
      target_project_id is not null
      and exists (
        select 1 from public.projects p
        where p.id = target_project_id
          and private.can_manage_client(p.client_id)
      )
    )
    or (
      target_client_id is null
      and target_project_id is null
      and (
        target_uploaded_by = auth.uid()
        or private.member_has_role(target_organization_id, array['project_manager'::public.member_role])
      )
    )
  );
$$;

revoke all on function private.shares_organization_with(uuid) from public, anon;
revoke all on function private.can_mutate_project(uuid, text) from public, anon;
revoke all on function private.can_mutate_task(uuid, uuid, text, uuid) from public, anon;
revoke all on function private.can_manage_document(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function private.shares_organization_with(uuid) to authenticated, service_role;
grant execute on function private.can_mutate_project(uuid, text) to authenticated, service_role;
grant execute on function private.can_mutate_task(uuid, uuid, text, uuid) to authenticated, service_role;
grant execute on function private.can_manage_document(uuid, uuid, uuid, uuid) to authenticated, service_role;

-- Team members need names and avatars to render assignments. Email exposure should
-- be reviewed before production; the current table-level API still returns every
-- selected column, so the frontend must avoid querying email unless required.
drop policy if exists profiles_select_org_colleagues on public.profiles;
create policy profiles_select_org_colleagues on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.shares_organization_with(id));

-- A project without a service classification remains manageable only by a PM
-- assigned at client level (or an admin), not by every service-specific assignee.
drop policy if exists projects_insert_service_editors on public.projects;
drop policy if exists projects_update_service_editors on public.projects;
drop policy if exists projects_delete_service_editors on public.projects;
create policy projects_insert_service_editors on public.projects
  for insert to authenticated
  with check (private.can_mutate_project(client_id, service_id));
create policy projects_update_service_editors on public.projects
  for update to authenticated
  using (private.can_mutate_project(client_id, service_id))
  with check (private.can_mutate_project(client_id, service_id));
create policy projects_delete_service_editors on public.projects
  for delete to authenticated
  using (private.can_mutate_project(client_id, service_id));

-- Client tasks follow client/module assignment. Personal or commercial tasks
-- without a client remain editable by their assignee or the coordinating roles.
drop policy if exists tasks_insert_service_editors on public.tasks;
drop policy if exists tasks_update_service_editors on public.tasks;
drop policy if exists tasks_delete_service_editors on public.tasks;
create policy tasks_insert_service_editors on public.tasks
  for insert to authenticated
  with check (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));
create policy tasks_update_service_editors on public.tasks
  for update to authenticated
  using (private.can_mutate_task(organization_id, client_id, service_id, assigned_to))
  with check (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));
create policy tasks_delete_service_editors on public.tasks
  for delete to authenticated
  using (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));

-- Documents may belong directly to a client, to a project, or be internal. The
-- policy resolves the owning client before authorizing a mutation.
drop policy if exists documents_insert_managers on public.documents;
drop policy if exists documents_update_managers on public.documents;
drop policy if exists documents_delete_managers on public.documents;
create policy documents_insert_managers on public.documents
  for insert to authenticated
  with check (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
create policy documents_update_managers on public.documents
  for update to authenticated
  using (private.can_manage_document(organization_id, client_id, project_id, uploaded_by))
  with check (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
create policy documents_delete_managers on public.documents
  for delete to authenticated
  using (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
