# ================================================================
#  BotBuilder - Windows stop script
#  Usage: .\stop.ps1
#  Stops backend, Celery, and frontend. Does NOT touch Redis or
#  Cloudflare tunnels (they keep running between restarts).
# ================================================================
$ErrorActionPreference = "SilentlyContinue"

function OK   { param($m) Write-Host "[OK] $m" -ForegroundColor Green  }
function WARN { param($m) Write-Host "[!!] $m" -ForegroundColor Yellow }
function INFO { param($m) Write-Host "[>>] $m" -ForegroundColor Cyan   }

function Kill-Port {
    param([int]$Port)
    $lines = netstat -ano 2>$null | Select-String ":$Port\s.*LISTENING"
    foreach ($line in $lines) {
        $p = ($line.ToString().Trim() -split "\s+")[-1]
        if ($p -match "^\d+$" -and $p -ne "0") {
            Stop-Process -Id ([int]$p) -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host "       BotBuilder Stopper            " -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""

# Stop frontend (port 5173)
INFO "Stopping frontend (port 5173)..."
Kill-Port 5173
OK "Frontend stopped"

# Stop Celery
INFO "Stopping Celery..."
Get-Process "celery" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
OK "Celery stopped"

# Stop backend (port 8000)
INFO "Stopping backend (port 8000)..."
Kill-Port 8000
OK "Backend stopped"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    BotBuilder stopped               " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Redis and Cloudflare tunnels kept running." -ForegroundColor DarkGray
Write-Host "  Run .\start.ps1 to restart." -ForegroundColor Cyan
Write-Host ""
