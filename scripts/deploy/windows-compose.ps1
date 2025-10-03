<#
  Windows One-Click Deploy (Docker Compose)
  - Validates/creates .env
  - Creates docker-compose.override.yml if missing
  - Runs docker compose up -d --build
  - Waits for health and opens the app
#>

param(
  [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg)  { Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[ OK ]  $msg" -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[ERR ]  $msg" -ForegroundColor Red }

# Resolve repo root from script location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Resolve-Path (Join-Path $ScriptDir "..\..")
Set-Location $RepoRoot

Write-Info "Repo: $RepoRoot"

if (-not (Test-Path 'docker-compose.yml')) {
  Write-Err 'docker-compose.yml not found. Run this from the project root.'
  exit 1
}

# Ensure Docker CLI is available
function Test-Command($name) {
  $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command 'docker')) {
  Write-Err 'Docker CLI not found. Please install Docker Desktop and retry.'
  exit 1
}

# Ensure Docker Desktop is running (try to start service if possible)
function Ensure-DockerRunning {
  try {
    docker info --format '{{json .ServerVersion}}' | Out-Null
    return
  } catch {
    Write-Warn 'Docker is not responding. Attempting to start com.docker.service...'
    try {
      $svc = Get-Service -Name 'com.docker.service' -ErrorAction SilentlyContinue
      if ($null -ne $svc) {
        if ($svc.Status -ne 'Running') {
          Start-Service 'com.docker.service'
          Start-Sleep -Seconds 8
        }
      }
    } catch { }
  }
  try {
    docker info --format '{{json .ServerVersion}}' | Out-Null
  } catch {
    Write-Err 'Docker is not running. Please start Docker Desktop and rerun this script.'
    exit 1
  }
}

Ensure-DockerRunning
Write-Ok 'Docker is available.'

$envPath = Join-Path $RepoRoot '.env'
$examplePath = Join-Path $RepoRoot '.env.example'

function Read-Env([string]$path) {
  $dict = @{}
  if (-not (Test-Path $path)) { return $dict }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^[\s#]') { return }
    $i = $_.IndexOf('=')
    if ($i -gt 0) {
      $k = $_.Substring(0,$i).Trim()
      $v = $_.Substring($i+1).Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
      $dict[$k] = $v
    }
  }
  return $dict
}

function Write-Env([string]$path, [hashtable]$data) {
  $lines = @()
  foreach ($k in $data.Keys | Sort-Object) {
    $v = $data[$k]
    if ($v -match '\s') { $v = '"' + $v + '"' }
    $lines += "$k=$v"
  }
  Set-Content -Path $path -Value $lines -Encoding UTF8
}

function Next-FreePort($start) {
  $p = [int]$start
  while ($true) {
    $inUse = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
    if (-not $inUse) { return $p }
    $p += 1
  }
}

