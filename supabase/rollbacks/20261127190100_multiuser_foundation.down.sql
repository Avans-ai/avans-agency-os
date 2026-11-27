-- REVERSIÓN de 20261127190100_multiuser_foundation.sql
-- Ejecutar solo con autorización, primero en un entorno que no sea producción.
--
-- Restaura el comportamiento previo (políticas, funciones, triggers y permisos)
-- SIN borrar datos: las columnas y tablas agregadas (revision, archived_at,
-- client_visible, chain_id, user_invitations, audit_events, task_events, …)
-- quedan en su lugar y sin uso. Borrarlas sería destructivo y requiere una
-- decisión aparte. Los valores nuevos del enum member_role no se pueden quitar
-- en Postgres; quedan disponibles y sin efecto.
--
-- Las políticas, funciones y permisos se generaron a partir de una base con las
-- migraciones anteriores aplicadas (scripts/db/test-rls.sh verifica que la
-- reversión deja la base idéntica en políticas, funciones, triggers y permisos).
begin;

-- 1. Triggers agregados
do $$ declare r record; begin
  for r in
    select c.relname as tbl, n.nspname as sch, t.tgname
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and (
      t.tgname like 'bump\_%\_revision' or t.tgname like 'enforce\_%\_client\_tenant'
      or t.tgname like 'audit\_%' or t.tgname in (
        'validate_client_assignment', 'protect_last_admin', 'record_task_event', 'task_events_immutable',
        'audit_events_immutable', 'audit_events_no_truncate', 'avans_enforce_signup_policy', 'avans_handle_new_user',
        'set_user_invitations_updated_at', 'enforce_user_invitations_client_tenant'))
      and c.relname not in ('audit_events', 'task_events', 'user_invitations')
  loop
    execute format('drop trigger if exists %I on %I.%I', r.tgname, r.sch, r.tbl);
  end loop;
end $$;

-- 2. Índices únicos agregados (no contienen datos propios)
drop index if exists public.tasks_org_external_key_uidx;
drop index if exists public.projects_org_external_key_uidx;
drop index if exists public.documents_org_external_key_uidx;
drop index if exists public.reports_org_external_key_uidx;
drop index if exists public.tasks_one_active_per_chain_uidx;
drop index if exists public.tasks_chain_idx;

-- 3. Políticas: se eliminan todas las de las tablas afectadas y se recrean las previas
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in (
    'clients','projects','tasks','documents','reports','client_assignments','client_services','client_channels',
    'client_competitors','benchmark_scan_configs','benchmark_snapshots','client_report_schedules',
    'service_recommendations','profiles','organization_members','leads','lead_messages','proposals','discoveries',
    'onboarding_checklists','brand_profiles','onboarding_items','content_items','report_metrics','approvals',
    'agents','agent_runs','automation_logs','integrations')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy agent_runs_org_access on public.agent_runs as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy agents_org_access on public.agents as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy approvals_org_access on public.approvals as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy automation_logs_org_access on public.automation_logs as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy benchmark_scan_configs_manage on public.benchmark_scan_configs as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy benchmark_scan_configs_select on public.benchmark_scan_configs as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy benchmark_snapshots_manage on public.benchmark_snapshots as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy benchmark_snapshots_select on public.benchmark_snapshots as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy brand_profiles_org_access on public.brand_profiles as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy client_assignments_manage on public.client_assignments as PERMISSIVE for ALL to authenticated using (private.member_has_role(organization_id, ARRAY['admin'::member_role, 'project_manager'::member_role])) with check (private.member_has_role(organization_id, ARRAY['admin'::member_role, 'project_manager'::member_role]));
