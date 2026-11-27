-- Avans OS · Etapa 1 · Base multiusuario.
--
-- Aditiva y no destructiva:
--   * no borra tablas, columnas ni filas;
--   * solo agrega columnas con default, tablas nuevas, funciones, triggers e índices;
--   * reemplaza políticas RLS (las políticas no son datos) por versiones con
--     aislamiento por cliente y módulo.
-- Reversión: supabase/rollbacks/20261127190100_multiuser_foundation.down.sql
-- restaura funciones y políticas previas (sin borrar las columnas/tablas nuevas).
--
-- Modelo de acceso (rol general × asignación por cliente/módulo):
--   * Dirección (admin, socio, gerencia): ve y gestiona todos los clientes de su organización.
--   * Equipo interno (resto de roles internos): ve solo los clientes asignados; dentro de
--     un cliente, una asignación con service_id limita a ese módulo.
--   * Cliente: ve su cliente, sus módulos contratados y solo lo marcado client_visible.
--     Nunca edita por API directa.
--   * Proveedor externo: ve solo el módulo asignado del cliente asignado.
--   * Nadie ve otra organización. anon no ve nada.
-- El rol que muestra la preview en localStorage NO interviene: todo sale de
-- auth.uid() + organization_members + client_assignments.

begin;

-- ---------------------------------------------------------------------------
-- 1. Funciones de identidad y alcance (security definer, search_path vacío)
-- ---------------------------------------------------------------------------
create or replace function private.is_leadership(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.member_has_role(target_organization_id,
    array['admin', 'socio', 'gerencia']::public.member_role[]);
$$;

create or replace function private.is_internal(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id and om.user_id = auth.uid()
      and om.role not in ('cliente'::public.member_role, 'proveedor_externo'::public.member_role)
  );
$$;

create or replace function private.is_client_user(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.member_has_role(target_organization_id, array['cliente']::public.member_role[]);
$$;

-- Lectura del cliente: dirección de la organización o asignación activa.
create or replace function private.can_read_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and private.is_org_member(c.organization_id)
      and (
        private.is_leadership(c.organization_id)
        or exists (
          select 1 from public.client_assignments ca
          where ca.client_id = c.id and ca.user_id = auth.uid() and ca.active
        )
      )
  );
$$;

-- Lectura de un módulo del cliente. Sin módulo (null o vacío) exige asignación a
-- nivel cliente: un proveedor de Audiovisuales no ve lo que no es de su módulo.
create or replace function private.can_read_service(target_client_id uuid, target_service_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and private.is_org_member(c.organization_id)
      and (
        private.is_leadership(c.organization_id)
        or exists (
          select 1 from public.client_assignments ca
          where ca.client_id = c.id and ca.user_id = auth.uid() and ca.active
            and (ca.service_id is null or ca.service_id = nullif(btrim(target_service_id), ''))
        )
      )
  );
$$;

-- Redefinición: dirección completa gestiona; asignación con can_manage solo si es interno.
create or replace function private.can_manage_client(target_client_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and (
        private.is_leadership(c.organization_id)
        or (
          private.is_internal(c.organization_id)
          and exists (
            select 1 from public.client_assignments ca
            where ca.client_id = c.id and ca.user_id = auth.uid() and ca.active and ca.can_manage
          )
        )
      )
  );
$$;

-- Redefinición: el rol Cliente nunca edita por API directa.
create or replace function private.can_edit_service(target_client_id uuid, target_service_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.clients c
    where c.id = target_client_id
      and (
        private.is_leadership(c.organization_id)
        or (
          not private.is_client_user(c.organization_id)
          and private.is_org_member(c.organization_id)
          and exists (
            select 1 from public.client_assignments ca
            where ca.client_id = c.id
              and ca.user_id = auth.uid()
              and ca.active and ca.can_edit
              and (ca.service_id is null or ca.service_id = nullif(btrim(target_service_id), ''))
          )
        )
      )
  );
$$;

create or replace function private.can_view_financials(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.member_has_role(target_organization_id,
    array['admin', 'socio', 'gerencia', 'finance']::public.member_role[]);
$$;

-- Redefinición: las tareas internas (sin cliente) quedan solo para el equipo interno.
create or replace function private.can_mutate_task(
  target_organization_id uuid,
  target_client_id uuid,
  target_service_id text,
  target_assigned_to uuid
)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    private.is_leadership(target_organization_id)
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
      and private.is_internal(target_organization_id)
      and (
        target_assigned_to = auth.uid()
        or private.member_has_role(target_organization_id,
          array['project_manager', 'comercial']::public.member_role[])
      )
    )
  );
