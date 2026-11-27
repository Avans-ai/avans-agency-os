#!/usr/bin/env bash
# Pruebas de base de datos de Avans OS contra un Postgres DESCARTABLE.
#
#   scripts/db/test-rls.sh                 # levanta un Postgres temporal (initdb) y lo borra al terminar
#   TEST_DATABASE_URL=postgres://... scripts/db/test-rls.sh   # usa un servidor vacío propio (CI)
#
# Nunca apunta a Supabase: rechaza URLs de supabase.co / pooler.supabase.com.
# Pasos:
#   1. base anterior (migraciones hasta la última previa) + foto de políticas/funciones/permisos
#   2. migraciones nuevas + pruebas de aislamiento (supabase/tests/*.test.sql)
#   3. reversión (supabase/rollbacks/*.down.sql) + comparación con la foto
#   4. reaplicación de las migraciones nuevas + pruebas otra vez
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"
TESTS="$ROOT/supabase/tests"
ROLLBACKS="$ROOT/supabase/rollbacks"
# Migraciones que la reversión debe deshacer (las de esta etapa).
FOUNDATION=(20261127190000_member_roles_multiuser.sql 20261127190100_multiuser_foundation.sql)
DB=avans_rls_test

cleanup() { :; }
trap 'cleanup' EXIT

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  if [[ "$TEST_DATABASE_URL" =~ supabase\.(co|com) ]]; then
    echo "Rechazado: TEST_DATABASE_URL apunta a Supabase. Usá un Postgres descartable." >&2
    exit 2
  fi
  ADMIN_URL="$TEST_DATABASE_URL"
else
  PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  [[ -x "$PG_BIN/initdb" ]] || { echo "No encontré initdb; instalá postgresql o definí TEST_DATABASE_URL." >&2; exit 2; }
  PORT="${TEST_PG_PORT:-54329}"
  DATA="$(mktemp -d /tmp/avans-pg.XXXXXX)"
  RUN=()
  if [[ "$(id -u)" == "0" ]]; then chown postgres "$DATA"; RUN=(su postgres -c); fi
  run_pg() { if [[ ${#RUN[@]} -gt 0 ]]; then "${RUN[@]}" "$*"; else bash -c "$*"; fi; }
  run_pg "$PG_BIN/initdb -D $DATA -A trust -U postgres >/dev/null"
  run_pg "$PG_BIN/pg_ctl -D $DATA -o '-p $PORT -k /tmp -c listen_addresses=' -l $DATA/log -w start >/dev/null"
  cleanup() { run_pg "$PG_BIN/pg_ctl -D $DATA -m fast stop >/dev/null" || true; rm -rf "$DATA"; }
  ADMIN_URL="postgresql://postgres@/postgres?host=/tmp&port=$PORT"
fi

DB_URL="${ADMIN_URL%%\?*}"
DB_URL="${DB_URL%/*}/$DB"
[[ "$ADMIN_URL" == *\?* ]] && DB_URL="$DB_URL?${ADMIN_URL#*\?}"
psql_admin() { psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q "$@"; }
psql_db() { PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=${PG_LEVEL:-warning}" psql "$DB_URL" -v ON_ERROR_STOP=1 -q "$@"; }

psql_admin -c "drop database if exists $DB" -c "create database $DB"
psql_db -f "$TESTS/supabase-shim.sql"

is_foundation() { local f; for f in "${FOUNDATION[@]}"; do [[ "$1" == "$f" ]] && return 0; done; return 1; }
apply_migration() {
  local file="$1"
  # La migración inicial referencia una tabla antes de crearla dentro de una
  # función SQL; se aplica sin validar cuerpos (igual que un pg_dump).
  if [[ "$(basename "$file")" == 20260814012500_initial_schema.sql ]]; then
    PGOPTIONS="-c check_function_bodies=off" psql_db -f "$file"
  else
    psql_db -f "$file"
  fi
}

snapshot() {
  psql_db -At <<'SQL'
select 'policy|' || tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
  from pg_policies where schemaname = 'public' and tablename not in ('audit_events', 'task_events', 'user_invitations')
union all
select 'function|' || p.oid::regprocedure::text || '|' || md5(pg_get_functiondef(p.oid)) || '|' || coalesce((select string_agg(a::text, ',' order by a::text) from unnest(p.proacl) a), '')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.oid::regprocedure::text = any (string_to_array(current_setting('avans.base_functions', true), ';'))
union all
select 'trigger|' || c.relname || '|' || t.tgname
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname in ('public', 'auth') and c.relname not in ('audit_events', 'task_events', 'user_invitations')
union all
select 'grant|' || table_name || '|' || grantee || '|' || string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated') and table_name not in ('audit_events', 'task_events', 'user_invitations')
  group by table_name, grantee
order by 1;
SQL
}

run_tests() {
  local label="$1" total=0 file out count
  psql_db -f "$TESTS/lib.sql"
  for file in "$TESTS"/*.test.sql; do
    if ! out="$(PG_LEVEL=notice psql_db -o /dev/null -f "$file" 2>&1)"; then
      echo "$out" | grep -E "ok -|ERROR|CONTEXT" | sed 's/^psql:[^:]*:[0-9]*: //' >&2
      echo "FALLÓ ($label): $(basename "$file")" >&2
      exit 1
    fi
    count="$(grep -c "NOTICE:  ok - " <<<"$out" || true)"
    total=$((total + count))
    [[ -n "${VERBOSE:-}" ]] && grep "NOTICE:  ok - " <<<"$out" | sed 's/.*NOTICE:  /  /'
    echo "  $(basename "$file"): $count verificaciones ok ($label)"
  done
  [[ $total -gt 0 ]] || { echo "No se ejecutó ninguna verificación" >&2; exit 1; }
}

echo "1. Base anterior"
for file in "$MIGRATIONS"/*.sql; do
  is_foundation "$(basename "$file")" || apply_migration "$file"
done
BASE_FUNCTIONS="$(psql_db -At -c "select string_agg(p.oid::regprocedure::text, ';') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private')")"
psql_admin -c "alter database $DB set avans.base_functions = '$BASE_FUNCTIONS'"
BEFORE="$(snapshot)"

echo "2. Migraciones nuevas + pruebas"
for f in "${FOUNDATION[@]}"; do apply_migration "$MIGRATIONS/$f"; done
run_tests "aplicada"
AFTER_UP="$(snapshot)"
[[ "$BEFORE" != "$AFTER_UP" ]] || { echo "La migración no cambió políticas/permisos: revisar" >&2; exit 1; }

echo "3. Reversión"
for f in "$ROLLBACKS"/*.down.sql; do psql_db -f "$f"; done
AFTER_DOWN="$(snapshot)"
if [[ "$BEFORE" != "$AFTER_DOWN" ]]; then
  echo "La reversión no restauró el estado previo:" >&2
  diff <(echo "$BEFORE") <(echo "$AFTER_DOWN") >&2 || true
  exit 1
fi
echo "  políticas, funciones, triggers y permisos idénticos a la base anterior"

echo "4. Reaplicación + pruebas"
for f in "${FOUNDATION[@]}"; do apply_migration "$MIGRATIONS/$f"; done
run_tests "reaplicada"
echo "OK"
