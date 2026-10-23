#!/usr/bin/env bash
# Worker del controllo siti sul VPS (punto 49, 22/10). Da eseguire come utente «worker» (usa sudo dove serve).
#   bash worker.sh installa         scarica il codice in /opt/avvisto/app, chiede SITE_CHECKS_SECRET (non resta nella
#                                   cronologia) e prepara i servizi, senza avviarli; rilanciato, aggiorna
#   bash worker.sh prova            controllo siti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh prova-contatti   contatti: giro di prova su 20 aziende, SENZA salvare
#   bash worker.sh giro             controllo siti: un giro vero adesso (300 aziende)
#   bash worker.sh giro-contatti    contatti: un giro vero adesso (150 aziende)
#   bash worker.sh prova-osm        popolamento OSM: scarica l'Italia e conta, SENZA salvare (10-20 minuti)
#   bash worker.sh osm              popolamento OSM: un giro vero, in sottofondo (si segue con «stato-osm»)
#   bash worker.sh stato-osm        ultime righe del popolamento OSM
#   bash worker.sh prova-siti       siti delle attività OSM senza sito: 300 attività, SENZA salvare (mostra esempi)
#   bash worker.sh giro-siti        siti: un giro vero adesso (3000 attività), in sottofondo
#   bash worker.sh prova-cc         aziende da Common Crawl (punto 92): scarica l'elenco dei .it (la prima volta, pochi
#                                   minuti) e prova 300 domini, SENZA salvare (mostra esempi con il settore)
#   bash worker.sh giro-cc          Common Crawl: un giro vero adesso (3000 domini), in sottofondo;  stato-cc  ultimi giri
#   bash worker.sh avvia-cc         Common Crawl ogni 3 ore (alle :25); si ferma con «ferma»
#   bash worker.sh installa-backup  backup notturno del database (punto 90): chiede la stringa di connessione di Supabase
#                                   e crea la chiave di cifratura, da copiare e conservare fuori dal server
#   bash worker.sh backup           un backup adesso;  bash worker.sh stato-backup  archivi e ultimi giri
#   bash worker.sh avvia            giri automatici: controllo siti alle :05 e :35, contatti alle :15 e :45, siti alle :50,
#                                   OSM il lunedì
#   bash worker.sh ferma            ferma i giri automatici
#   bash worker.sh stato            ultimi giri e prossimi
#   bash worker.sh aggiorna         scarica l'ultima versione del codice da main
#   bash worker.sh dominio URL      indirizzo dell'app per i worker (bash worker.sh dominio https://avvisto.it)
#   bash worker.sh rinomina         una volta sola (23/10): porta cartelle e servizi dal nome vecchio ad «avvisto»
set -euo pipefail
APP=/opt/avvisto/app
ENVF=/etc/avvisto/site-checks.env
REPO=https://github.com/marcoscazzari03/prospect-azienda.git
NOME=avvisto-site-checks
CONT=avvisto-contacts
OSM=avvisto-osm
SITI=avvisto-siti
CC=avvisto-cc
BACKUP=avvisto-backup