$$;

create or replace function private.can_read_document(
  target_organization_id uuid,
  target_client_id uuid,
  target_project_id uuid,
  target_client_visible boolean
)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    case
      when target_client_id is not null then
        private.can_read_client(target_client_id)
        and (private.is_internal(target_organization_id) or target_client_visible)
      when target_project_id is not null then exists (
        select 1 from public.projects p
        where p.id = target_project_id and p.client_id is not null
          and private.can_read_client(p.client_id)
          and (private.is_internal(target_organization_id) or target_client_visible)
      )
      else private.is_internal(target_organization_id)
    end
  );
$$;

-- Perfiles visibles: los propios, colegas internos de la organización y, para
-- usuarios externos, solo quienes trabajan en sus mismos clientes.
create or replace function private.can_see_profile(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    target_user_id = auth.uid()
    or exists (
      select 1 from public.organization_members self_m
      join public.organization_members other_m on other_m.organization_id = self_m.organization_id
      where self_m.user_id = auth.uid() and other_m.user_id = target_user_id
        and self_m.role not in ('cliente'::public.member_role, 'proveedor_externo'::public.member_role)
    )
    or exists (
      select 1 from public.client_assignments mine
      join public.client_assignments theirs on theirs.client_id = mine.client_id
      where mine.user_id = auth.uid() and mine.active
        and theirs.user_id = target_user_id and theirs.active
    )
  );
$$;