create policy client_assignments_select on public.client_assignments as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy client_channels_manage on public.client_channels as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy client_channels_select on public.client_channels as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy client_competitors_manage on public.client_competitors as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy client_competitors_select on public.client_competitors as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy client_report_schedules_manage on public.client_report_schedules as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy client_report_schedules_select on public.client_report_schedules as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy client_services_manage on public.client_services as PERMISSIVE for ALL to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy client_services_select on public.client_services as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy clients_delete_admins on public.clients as PERMISSIVE for DELETE to authenticated using (private.member_has_role(organization_id, ARRAY['admin'::member_role]));
create policy clients_insert_managers on public.clients as PERMISSIVE for INSERT to authenticated with check (private.member_has_role(organization_id, ARRAY['admin'::member_role, 'project_manager'::member_role]));
create policy clients_select_members on public.clients as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy clients_update_assigned_managers on public.clients as PERMISSIVE for UPDATE to authenticated using (private.can_manage_client(id)) with check (private.can_manage_client(id));
create policy content_items_org_access on public.content_items as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy discoveries_org_access on public.discoveries as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy documents_delete_managers on public.documents as PERMISSIVE for DELETE to authenticated using (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
create policy documents_insert_managers on public.documents as PERMISSIVE for INSERT to authenticated with check (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
create policy documents_select_members on public.documents as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy documents_update_managers on public.documents as PERMISSIVE for UPDATE to authenticated using (private.can_manage_document(organization_id, client_id, project_id, uploaded_by)) with check (private.can_manage_document(organization_id, client_id, project_id, uploaded_by));
create policy integrations_org_access on public.integrations as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy lead_messages_org_access on public.lead_messages as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy leads_org_access on public.leads as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy onboarding_checklists_org_access on public.onboarding_checklists as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy onboarding_items_org_access on public.onboarding_items as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy members_select_own_orgs on public.organization_members as PERMISSIVE for SELECT to public using (is_org_member(organization_id));
create policy profiles_select_org_colleagues on public.profiles as PERMISSIVE for SELECT to authenticated using (((id = auth.uid()) OR private.shares_organization_with(id)));
create policy profiles_select_own on public.profiles as PERMISSIVE for SELECT to public using ((id = auth.uid()));
create policy profiles_update_own on public.profiles as PERMISSIVE for UPDATE to public using ((id = auth.uid())) with check ((id = auth.uid()));
create policy projects_delete_service_editors on public.projects as PERMISSIVE for DELETE to authenticated using (private.can_mutate_project(client_id, service_id));
create policy projects_insert_service_editors on public.projects as PERMISSIVE for INSERT to authenticated with check (private.can_mutate_project(client_id, service_id));
create policy projects_select_members on public.projects as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy projects_update_service_editors on public.projects as PERMISSIVE for UPDATE to authenticated using (private.can_mutate_project(client_id, service_id)) with check (private.can_mutate_project(client_id, service_id));
create policy proposals_org_access on public.proposals as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy report_metrics_org_access on public.report_metrics as PERMISSIVE for ALL to public using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy reports_delete_managers on public.reports as PERMISSIVE for DELETE to authenticated using (private.can_manage_client(client_id));
create policy reports_insert_managers on public.reports as PERMISSIVE for INSERT to authenticated with check (private.can_manage_client(client_id));
create policy reports_select_members on public.reports as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy reports_update_managers on public.reports as PERMISSIVE for UPDATE to authenticated using (private.can_manage_client(client_id)) with check (private.can_manage_client(client_id));
create policy service_recommendations_manage on public.service_recommendations as PERMISSIVE for ALL to authenticated using (private.can_edit_service(client_id, service_id)) with check (private.can_edit_service(client_id, service_id));
create policy service_recommendations_select on public.service_recommendations as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy tasks_delete_service_editors on public.tasks as PERMISSIVE for DELETE to authenticated using (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));
create policy tasks_insert_service_editors on public.tasks as PERMISSIVE for INSERT to authenticated with check (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));
create policy tasks_select_members on public.tasks as PERMISSIVE for SELECT to authenticated using (private.is_org_member(organization_id));
create policy tasks_update_service_editors on public.tasks as PERMISSIVE for UPDATE to authenticated using (private.can_mutate_task(organization_id, client_id, service_id, assigned_to)) with check (private.can_mutate_task(organization_id, client_id, service_id, assigned_to));

-- 4. Funciones redefinidas: definición previa
CREATE OR REPLACE FUNCTION private.can_manage_client(target_client_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION private.can_edit_service(target_client_id uuid, target_service_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION private.can_view_financials(target_organization_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.member_has_role(target_organization_id, array['admin'::public.member_role, 'finance'::public.member_role]);
$function$
;
CREATE OR REPLACE FUNCTION private.can_mutate_task(target_organization_id uuid, target_client_id uuid, target_service_id text, target_assigned_to uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

-- 5. Permisos previos (la migración solo revocó; se vuelven a otorgar)
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agent_runs to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agent_runs to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agents to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.agents to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.approvals to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.approvals to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.automation_logs to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.automation_logs to authenticated;
grant SELECT on public.benchmark_analysis_items to authenticated;
grant SELECT on public.benchmark_findings to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.benchmark_scan_configs to authenticated;
grant INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on public.benchmark_snapshots to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.brand_profiles to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.brand_profiles to authenticated;
grant SELECT on public.change_proposal_evidence to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_assignments to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_channels to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_competitors to authenticated;
grant SELECT on public.client_discoveries to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_financials to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_report_schedules to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.client_services to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.clients to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.content_items to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.content_items to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.discoveries to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.discoveries to authenticated;
grant SELECT on public.document_change_proposals to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.documents to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.integrations to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.integrations to authenticated;
grant SELECT on public.knowledge_dependencies to authenticated;
grant SELECT on public.knowledge_item_sources to authenticated;
grant SELECT on public.knowledge_sources to authenticated;
grant SELECT on public.knowledge_versions to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.lead_messages to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.lead_messages to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.leads to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.leads to authenticated;
grant SELECT on public.marketing_plan_items to authenticated;
grant SELECT on public.marketing_plan_modules to authenticated;
grant SELECT on public.marketing_plans to authenticated;
grant SELECT on public.meeting_artifacts to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.onboarding_checklists to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.onboarding_checklists to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.onboarding_items to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.onboarding_items to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.organization_members to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.organization_members to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.organizations to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.organizations to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.projects to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.proposals to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.proposals to authenticated;
grant SELECT on public.questionnaire_instances to authenticated;
grant SELECT on public.questionnaire_responses to authenticated;
grant SELECT on public.questionnaire_templates to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.report_metrics to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.report_metrics to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.reports to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.service_recommendations to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tasks to authenticated;
grant execute on function public.is_org_member(uuid) to public, anon;

commit;
