# Antigravity Agent Guidelines & Project Rules

This repository is a public Open Source Software (OSS) project for `marp-slide-mcp`.
All AI agents operating in **Antigravity 2.0** and **Antigravity IDE** MUST strictly follow the rules defined in this document.

---

## 1. CRITICAL MANDATE: Docker Development Environment Only

> [!IMPORTANT]
> **NEVER execute development commands directly on the host machine.**
> All installations, builds, type checking, tests, Marp conversions, and script executions MUST run inside the Docker container.

### Execution Policy
- **Antigravity IDE**: Open and operate within the DevContainer (`ms-vscode-remote.remote-containers`).
- **Antigravity 2.0 / Terminal Commands**: When executing shell commands from the host, always route them through Docker Compose:

```bash
# General command execution
docker compose run --rm app <command>

# Or use the provided helper scripts:
# Windows (PowerShell):
.\dev.ps1 run npm run build
.\dev.ps1 run npm run build:pdf

# Linux / Mac / WSL (Bash):
./dev.sh run npm run build
./dev.sh run npm run build:pdf
```

### Standard Automated Development Workflow
- **Dependency installation**: `docker compose run --rm app npm install`
- **TypeScript Build**: `docker compose run --rm app npm run build`
- **Slide PDF Export**: `docker compose run --rm app npm run build:pdf`
- **Slide PPTX Export**: `docker compose run --rm app npm run build:pptx`
- **Start MCP Server**: `docker compose run --rm app npm run start`

---

## 2. OSS Privacy & Identity Protection

> [!CAUTION]
> **NO PERSONAL IDENTIFIABLE INFORMATION (PII) OR LOCAL HOST PATHS.**
> This repository is publicly published on GitHub (`https://github.com/N-Y-Public/marp-slide-mcp`).

1. **Git Author / Committer Identity**:
   - Name: `N-Y-Public`
   - Email: `330902043+N-Y-Public@users.noreply.github.com`
   - Never use personal names or private email addresses.
   - The `.githooks/pre-commit` hook automatically enforces this policy.

2. **No Local Host Paths**:
   - Never commit or log host-specific absolute paths (such as `/Users/...` or `/home/...`).
   - Always use relative paths from the repository root (e.g. `./slides/...`, `./src/...`).

3. **No Secrets / Credentials**:
   - Never commit `.env`, API keys, tokens, or credential files.
   - Refer to `.gitignore` for excluded patterns.

---

## 3. Project Architecture & Manual Source Integration

1. **Source Code Structure**:
   - Future source files (TypeScript MCP server, custom Marp business themes, PPTX converter, slide templates, prompts) are managed under `src/`, `themes/`, `slides/`, `templates/`, `prompts/`, and `pptx_converter/`.
   - The container image contains Node.js 22 LTS, headless Chromium, Japanese CJK fonts (`fonts-noto-cjk`), and Puppeteer dependencies to guarantee pixel-perfect Marp PDF exports.

2. **Automated Verification Before Commit**:
   - Always ensure TypeScript compiles cleanly: `docker compose run --rm app npm run build`
   - Verify slide export renders properly if slide changes occur: `docker compose run --rm app npm run build:pdf`