create or replace function private.checklist_client(target_checklist_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select oc.client_id from public.onboarding_checklists oc where oc.id = target_checklist_id;
$$;

create or replace function private.report_client(target_report_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select r.client_id from public.reports r where r.id = target_report_id;
$$;

do $$ declare f text; begin
  foreach f in array array[
    'private.is_leadership(uuid)', 'private.is_internal(uuid)', 'private.is_client_user(uuid)',
    'private.can_read_client(uuid)', 'private.can_read_service(uuid, text)',
    'private.can_read_document(uuid, uuid, uuid, boolean)', 'private.can_see_profile(uuid)',
    'private.checklist_client(uuid)', 'private.report_client(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- La función heredada del esquema inicial no debe ser invocable por anon.
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Columnas para concurrencia, IDs estables, archivo sin pérdida y visibilidad
-- ---------------------------------------------------------------------------
alter table public.clients add column if not exists revision bigint not null default 0;
alter table public.clients add column if not exists archived_at timestamptz;

alter table public.projects add column if not exists revision bigint not null default 0;
alter table public.projects add column if not exists archived_at timestamptz;
alter table public.projects add column if not exists external_key text;

alter table public.tasks add column if not exists revision bigint not null default 0;
alter table public.tasks add column if not exists chain_id text;
alter table public.tasks add column if not exists cycle integer;
alter table public.tasks add column if not exists stage text;
alter table public.tasks add column if not exists previous_task_id uuid references public.tasks(id) on delete set null;
alter table public.tasks add column if not exists client_visible boolean not null default false;

alter table public.documents add column if not exists revision bigint not null default 0;
alter table public.documents add column if not exists archived_at timestamptz;
alter table public.documents add column if not exists external_key text;
alter table public.documents add column if not exists client_visible boolean not null default false;

alter table public.reports add column if not exists revision bigint not null default 0;
alter table public.reports add column if not exists archived_at timestamptz;
alter table public.reports add column if not exists external_key text;
alter table public.reports add column if not exists client_visible boolean not null default false;

alter table public.client_services add column if not exists revision bigint not null default 0;

-- IDs estables: la clave de la preview (p. ej. el id determinístico de una tarea
-- de cadena) se conserva como external_key única por organización. Reintentar la
-- misma transición choca contra este índice en lugar de duplicar.
create unique index if not exists tasks_org_external_key_uidx on public.tasks (organization_id, external_key) where external_key is not null;
create unique index if not exists projects_org_external_key_uidx on public.projects (organization_id, external_key) where external_key is not null;
create unique index if not exists documents_org_external_key_uidx on public.documents (organization_id, external_key) where external_key is not null;
create unique index if not exists reports_org_external_key_uidx on public.reports (organization_id, external_key) where external_key is not null;

-- Una sola tarea activa por instancia de proceso (cadena).
create unique index if not exists tasks_one_active_per_chain_uidx on public.tasks (organization_id, chain_id)
  where chain_id is not null and archived_at is null
    and status in ('pendiente'::public.task_status, 'en_progreso'::public.task_status, 'bloqueada'::public.task_status);
create index if not exists tasks_chain_idx on public.tasks (organization_id, chain_id, cycle);

-- Concurrencia optimista: cada UPDATE incrementa revision. La aplicación actualiza
-- con `where id = $1 and revision = $2`; 0 filas afectadas = conflicto.
create or replace function private.bump_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := coalesce(old.revision, 0) + 1;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['clients', 'projects', 'tasks', 'documents', 'reports', 'client_services'] loop
    execute format('drop trigger if exists bump_%1$s_revision on public.%1$I', t);
    execute format('create trigger bump_%1$s_revision before update on public.%1$I for each row execute function private.bump_revision()', t);
  end loop;
end $$;

-- Integridad entre organizaciones: client_id siempre de la misma organización.
create or replace function private.enforce_client_tenant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients c where c.id = new.client_id and c.organization_id = new.organization_id
  ) then
    raise exception 'AVANS_TENANT_MISMATCH: el cliente no pertenece a la organización' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array[
    'projects', 'tasks', 'documents', 'reports', 'leads', 'discoveries', 'proposals',
    'onboarding_checklists', 'brand_profiles', 'content_items', 'client_services',
    'client_channels', 'client_financials', 'client_competitors', 'benchmark_scan_configs',
    'benchmark_snapshots', 'service_recommendations', 'document_change_proposals',
    'client_report_schedules', 'client_assignments'
  ] loop
    execute format('drop trigger if exists enforce_%1$s_client_tenant on public.%1$I', t);
    execute format('create trigger enforce_%1$s_client_tenant before insert or update of client_id, organization_id on public.%1$I for each row execute function private.enforce_client_tenant()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Asignaciones: validación y protección contra escalamiento
-- ---------------------------------------------------------------------------
create or replace function private.validate_client_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assignee_role public.member_role;
begin
  select om.role into assignee_role from public.organization_members om
  where om.organization_id = new.organization_id and om.user_id = new.user_id;
  if assignee_role is null then
    raise exception 'AVANS_ASSIGNEE_NOT_MEMBER: la persona no es miembro de la organización' using errcode = '42501';
  end if;
  if assignee_role = 'cliente' and (new.can_manage or new.can_edit or new.service_id is not null) then
    raise exception 'AVANS_INVALID_ASSIGNMENT: un usuario Cliente solo puede tener acceso de lectura a nivel cliente' using errcode = '22023';
  end if;
  if assignee_role = 'proveedor_externo' and (new.can_manage or new.service_id is null) then
    raise exception 'AVANS_INVALID_ASSIGNMENT: un Proveedor externo se asigna a un módulo y no gestiona el cliente' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_client_assignment on public.client_assignments;
create trigger validate_client_assignment before insert or update on public.client_assignments
  for each row execute function private.validate_client_assignment();

-- No se puede dejar una organización sin administrador.
create or replace function private.protect_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') and not exists (
    select 1 from public.organization_members om
    where om.organization_id = old.organization_id and om.role = 'admin' and om.id <> old.id
  ) then
    raise exception 'AVANS_LAST_ADMIN: la organización debe conservar al menos un administrador' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
drop trigger if exists protect_last_admin on public.organization_members;
create trigger protect_last_admin before update or delete on public.organization_members
  for each row execute function private.protect_last_admin();

-- ---------------------------------------------------------------------------
-- 4. Invitaciones y restricción de alta (@avans.agency o invitación explícita)
-- ---------------------------------------------------------------------------
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and position('@' in email) > 1),
  role public.member_role not null,
  client_id uuid references public.clients(id) on delete cascade,
  service_id text,
  can_manage boolean not null default false,
  can_edit boolean not null default true,
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role not in ('cliente', 'proveedor_externo') or client_id is not null),
  check (role <> 'proveedor_externo' or service_id is not null)
);
create unique index if not exists user_invitations_open_uidx on public.user_invitations
  (organization_id, email, coalesce(client_id::text, ''), coalesce(service_id, ''))
  where accepted_at is null and revoked_at is null;
