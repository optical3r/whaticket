#!/bin/bash
# Sobe o sistema no Docker do seu computador para testes (Mac ou Linux).
# Uso, na pasta do projeto: ./scripts/dev-local.sh
# Na primeira vez cria o .env com senhas aleatórias e o administrador.
# Rodar de novo só atualiza e sobe os containers.
set -euo pipefail

cd "$(dirname "$0")/.."
CREDENTIALS=".credenciais-local.txt"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# O comando docker existe mesmo com o Docker parado; "docker info" só
# responde com ele rodando.
if ! docker info >/dev/null 2>&1; then
  echo "O Docker não está rodando. Abra o Docker Desktop (ou inicie o serviço do Docker) e rode o script de novo."
  exit 1
fi

random() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

get_env() { grep "^$1=" .env | head -1 | cut -d= -f2- || true; }

# Troca (ou acrescenta) uma linha CHAVE=valor do .env, igual no Mac e no Linux.
set_env() {
  awk -v key="$1" -v value="$2" '
    BEGIN { found = 0 }
    index($0, key "=") == 1 { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' .env > .env.tmp && mv .env.tmp .env
}

# Uma porta está ocupada quando algum programa aceita conexão nela, em
# IPv4 ou IPv6 (o navegador pode cair em qualquer um dos dois).
port_busy() {
  local address
  for address in 127.0.0.1 ::1; do
    if (exec 3<>"/dev/tcp/$address/$1") 2>/dev/null; then return 0; fi
  done
  return 1
}

free_port() {
  local avoid="$1" port
  shift
  for port in "$@"; do
    if [ "$port" != "$avoid" ] && ! port_busy "$port"; then
      echo "$port"
      return
    fi
  done
  echo "Não achei uma porta livre entre $*. Feche os programas que usam essas portas e rode de novo." >&2
  exit 1
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
  # Sem domínio e sem HTTPS.
  set_env BACKEND_SERVER_NAME ""
  set_env BACKEND_URL "http://localhost"
  set_env FRONTEND_SERVER_NAME ""
  set_env FRONTEND_PORT "3000"
  set_env BACKEND_PORT "8080"
  ADMIN_EMAIL="$(get_env ADMIN_EMAIL)"
  {
    echo "E-mail: ${ADMIN_EMAIL:-admin@cerqueiralabs.com}"
    echo "Senha: $ADMIN_PASSWORD"
  } > "$CREDENTIALS"
  chmod 600 .env "$CREDENTIALS"
fi

# Com os containers parados, confere se as portas estão livres e troca as
# que outro programa estiver usando.
if [ -z "$(docker compose ps -q --status running frontend 2>/dev/null)" ]; then
  FRONTEND_PORT="$(get_env FRONTEND_PORT)"
  BACKEND_PORT="$(get_env BACKEND_PORT)"
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  BACKEND_PORT="${BACKEND_PORT:-8080}"
  NEW_FRONTEND="$(free_port 0 "$FRONTEND_PORT" 3000 3080 8000 8088 8090 5080)"
  NEW_BACKEND="$(free_port "$NEW_FRONTEND" "$BACKEND_PORT" 8080 8081 8082 8085 9080)"
  [ "$NEW_FRONTEND" != "$FRONTEND_PORT" ] &&
    log "A porta $FRONTEND_PORT está em uso por outro programa; o sistema vai usar a $NEW_FRONTEND"
  [ "$NEW_BACKEND" != "$BACKEND_PORT" ] &&
    log "A porta $BACKEND_PORT está em uso por outro programa; o backend vai usar a $NEW_BACKEND"
  set_env FRONTEND_PORT "$NEW_FRONTEND"
  set_env FRONTEND_SSL_PORT "$((NEW_FRONTEND + 1))"
  set_env FRONTEND_URL "http://localhost:$NEW_FRONTEND"
  set_env BACKEND_PORT "$NEW_BACKEND"
  set_env PROXY_PORT "$NEW_BACKEND"
fi
FRONTEND_PORT="$(get_env FRONTEND_PORT)"
BACKEND_PORT="$(get_env BACKEND_PORT)"

log "Montando e subindo os containers (a primeira vez leva de 10 a 20 minutos)"
docker compose up -d --build

log "Esperando o backend responder"
for _ in $(seq 1 120); do
  if curl -fs "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then break; fi
  sleep 5
done
if ! curl -fs "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
  echo "O backend não respondeu em 10 minutos. Veja o motivo com: docker compose logs backend"
  exit 1
fi

if [ ! -f .docker/.seeded ]; then
  log "Criando o administrador"
  docker compose exec -T backend npx sequelize db:seed:all
  mkdir -p .docker && touch .docker/.seeded
fi

echo
echo "Pronto. Abra http://localhost:$FRONTEND_PORT"
[ -f "$CREDENTIALS" ] && echo "Login e senha estão em $CREDENTIALS"
echo "Para parar: docker compose down"
