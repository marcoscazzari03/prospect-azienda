#!/usr/bin/env bash
# Esegue migrazioni e test SQL su un database Postgres usa e getta.
# Uso: PGHOST=... PGPORT=... PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=leads_test_$$
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/00_supabase_stub.sql
for f in migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f tests/01_flow_test.sql 2>&1 | grep -E "ok  |FALLITO|ERROR|superati" | sed "s/^psql:[^ ]* NOTICE:  /  /"
