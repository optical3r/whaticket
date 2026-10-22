#!/bin/bash
# Instalação do sistema de atendimento da Cerqueira Labs numa VPS Hostinger
# (Ubuntu 24.04 com Docker). Roda uma vez, como root, no primeiro boot.
# Nenhuma senha está neste arquivo: todas são geradas no próprio servidor.
set -uo pipefail

APP_DOMAIN="app.cerqueiralabs.com.br"
API_DOMAIN="api.cerqueiralabs.com.br"
ADMIN_EMAIL="rodrigo.rebento@gmail.com"
REPO="https://github.com/optical3r/whaticket.git"
DIR="/opt/whaticket"
CREDENTIALS="/root/cerqueira-credenciais.txt"

log() { echo "[$(date '+%F %T')] $*"; }
export DEBIAN_FRONTEND=noninteractive

log "1/8 Atualizando o sistema"
apt-get update -q && apt-get -y -q upgrade
apt-get -y -q install git ufw unattended-upgrades fail2ban certbot openssl curl
timedatectl set-timezone America/Sao_Paulo

log "2/8 Memória extra em disco (swap de 2 GB)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "3/8 Firewall: só SSH, HTTP e HTTPS"
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

log "4/8 Docker"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

log "5/8 Baixando o sistema"
[ -d "$DIR/.git" ] || git clone --depth 1 "$REPO" "$DIR"
cd "$DIR" || exit 1

if [ ! -f .env ]; then
  cp .env.example .env
  set_env() {
    if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
  }
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-18)Aa9"
  set_env MYSQL_ROOT_PASSWORD "$(openssl rand -hex 16)"
  set_env JWT_SECRET "$(openssl rand -hex 32)"
  set_env JWT_REFRESH_SECRET "$(openssl rand -hex 32)"
  set_env DATA_ENCRYPTION_KEY "$(openssl rand -hex 32)"
  set_env TZ "America/Sao_Paulo"
  set_env BACKEND_SERVER_NAME "$API_DOMAIN"
  set_env BACKEND_URL "https://$API_DOMAIN"
  set_env PROXY_PORT "443"
  set_env FRONTEND_SERVER_NAME "$APP_DOMAIN"
  set_env FRONTEND_URL "https://$APP_DOMAIN"
  set_env FRONTEND_PORT "80"
  set_env FRONTEND_SSL_PORT "443"
  set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  chmod 600 .env
  {
    echo "Sistema: https://$APP_DOMAIN"
    echo "Administrador: $ADMIN_EMAIL"
    echo "Senha inicial: $ADMIN_PASSWORD"
    echo "Troque a senha no primeiro login. Guarde uma cópia do $DIR/.env fora do servidor."
  } > "$CREDENTIALS"
  chmod 600 "$CREDENTIALS"
fi
mkdir -p ssl/certs/frontend ssl/certs/backend ssl/www backups

log "6/8 Montando e subindo os containers (leva de 15 a 30 minutos no KVM 1)"
docker compose up -d --build

log "Esperando o backend responder"
for _ in $(seq 1 120); do
  curl -fs http://127.0.0.1:8080/health >/dev/null && break
  sleep 15
done
if ! curl -fs http://127.0.0.1:8080/health >/dev/null; then
  log "ERRO: o backend não respondeu. Veja: cd $DIR && docker compose logs backend"
  exit 1
fi

if [ ! -f .seeded ]; then
  log "Criando o administrador e as configurações iniciais"
  docker compose exec -T backend npx sequelize db:seed:all && touch .seeded
fi

log "7/8 Backup diário às 3h15 e renovação do HTTPS"
chmod +x scripts/backup.sh
( crontab -l 2>/dev/null | grep -v backup.sh; echo "15 3 * * * cd $DIR && ./scripts/backup.sh >> backups/backup.log 2>&1" ) | crontab -

# Copia o certificado para o nginx e recria o container (um restart
# repetiria a configuração de SSL).
cat > /usr/local/bin/cerqueira-cert-deploy <<EOF
#!/bin/bash
for name in frontend backend; do
  cp -L /etc/letsencrypt/live/cerqueira/fullchain.pem $DIR/ssl/certs/\$name/fullchain.pem
  cp -L /etc/letsencrypt/live/cerqueira/privkey.pem $DIR/ssl/certs/\$name/privkey.pem
  chmod 600 $DIR/ssl/certs/\$name/privkey.pem
done
cd $DIR && docker compose up -d --force-recreate --no-deps frontend
EOF
chmod +x /usr/local/bin/cerqueira-cert-deploy

# Pede o certificado quando o DNS apontar para esta VPS. Tenta a cada 5
# minutos por até 7 dias, para dar tempo de criar os registros na Cloudflare.
cat > /usr/local/bin/cerqueira-cert-request <<EOF
#!/bin/bash
[ -f /etc/letsencrypt/live/cerqueira/fullchain.pem ] && exit 0
certbot certonly --webroot -w $DIR/ssl/www -d $APP_DOMAIN -d $API_DOMAIN \
  --cert-name cerqueira --non-interactive --agree-tos -m $ADMIN_EMAIL \
  --deploy-hook /usr/local/bin/cerqueira-cert-deploy \
  && crontab -l | grep -v cerqueira-cert-request | crontab -
EOF
chmod +x /usr/local/bin/cerqueira-cert-request
( crontab -l 2>/dev/null | grep -v cerqueira-cert-request; echo "*/5 * * * * /usr/local/bin/cerqueira-cert-request >> /var/log/cerqueira-cert.log 2>&1" ) | crontab -
/usr/local/bin/cerqueira-cert-request || log "HTTPS ainda não: aguardando o DNS (tenta de novo a cada 5 minutos)"

log "8/8 Pronto. Senha do administrador em $CREDENTIALS"
