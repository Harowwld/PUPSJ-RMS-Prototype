# Linux Startup Rules for AI Agents

When preparing, starting, or running the PUPSJ Records Management System in a Linux environment (e.g., CachyOS, Arch Linux, Ubuntu, Debian), AI agents **MUST** adhere to the following startup sequence:

## Required Execution Flow

```bash
# Step 1: Switch / ensure docker group in the active shell
newgrp docker

# Step 2: Start PostgreSQL container in background (inside next-app/)
cd next-app && docker compose up -d

# Step 3: Launch dev server, apply migrations, and start Next.js
cd next-app && pnpm dev
```

## Agent Tool Execution Details

1. **Docker Socket Access (`newgrp docker`)**:
   - On Linux, Docker socket permissions (`/var/run/docker.sock`) belong to `root:docker`.
   - In terminal sessions, run `newgrp docker` before executing docker commands.
   - In non-interactive tool executions where subshells do not accept interactive TTY input, run commands with `sg docker -c "..."` or execute compound commands.

2. **Docker Compose (`docker compose up -d`)**:
   - Location: Must be run from `next-app/` where `docker-compose.yml` is located.
   - Service: Starts `pupsj-rms-postgres` on mapped host port `5433` (`5433:5432`).
   - Connection URL: `postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms`.

3. **Development Server (`pnpm dev`)**:
   - Location: `next-app/`.
   - Script: Invokes `scripts/start-local-dev.mjs`, which runs `pnpm db:migrate` and boots Next.js at `http://localhost:3000`.
   - Alternative: Use `pnpm dev:next` if PostgreSQL is already active and migrated.
