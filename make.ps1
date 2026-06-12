param(
    [Parameter(Position = 0)]
    [ValidateSet("help", "up", "down", "restart", "build", "rebuild", "seed-reset", "test-backend", "build-frontend", "logs", "ps", "clean", "backend-dev", "frontend-dev", "backend-install", "frontend-install")]
    [string]$Target = "help"
)

$COMPOSE = "docker compose"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Help {
    Write-Host "Available targets:"
    Write-Host "  help              - Show this help message"
    Write-Host "  up                - Start all services (detached)"
    Write-Host "  down              - Stop and remove all services"
    Write-Host "  restart           - Restart all services"
    Write-Host "  build             - Build images without cache"
    Write-Host "  rebuild           - Rebuild images and restart services"
    Write-Host "  seed-reset        - Reset database seed data (stop, remove volume, restart)"
    Write-Host "  test-backend      - Run backend unit tests (pytest)"
    Write-Host "  build-frontend    - Build frontend production bundle locally"
    Write-Host "  logs              - View all service logs (follow)"
    Write-Host "  ps                - Show running service status"
    Write-Host "  clean             - Stop services and remove all volumes/images"
    Write-Host "  backend-dev       - Start backend in local dev mode (requires venv)"
    Write-Host "  frontend-dev      - Start frontend in local dev mode (requires npm)"
    Write-Host "  backend-install   - Install backend dependencies into venv"
    Write-Host "  frontend-install  - Install frontend dependencies via npm"
    Write-Host ""
    Write-Host "Usage: .\make.ps1 <target>"
}

function Invoke-InDir($Dir, $Command) {
    Push-Location (Join-Path $ScriptDir $Dir)
    try {
        Invoke-Expression $Command
    } finally {
        Pop-Location
    }
}

switch ($Target) {
    "help" { Show-Help }
    "up" { Invoke-Expression "$COMPOSE up -d" }
    "down" { Invoke-Expression "$COMPOSE down" }
    "restart" { Invoke-Expression "$COMPOSE restart" }
    "build" { Invoke-Expression "$COMPOSE build --no-cache" }
    "rebuild" { Invoke-Expression "$COMPOSE up -d --build" }
    "seed-reset" {
        Invoke-Expression "$COMPOSE down -v"
        Invoke-Expression "$COMPOSE up -d"
    }
    "test-backend" {
        Invoke-InDir "backend" {
            try {
                python -m pytest -v
            } catch {
                pip install pytest
                python -m pytest -v
            }
        }
    }
    "build-frontend" { Invoke-InDir "frontend" "npm run build" }
    "logs" { Invoke-Expression "$COMPOSE logs -f" }
    "ps" { Invoke-Expression "$COMPOSE ps" }
    "clean" { Invoke-Expression "$COMPOSE down -v --rmi all" }
    "backend-dev" { Invoke-InDir "backend" "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" }
    "frontend-dev" { Invoke-InDir "frontend" "npm start" }
    "backend-install" { Invoke-InDir "backend" "pip install -r requirements.txt" }
    "frontend-install" { Invoke-InDir "frontend" "npm install" }
}