function Ensure-Env {
  $envData = Read-Env $envPath

  $required = @(
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET'
  )

  $needsInput = @()
  foreach ($k in $required) { if (-not $envData.ContainsKey($k) -or [string]::IsNullOrWhiteSpace($envData[$k])) { $needsInput += $k } }

  $port = if ($envData['PORT']) { [int]$envData['PORT'] } else { 3000 }
  $appName = if ($envData['NEXT_PUBLIC_APP_NAME']) { $envData['NEXT_PUBLIC_APP_NAME'] } else { 'Attendance System' }
  $appUrl  = if ($envData['NEXT_PUBLIC_APP_URL']) { $envData['NEXT_PUBLIC_APP_URL'] } else { "http://localhost:$port" }

  if ($needsInput.Count -gt 0 -and $NonInteractive) {
    Write-Err ("Missing required env keys: " + ($needsInput -join ', '))
    exit 1
  }

  if ($needsInput.Count -gt 0) {
    Write-Info 'Creating .env configuration...'
    if (-not $envData['NEXT_PUBLIC_SUPABASE_URL']) {
      $envData['NEXT_PUBLIC_SUPABASE_URL'] = Read-Host 'Enter NEXT_PUBLIC_SUPABASE_URL (e.g., https://xxxx.supabase.co)'
    }
    if (-not $envData['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
      $envData['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = Read-Host 'Enter NEXT_PUBLIC_SUPABASE_ANON_KEY'
    }
    if (-not $envData['SUPABASE_SERVICE_ROLE_KEY']) {
      $envData['SUPABASE_SERVICE_ROLE_KEY'] = Read-Host 'Enter SUPABASE_SERVICE_ROLE_KEY'
    }
    if (-not $envData['JWT_SECRET']) {
      $ans = Read-Host 'Enter JWT_SECRET (leave empty to auto-generate 48 bytes)'
      if ([string]::IsNullOrWhiteSpace($ans)) {
        $bytes = New-Object byte[] 48
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
        $envData['JWT_SECRET'] = [Convert]::ToBase64String($bytes)
        Write-Ok 'Generated secure JWT_SECRET.'
      } else {
        $envData['JWT_SECRET'] = $ans
      }
    }
  }

  # Basic validation
  if (-not ($envData['NEXT_PUBLIC_SUPABASE_URL'] -match '^https?://')) {
    Write-Err 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL (https://...)'
    exit 1
  }
  if (($envData['JWT_SECRET'] | Measure-Object -Character).Characters -lt 32) {
    Write-Err 'JWT_SECRET must be at least 32 characters.'
    exit 1
  }

  # Port handling
  if (-not $envData['PORT']) { $envData['PORT'] = $port }
  $inUse = Get-NetTCPConnection -State Listen -LocalPort ([int]$envData['PORT']) -ErrorAction SilentlyContinue
  if ($inUse) {
    $alt = Next-FreePort ([int]$envData['PORT'] + 1)
    Write-Warn "Port $($envData['PORT']) is in use. Using $alt instead."
    $envData['PORT'] = $alt
  }

  if (-not $envData['NEXT_PUBLIC_APP_NAME']) { $envData['NEXT_PUBLIC_APP_NAME'] = $appName }
  if (-not $envData['NEXT_PUBLIC_APP_URL'])  { $envData['NEXT_PUBLIC_APP_URL']  = "http://localhost:$($envData['PORT'])" }

  Write-Env $envPath $envData
  Write-Ok ".env ready at $envPath"
  return $envData
}

$envData = Ensure-Env
$port = [int]$envData['PORT']

# Ensure docker-compose.override.yml
$overridePath = Join-Path $RepoRoot 'docker-compose.override.yml'
if (-not (Test-Path $overridePath)) {
  $override = @(
    'services:',
    '  attendance-app:',
    '    env_file:',
    '      - ./.env',
    '    ports:',
    '      - "${PORT:-3000}:3000"'
  )
  Set-Content -Path $overridePath -Value $override -Encoding UTF8
  Write-Ok "Created $overridePath"
} else {
  Write-Info 'docker-compose.override.yml already exists. Skipping creation.'
}

Write-Info 'Building and starting containers (docker compose up -d --build)...'
docker compose up -d --build | Out-Host

# Wait for health
$containerName = 'attendance-system'
Write-Info "Waiting for container '$containerName' to be healthy..."

$deadline = (Get-Date).AddMinutes(5)
while ($true) {
  try {
    $status = docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerName 2>$null
  } catch { $status = $null }
  if ($status -eq 'healthy') { break }
  if ($status -eq 'unhealthy') {
    Write-Err 'Container became unhealthy. Showing last logs:'
    docker compose logs --tail 200 attendance-app | Out-Host
    exit 1
  }
  if ((Get-Date) -gt $deadline) {
    Write-Err 'Timed out waiting for healthy status. Showing last logs:'
    docker compose logs --tail 200 attendance-app | Out-Host
    exit 1
  }
  Start-Sleep -Seconds 3
}

Write-Ok 'Container is healthy.'

$url = "http://localhost:$port"
Write-Ok "Opening $url"
try { Start-Process $url } catch { }

Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Cyan
Write-Host "- View logs:    docker compose logs -f attendance-app"
Write-Host "- Restart app:  docker compose restart attendance-app"
Write-Host "- Stop stack:   docker compose down"

