#!/usr/bin/env bash
# Popolamento da OpenStreetMap sul VPS (punto 87, 22/10), lanciato da systemd (webora-osm.service) una volta a settimana.
# Scarica l'Italia da Geofabrik (solo se è cambiata, con il controllo md5), tiene le attività e i confini delle province
# con osmium e passa tutto a worker/osm.mjs, che salva le aziende con un sito. Cartella dei dati: $STATE_DIRECTORY
# (/var/lib/webora-osm). Variabili come gli altri worker; DRY_RUN=1 conta senza salvare.
set -euo pipefail
cd "${STATE_DIRECTORY:-/var/lib/webora-osm}"
APP=${APP_DIR:-/opt/webora/app}
URL=https://download.geofabrik.de/europe/italy-latest.osm.pbf
PBF=italy-latest.osm.pbf

curl -fsS -o $PBF.md5 "$URL.md5"
if [ -s $PBF ] && md5sum -c --status $PBF.md5; then
  echo "File Geofabrik già aggiornato."
else
  curl -fsS --retry 3 -o $PBF.nuovo "$URL"
  sed "s/$PBF/$PBF.nuovo/" $PBF.md5 | md5sum -c --status || { echo "md5 diverso: file scaricato male"; rm -f $PBF.nuovo; exit 1; }
  mv $PBF.nuovo $PBF
fi
echo "Italia: $(du -h $PBF | cut -f1)"

# Attività dei tipi utili (con e senza sito: quelle senza servono al punto 88) e confini con il codice ISO.
# shellcheck disable=SC2046
osmium tags-filter --overwrite -o attivita.osm.pbf $PBF $(node "$APP/worker/osm.mjs" filtri)
osmium export --overwrite -f geojsonseq --geometry-types=point,polygon -a type,id -o attivita.geojsonseq attivita.osm.pbf
osmium tags-filter --overwrite -o confini.osm.pbf $PBF r/ISO3166-2
osmium export --overwrite -f geojsonseq --geometry-types=polygon -o confini.geojsonseq confini.osm.pbf
echo "Attività: $(wc -l < attivita.geojsonseq) righe"

node "$APP/worker/osm.mjs" attivita.geojsonseq confini.geojsonseq
