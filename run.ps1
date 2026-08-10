#!/usr/bin/env pwsh
# =============================================================================
# PMG Group OS — one-command runner (Docker)
# =============================================================================
# Brings up the WHOLE app (Postgres + schema push + API + web) with one command.
#
#   .\run.ps1            # build (if needed) + start, then open the app
#   .\run.ps1 up         # same as above
#   .\run.ps1 down       # stop the stack (keeps the DB volume/data)
#   .\run.ps1 logs       # follow logs from all services
#   .\run.ps1 restart    # restart containers (no rebuild)
#   .\run.ps1 rebuild    # rebuild images from scratch + recreate
#   .\run.ps1 status     # show container status
#
# App:   http://localhost:5173
# Login: shershah_nawabi@pmggroup-llc.com  /  PMGAdmin2024!
# -----------------------------------------------------------------------------
[CmdletBinding()]
param([Parameter(Position = 0)][string]$Command = "up")

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$AppUrl = "http://localhost:5173"

function Test-Docker {
    try { docker info 2>&1 | Out-Null } catch { }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "X  Docker does not appear to be running. Start Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }
}

# Prefer Docker Compose v2 (`docker compose`); fall back to v1 (`docker-compose`).
$script:ComposeExe = "docker"
$script:ComposePre = @("compose")
docker compose version 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    $script:ComposeExe = "docker-compose"
    $script:ComposePre = @()
}

function Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & $script:ComposeExe @($script:ComposePre + $Args)
    if ($LASTEXITCODE -ne 0) { throw "compose command failed: $($Args -join ' ')" }
}

switch ($Command.ToLower()) {
    { $_ -in @("up", "start", "") } {
        Test-Docker
        Write-Host "==> Building & starting PMG Group OS (first run compiles the images; be patient)..." -ForegroundColor Cyan
        Compose up -d --build
        Write-Host ""
        Write-Host "OK  Stack is starting. It's healthy once the web container reports 'healthy'." -ForegroundColor Green
        Write-Host "    App:   $AppUrl" -ForegroundColor Green
        Write-Host "    Login: shershah_nawabi@pmggroup-llc.com  /  PMGAdmin2024!" -ForegroundColor Green
        Write-Host "    Logs:  .\run.ps1 logs" -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
        try { Start-Process $AppUrl } catch { }
        break
    }
    "down"    { Test-Docker; Write-Host "==> Stopping stack (data volume preserved)..." -ForegroundColor Cyan; Compose down; break }
    "logs"    { Test-Docker; Compose logs -f; break }
    "restart" { Test-Docker; Compose restart; break }
    "status"  { Test-Docker; Compose ps; break }
    "rebuild" {
        Test-Docker
        Write-Host "==> Rebuilding images from scratch and recreating containers..." -ForegroundColor Cyan
        Compose build --no-cache
        Compose up -d --force-recreate
        Write-Host "OK  Rebuilt. App: $AppUrl" -ForegroundColor Green
        break
    }
    default {
        Write-Host "Unknown command '$Command'. Use: up | down | logs | restart | rebuild | status" -ForegroundColor Yellow
        exit 1
    }
}
