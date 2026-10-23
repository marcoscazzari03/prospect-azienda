#!/usr/bin/env bash
# Popolamento da OpenStreetMap sul VPS (punto 87, 22/10), lanciato da systemd (avvisto-osm.service) una volta a settimana.
# Scarica l'Italia da Geofabrik (solo se è cambiata, con il controllo md5), tiene le attività e i confini delle province
# con osmium e passa tutto a worker/osm.mjs, che salva le aziende con un sito. Cartella dei dati: $STATE_DIRECTORY
# (/var/lib/avvisto-osm). Variabili come gli altri worker; DRY_RUN=1 conta senza salvare.
set -euo pipefail
cd "${STATE_DIRECTORY:-/var/lib/avvisto-osm}"
APP=${APP_DIR:-/opt/avvisto/app}
URL=https://download.geofabrik.de/europe/italy-latest.osm.pbf
PBF=italy-latest.osm.pbf

curl -fsSL -o $PBF.md5 "$URL.md5"
if [ -s $PBF ] && md5sum -c --status $PBF.md5; then
  echo "File Geofabrik già aggiornato."
else
  # Servono circa 6 GB: il file nuovo accanto al vecchio, più i file filtrati.
  LIBERI=$(df --output=avail -k . | tail -1)
  if [ "$LIBERI" -lt 6000000 ]; then echo "Spazio insufficiente: $((LIBERI / 1024)) MB liberi"; exit 1; fi
  trap 'rm -f $PBF.nuovo' EXIT
  # -L: Geofabrik rimanda il file «latest» a quello del giorno (22/10: senza, si salvava la pagina del rimando, 4 KB).
  curl -fsSL --retry 3 -o $PBF.nuovo "$URL"
  # Impronta attesa riletta dopo lo scaricamento: se Geofabrik ha pubblicato il file del giorno nel frattempo, vale la
  # nuova (22/10: primo tentativo fermato qui).
  ATTESO=$(curl -fsSL "$URL.md5" | cut -d' ' -f1)
  VERO=$(md5sum $PBF.nuovo | cut -d' ' -f1)
  if [ "$ATTESO" != "$VERO" ]; then
    echo "md5 diverso: file scaricato male ($(du -h $PBF.nuovo | cut -f1), atteso $ATTESO, trovato $VERO)"
    exit 1
  fi
  echo "$ATTESO  $PBF" > $PBF.md5
  mv $PBF.nuovo $PBF
fi
echo "Italia: $(du -h $PBF | cut -f1)"

# Attività dei tipi utili (con e senza sito: quelle senza servono al punto 88) e confini con il codice ISO.
# shellcheck disable=SC2046
osmium tags-filter --overwrite -o attivita.osm.pbf $PBF $(node "$APP/worker/osm.mjs" filtri)
# Scritti con un altro nome e poi rinominati: la ricerca dei siti (worker/siti-osm.mjs) li legge ogni ora.
osmium export --overwrite -f geojsonseq --geometry-types=point,polygon -a type,id -o attivita.nuovo.geojsonseq attivita.osm.pbf
osmium tags-filter --overwrite -o confini.osm.pbf $PBF r/ISO3166-2
osmium export --overwrite -f geojsonseq --geometry-types=polygon -o confini.nuovo.geojsonseq confini.osm.pbf
mv confini.nuovo.geojsonseq confini.geojsonseq
mv attivita.nuovo.geojsonseq attivita.geojsonseq
echo "Attività: $(wc -l < attivita.geojsonseq) righe"

node "$APP/worker/osm.mjs" attivita.geojsonseq confini.geojsonseq
