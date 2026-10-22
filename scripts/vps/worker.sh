#!/usr/bin/env bash
# Worker del controllo siti sul VPS (punto 49, 22/10). Da eseguire come utente «worker» (usa sudo dove serve).
#   bash worker.sh installa   scarica il codice in /opt/webora/app, chiede SITE_CHECKS_SECRET (non resta nella cronologia)
#                             e prepara il servizio, senza avviarlo
#   bash worker.sh prova      un giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh giro       un giro vero adesso (300 aziende, salva)
#   bash worker.sh avvia      giro automatico ogni 30 minuti (alle :05 e alle :35)
#   bash worker.sh ferma      ferma il giro automatico
#   bash worker.sh stato      ultimi giri e prossimo
#   bash worker.sh aggiorna   scarica l'ultima versione del codice da main
set -euo pipefail
APP=/opt/webora/app
ENVF=/etc/webora/site-checks.env
REPO=https://github.com/marcoscazzari03/prospect-azienda.git
NOME=webora-site-checks

case "${1:-}" in
  installa)
    sudo install -d -o "$USER" -g "$USER" /opt/webora
    if [ -d "$APP/.git" ]; then git -C "$APP" pull --ff-only; else git clone --depth 1 --branch main "$REPO" "$APP"; fi
    read -rsp "Incolla SITE_CHECKS_SECRET e premi Invio (non si vede niente, è normale): " SEGRETO; echo
    if [ "${#SEGRETO}" -lt 32 ]; then echo "Troppo corto: almeno 32 caratteri."; exit 1; fi
    sudo install -d -m 750 -o root -g "$USER" /etc/webora
    printf 'SITE_CHECKS_SECRET=%s\n' "$SEGRETO" | sudo tee "$ENVF" >/dev/null
    sudo chown root:"$USER" "$ENVF"; sudo chmod 640 "$ENVF"
    unset SEGRETO
    sudo tee /etc/systemd/system/$NOME.service >/dev/null <<UNIT
[Unit]
Description=Webora Leads - controllo siti
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=$USER
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=/usr/bin/node worker/site-checks.mjs
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
    sudo tee /etc/systemd/system/$NOME.timer >/dev/null <<UNIT
[Unit]
Description=Webora Leads - controllo siti ogni 30 minuti

[Timer]
OnCalendar=*-*-* *:05,35:00
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
UNIT
    sudo systemctl daemon-reload
    echo "Installato. Prossimo passo: bash $0 prova"
    ;;
  prova)
    sudo systemd-run --quiet --wait --pipe --collect --uid="$USER" --property=EnvironmentFile="$ENVF" \
      --working-directory="$APP" --setenv=DRY_RUN=1 --setenv=LIMIT=20 /usr/bin/node worker/site-checks.mjs
    ;;
  giro) sudo systemctl start $NOME.service || echo "Giro non riuscito: ecco le ultime righe."; journalctl -u $NOME.service -n 5 --no-pager ;;
  avvia) sudo systemctl enable --now $NOME.timer && systemctl list-timers $NOME.timer --no-pager ;;
  ferma) sudo systemctl disable --now $NOME.timer ;;
  stato) systemctl list-timers $NOME.timer --no-pager || true; journalctl -u $NOME.service -n 20 --no-pager ;;
  aggiorna) git -C "$APP" pull --ff-only && git -C "$APP" log --oneline -1 ;;
  *) sed -n '2,11p' "$0"; exit 1 ;;
esac
