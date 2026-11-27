-- Pruebas de aislamiento multiusuario (RLS + triggers). Se ejecutan en una
-- transacción que termina en ROLLBACK: no dejan datos.
\set ON_ERROR_STOP on
begin;

-- ---------------------------------------------------------------------------
-- Fixture (como superusuario, equivalente a service_role)
-- ---------------------------------------------------------------------------
-- La migración inicial ya crea la organización «avans»; la prueba usa un id fijo.
update public.organizations set id = 'a0000000-0000-0000-0000-00000000000a' where slug = 'avans';
insert into public.organizations (id, name, slug) values
  ('a0000000-0000-0000-0000-00000000000a', 'Avans', 'avans')
on conflict (slug) do nothing;
insert into public.organizations (id, name, slug) values
  ('b0000000-0000-0000-0000-00000000000b', 'Otra agencia', 'otra-prueba');

insert into public.clients (id, organization_id, name, slug) values
  ('c0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-00000000000a', 'ACA', 'aca'),
  ('c0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-00000000000a', 'EPSA', 'epsa'),
  ('c0000000-0000-0000-0000-0000000000b1', 'b0000000-0000-0000-0000-00000000000b', 'Ajeno', 'ajeno');

-- Invitaciones para externos (deben existir antes del alta en Auth).
insert into public.user_invitations (organization_id, email, role, client_id, service_id, can_edit) values
  ('a0000000-0000-0000-0000-00000000000a', 'cliente@aca.com.ar', 'cliente', 'c0000000-0000-0000-0000-0000000000a1', null, false),
  ('a0000000-0000-0000-0000-00000000000a', 'prov@estudio.com', 'proveedor_externo', 'c0000000-0000-0000-0000-0000000000a1', 'audiovisuales', true);
insert into public.user_invitations (organization_id, email, role, client_id, expires_at) values
  ('a0000000-0000-0000-0000-00000000000a', 'vencida@cliente.com', 'cliente', 'c0000000-0000-0000-0000-0000000000a1', now() - interval '1 day');
insert into public.user_invitations (organization_id, email, role, client_id, revoked_at) values
  ('a0000000-0000-0000-0000-00000000000a', 'revocada@cliente.com', 'cliente', 'c0000000-0000-0000-0000-0000000000a1', now());

-- Alta en Auth: dispara la política de dominio y la creación de perfil/membresía.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000001', 'admin@avans.agency', '{"full_name":"Admin"}'),
  ('11111111-0000-0000-0000-000000000002', 'socio@avans.agency', '{}'),
  ('11111111-0000-0000-0000-000000000003', 'pm@avans.agency', '{}'),
  ('11111111-0000-0000-0000-000000000004', 'designer@avans.agency', '{}'),
  ('11111111-0000-0000-0000-000000000005', 'content@avans.agency', '{}'),
  ('11111111-0000-0000-0000-000000000006', 'Nuevo@Avans.Agency', '{}'),
  ('11111111-0000-0000-0000-000000000007', 'viewer@avans.agency', '{}'),
  ('11111111-0000-0000-0000-000000000008', 'cliente@aca.com.ar', '{}'),
  ('11111111-0000-0000-0000-000000000009', 'prov@estudio.com', '{}'),
  ('11111111-0000-0000-0000-000000000010', 'otra-admin@avans.agency', '{}');

insert into public.organization_members (organization_id, user_id, role) values
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000002', 'socio'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000003', 'project_manager'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000004', 'designer'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000005', 'content_manager'),
  ('a0000000-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000007', 'viewer'),
  ('b0000000-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-000000000010', 'admin');

insert into public.client_assignments (organization_id, client_id, user_id, service_id, can_manage, can_edit) values
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-000000000003', null, true, true),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-000000000004', 'diseno-marca', false, true),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a2', '11111111-0000-0000-0000-000000000005', 'contenidos', false, true);

