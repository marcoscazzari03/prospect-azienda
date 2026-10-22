#!/usr/bin/env bash
# Worker del controllo siti sul VPS (punto 49, 22/10). Da eseguire come utente «worker» (usa sudo dove serve).
#   bash worker.sh installa         scarica il codice in /opt/webora/app, chiede SITE_CHECKS_SECRET (non resta nella
#                                   cronologia) e prepara i servizi, senza avviarli; rilanciato, aggiorna
#   bash worker.sh prova            controllo siti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh prova-contatti   contatti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh giro             controllo siti: un giro vero adesso (300 aziende)
#   bash worker.sh giro-contatti    contatti: un giro vero adesso (150 aziende)
#   bash worker.sh prova-osm        popolamento OSM: scarica l'Italia e conta, SENZA salvare (10-20 minuti)
#   bash worker.sh osm              popolamento OSM: un giro vero, in sottofondo (si segue con «stato-osm»)
#   bash worker.sh stato-osm        ultime righe del popolamento OSM
#   bash worker.sh avvia            giri automatici: controllo siti alle :05 e :35, contatti alle :15 e :45, OSM il lunedì
#   bash worker.sh ferma            ferma i giri automatici
#   bash worker.sh stato            ultimi giri e prossimi
#   bash worker.sh aggiorna         scarica l'ultima versione del codice da main
set -euo pipefail
APP=/opt/webora/app
ENVF=/etc/webora/site-checks.env
REPO=https://github.com/marcoscazzari03/prospect-azienda.git
NOME=webora-site-checks
CONT=webora-contacts
OSM=webora-osm

# Servizio e timer systemd per un giro del worker: nome, descrizione, comando, quando (OnCalendar), durata massima,
# memoria massima, righe in più per il servizio, righe in più per il timer.
unita() {
  sudo tee /etc/systemd/system/$1.service >/dev/null <<UNIT
[Unit]
Description=Webora Leads - $2
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=$3
TimeoutStartSec=$5
MemoryMax=$6
$7
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
UNIT
  sudo tee /etc/systemd/system/$1.timer >/dev/null <<UNIT
[Unit]
Description=Webora Leads - $2, giro programmato

[Timer]
OnCalendar=$4
RandomizedDelaySec=60
$8

[Install]
WantedBy=timers.target
UNIT
}

prova() {
  sudo systemd-run --quiet --wait --pipe --collect --uid="$USER" --property=EnvironmentFile="$ENVF" \
    --working-directory="$APP" --setenv=DRY_RUN=1 --setenv=LIMIT=20 "$@"
}

case "${1:-}" in
  installa)
    sudo install -d -o "$USER" -g "$USER" /opt/webora
    if [ -d "$APP/.git" ]; then git -C "$APP" pull --ff-only; else git clone --depth 1 --branch main "$REPO" "$APP"; fi
    if sudo test -s "$ENVF" && [ "${2:-}" != "nuovo-segreto" ]; then
      echo "Segreto già presente (per cambiarlo: bash $0 installa nuovo-segreto)."
    else
      read -rsp "Incolla SITE_CHECKS_SECRET e premi Invio (non si vede niente, è normale): " SEGRETO; echo
      if [ "${#SEGRETO}" -lt 32 ]; then echo "Troppo corto: almeno 32 caratteri."; exit 1; fi
      sudo install -d -m 750 -o root -g "$USER" /etc/webora
      printf 'SITE_CHECKS_SECRET=%s\n' "$SEGRETO" | sudo tee "$ENVF" >/dev/null
      sudo chown root:"$USER" "$ENVF"; sudo chmod 640 "$ENVF"
      unset SEGRETO
    fi
    # osmium legge il file di OpenStreetMap (popolamento OSM, punto 87).
    command -v osmium >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq osmium-tool; }
    unita "$NOME" "controllo siti" "/usr/bin/node worker/site-checks.mjs" "*-*-* *:05,35:00" 20min 1G "" ""
    unita "$CONT" "contatti" "/usr/bin/node worker/contacts.mjs" "*-*-* *:15,45:00" 20min 1G "" ""
    # Il file dell'Italia (circa 2 GB) e i suoi derivati restano in /var/lib/webora-osm, l'unica cartella scrivibile.
    unita "$OSM" "popolamento OSM" "/bin/bash $APP/scripts/vps/osm.sh" "Mon *-*-* 02:20:00" 3h 2500M "StateDirectory=webora-osm
Nice=10" "Persistent=true"
    sudo systemctl daemon-reload
    echo "Installato. Prossimo passo: bash $0 prova"
    ;;
  prova) prova /usr/bin/node worker/site-checks.mjs ;;
  prova-contatti) prova /usr/bin/node worker/contacts.mjs ;;
  prova-osm) prova --property=StateDirectory=webora-osm --property=MemoryMax=2500M /bin/bash "$APP/scripts/vps/osm.sh" ;;
  osm) sudo systemctl start --no-block $OSM.service && echo "Partito in sottofondo. Per seguirlo: bash $0 stato-osm" ;;
  stato-osm) systemctl is-active $OSM.service || true; sudo journalctl -u $OSM.service -n 15 --no-pager ;;
  giro) sudo systemctl start $NOME.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $NOME.service -n 5 --no-pager ;;
  giro-contatti) sudo systemctl start $CONT.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $CONT.service -n 5 --no-pager ;;
  avvia) sudo systemctl enable --now $NOME.timer $CONT.timer $OSM.timer && systemctl list-timers $NOME.timer $CONT.timer $OSM.timer --no-pager ;;
  ferma) sudo systemctl disable --now $NOME.timer $CONT.timer $OSM.timer ;;
  stato) systemctl list-timers $NOME.timer $CONT.timer $OSM.timer --no-pager || true; sudo journalctl -u $NOME.service -u $CONT.service -n 20 --no-pager ;;
  aggiorna) git -C "$APP" pull --ff-only && git -C "$APP" log --oneline -1 ;;
  *) sed -n '2,16p' "$0"; exit 1 ;;
esac