drop trigger if exists set_user_invitations_updated_at on public.user_invitations;
create trigger set_user_invitations_updated_at before update on public.user_invitations
  for each row execute function public.set_updated_at();
drop trigger if exists enforce_user_invitations_client_tenant on public.user_invitations;
create trigger enforce_user_invitations_client_tenant before insert or update of client_id, organization_id
  on public.user_invitations for each row execute function private.enforce_client_tenant();

alter table public.user_invitations enable row level security;
revoke all on public.user_invitations from public, anon, authenticated;
grant select, insert, update on public.user_invitations to authenticated;
grant all on public.user_invitations to service_role;
drop policy if exists user_invitations_select on public.user_invitations;
create policy user_invitations_select on public.user_invitations for select to authenticated
  using (private.is_leadership(organization_id));
-- Solo admin invita administradores; socio/gerencia invitan el resto. No hay DELETE: se revoca.
drop policy if exists user_invitations_insert on public.user_invitations;
create policy user_invitations_insert on public.user_invitations for insert to authenticated
  with check (
    private.is_leadership(organization_id)
    and (role <> 'admin' or private.member_has_role(organization_id, array['admin']::public.member_role[]))
    and invited_by = auth.uid() and accepted_at is null
  );
drop policy if exists user_invitations_update on public.user_invitations;
create policy user_invitations_update on public.user_invitations for update to authenticated
  using (private.is_leadership(organization_id))
  with check (
    private.is_leadership(organization_id)
    and (role <> 'admin' or private.member_has_role(organization_id, array['admin']::public.member_role[]))
  );

create or replace function private.allowed_email_domain()
returns text language sql immutable set search_path = '' as $$ select 'avans.agency'::text $$;