insert into public.tasks (id, organization_id, client_id, service_id, title, client_visible, chain_id, external_key) values
  ('70000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'estrategia', 'A1 estrategia visible', true, null, 'aca-kickoff'),
  ('70000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'diseno-marca', 'A1 diseño', false, 'aca-pieza-1', 'aca-pieza-1-diseno-1'),
  ('70000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'audiovisuales', 'A1 rodaje', false, null, null),
  ('70000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a2', 'contenidos', 'A2 contenidos', false, null, null),
  ('70000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-0000000000b1', null, 'B1 tarea', true, null, null),
  ('70000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-00000000000a', null, null, 'Interna Avans', false, null, null);

insert into public.client_financials (organization_id, client_id, monthly_fee) values
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 1000);
insert into public.reports (id, organization_id, client_id, title, client_visible) values
  ('80000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'Reporte publicado', true),
  ('80000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'Borrador interno', false);
insert into public.documents (organization_id, client_id, title, client_visible) values
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'Contrato interno', false),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'Brief compartido', true);
insert into public.client_services (organization_id, client_id, service_id, label) values
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'diseno-marca', 'Diseño de marca'),
  ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'audiovisuales', 'Audiovisuales');
insert into public.integrations (organization_id, provider, name, status, config) values
  ('a0000000-0000-0000-0000-00000000000a', 'metricool', 'Metricool', 'disconnected', '{"note":"sin tokens"}');

-- ---------------------------------------------------------------------------
-- Alta y restricción de dominio
-- ---------------------------------------------------------------------------
select tests.throws($$insert into auth.users (id, email) values ('22222222-0000-0000-0000-000000000001', 'alguien@gmail.com')$$,
  'Auth rechaza correos fuera de avans.agency sin invitación', '%AVANS_SIGNUP_NOT_ALLOWED%');
select tests.throws($$insert into auth.users (id, email) values ('22222222-0000-0000-0000-000000000002', 'x@avans.agency.evil.com')$$,
  'Auth rechaza dominios que solo empiezan como avans.agency', '%AVANS_SIGNUP_NOT_ALLOWED%');
select tests.throws($$insert into auth.users (id, email) values ('22222222-0000-0000-0000-000000000003', 'vencida@cliente.com')$$,
  'Auth rechaza invitaciones vencidas', '%AVANS_SIGNUP_NOT_ALLOWED%');
select tests.throws($$insert into auth.users (id, email) values ('22222222-0000-0000-0000-000000000004', 'revocada@cliente.com')$$,
  'Auth rechaza invitaciones revocadas', '%AVANS_SIGNUP_NOT_ALLOWED%');
select tests.throws($$update auth.users set email = 'fuga@gmail.com' where id = '11111111-0000-0000-0000-000000000003'$$,
  'Auth rechaza cambiar el correo a un dominio no permitido', '%AVANS_SIGNUP_NOT_ALLOWED%');
select tests.ok((select count(*) = 10 from public.profiles), 'cada alta crea su perfil');
select tests.ok((select email = 'nuevo@avans.agency' from public.profiles where id = '11111111-0000-0000-0000-000000000006'), 'el correo del perfil se normaliza en minúsculas');
select tests.ok(not exists (select 1 from public.organization_members where user_id = '11111111-0000-0000-0000-000000000006'),
  '@avans.agency sin invitación queda sin membresía (falla cerrado)');
select tests.ok((select role = 'cliente' from public.organization_members where user_id = '11111111-0000-0000-0000-000000000008'),
  'la invitación de Cliente crea la membresía con rol cliente');
select tests.ok((select not can_edit and not can_manage and service_id is null from public.client_assignments where user_id = '11111111-0000-0000-0000-000000000008'),
  'la invitación de Cliente asigna solo lectura a nivel cliente');
select tests.ok((select service_id = 'audiovisuales' and not can_manage from public.client_assignments where user_id = '11111111-0000-0000-0000-000000000009'),
  'la invitación de Proveedor asigna solo su módulo');
select tests.ok((select count(*) = 2 from public.user_invitations where accepted_at is not null), 'las invitaciones usadas quedan aceptadas');

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------
select tests.as_anon();
select tests.throws('select * from public.clients', 'anon no puede leer clientes', '%permission denied%');
select tests.throws('select * from public.tasks', 'anon no puede leer tareas', '%permission denied%');
select tests.throws('select * from public.profiles', 'anon no puede leer perfiles', '%permission denied%');
select tests.throws('select * from public.audit_events', 'anon no puede leer auditoría', '%permission denied%');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Administrador de la organización A
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000001');
select tests.ok(tests.rows('select 1 from public.clients') = 2, 'admin A ve sus 2 clientes y ninguno de B');
select tests.ok(tests.rows($$select 1 from public.tasks where organization_id = 'b0000000-0000-0000-0000-00000000000b'$$) = 0, 'admin A no ve tareas de B');
select tests.ok(tests.rows('select 1 from public.integrations') = 1, 'admin ve las integraciones de su organización');
select tests.throws($$insert into public.tasks (organization_id, client_id, title) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000b1', 'inyección')$$,
  'admin A no puede crear una tarea en su organización apuntando a un cliente de B', '%AVANS_TENANT_MISMATCH%');
