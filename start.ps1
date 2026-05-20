# ================================================================
#  BotBuilder - Windows start script
#  Usage: .\start.ps1
#  - Does NOT create new Cloudflare tunnels
#  - Re-registers bot webhooks with current WEBHOOK_BASE_URL
# ================================================================
$ErrorActionPreference = "SilentlyContinue"

$ROOT     = $PSScriptRoot
$BACKEND  = "$ROOT\backend"
$FRONTEND = "$ROOT\frontend"
$LOGS     = "$ROOT\.logs"
$VENV     = "$BACKEND\.venv\Scripts"
$UVICORN  = "$VENV\uvicorn.exe"
$CELERY   = "$VENV\celery.exe"
$PYTHON   = "$VENV\python.exe"
$ALEMBIC  = "$VENV\alembic.exe"
$ENV_FILE = "$ROOT\.env"

New-Item -ItemType Directory -Force -Path $LOGS | Out-Null

function OK   { param($m) Write-Host "[OK] $m" -ForegroundColor Green  }
function WARN { param($m) Write-Host "[!!] $m" -ForegroundColor Yellow }
function ERR  { param($m) Write-Host "[XX] $m" -ForegroundColor Red    }
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

function Wait-Port {
    param([int]$Port, [int]$MaxSec = 30)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $MaxSec) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", $Port)
            $tcp.Close()
            return $true
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Read-Env {
    param([string]$Key)
    $line = Get-Content $ENV_FILE -ErrorAction SilentlyContinue |
            Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
    if ($line) { return ($line -split "=",2)[1].Trim('"').Trim("'").Trim() }
    return ""
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Blue
Write-Host "       BotBuilder Starter            " -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""

# ---- pre-flight checks ----------------------------------------
if (-not (Test-Path $UVICORN)) { ERR "uvicorn not found: $UVICORN"; exit 1 }
if (-not (Test-Path $CELERY))  { ERR "celery not found: $CELERY";   exit 1 }
if (-not (Test-Path $PYTHON))  { ERR "python not found: $PYTHON";   exit 1 }
if (-not (Test-Path $ENV_FILE)){ ERR ".env not found";               exit 1 }

$WEBHOOK_BASE = Read-Env "WEBHOOK_BASE_URL"
if (-not $WEBHOOK_BASE) { ERR "WEBHOOK_BASE_URL missing from .env"; exit 1 }
INFO "Webhook base: $WEBHOOK_BASE"

# ================================================================
# 1. REDIS
# ================================================================
INFO "Checking Redis..."
$redisUp = ($null -ne (netstat -ano 2>$null | Select-String ":6379.*LISTENING" | Select-Object -First 1))

if ($redisUp) {
    OK "Redis already running"
} else {
    INFO "Starting Redis via WSL..."
    Start-Process "wsl" -ArgumentList "redis-server","--daemonize","yes","--bind","0.0.0.0","--protected-mode","no" -WindowStyle Hidden
    Start-Sleep -Seconds 3
    $redisUp = ($null -ne (netstat -ano 2>$null | Select-String ":6379.*LISTENING" | Select-Object -First 1))
    if ($redisUp) { OK "Redis started" }
    else          { WARN "Redis not started - state and Celery may not work" }
}

# ================================================================
# 1b. POSTGRESQL
# ================================================================
INFO "Checking PostgreSQL..."
$pgUp = ($null -ne (netstat -ano 2>$null | Select-String ":5432.*LISTENING" | Select-Object -First 1))

if ($pgUp) {
    OK "PostgreSQL already running"
} else {
    INFO "Starting PostgreSQL via WSL..."
    Start-Process "wsl" -ArgumentList "bash","-c","sudo service postgresql start" -WindowStyle Hidden -Wait
    Start-Sleep -Seconds 3
    $pgUp = ($null -ne (netstat -ano 2>$null | Select-String ":5432.*LISTENING" | Select-Object -First 1))
    if ($pgUp) {
        OK "PostgreSQL started"
    } else {
        # WSL2 mirrored networking may not expose port; try connecting directly
        $pgUp = Wait-Port 5432 5
        if ($pgUp) { OK "PostgreSQL started" }
        else       { WARN "PostgreSQL not detected on port 5432 - DB queries may fail" }
    }
}

# ================================================================
# 1c. DB MIGRATIONS (alembic upgrade head)
# ================================================================
if ($pgUp -or (Test-Path "$BACKEND\botbuilder.db")) {
    INFO "Running DB migrations..."
    $migResult = & $ALEMBIC -c "$BACKEND\alembic.ini" upgrade head 2>&1
    if ($LASTEXITCODE -eq 0) { OK "Migrations applied" }
    else {
        WARN "Migrations failed (exit $LASTEXITCODE). Check alembic output:"
        $migResult | Write-Host -ForegroundColor DarkGray
    }
} else {
    WARN "Skipping migrations — no DB available"
}

# ================================================================
# 2. BACKEND
# ================================================================
INFO "Starting backend on port 8000..."
Kill-Port 8000
Start-Sleep -Milliseconds 500

Start-Process -FilePath $UVICORN `
    -ArgumentList "app.main:app","--host","0.0.0.0","--port","8000","--reload" `
    -WorkingDirectory $BACKEND `
    -RedirectStandardOutput "$LOGS\backend.log" `
    -RedirectStandardError  "$LOGS\backend.err.log" `
    -WindowStyle Hidden

INFO "Waiting for backend (max 30s)..."
if (Wait-Port 8000 30) { OK "Backend is up" }
else { ERR "Backend did not start. Check: $LOGS\backend.err.log"; exit 1 }

# ================================================================
# 3. WEBHOOK RE-REGISTRATION
# ================================================================
INFO "Re-registering bot webhooks..."

$backendPy = $BACKEND -replace "\\","/"

$pyLines = @(
    "import asyncio, sys",
    "sys.path.insert(0, r'$BACKEND')",
    "",
    "async def main():",
    "    import httpx",
    "    from app.db.session import async_session_factory",
    "    from app.models.bot import Bot",
    "    from app.utils.encryption import decrypt_token",
    "    from app.settings import settings",
    "    from sqlalchemy import select",
    "    base = settings.WEBHOOK_BASE_URL.rstrip('/')",
    "    async with async_session_factory() as db:",
    "        rows = (await db.execute(select(Bot).where(Bot.is_active == True))).scalars().all()",
    "        if not rows:",
    "            print('  No active bots found')",
    "            return",
    "        ok_ = 0; fail_ = 0",
    "        async with httpx.AsyncClient(timeout=10) as client:",
    "            for bot in rows:",
    "                try:",
    "                    token = decrypt_token(bot.token)",
    "                    url = f'{base}/webhook/{token.split(chr(58))[1]}'",
    "                    resp = await client.post(",
    "                        f'https://api.telegram.org/bot{token}/setWebhook',",
    "                        json={",
    "                            'url': url,",
    "                            'allowed_updates': ['message','edited_message','channel_post',",
    "                                'callback_query','chat_join_request','business_connection',",
    "                                'business_message','edited_business_message','deleted_business_messages'],",
    "                            'drop_pending_updates': False,",
    "                        }",
    "                    )",
    "                    d = resp.json()",
    "                    if d.get('ok'):",
    "                        bot.webhook_url = url",
    "                        print(f'  [OK] {bot.name}  ->  {url}')",
    "                        ok_ += 1",
    "                    else:",
    "                        print(f'  [!!] {bot.name}: {d.get(\"description\")}')",
    "                        fail_ += 1",
    "                except Exception as e:",
    "                    print(f'  [XX] {bot.name}: {e}')",
    "                    fail_ += 1",
    "        await db.commit()",
    "        print(f'  Done: {ok_} updated, {fail_} failed')",
    "",
    "asyncio.run(main())"
)

$tmpPy = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "bb_webhook.py")
$pyLines | Set-Content -Path $tmpPy -Encoding UTF8

& $PYTHON $tmpPy 2>&1
Remove-Item $tmpPy -ErrorAction SilentlyContinue

# ================================================================
# 4. CELERY
# ================================================================
if ($redisUp) {
    INFO "Starting Celery worker..."
    Get-Process "celery" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300

    Start-Process -FilePath $CELERY `
        -ArgumentList "-A","app.queue.worker","worker","--loglevel=info","--pool=solo" `
        -WorkingDirectory $BACKEND `
        -RedirectStandardOutput "$LOGS\celery.log" `
        -RedirectStandardError  "$LOGS\celery.err.log" `
        -WindowStyle Hidden

    Start-Sleep -Seconds 4
    $ready = (Get-Content "$LOGS\celery.err.log" -Tail 5 -ErrorAction SilentlyContinue) -match "ready"
    if ($ready) { OK "Celery worker is up" }
    else        { WARN "Celery may not be ready. Check: $LOGS\celery.err.log" }
} else {
    WARN "Redis not available - skipping Celery"
}

# ================================================================
# 5. FRONTEND
# ================================================================
INFO "Starting frontend on port 5173..."
Kill-Port 5173
Start-Sleep -Milliseconds 300

Start-Process "cmd.exe" `
    -ArgumentList "/c","npm run dev" `
    -WorkingDirectory $FRONTEND `
    -RedirectStandardOutput "$LOGS\frontend.log" `
    -RedirectStandardError  "$LOGS\frontend.err.log" `
    -WindowStyle Hidden

if (Wait-Port 5173 30) { OK "Frontend is up" }
else                   { WARN "Frontend port not open in 30s. Check: $LOGS\frontend.log" }

# ================================================================
# 6. SUMMARY
# ================================================================
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    BotBuilder started successfully  " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API docs : http://localhost:8000/schema/swagger" -ForegroundColor Cyan
Write-Host "  Webhook  : $WEBHOOK_BASE/webhook" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Logs     : $LOGS\" -ForegroundColor DarkGray
Write-Host "  Stop     : .\stop.ps1" -ForegroundColor Yellow
Write-Host ""