create or replace function private.is_allowed_signup(candidate_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select candidate_email is not null and (
    split_part(lower(btrim(candidate_email)), '@', 2) = private.allowed_email_domain()
    or exists (
      select 1 from public.user_invitations i
      where i.email = lower(btrim(candidate_email))
        and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    )
  );
$$;
revoke all on function private.is_allowed_signup(text) from public, anon, authenticated;
grant execute on function private.is_allowed_signup(text) to service_role;

-- Antes de crear un usuario en Auth: solo @avans.agency o con invitación vigente.
-- Defensa en profundidad: la ruta /auth/callback valida lo mismo en el servidor y
-- el parámetro hd=avans.agency de Google es solo una ayuda visual.
create or replace function private.enforce_signup_policy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_allowed_signup(new.email) then
    raise exception 'AVANS_SIGNUP_NOT_ALLOWED: el correo no pertenece a avans.agency ni tiene una invitación vigente'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists avans_enforce_signup_policy on auth.users;
create trigger avans_enforce_signup_policy before insert or update of email on auth.users
  for each row execute function private.enforce_signup_policy();

-- Después del alta: perfil + invitaciones aceptadas. Un @avans.agency sin
-- invitación queda sin membresía (no ve nada) hasta que un administrador lo asigne.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare inv record;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id, lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  for inv in
    select * from public.user_invitations i
    where i.email = lower(btrim(new.email))
      and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    order by i.created_at
  loop
    insert into public.organization_members (organization_id, user_id, role)
    values (inv.organization_id, new.id, inv.role)
    on conflict (organization_id, user_id) do nothing;
    if inv.client_id is not null then
      insert into public.client_assignments (organization_id, client_id, user_id, service_id, assignment_role, can_manage, can_edit)
      values (inv.organization_id, inv.client_id, new.id, inv.service_id, inv.role::text,
        inv.can_manage and inv.role not in ('cliente', 'proveedor_externo'),
        inv.can_edit and inv.role <> 'cliente')
      on conflict do nothing;
    end if;
    update public.user_invitations set accepted_at = now(), accepted_user_id = new.id where id = inv.id;
  end loop;
  return new;
end;
$$;
drop trigger if exists avans_handle_new_user on auth.users;
create trigger avans_handle_new_user after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on function private.enforce_signup_policy() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Auditoría inmutable
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid,
  client_id uuid,
  actor_id uuid,
  actor_role text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists audit_events_org_time_idx on public.audit_events (organization_id, occurred_at desc);
create index if not exists audit_events_row_idx on public.audit_events (table_name, row_id, occurred_at desc);
create index if not exists audit_events_client_idx on public.audit_events (client_id, occurred_at desc) where client_id is not null;

create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_json jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_json jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  base jsonb := coalesce(new_json, old_json);
  org uuid := nullif(base ->> 'organization_id', '')::uuid;
begin
  if tg_op = 'UPDATE' and old_json = new_json then return new; end if;
  insert into public.audit_events (organization_id, client_id, actor_id, actor_role, action, table_name, row_id, old_data, new_data)
  values (
    org,
    case when tg_table_name = 'clients' then nullif(base ->> 'id', '')::uuid else nullif(base ->> 'client_id', '')::uuid end,
    auth.uid(),
    coalesce(auth.jwt() ->> 'role', current_user),
    tg_op, tg_table_name, base ->> 'id', old_json, new_json
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.audit_row() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array[
    'organization_members', 'client_assignments', 'user_invitations', 'clients', 'client_services',
    'client_financials', 'projects', 'tasks', 'documents', 'reports', 'integrations'
  ] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function private.audit_row()', t);
  end loop;
end $$;

create or replace function private.reject_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'AVANS_IMMUTABLE: % es de solo agregado', tg_table_name using errcode = '42501';
end;
$$;
drop trigger if exists audit_events_immutable on public.audit_events;
create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function private.reject_mutation();
drop trigger if exists audit_events_no_truncate on public.audit_events;
create trigger audit_events_no_truncate before truncate on public.audit_events
  for each statement execute function private.reject_mutation();

alter table public.audit_events enable row level security;
revoke all on public.audit_events from public, anon, authenticated;
grant select on public.audit_events to authenticated;
grant select, insert on public.audit_events to service_role;
drop policy if exists audit_events_read on public.audit_events;
create policy audit_events_read on public.audit_events for select to authenticated using (
  (organization_id is not null and private.is_leadership(organization_id))
  or (client_id is not null and private.can_manage_client(client_id))
);

-- ---------------------------------------------------------------------------
-- 6. Historial de transiciones de tareas
-- ---------------------------------------------------------------------------
create table if not exists public.task_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  chain_id text,
  event text not null check (event in ('created', 'status_changed', 'reassigned', 'archived')),
  from_status public.task_status,
  to_status public.task_status,
  from_assignee uuid,
  to_assignee uuid,
  actor_id uuid,
  occurred_at timestamptz not null default now()
);
create index if not exists task_events_task_idx on public.task_events (task_id, occurred_at);
create index if not exists task_events_chain_idx on public.task_events (organization_id, chain_id, occurred_at) where chain_id is not null;

create or replace function private.record_task_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_events (organization_id, task_id, chain_id, event, to_status, to_assignee, actor_id)
    values (new.organization_id, new.id, new.chain_id, 'created', new.status, new.assigned_to, auth.uid());
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.task_events (organization_id, task_id, chain_id, event, from_status, to_status, actor_id)
    values (new.organization_id, new.id, new.chain_id, 'status_changed', old.status, new.status, auth.uid());
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.task_events (organization_id, task_id, chain_id, event, from_assignee, to_assignee, actor_id)
    values (new.organization_id, new.id, new.chain_id, 'reassigned', old.assigned_to, new.assigned_to, auth.uid());
  end if;
  if new.archived_at is not null and old.archived_at is null then
    insert into public.task_events (organization_id, task_id, chain_id, event, from_status, to_status, actor_id)
    values (new.organization_id, new.id, new.chain_id, 'archived', old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
revoke all on function private.record_task_event() from public, anon, authenticated;
drop trigger if exists record_task_event on public.tasks;
create trigger record_task_event after insert or update on public.tasks
  for each row execute function private.record_task_event();
drop trigger if exists task_events_immutable on public.task_events;
create trigger task_events_immutable before update or delete on public.task_events
  for each row execute function private.reject_mutation();

alter table public.task_events enable row level security;
revoke all on public.task_events from public, anon, authenticated;
grant select on public.task_events to authenticated;
grant select, insert on public.task_events to service_role;
-- La subconsulta corre con los permisos de quien consulta: aplica la RLS de tasks.
drop policy if exists task_events_read on public.task_events;
create policy task_events_read on public.task_events for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_events.task_id));