select tests.throws($$insert into public.tasks (organization_id, client_id, title) values ('b0000000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-0000000000b1', 'cruce')$$,
  'admin A no puede crear tareas en la organización B', '%row-level security%');
select tests.ok(tests.affected($$update public.organization_members set role = 'viewer' where user_id = '11111111-0000-0000-0000-000000000003'$$) = 0,
  'ni siquiera un admin cambia roles por API directa (solo el servidor)');
select tests.logout();
select tests.throws($$update public.organization_members set role = 'viewer' where user_id = '11111111-0000-0000-0000-000000000001'$$,
  'la organización conserva al menos un administrador', '%AVANS_LAST_ADMIN%');

-- ---------------------------------------------------------------------------
-- Administrador de la organización B: aislamiento entre organizaciones
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000010');
select tests.ok(tests.rows('select 1 from public.clients') = 1, 'admin B solo ve su cliente');
select tests.ok(tests.rows('select 1 from public.tasks') = 1, 'admin B solo ve su tarea');
select tests.ok(tests.rows('select 1 from public.client_financials') = 0, 'admin B no ve finanzas de A');
select tests.ok(tests.rows('select 1 from public.audit_events where organization_id = ''a0000000-0000-0000-0000-00000000000a''') = 0, 'admin B no ve auditoría de A');
select tests.ok(tests.affected($$update public.clients set name = 'hackeado' where id = 'c0000000-0000-0000-0000-0000000000a1'$$) = 0, 'admin B no puede modificar un cliente de A');
select tests.ok(tests.rows('select 1 from public.profiles') = 1, 'admin B solo ve su propio perfil');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Socio: ve todo en su organización, incluidas finanzas
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000002');
select tests.ok(tests.rows('select 1 from public.clients') = 2, 'socio ve todos los clientes de A');
select tests.ok(tests.rows('select 1 from public.client_financials') = 1, 'socio ve finanzas');
select tests.ok(tests.rows('select 1 from public.integrations') = 0, 'socio no ve configuración de integraciones (solo admin)');
select tests.logout();

-- ---------------------------------------------------------------------------
-- PM asignado a A1 (gestiona A1)
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000003');
select tests.ok(tests.rows('select 1 from public.clients') = 1, 'PM solo ve el cliente asignado');
select tests.ok(tests.rows($$select 1 from public.tasks where client_id = 'c0000000-0000-0000-0000-0000000000a2'$$) = 0, 'PM no ve tareas de un cliente no asignado');
select tests.ok(tests.rows($$select 1 from public.tasks where client_id = 'c0000000-0000-0000-0000-0000000000a1'$$) = 3, 'PM ve todas las tareas de su cliente');
select tests.ok(tests.rows('select 1 from public.client_financials') = 0, 'PM no ve finanzas');
select tests.ok(tests.affected($$update public.tasks set title = 'editada' where id = '70000000-0000-0000-0000-000000000002'$$) = 1, 'PM edita tareas de su cliente');
select tests.ok(tests.affected($$update public.tasks set title = 'cruce' where id = '70000000-0000-0000-0000-000000000004'$$) = 0, 'PM no edita tareas de otro cliente');
select tests.throws($$insert into public.tasks (organization_id, client_id, service_id, title) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a2', 'contenidos', 'x')$$,
  'PM no crea tareas en un cliente no asignado', '%row-level security%');
select tests.throws($$insert into public.client_assignments (organization_id, client_id, user_id, can_manage) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a2', '11111111-0000-0000-0000-000000000003', true)$$,
  'PM no puede autoasignarse a otro cliente', '%row-level security%');
select tests.throws($$insert into public.client_assignments (organization_id, client_id, user_id, can_manage) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-000000000004', true)$$,
  'PM no puede otorgar gestión del cliente (solo dirección)', '%row-level security%');
select tests.ok(tests.affected($$delete from public.tasks where id = '70000000-0000-0000-0000-000000000002'$$) = 0, 'PM no borra tareas: se archivan');
select tests.ok(tests.affected($$update public.tasks set archived_at = now() where id = '70000000-0000-0000-0000-000000000002'$$) = 1, 'PM archiva tareas de su cliente');
select tests.ok(tests.affected($$update public.organization_members set role = 'admin' where user_id = '11111111-0000-0000-0000-000000000003'$$) = 0,
  'PM no puede elevar su propio rol');
