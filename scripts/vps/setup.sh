#!/usr/bin/env bash
# Prima configurazione del VPS Hetzner per il worker del controllo siti (punto 49 della checklist).
# Da eseguire UNA volta, come root, subito dopo la reinstallazione con Ubuntu 24.04 e con la propria chiave SSH già
# inserita da Hetzner. Non contiene segreti: le chiavi del worker si aggiungeranno dopo, solo sul server.
#   bash setup.sh
# Cosa fa: aggiornamenti (anche automatici), firewall con la sola porta SSH, fail2ban, utente «worker» senza password
# con la stessa chiave SSH di root, accesso SSH solo con chiave e niente login di root, Node.js 22 e git.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Eseguire come root."; exit 1; fi
# Senza chiave SSH (scelta dell'utente, 21/10): resta l'accesso di root con password, protetto da fail2ban; con la chiave
# l'accesso diventa solo con chiave e con l'utente «worker».
CHIAVE=0
if [ -s /root/.ssh/authorized_keys ]; then CHIAVE=1; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold
apt-get install -yq ufw fail2ban unattended-upgrades ca-certificates curl git

# Aggiornamenti di sicurezza automatici.
dpkg-reconfigure -f noninteractive unattended-upgrades

# Firewall: in entrata solo SSH (il worker fa solo richieste in uscita).
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable

systemctl enable --now fail2ban

if [ "$CHIAVE" = 1 ]; then
# Utente del worker, con la stessa chiave SSH di root e sudo.
if ! id worker >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" worker
  usermod -aG sudo worker
fi
install -d -m 700 -o worker -g worker /home/worker/.ssh
install -m 600 -o worker -g worker /root/.ssh/authorized_keys /home/worker/.ssh/authorized_keys
echo "worker ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/worker
chmod 440 /etc/sudoers.d/worker
visudo -cf /etc/sudoers.d/worker

# SSH: solo con chiave, niente root.
cat > /etc/ssh/sshd_config.d/10-worker.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
CONF
sshd -t
systemctl reload ssh
fi

# Node.js 22 (pacchetto ufficiale NodeSource).
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -yq nodejs

echo
echo "Node: $(node -v)  ·  firewall: $(ufw status | head -1)"
if [ "$CHIAVE" = 0 ]; then
  echo "Fatto (senza chiave SSH). Si entra ancora con: ssh root@IP-DEL-SERVER e la password di root."
  echo "Usa una password lunga e unica (passwd); fail2ban blocca per 10 minuti chi sbaglia 5 volte."
  echo "Poi riavvia una volta (reboot) per caricare il kernel aggiornato."
  exit 0
fi
echo "Fatto. Da ora si entra con: ssh worker@$(curl -fsS -4 https://ifconfig.me 2>/dev/null || echo IP-DEL-SERVER)"
echo "IMPORTANTE: prima di chiudere questa sessione, prova l'accesso come worker da una seconda finestra. Root non entra più"
echo "via SSH e non ci sono password: se l'accesso come worker non funzionasse, resterebbe solo il rescue system di Hetzner."
echo "Poi riavvia una volta (sudo reboot) per caricare il kernel aggiornato."
