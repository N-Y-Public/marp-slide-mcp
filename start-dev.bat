@echo off
echo Starting Marp MCP Dev Container...
docker compose up -d
if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo Dev container 'marp-slide-mcp-app' is running.
    echo In Antigravity IDE:
    echo   1. Ctrl+Shift+P
    echo   2. 'Dev Containers: Attach to Running Container...'
    echo   3. Select 'marp-slide-mcp-app'
    echo ========================================================
) else (
    echo.
    echo Failed to start container. Please ensure Docker Desktop is running.
)
pause
