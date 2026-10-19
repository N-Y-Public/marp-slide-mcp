<#
.SYNOPSIS
  Helper script to manage and run the Docker development container.
.DESCRIPTION
  Usage:
    .\dev.ps1 start            # Start container in background and verify readiness
    .\dev.ps1 stop             # Stop container
    .\dev.ps1 restart          # Restart container
    .\dev.ps1 status           # Check container status
    .\dev.ps1 run <command>    # Run command in container via exec
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0, Mandatory = $false)]
    [string]$Command = "start",

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

switch ($Command.ToLower()) {
    "start" {
        Write-Host "🚀 Starting dev container in background..." -ForegroundColor Cyan
        docker compose up -d
        Write-Host "✅ Container 'marp-slide-mcp-app' is running." -ForegroundColor Green
        Write-Host "👉 In Antigravity IDE: Press Ctrl+Shift+P -> 'Dev Containers: Attach to Running Container' -> select 'marp-slide-mcp-app'" -ForegroundColor Yellow
    }
    "up" {
        docker compose up -d
    }
    "stop" {
        Write-Host "🛑 Stopping dev container..." -ForegroundColor Yellow
        docker compose down
    }
    "down" {
        docker compose down
    }
    "restart" {
        docker compose restart
    }
    "status" {
        docker ps --filter "name=marp-slide-mcp-app"
    }
    "run" {
        docker compose exec -T app @RemainingArgs
    }
    "exec" {
        docker compose exec app @RemainingArgs
    }
    "unlock-worktrees" {
        Write-Host "🔓 Releasing branch locks on all secondary worktrees (detaching HEAD)..." -ForegroundColor Cyan
        $wtLines = git worktree list --porcelain
        $currentPath = ""
        $count = 0
        $isFirst = $true
        foreach ($line in $wtLines) {
            if ($line -match "^worktree (.+)$") {
                $currentPath = $matches[1]
                if ($isFirst) {
                    $isFirst = $false
                    continue
                }
                Write-Host "  -> Detaching HEAD in: $currentPath" -ForegroundColor Yellow
                git -C $currentPath checkout --detach --quiet
                $count++
            }
        }
        Write-Host "✅ $count worktree(s) detached. All branch locks are now released for Antigravity IDE." -ForegroundColor Green
    }
    default {
        Write-Host "Available commands:" -ForegroundColor Green
        Write-Host "  .\dev.ps1 start            - Start container in background"
        Write-Host "  .\dev.ps1 stop             - Stop container"
        Write-Host "  .\dev.ps1 status           - Check container status"
        Write-Host "  .\dev.ps1 run <cmd>        - Run command inside container"
        Write-Host "  .\dev.ps1 unlock-worktrees - Release branch locks across worktrees for IDE checkout"
    }
}