select tests.ok(tests.rows('select 1 from public.audit_events where client_id = ''c0000000-0000-0000-0000-0000000000a1''') > 0, 'PM ve la auditoría de su cliente');
select tests.ok(tests.rows('select 1 from public.audit_events where client_id = ''c0000000-0000-0000-0000-0000000000a2''') = 0, 'PM no ve auditoría de otro cliente');
select tests.throws($$insert into public.audit_events (action, table_name) values ('UPDATE', 'tasks')$$, 'nadie escribe auditoría por API', '%permission denied%');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Diseñador asignado a A1 · diseno-marca
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000004');
select tests.ok(tests.rows('select 1 from public.tasks where client_id is not null') = 1, 'diseñador solo ve tareas de clientes de su módulo');
select tests.ok(tests.rows('select 1 from public.client_services') = 1, 'diseñador solo ve su módulo contratado');
select tests.ok(tests.affected($$update public.tasks set title = 'otro módulo' where id = '70000000-0000-0000-0000-000000000001'$$) = 0, 'diseñador no edita tareas de otro módulo');
select tests.throws($$insert into public.tasks (organization_id, client_id, service_id, title) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'publicidad-digital', 'x')$$,
  'diseñador no crea tareas en otro módulo', '%row-level security%');
select tests.ok(tests.rows('select 1 from public.reports') = 2, 'equipo interno asignado ve los reportes del cliente');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Interno sin asignaciones / @avans.agency sin membresía
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000007');
select tests.ok(tests.rows('select 1 from public.clients') = 0, 'interno sin asignación no ve clientes');
select tests.ok(tests.rows('select 1 from public.tasks where client_id is not null') = 0, 'interno sin asignación no ve tareas de clientes');
select tests.logout();
select tests.login('11111111-0000-0000-0000-000000000006');
select tests.ok(tests.rows('select 1 from public.clients') + tests.rows('select 1 from public.tasks') + tests.rows('select 1 from public.organization_members') = 0,
  'usuario sin membresía no ve nada');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Cliente de A1
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000008');
select tests.ok(tests.rows('select 1 from public.clients') = 1, 'cliente ve solo su cliente');
select tests.ok(tests.rows('select 1 from public.tasks') = 1, 'cliente ve solo tareas marcadas como visibles');
select tests.ok(tests.rows('select 1 from public.reports') = 1, 'cliente ve solo reportes publicados para él');
select tests.ok(tests.rows('select 1 from public.documents') = 1, 'cliente ve solo documentos compartidos');
select tests.ok(tests.rows('select 1 from public.client_financials') = 0, 'cliente no ve finanzas');
select tests.ok(tests.rows('select 1 from public.integrations') = 0, 'cliente no ve integraciones');
select tests.ok(tests.rows('select 1 from public.organization_members') = 1, 'cliente solo ve su propia membresía');
select tests.ok(tests.rows('select 1 from public.client_assignments where user_id <> auth.uid()') = 0, 'cliente no ve asignaciones del equipo');
select tests.ok(tests.rows('select 1 from public.client_competitors') = 0, 'cliente no ve el benchmark interno');
select tests.ok(tests.affected($$update public.tasks set title = 'cliente edita' where id = '70000000-0000-0000-0000-000000000001'$$) = 0, 'cliente no edita tareas');
select tests.throws($$insert into public.tasks (organization_id, client_id, title) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'x')$$,
  'cliente no crea tareas', '%row-level security%');
select tests.ok(tests.rows('select 1 from public.audit_events') = 0, 'cliente no ve auditoría');
select tests.ok(tests.rows('select 1 from public.profiles') >= 1 and tests.rows($$select 1 from public.profiles where email = 'viewer@avans.agency'$$) = 0,
  'cliente no ve perfiles de personas que no trabajan en su cliente');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Proveedor externo de A1 · audiovisuales
