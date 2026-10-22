#!/usr/bin/env bash
# Worker del controllo siti sul VPS (punto 49, 22/10). Da eseguire come utente «worker» (usa sudo dove serve).
#   bash worker.sh installa         scarica il codice in /opt/webora/app, chiede SITE_CHECKS_SECRET (non resta nella
#                                   cronologia) e prepara i servizi, senza avviarli; rilanciato, aggiorna
#   bash worker.sh prova            controllo siti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh prova-contatti   contatti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh giro             controllo siti: un giro vero adesso (300 aziende)
#   bash worker.sh giro-contatti    contatti: un giro vero adesso (150 aziende)
#   bash worker.sh avvia            giri automatici: controllo siti alle :05 e :35, contatti alle :15 e :45
#   bash worker.sh ferma            ferma i giri automatici
#   bash worker.sh stato            ultimi giri e prossimi
#   bash worker.sh aggiorna         scarica l'ultima versione del codice da main
set -euo pipefail
APP=/opt/webora/app
ENVF=/etc/webora/site-checks.env
REPO=https://github.com/marcoscazzari03/prospect-azienda.git
NOME=webora-site-checks
CONT=webora-contacts

# Servizio e timer systemd per un giro del worker: nome, descrizione, script, minuti.
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
ExecStart=/usr/bin/node $3
TimeoutStartSec=20min
MemoryMax=1G
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
Description=Webora Leads - $2 ogni 30 minuti

[Timer]
OnCalendar=*-*-* *:$4:00
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
UNIT
}

prova() {
  sudo systemd-run --quiet --wait --pipe --collect --uid="$USER" --property=EnvironmentFile="$ENVF" \
    --working-directory="$APP" --setenv=DRY_RUN=1 --setenv=LIMIT=20 /usr/bin/node "$1"
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
    unita "$NOME" "controllo siti" "worker/site-checks.mjs" "05,35"
    unita "$CONT" "contatti" "worker/contacts.mjs" "15,45"
    sudo systemctl daemon-reload
    echo "Installato. Prossimo passo: bash $0 prova"
    ;;
  prova) prova worker/site-checks.mjs ;;
  prova-contatti) prova worker/contacts.mjs ;;
  giro) sudo systemctl start $NOME.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $NOME.service -n 5 --no-pager ;;
  giro-contatti) sudo systemctl start $CONT.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $CONT.service -n 5 --no-pager ;;
  avvia) sudo systemctl enable --now $NOME.timer $CONT.timer && systemctl list-timers $NOME.timer $CONT.timer --no-pager ;;
  ferma) sudo systemctl disable --now $NOME.timer $CONT.timer ;;
  stato) systemctl list-timers $NOME.timer $CONT.timer --no-pager || true; sudo journalctl -u $NOME.service -u $CONT.service -n 20 --no-pager ;;
  aggiorna) git -C "$APP" pull --ff-only && git -C "$APP" log --oneline -1 ;;
  *) sed -n '2,13p' "$0"; exit 1 ;;
esac
