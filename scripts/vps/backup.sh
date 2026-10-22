#!/usr/bin/env bash
# Backup notturno cifrato del database sul VPS (punto 90, 22/10), finché non c'è Supabase Pro con i suoi backup.
# Lanciato da systemd (webora-backup.service, ogni notte alle 1:40 UTC). Due archivi per notte, entrambi cifrati con age
# per la chiave pubblica in /etc/webora/backup-pubblica.txt (la chiave privata NON sta sul server: la tiene l'utente):
#   db-AAAA-MM-GG.public.dump.age   tutto lo schema public (tabelle, funzioni, dati), formato di pg_restore
#   db-AAAA-MM-GG.auth.dump.age     solo i dati degli utenti (auth.users, auth.identities), per ricrearli
# Si tengono gli ultimi 7 giorni e le domeniche delle ultime 5 settimane. Connessione: variabili PGHOST, PGPORT, PGUSER,
# PGPASSWORD, PGDATABASE in /etc/webora/backup.env (mai sulla riga di comando: si vedrebbero tra i processi).
# Ripristino (sul proprio computer, con la chiave privata): docs/04-pubblicazione.md, sezione 8.
set -euo pipefail
cd "${STATE_DIRECTORY:-/var/lib/webora-backup}"
PUBBLICA=/etc/webora/backup-pubblica.txt
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)
[ -x "$PGBIN/pg_dump" ] || { echo "pg_dump mancante: bash worker.sh installa-backup"; exit 1; }
[ -s "$PUBBLICA" ] || { echo "Chiave pubblica mancante: bash worker.sh installa-backup"; exit 1; }
: "${PGHOST:?connessione mancante: bash worker.sh installa-backup}"

OGGI=$(date -u +%Y-%m-%d)
TMP=$(mktemp -d -p .)
trap 'rm -rf "$TMP"' EXIT

"$PGBIN/pg_dump" -Fc --no-owner --no-privileges -n public -f "$TMP/public.dump"
"$PGBIN/pg_dump" -Fc --no-owner --no-privileges --data-only -t auth.users -t auth.identities -f "$TMP/auth.dump"
# Archivi leggibili prima di cifrarli: un archivio rotto non deve sostituire quelli buoni.
TABELLE=$("$PGBIN/pg_restore" --list "$TMP/public.dump" | grep -c 'TABLE DATA')
"$PGBIN/pg_restore" --list "$TMP/auth.dump" >/dev/null
[ "$TABELLE" -ge 10 ] || { echo "Backup sospetto: solo $TABELLE tabelle con dati"; exit 1; }

for parte in public auth; do
  age -R "$PUBBLICA" -o "$TMP/$parte.age" "$TMP/$parte.dump"
  mv "$TMP/$parte.age" "db-$OGGI.$parte.dump.age"
done

# Pulizia: ultimi 7 giorni, più le domeniche fino a 35 giorni.
ADESSO=$(date -u +%s)
for f in db-*.public.dump.age db-*.auth.dump.age; do
  [ -e "$f" ] || continue
  giorno=${f#db-}; giorno=${giorno%%.*}
  eta=$(( (ADESSO - $(date -u -d "$giorno" +%s)) / 86400 ))
  if [ "$eta" -ge 7 ] && { [ "$(date -u -d "$giorno" +%u)" != 7 ] || [ "$eta" -gt 35 ]; }; then rm -f "$f"; fi
done

echo "Backup $OGGI: $TABELLE tabelle, public $(du -h "db-$OGGI.public.dump.age" | cut -f1), auth $(du -h "db-$OGGI.auth.dump.age" | cut -f1); archivi tenuti: $(ls db-*.public.dump.age | wc -l)"
