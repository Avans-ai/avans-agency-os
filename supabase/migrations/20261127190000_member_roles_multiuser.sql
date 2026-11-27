-- Avans OS · Etapa 1 · Roles de la plataforma multiusuario.
-- Aditiva y no destructiva: solo agrega valores al enum existente. Los valores
-- previos (comercial, trafficker, finance, viewer) se conservan para no romper
-- datos ni políticas existentes.
--
-- Va en un archivo separado porque Postgres no permite usar un valor de enum
-- agregado dentro de la misma transacción en la que se crea.
--
-- Mapa de roles de negocio → valor técnico:
--   Administrador      → admin
--   Socios             → socio
--   Gerencia           → gerencia
--   PM                 → project_manager
--   Content Manager    → content_manager
--   Diseñador          → designer
--   Líder técnico      → lider_tecnico
--   Cliente            → cliente            (externo, solo su cliente)
--   Proveedor externo  → proveedor_externo  (externo, solo su módulo asignado)
alter type public.member_role add value if not exists 'socio';
alter type public.member_role add value if not exists 'gerencia';
alter type public.member_role add value if not exists 'lider_tecnico';
alter type public.member_role add value if not exists 'cliente';
alter type public.member_role add value if not exists 'proveedor_externo';