-- ---------------------------------------------------------------------------
-- 7. Políticas de lectura con aislamiento por cliente y módulo
-- ---------------------------------------------------------------------------
drop policy if exists clients_select_members on public.clients;
create policy clients_select_scoped on public.clients for select to authenticated
  using (private.can_read_client(id));

drop policy if exists projects_select_members on public.projects;
create policy projects_select_scoped on public.projects for select to authenticated using (
  case when client_id is null then private.is_internal(organization_id)
  else private.can_read_service(client_id, service_id) end
);

drop policy if exists tasks_select_members on public.tasks;
create policy tasks_select_scoped on public.tasks for select to authenticated using (
  case when client_id is null then private.is_internal(organization_id)
  else private.can_read_service(client_id, service_id)
    and (not private.is_client_user(organization_id) or client_visible) end
);

drop policy if exists documents_select_members on public.documents;
create policy documents_select_scoped on public.documents for select to authenticated
  using (private.can_read_document(organization_id, client_id, project_id, client_visible));

drop policy if exists reports_select_members on public.reports;
create policy reports_select_scoped on public.reports for select to authenticated using (
  private.can_read_client(client_id)
  and (private.is_internal(organization_id) or (private.is_client_user(organization_id) and client_visible))
);

-- Borrado físico solo para administración; el resto archiva (archived_at).
drop policy if exists projects_delete_service_editors on public.projects;
create policy projects_delete_admins on public.projects for delete to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]));
drop policy if exists tasks_delete_service_editors on public.tasks;
create policy tasks_delete_admins on public.tasks for delete to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]));
drop policy if exists documents_delete_managers on public.documents;
create policy documents_delete_admins on public.documents for delete to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]));
drop policy if exists reports_delete_managers on public.reports;
create policy reports_delete_admins on public.reports for delete to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]));

-- Socios y Gerencia también pueden dar de alta clientes.
drop policy if exists clients_insert_managers on public.clients;
create policy clients_insert_managers on public.clients for insert to authenticated with check (
  private.member_has_role(organization_id, array['admin', 'socio', 'gerencia', 'project_manager']::public.member_role[])
);

