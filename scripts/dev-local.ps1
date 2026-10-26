# Sobe o sistema no Docker do seu computador para testes (Windows).
# Uso, no PowerShell, na pasta do projeto:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-local.ps1
# Na primeira vez cria o .env com senhas aleatórias e o administrador.
# Rodar de novo só atualiza e sobe os containers.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
$credentials = ".credenciais-local.txt"

function Log($message) { Write-Host "[$(Get-Date -Format HH:mm:ss)] $message" }

docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Compose não encontrado. Abra o Docker Desktop e tente de novo."
  exit 1
}

function Random-Hex([int]$bytes) {
  $buffer = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

# Troca (ou acrescenta) uma linha CHAVE=valor do .env.
function Set-Env([string]$key, [string]$value) {
  $lines = Get-Content -Encoding UTF8 .env
  $found = $false
  $lines = $lines | ForEach-Object {
    if ($_.StartsWith("$key=")) { $found = $true; "$key=$value" } else { $_ }
  }
  if (-not $found) { $lines += "$key=$value" }
  # UTF-8 sem BOM e quebras de linha LF, como o Docker espera.
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env"), (($lines -join "`n") + "`n"))
}

if (-not (Test-Path .env)) {
  Log "Criando o .env para uso local"
  Copy-Item .env.example .env
  $adminPassword = Random-Hex 9
  Set-Env "MYSQL_ROOT_PASSWORD" (Random-Hex 16)
  Set-Env "JWT_SECRET" (Random-Hex 32)
  Set-Env "JWT_REFRESH_SECRET" (Random-Hex 32)
  Set-Env "DATA_ENCRYPTION_KEY" (Random-Hex 32)
  Set-Env "ADMIN_PASSWORD" $adminPassword
  # Sem domínio e sem HTTPS: o sistema em localhost:3000, o backend em 8080.
  Set-Env "BACKEND_SERVER_NAME" ""
  Set-Env "BACKEND_URL" "http://localhost"
  Set-Env "PROXY_PORT" "8080"
  Set-Env "FRONTEND_PORT" "3000"
  Set-Env "FRONTEND_SSL_PORT" "3001"
  Set-Env "FRONTEND_SERVER_NAME" ""
  Set-Env "FRONTEND_URL" "http://localhost:3000"
  $adminEmail = ((Get-Content -Encoding UTF8 .env | Where-Object { $_.StartsWith("ADMIN_EMAIL=") }) -replace "^ADMIN_EMAIL=", "")
  if (-not $adminEmail) { $adminEmail = "admin@cerqueiralabs.com" }
  @("Sistema: http://localhost:3000", "E-mail: $adminEmail", "Senha: $adminPassword") | Set-Content $credentials
}

Log "Montando e subindo os containers (a primeira vez leva de 10 a 20 minutos)"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit 1 }

Log "Esperando o backend responder"
$ready = $false
for ($i = 0; $i -lt 120; $i++) {
  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 http://localhost:8080/health *> $null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 5
  }
}
if (-not $ready) {
  Write-Host "O backend não respondeu em 10 minutos. Veja o motivo com: docker compose logs backend"
  exit 1
}

if (-not (Test-Path .docker\.seeded)) {
  Log "Criando o administrador"
  docker compose exec -T backend npx sequelize db:seed:all
  if ($LASTEXITCODE -ne 0) { exit 1 }
  New-Item -ItemType Directory -Force .docker | Out-Null
  New-Item -ItemType File -Force .docker\.seeded | Out-Null
}

Write-Host ""
Write-Host "Pronto. Abra http://localhost:3000"
if (Test-Path $credentials) { Write-Host "Login e senha estão em $credentials" }
Write-Host "Para parar: docker compose down"
