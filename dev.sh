#!/usr/bin/env bash
# ==============================================================================
# Helper script to run development commands inside Docker container (Linux / Mac / WSL)
# ==============================================================================
set -e

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    build)
        echo "🔨 Building Docker image..."
        docker compose build
        ;;
    up)
        echo "🚀 Starting dev container in background..."
        docker compose up -d
        ;;
    down)
        echo "🛑 Stopping containers..."
        docker compose down
        ;;
    run)
        docker compose run --rm app "$@"
        ;;
    exec)
        docker compose exec app "$@"
        ;;
    npm)
        docker compose run --rm app npm "$@"
        ;;
    npx)
        docker compose run --rm app npx "$@"
        ;;
    marp)
        docker compose run --rm app npx @marp-team/marp-cli "$@"
        ;;
    unlock-worktrees)
        echo "🔓 Releasing branch locks on all secondary worktrees (detaching HEAD)..."
        git worktree list --porcelain | grep '^worktree ' | cut -d' ' -f2- | tail -n +2 | while read -r wt; do
            echo "  -> Detaching HEAD in: $wt"
            git -C "$wt" checkout --detach --quiet 2>/dev/null || true
        done
        echo "✅ All secondary worktree branch locks released for Antigravity IDE."
        ;;
    *)
        echo "Available commands:"
        echo "  ./dev.sh build            - Build Docker image"
        echo "  ./dev.sh up               - Start container in background"
        echo "  ./dev.sh down             - Stop container"
        echo "  ./dev.sh run <cmd>        - Run command in container"
        echo "  ./dev.sh npm <args>       - Run npm inside container"
        echo "  ./dev.sh marp <args>      - Run marp inside container"
        echo "  ./dev.sh unlock-worktrees - Release branch locks across worktrees for IDE checkout"
        ;;
esac