# Servizio e timer systemd per un giro del worker: nome, descrizione, comando, quando (OnCalendar), durata massima,
# memoria massima, righe in più per il servizio, righe in più per il timer.
unita() {
  sudo tee /etc/systemd/system/$1.service >/dev/null <<UNIT
[Unit]
Description=Avvisto - $2
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
Description=Avvisto - $2, giro programmato

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
    sudo install -d -o "$USER" -g "$USER" /opt/avvisto
    if [ -d "$APP/.git" ]; then git -C "$APP" pull --ff-only; else git clone --depth 1 --branch main "$REPO" "$APP"; fi
    if sudo test -s "$ENVF" && [ "${2:-}" != "nuovo-segreto" ]; then
      echo "Segreto già presente (per cambiarlo: bash $0 installa nuovo-segreto)."
    else
      read -rsp "Incolla SITE_CHECKS_SECRET e premi Invio (non si vede niente, è normale): " SEGRETO; echo
      if [ "${#SEGRETO}" -lt 32 ]; then echo "Troppo corto: almeno 32 caratteri."; exit 1; fi
      sudo install -d -m 750 -o root -g "$USER" /etc/avvisto
      printf 'SITE_CHECKS_SECRET=%s\n' "$SEGRETO" | sudo tee "$ENVF" >/dev/null
      sudo chown root:"$USER" "$ENVF"; sudo chmod 640 "$ENVF"
      unset SEGRETO
    fi
    # osmium legge il file di OpenStreetMap (popolamento OSM, punto 87).
    command -v osmium >/dev/null || { sudo apt-get update -qq && sudo apt-get install -y -qq osmium-tool; }
    # Più thread per le risoluzioni DNS: con molti siti morti le 4 predefinite fanno da collo di bottiglia (23/10).
    unita "$NOME" "controllo siti" "/usr/bin/node worker/site-checks.mjs" "*-*-* *:05,35:00" 20min 1G "Environment=UV_THREADPOOL_SIZE=16" ""
    unita "$CONT" "contatti" "/usr/bin/node worker/contacts.mjs" "*-*-* *:15,45:00" 20min 1G "Environment=UV_THREADPOOL_SIZE=16" ""
    # Il file dell'Italia (circa 2 GB) e i suoi derivati restano in /var/lib/avvisto-osm, l'unica cartella scrivibile.
    unita "$OSM" "popolamento OSM" "/bin/bash $APP/scripts/vps/osm.sh" "Mon *-*-* 02:20:00" 3h 2500M "StateDirectory=avvisto-osm
Nice=10" "Persistent=true"
    # Siti delle attività OSM senza sito (punto 88): stessa cartella dei dati del popolamento.
    unita "$SITI" "siti delle attività OSM" "/usr/bin/node worker/siti-osm.mjs" "*-*-* *:50:00" 50min 1500M "StateDirectory=avvisto-osm
Environment=UV_THREADPOOL_SIZE=16
Nice=5" ""
    # Aziende da Common Crawl (punto 92): elenco dei domini e domini provati in /var/lib/avvisto-cc. Non parte con «avvia»:
    # si accende con «avvia-cc» quando il controllo siti non ha più arretrato.
    unita "$CC" "aziende da Common Crawl" "/usr/bin/node worker/cc.mjs" "*-*-* 00/3:25:00" 50min 1500M "StateDirectory=avvisto-cc
Environment=UV_THREADPOOL_SIZE=16
Nice=5" ""
    sudo systemctl daemon-reload
    echo "Installato. Prossimo passo: bash $0 prova"
    ;;
  prova) prova /usr/bin/node worker/site-checks.mjs ;;
  prova-contatti) prova /usr/bin/node worker/contacts.mjs ;;
  prova-osm) prova --property=StateDirectory=avvisto-osm --property=MemoryMax=2500M /bin/bash "$APP/scripts/vps/osm.sh" ;;
  osm) sudo systemctl start --no-block $OSM.service && echo "Partito in sottofondo. Per seguirlo: bash $0 stato-osm" ;;
  stato-osm) systemctl is-active $OSM.service || true; sudo journalctl -u $OSM.service -n 15 --no-pager ;;
  prova-siti) prova --property=StateDirectory=avvisto-osm --setenv=LIMIT=300 --setenv=UV_THREADPOOL_SIZE=16 /usr/bin/node worker/siti-osm.mjs ;;
  giro-siti) sudo systemctl start --no-block $SITI.service && echo "Partito in sottofondo. Per seguirlo: bash $0 stato-siti" ;;
  prova-cc) prova --property=StateDirectory=avvisto-cc --property=MemoryMax=1500M --setenv=LIMIT=300 --setenv=UV_THREADPOOL_SIZE=16 /usr/bin/node worker/cc.mjs ;;
  giro-cc) sudo systemctl start --no-block $CC.service && echo "Partito in sottofondo. Per seguirlo: bash $0 stato-cc" ;;
  stato-cc) systemctl is-active $CC.service || true; sudo journalctl -u $CC.service -n 10 --no-pager ;;
  avvia-cc) sudo systemctl enable --now $CC.timer && systemctl list-timers $CC.timer --no-pager ;;
  stato-siti) systemctl is-active $SITI.service || true; sudo journalctl -u $SITI.service -n 10 --no-pager ;;
  giro) sudo systemctl start $NOME.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $NOME.service -n 5 --no-pager ;;
  giro-contatti) sudo systemctl start $CONT.service || echo "Giro non riuscito: ecco le ultime righe."; sudo journalctl -u $CONT.service -n 5 --no-pager ;;
  installa-backup)
    # Client di PostgreSQL 17 (pg_dump non legge un database più nuovo di sé) e age per la cifratura.
    if ! ls /usr/lib/postgresql/17/bin/pg_dump >/dev/null 2>&1; then
      sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-common age
      sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y >/dev/null
      sudo apt-get install -y -qq postgresql-client-17
    fi
    command -v age >/dev/null || sudo apt-get install -y -qq age
    sudo install -d -m 750 -o root -g "$USER" /etc/avvisto
    if sudo test -s /etc/avvisto/backup.env && [ "${2:-}" != "nuova-connessione" ]; then
      echo "Connessione già presente (per cambiarla: bash $0 installa-backup nuova-connessione)."
    else
      read -rp "Incolla la stringa «Session pooler» di Supabase così com'è, con [YOUR-PASSWORD], e premi Invio: " URI
      IFS= read -rsp "Ora la password del database e Invio (non si vede niente, è normale): " PW; echo
      # Dalla stringa alle variabili di libpq; la password, chiesta a parte, non passa mai sulla riga di comando.
      RIGHE=$(URI="$URI" PW="$PW" python3 -c '
import os, urllib.parse as u
uri = os.environ["URI"].strip().replace("[YOUR-PASSWORD]", "x")
p = u.urlparse(uri)
assert p.scheme in ("postgres", "postgresql") and p.hostname and p.username, "stringa non valida"
pw = os.environ["PW"]
assert pw, "password vuota"
q = lambda v: "\"" + v.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
for k, v in [("PGHOST", p.hostname), ("PGPORT", str(p.port or 5432)), ("PGUSER", u.unquote(p.username)), ("PGPASSWORD", pw), ("PGDATABASE", (p.path or "/postgres")[1:] or "postgres"), ("PGSSLMODE", "require")]:
    print(f"{k}={q(v)}")
' 2>/dev/null) || { echo "Stringa non valida: copia quella «Session pooler» da Supabase → Connect."; exit 1; }
      # 6543 è il «Transaction pooler»: pg_dump lì non funziona bene (QA).
      case "$URI" in *:6543/*) echo "Questa è la stringa «Transaction pooler» (porta 6543): serve la «Session pooler» (porta 5432)."; exit 1 ;; esac
      unset PW
      unset URI
      printf '%s\n' "$RIGHE" | sudo tee /etc/avvisto/backup.env >/dev/null
      unset RIGHE
      # Solo root: la legge systemd prima di avviare il backup, non i worker (Code Reviewer).
      sudo chown root:root /etc/avvisto/backup.env; sudo chmod 600 /etc/avvisto/backup.env
    fi
    sudo install -d -m 755 -o root -g root /usr/local/lib/avvisto
    if [ ! -s /usr/local/lib/avvisto/backup-pubblica.txt ]; then
      CHIAVE=$(age-keygen 2>/dev/null)
      printf '%s\n' "$CHIAVE" | age-keygen -y | sudo tee /usr/local/lib/avvisto/backup-pubblica.txt >/dev/null
      echo
      echo "=== CHIAVE PER APRIRE I BACKUP: copiala ADESSO in un posto sicuro (gestore di password), NON in chat ==="
      printf '%s\n' "$CHIAVE" | grep '^AGE-SECRET-KEY'
      echo "=== Sul server resta solo la chiave pubblica: senza questa riga i backup non si possono aprire ==="
      unset CHIAVE
      read -rp "Scrivi «copiata» quando l'hai salvata: " OK
      [ "$OK" = "copiata" ] || echo "Attenzione: senza la chiave salvata i backup non servono. Si rigenera con: sudo rm /usr/local/lib/avvisto/backup-pubblica.txt && bash $0 installa-backup"
      clear; printf '\033[3J'
    fi
    # Copia dello script di proprietà di root: «worker» non può cambiare quello che gira con la password del database.
    sudo install -D -m 755 -o root -g root "$APP/scripts/vps/backup.sh" /usr/local/lib/avvisto/backup.sh
    sudo tee /etc/systemd/system/$BACKUP.service >/dev/null <<UNIT
[Unit]
Description=Avvisto - backup del database
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
DynamicUser=yes
EnvironmentFile=/etc/avvisto/backup.env
ExecStart=/bin/bash /usr/local/lib/avvisto/backup.sh
TimeoutStartSec=1h
MemoryMax=1G
StateDirectory=avvisto-backup
StateDirectoryMode=0700
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
UNIT
    sudo tee /etc/systemd/system/$BACKUP.timer >/dev/null <<UNIT
[Unit]
Description=Avvisto - backup del database, ogni notte

[Timer]
OnCalendar=*-*-* 01:40:00
RandomizedDelaySec=300
Persistent=true

[Install]
WantedBy=timers.target
UNIT
    sudo systemctl daemon-reload
    echo "Backup installato. Prossimo passo: bash $0 backup"
    ;;
  backup) sudo install -m 755 -o root -g root "$APP/scripts/vps/backup.sh" /usr/local/lib/avvisto/backup.sh; sudo systemctl start $BACKUP.service || echo "Backup non riuscito: ecco le ultime righe."; sudo journalctl -u $BACKUP.service -n 6 --no-pager ;;
  stato-backup) sudo ls -lh /var/lib/avvisto-backup/ 2>/dev/null || true; systemctl list-timers $BACKUP.timer --no-pager || true; sudo journalctl -u $BACKUP.service -n 6 --no-pager ;;
  avvia)
    TIMER="$NOME.timer $CONT.timer $OSM.timer $SITI.timer"
    [ -f /etc/systemd/system/$BACKUP.service ] && TIMER="$TIMER $BACKUP.timer"
    # shellcheck disable=SC2086
    sudo systemctl enable --now $TIMER && systemctl list-timers $TIMER --no-pager ;;
  # Il backup resta acceso anche con «ferma» (per spegnerlo: sudo systemctl disable --now avvisto-backup.timer).
  ferma) sudo systemctl disable --now $NOME.timer $CONT.timer $OSM.timer $SITI.timer; [ -f /etc/systemd/system/$CC.timer ] && sudo systemctl disable --now $CC.timer || true ;;
  stato) systemctl list-timers $NOME.timer $CONT.timer $OSM.timer $SITI.timer $CC.timer --no-pager || true; sudo journalctl -u $NOME.service -u $CONT.service -n 20 --no-pager ;;
  aggiorna) git -C "$APP" pull --ff-only && git -C "$APP" log --oneline -1 ;;
  dominio)
    # APP_URL nel file letto da tutti i servizi (docs/17-avvisto.md, fase C8): vale dal giro successivo.
    # Solo l'indirizzo dell'app: i worker mandano SITE_CHECKS_SECRET ad APP_URL, un errore di battitura lo manderebbe a
    # un sito di altri (Code Reviewer).
    case "${2:-}" in https://avvisto.it) ;; *) echo "Uso: bash $0 dominio https://avvisto.it"; exit 1 ;; esac
    U="$2"
    sudo sed -i '/^APP_URL=/d' "$ENVF"
    printf 'APP_URL=%s\n' "$U" | sudo tee -a "$ENVF" >/dev/null
    echo "Indirizzo dell'app per i worker: $U (dal prossimo giro)." ;;
  rinomina)
    # Passaggio al nome Avvisto (23/10): sposta codice, segreti, dati e servizi dal nome vecchio a «avvisto», ricrea i
    # servizi e riaccende i timer che erano accesi. Da togliere da qui quando è stato eseguito.
    V=$(printf '%s' d2Vib3Jh | base64 -d)  # il nome vecchio (scritto così per non lasciarlo in chiaro nel repository)
    [ -d /opt/$V ] || { echo "Niente da rinominare: le cartelle hanno già il nome nuovo."; exit 0; }
    # La copia dentro /opt si sposta durante il comando e «installa» non partirebbe più (QA): solo quella nella home.
    case "$(readlink -f "$0")" in /opt/*) echo "Lancia la copia nella home: bash ~/worker.sh rinomina"; exit 1 ;; esac
    # Se «installa» è già stato lanciato col nome nuovo, mv metterebbe le cartelle vecchie dentro quelle nuove (Code Reviewer).
    for d in /opt/avvisto /etc/avvisto; do
      sudo test -e $d && { echo "$d esiste già: spostala prima (sudo mv $d $d.vuota) e rilancia."; exit 1; }
    done
    for u in site-checks contacts osm siti cc backup; do
      systemctl is-active --quiet $V-$u.service && { echo "Il servizio $u sta lavorando: riprova a giro finito (bash $0 stato)."; exit 1; }
    done
    ACCESI=""
    for u in site-checks contacts osm siti cc backup; do
      systemctl is-enabled --quiet $V-$u.timer 2>/dev/null && ACCESI="$ACCESI avvisto-$u.timer"
      sudo systemctl disable --now $V-$u.timer 2>/dev/null || true
    done
    sudo mv /opt/$V /opt/avvisto
    sudo mv /etc/$V /etc/avvisto
    [ -d /usr/local/lib/$V ] && sudo mv /usr/local/lib/$V /usr/local/lib/avvisto
    for d in osm cc; do [ -d /var/lib/$V-$d ] && sudo mv /var/lib/$V-$d /var/lib/avvisto-$d; done
    # Il backup usa DynamicUser: i dati veri stanno in /var/lib/private, in /var/lib c'è solo un collegamento.
    sudo test -d /var/lib/private/$V-backup && sudo mv /var/lib/private/$V-backup /var/lib/private/avvisto-backup
    sudo rm -f /var/lib/$V-backup
    sudo rm -f /etc/systemd/system/$V-*.service /etc/systemd/system/$V-*.timer
    sudo systemctl daemon-reload
    # Indirizzo dell'app: il vecchio verrà staccato, quindi sempre quello nuovo.
    sudo sed -i '/^APP_URL=/d' /etc/avvisto/site-checks.env
    printf 'APP_URL=https://avvisto.it\n' | sudo tee -a /etc/avvisto/site-checks.env >/dev/null
    bash "$0" installa
    [ -s /etc/avvisto/backup.env ] && bash "$0" installa-backup
    # shellcheck disable=SC2086
    [ -n "$ACCESI" ] && sudo systemctl enable --now $ACCESI
    echo "Fatto. Servizi accesi:$ACCESI" ;;
  *) sed -n '2,27p' "$0"; exit 1 ;;
esac
