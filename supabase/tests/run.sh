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
# I test delle modalità con i referenti le richiedono accese (in produzione sono spente, migrazione 037).
psql -q -v ON_ERROR_STOP=1 -d "$DB" -c "update app_settings set value = 'true' where key = 'people_enabled'"
for f in tests/[0-9][0-9]_*_test.sql; do psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -E "ok  |FALLITO|ERROR|superati" | sed "s/^psql:[^ ]* NOTICE:  /  /"; done
