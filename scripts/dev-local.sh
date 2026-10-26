#!/bin/bash
# Sobe o sistema no Docker do seu computador para testes (Mac ou Linux).
# Uso, na pasta do projeto: ./scripts/dev-local.sh
# Na primeira vez cria o .env com senhas aleatórias e o administrador.
# Rodar de novo só atualiza e sobe os containers.
set -euo pipefail

cd "$(dirname "$0")/.."
CREDENTIALS=".credenciais-local.txt"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose não encontrado. Abra o Docker Desktop e tente de novo."
  exit 1
fi

random() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

# Troca (ou acrescenta) uma linha CHAVE=valor do .env, igual no Mac e no Linux.
set_env() {
  awk -v key="$1" -v value="$2" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' .env > .env.tmp && mv .env.tmp .env
}

if [ ! -f .env ]; then
  log "Criando o .env para uso local"
  cp .env.example .env
  ADMIN_PASSWORD="$(random 9)"
  set_env MYSQL_ROOT_PASSWORD "$(random 16)"
  set_env JWT_SECRET "$(random 32)"
  set_env JWT_REFRESH_SECRET "$(random 32)"
  set_env DATA_ENCRYPTION_KEY "$(random 32)"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  # Sem domínio e sem HTTPS: o sistema em localhost:3000, o backend em 8080.
  set_env BACKEND_SERVER_NAME ""
  set_env BACKEND_URL "http://localhost"
  set_env PROXY_PORT "8080"
  set_env FRONTEND_PORT "3000"
  set_env FRONTEND_SSL_PORT "3001"
  set_env FRONTEND_SERVER_NAME ""
  set_env FRONTEND_URL "http://localhost:3000"
  ADMIN_EMAIL="$(grep '^ADMIN_EMAIL=' .env | cut -d= -f2-)"
  {
    echo "Sistema: http://localhost:3000"
    echo "E-mail: ${ADMIN_EMAIL:-admin@cerqueiralabs.com}"
    echo "Senha: $ADMIN_PASSWORD"
  } > "$CREDENTIALS"
  chmod 600 .env "$CREDENTIALS"
fi

log "Montando e subindo os containers (a primeira vez leva de 10 a 20 minutos)"
docker compose up -d --build

log "Esperando o backend responder"
for _ in $(seq 1 120); do
  if curl -fs http://localhost:8080/health >/dev/null 2>&1; then break; fi
  sleep 5
done
if ! curl -fs http://localhost:8080/health >/dev/null 2>&1; then
  echo "O backend não respondeu em 10 minutos. Veja o motivo com: docker compose logs backend"
  exit 1
fi

if [ ! -f .docker/.seeded ]; then
  log "Criando o administrador"
  docker compose exec -T backend npx sequelize db:seed:all
  mkdir -p .docker && touch .docker/.seeded
fi

echo
echo "Pronto. Abra http://localhost:3000"
[ -f "$CREDENTIALS" ] && echo "Login e senha estão em $CREDENTIALS"
echo "Para parar: docker compose down"