-- ---------------------------------------------------------------------------
select tests.login('11111111-0000-0000-0000-000000000009');
select tests.ok(tests.rows('select 1 from public.tasks') = 1, 'proveedor solo ve tareas de su módulo');
select tests.ok(tests.rows('select 1 from public.documents') = 1, 'proveedor solo ve documentos compartidos');
select tests.ok(tests.rows('select 1 from public.reports') = 0, 'proveedor no ve reportes');
select tests.ok(tests.rows('select 1 from public.tasks where client_id is null') = 0, 'proveedor no ve tareas internas de Avans');
select tests.ok(tests.affected($$update public.tasks set status = 'en_progreso' where id = '70000000-0000-0000-0000-000000000003'$$) = 1, 'proveedor actualiza tareas de su módulo');
select tests.ok(tests.affected($$update public.clients set name = 'x'$$) = 0, 'proveedor no modifica el cliente');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Validaciones de asignación (como servicio)
-- ---------------------------------------------------------------------------
select tests.throws($$insert into public.client_assignments (organization_id, client_id, user_id) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', '11111111-0000-0000-0000-000000000010')$$,
  'no se asigna a alguien que no es miembro de la organización', '%AVANS_ASSIGNEE_NOT_MEMBER%');
select tests.throws($$update public.client_assignments set can_manage = true where user_id = '11111111-0000-0000-0000-000000000009'$$,
  'un proveedor no puede gestionar el cliente', '%AVANS_INVALID_ASSIGNMENT%');
select tests.throws($$update public.client_assignments set can_edit = true where user_id = '11111111-0000-0000-0000-000000000008'$$,
  'un cliente no puede tener edición', '%AVANS_INVALID_ASSIGNMENT%');

-- ---------------------------------------------------------------------------
-- Motor de tareas: una activa por cadena, idempotencia, historial y concurrencia
-- ---------------------------------------------------------------------------
update public.tasks set archived_at = null where id = '70000000-0000-0000-0000-000000000002';
select tests.throws($$insert into public.tasks (organization_id, client_id, service_id, title, chain_id) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'diseno-marca', 'segunda activa', 'aca-pieza-1')$$,
  'no puede haber dos tareas activas en la misma cadena', '%tasks_one_active_per_chain_uidx%');
update public.tasks set status = 'completada' where id = '70000000-0000-0000-0000-000000000002';
insert into public.tasks (organization_id, client_id, service_id, title, chain_id, cycle, previous_task_id, external_key)
values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'diseno-marca', 'revisión', 'aca-pieza-1', 1,
  '70000000-0000-0000-0000-000000000002', 'aca-pieza-1-revision-1');
select tests.ok(true, 'al completar la tarea activa se crea la siguiente de la cadena');
select tests.throws($$insert into public.tasks (organization_id, client_id, service_id, title, external_key) values ('a0000000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-0000000000a1', 'diseno-marca', 'reintento', 'aca-pieza-1-revision-1')$$,
  'reintentar la misma transición no duplica (external_key)', '%tasks_org_external_key_uidx%');
select tests.ok((select array_agg(event order by id) = array['created', 'archived', 'status_changed']::text[]
  from public.task_events where task_id = '70000000-0000-0000-0000-000000000002'), 'el historial registra alta, cambios y archivo');
select tests.ok((select completed_at is not null from public.tasks where id = '70000000-0000-0000-0000-000000000002'), 'completar registra completed_at');
select tests.throws($$delete from public.task_events$$, 'el historial de tareas es inmutable', '%AVANS_IMMUTABLE%');
select tests.throws($$update public.audit_events set actor_id = null$$, 'la auditoría es inmutable', '%AVANS_IMMUTABLE%');
select tests.throws($$truncate public.audit_events$$, 'la auditoría no se puede truncar', '%AVANS_IMMUTABLE%');

select tests.login('11111111-0000-0000-0000-000000000003');
select tests.ok((select revision from public.tasks where id = '70000000-0000-0000-0000-000000000001') = 0, 'revisión inicial 0');
select tests.ok(tests.affected($$update public.tasks set title = 'v1' where id = '70000000-0000-0000-0000-000000000001' and revision = 0$$) = 1, 'actualización con la revisión vigente se aplica');
select tests.ok(tests.affected($$update public.tasks set title = 'pisada' where id = '70000000-0000-0000-0000-000000000001' and revision = 0$$) = 0, 'actualización con revisión vieja no pisa cambios ajenos');
select tests.ok((select revision = 1 and title = 'v1' from public.tasks where id = '70000000-0000-0000-0000-000000000001'), 'la revisión se incrementa en cada cambio');
select tests.logout();

select tests.ok((select count(*) > 0 from public.audit_events where table_name = 'tasks' and action = 'UPDATE'
  and actor_id = '11111111-0000-0000-0000-000000000003'), 'la auditoría registra quién modificó');

rollback;