drop policy if exists client_assignments_select on public.client_assignments;
drop policy if exists client_assignments_manage on public.client_assignments;
create policy client_assignments_select on public.client_assignments for select to authenticated using (
  user_id = auth.uid()
  or private.is_leadership(organization_id)
  or (private.is_internal(organization_id) and private.can_read_client(client_id))
);
-- Antes cualquier PM podía asignarse a cualquier cliente. Ahora: dirección, o quien
-- ya gestiona ese cliente, y solo dirección otorga can_manage.
create policy client_assignments_insert on public.client_assignments for insert to authenticated with check (
  private.is_leadership(organization_id) or (private.can_manage_client(client_id) and not can_manage)
);
create policy client_assignments_update on public.client_assignments for update to authenticated
  using (private.is_leadership(organization_id) or private.can_manage_client(client_id))
  with check (private.is_leadership(organization_id) or (private.can_manage_client(client_id) and not can_manage));
create policy client_assignments_delete on public.client_assignments for delete to authenticated
  using (private.is_leadership(organization_id));

drop policy if exists client_services_select on public.client_services;
create policy client_services_select on public.client_services for select to authenticated
  using (private.can_read_service(client_id, service_id));
drop policy if exists client_channels_select on public.client_channels;
create policy client_channels_select on public.client_channels for select to authenticated
  using (private.can_read_client(client_id));

do $$ declare t text; begin
  foreach t in array array['client_competitors', 'benchmark_scan_configs', 'benchmark_snapshots', 'client_report_schedules'] loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format('create policy %1$s_select on public.%1$I for select to authenticated using (private.is_internal(organization_id) and private.can_read_client(client_id))', t);
  end loop;
end $$;
drop policy if exists service_recommendations_select on public.service_recommendations;
create policy service_recommendations_select on public.service_recommendations for select to authenticated
  using (private.is_internal(organization_id) and private.can_read_service(client_id, service_id));

drop policy if exists profiles_select_org_colleagues on public.profiles;
create policy profiles_select_scoped on public.profiles for select to authenticated
  using (private.can_see_profile(id));

drop policy if exists "members_select_own_orgs" on public.organization_members;
create policy members_select_scoped on public.organization_members for select to authenticated
  using (user_id = auth.uid() or private.is_internal(organization_id));

-- ---------------------------------------------------------------------------
-- 8. Tablas del esquema inicial: de "cualquier miembro todo" a alcance por rol
-- ---------------------------------------------------------------------------
drop policy if exists "leads_org_access" on public.leads;
drop policy if exists "lead_messages_org_access" on public.lead_messages;
drop policy if exists "proposals_org_access" on public.proposals;
do $$ declare t text; begin
  foreach t in array array['leads', 'lead_messages', 'proposals'] loop
    execute format('create policy %1$s_select_internal on public.%1$I for select to authenticated using (private.is_internal(organization_id))', t);
    execute format($p$create policy %1$s_write_commercial on public.%1$I for all to authenticated
      using (private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[]))
      with check (private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[]))$p$, t);
  end loop;
end $$;

drop policy if exists "discoveries_org_access" on public.discoveries;
drop policy if exists "onboarding_checklists_org_access" on public.onboarding_checklists;
drop policy if exists "brand_profiles_org_access" on public.brand_profiles;
do $$ declare t text; begin
  foreach t in array array['discoveries', 'onboarding_checklists', 'brand_profiles'] loop
    execute format('create policy %1$s_select_scoped on public.%1$I for select to authenticated using (private.is_internal(organization_id) and (client_id is null or private.can_read_client(client_id)))', t);
    execute format($p$create policy %1$s_write_scoped on public.%1$I for all to authenticated
      using (case when client_id is null then private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[]) else private.can_manage_client(client_id) end)
      with check (case when client_id is null then private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[]) else private.can_manage_client(client_id) end)$p$, t);
  end loop;
end $$;

drop policy if exists "onboarding_items_org_access" on public.onboarding_items;
create policy onboarding_items_select_scoped on public.onboarding_items for select to authenticated using (
  private.is_internal(organization_id)
  and (private.checklist_client(checklist_id) is null or private.can_read_client(private.checklist_client(checklist_id)))
);
create policy onboarding_items_write_scoped on public.onboarding_items for all to authenticated
  using (case when private.checklist_client(checklist_id) is null
    then private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[])
    else private.can_manage_client(private.checklist_client(checklist_id)) end)
  with check (case when private.checklist_client(checklist_id) is null
    then private.member_has_role(organization_id, array['admin','socio','gerencia','comercial','project_manager']::public.member_role[])
    else private.can_manage_client(private.checklist_client(checklist_id)) end);

