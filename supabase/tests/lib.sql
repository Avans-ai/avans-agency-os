-- Helpers de prueba (solo base local descartable).
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Simula una sesión de Supabase: rol de API + claims del JWT.
create or replace function tests.login(uid uuid, email text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', email)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
create or replace function tests.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create or replace function tests.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end $$;

create or replace function tests.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'not ok - %', label; end if;
  raise notice 'ok - %', label;
end $$;

create or replace function tests.rows(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from (%s) s', stmt) into n;
  return n;
end $$;

-- Ejecuta una mutación y devuelve filas afectadas (RLS filtra en silencio UPDATE/DELETE).
create or replace function tests.affected(stmt text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function tests.throws(stmt text, label text, pattern text default null) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if pattern is null or sqlerrm ilike pattern then
      raise notice 'ok - % (rechazado: %)', label, left(sqlerrm, 90);
      return;
    end if;
    raise exception 'not ok - % (error inesperado: %)', label, sqlerrm;
  end;
  raise exception 'not ok - % (la operación no falló)', label;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;
