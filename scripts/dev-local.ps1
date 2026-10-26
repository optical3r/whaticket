# Sobe o sistema no Docker do seu computador para testes (Windows).
# Uso, no PowerShell, na pasta do projeto:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-local.ps1
# Na primeira vez cria o .env com senhas aleatórias e o administrador.
# Rodar de novo só atualiza e sobe os containers.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")
$credentials = ".credenciais-local.txt"

function Log($message) { Write-Host "[$(Get-Date -Format HH:mm:ss)] $message" }

# O comando docker existe mesmo com o Docker Desktop fechado; "docker info"
# só responde com ele aberto.
$ErrorActionPreference = "Continue"
docker info *> $null
$dockerOk = $LASTEXITCODE -eq 0
$ErrorActionPreference = "Stop"
if (-not $dockerOk) {
  Write-Host "O Docker não está rodando. Abra o Docker Desktop, espere aparecer 'Engine running' e rode o script de novo."
  exit 1
}

function Random-Hex([int]$bytes) {
  $buffer = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString("x2") })
}

function Get-Env([string]$key) {
  $line = Get-Content -Encoding UTF8 .env | Where-Object { $_.StartsWith("$key=") } | Select-Object -First 1
  if ($line) { return $line.Substring($key.Length + 1) }
  return ""
}

# Troca (ou acrescenta) uma linha CHAVE=valor do .env.
function Set-Env([string]$key, [string]$value) {
  $lines = @(Get-Content -Encoding UTF8 .env)
  $found = $false
  $lines = $lines | ForEach-Object {
    if ($_.StartsWith("$key=")) { $found = $true; "$key=$value" } else { $_ }
  }
  if (-not $found) { $lines += "$key=$value" }
  # UTF-8 sem BOM e quebras de linha LF, como o Docker espera.
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) ".env"), (($lines -join "`n") + "`n"))
}

# Uma porta está ocupada quando algum programa aceita conexão nela, em
# IPv4 ou IPv6 (o navegador pode cair em qualquer um dos dois).
function Test-PortBusy([int]$port) {
  foreach ($address in @("127.0.0.1", "::1")) {
    $client = $null
    try {
      $family = [System.Net.IPAddress]::Parse($address).AddressFamily
      $client = [System.Net.Sockets.TcpClient]::new($family)
      $attempt = $client.BeginConnect($address, $port, $null, $null)
      if ($attempt.AsyncWaitHandle.WaitOne(300) -and $client.Connected) { return $true }
    } catch {
      # Sem IPv6 ou conexão recusada: ninguém nessa porta por esse endereço.
    } finally {
      if ($client) { $client.Close() }
    }
  }
  return $false
}

function Find-FreePort([int]$preferred, [int[]]$others, [int]$avoid) {
  foreach ($port in @($preferred) + $others) {
    if ($port -ne $avoid -and -not (Test-PortBusy $port)) { return $port }
  }
  Write-Host "Não achei uma porta livre. Feche outros programas que usam as portas $preferred e $($others -join ', ') e rode de novo."
  exit 1
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
  # Sem domínio e sem HTTPS.
  Set-Env "BACKEND_SERVER_NAME" ""
  Set-Env "BACKEND_URL" "http://localhost"
  Set-Env "FRONTEND_SERVER_NAME" ""
  Set-Env "FRONTEND_PORT" "3000"
  Set-Env "BACKEND_PORT" "8080"
  $adminEmail = Get-Env "ADMIN_EMAIL"
  if (-not $adminEmail) { $adminEmail = "admin@cerqueiralabs.com" }
  @("E-mail: $adminEmail", "Senha: $adminPassword") | Set-Content $credentials
}

# Com os containers parados, confere se as portas estão livres e troca as
# que outro programa estiver usando.
$ErrorActionPreference = "Continue"
$running = docker compose ps -q --status running frontend 2>$null
$ErrorActionPreference = "Stop"
if (-not $running) {
  $frontendPort = [int](Get-Env "FRONTEND_PORT")
  if (-not $frontendPort) { $frontendPort = 3000 }
  $backendPort = [int](Get-Env "BACKEND_PORT")
  if (-not $backendPort) { $backendPort = 8080 }
  $newFrontend = Find-FreePort $frontendPort @(3000, 3080, 8000, 8088, 8090, 5080) 0
  $newBackend = Find-FreePort $backendPort @(8080, 8081, 8082, 8085, 9080) $newFrontend
  if ($newFrontend -ne $frontendPort) { Log "A porta $frontendPort está em uso por outro programa; o sistema vai usar a $newFrontend" }
  if ($newBackend -ne $backendPort) { Log "A porta $backendPort está em uso por outro programa; o backend vai usar a $newBackend" }
  Set-Env "FRONTEND_PORT" "$newFrontend"
  Set-Env "FRONTEND_SSL_PORT" "$($newFrontend + 1)"
  Set-Env "FRONTEND_URL" "http://localhost:$newFrontend"
  Set-Env "BACKEND_PORT" "$newBackend"
  Set-Env "PROXY_PORT" "$newBackend"
}
$frontendPort = Get-Env "FRONTEND_PORT"
$backendPort = Get-Env "BACKEND_PORT"

Log "Montando e subindo os containers (a primeira vez leva de 10 a 20 minutos)"
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit 1 }

Log "Esperando o backend responder"
$ready = $false
for ($i = 0; $i -lt 120; $i++) {
  try {
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 "http://127.0.0.1:$backendPort/health" *> $null
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
Write-Host "Pronto. Abra http://localhost:$frontendPort"
if (Test-Path $credentials) { Write-Host "Login e senha estão em $credentials" }
Write-Host "Para parar: docker compose down"