drop policy if exists "content_items_org_access" on public.content_items;
create policy content_items_select_scoped on public.content_items for select to authenticated using (
  private.is_internal(organization_id)
  and (client_id is null or private.can_read_service(client_id, 'contenidos'))
);
create policy content_items_write_scoped on public.content_items for all to authenticated
  using (client_id is not null and private.can_edit_service(client_id, 'contenidos'))
  with check (client_id is not null and private.can_edit_service(client_id, 'contenidos'));

drop policy if exists "report_metrics_org_access" on public.report_metrics;
create policy report_metrics_select_scoped on public.report_metrics for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_metrics.report_id));
create policy report_metrics_write_scoped on public.report_metrics for all to authenticated
  using (private.can_manage_client(private.report_client(report_id)))
  with check (private.can_manage_client(private.report_client(report_id)));

drop policy if exists "approvals_org_access" on public.approvals;
create policy approvals_scoped on public.approvals for all to authenticated
  using (private.is_internal(organization_id) and (
    private.is_leadership(organization_id) or reviewer_id = auth.uid() or requested_by = auth.uid()
    or private.member_has_role(organization_id, array['project_manager']::public.member_role[])))
  with check (private.is_internal(organization_id) and (
    private.is_leadership(organization_id) or reviewer_id = auth.uid() or requested_by = auth.uid()
    or private.member_has_role(organization_id, array['project_manager']::public.member_role[])));

drop policy if exists "agents_org_access" on public.agents;
create policy agents_select_internal on public.agents for select to authenticated
  using (private.is_internal(organization_id));
create policy agents_write_admins on public.agents for all to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]))
  with check (private.member_has_role(organization_id, array['admin']::public.member_role[]));

-- Ejecuciones de IA, logs e integraciones: lectura de dirección/admin; escritura
-- solo desde el servidor (service_role). integrations.config nunca debe guardar tokens.
drop policy if exists "agent_runs_org_access" on public.agent_runs;
drop policy if exists "automation_logs_org_access" on public.automation_logs;
drop policy if exists "integrations_org_access" on public.integrations;
create policy agent_runs_read_leadership on public.agent_runs for select to authenticated
  using (private.is_leadership(organization_id));
create policy automation_logs_read_leadership on public.automation_logs for select to authenticated
  using (organization_id is not null and private.is_leadership(organization_id));
create policy integrations_read_admins on public.integrations for select to authenticated
  using (private.member_has_role(organization_id, array['admin']::public.member_role[]));
revoke insert, update, delete on public.agent_runs, public.automation_logs, public.integrations from anon, authenticated;
revoke all on public.agent_runs, public.automation_logs, public.integrations from anon;
grant select on public.agent_runs, public.automation_logs, public.integrations to authenticated;
grant all on public.agent_runs, public.automation_logs, public.integrations to service_role;

-- TRUNCATE no respeta RLS: los roles de API no lo necesitan (tampoco TRIGGER/REFERENCES).
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Ninguna tabla operativa es accesible para anon.
do $$ declare t text; begin
  foreach t in array array[
    'organizations', 'profiles', 'organization_members', 'leads', 'lead_messages', 'discoveries',
    'proposals', 'onboarding_checklists', 'onboarding_items', 'brand_profiles', 'content_items',
    'report_metrics', 'approvals', 'agents'
  ] loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

comment on table public.audit_events is 'Auditoría de solo agregado: triggers security definer; UPDATE/DELETE/TRUNCATE rechazados.';
comment on table public.task_events is 'Historial inmutable de transiciones de tareas.';
comment on table public.user_invitations is 'Alta de usuarios externos (Cliente, Proveedor) y asignación inicial. Sin DELETE: se revoca.';

commit;
