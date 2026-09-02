# PUP E-Manage / PUPSJ Records Management System

Local records-management application for PUP San Juan. The current development setup uses **PostgreSQL running locally through Docker Compose**. SQLite is retained only for legacy migration utilities; it is not the active application database.

## Prerequisites

- Git
- Node.js 20 or newer
- pnpm
- Docker Desktop, running before starting the app
- macOS for Apple Vision OCR, or Windows 10/11 with the .NET 8 SDK for Windows OCR

Install pnpm if it is not already available:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Clone and install

Clone the branch you want to run. The latest OCR work is on `OCR-Improvements`:

```bash
git clone -b OCR-Improvements https://github.com/Harowwld/PUPSJ-RMS-Prototype.git
cd PUPSJ-RMS-Prototype/next-app
pnpm install
```

To run the stable `main` branch, omit `-b OCR-Improvements` from the clone command.

## Configure the environment

Create `next-app/.env.local` from the example file:

```bash
cp .env.example .env.local
```

At minimum, set a private JWT secret:

```dotenv
DATABASE_URL=postgres://pupsj_rms:pupsj_rms_local@localhost:5432/pupsj_rms
JWT_SECRET=replace_with_a_long_random_value
DEFAULT_STAFF_PASSWORD=pupstaff
LOCAL_DATA_DIR=.local
```

Do not commit `.env.local`. The default Docker Compose database values are intended for local development only.

## Start PostgreSQL and initialize the database

Start Docker Desktop, then from `next-app/` run:

```bash
docker compose up -d --wait postgres
pnpm db:migrate
pnpm db:seed:sample
pnpm db:verify
```

`db:migrate` applies every numbered SQL migration once. `db:seed:sample` is safe to run again because the sample records use conflict-safe inserts. It creates sample courses, sections, document types, staff, students, documents, requests, and the default room/cabinet/drawer layout.

To start everything in one command, use:

```bash
pnpm dev
```

This starts PostgreSQL, waits for it to become healthy, runs migrations, and starts Next.js. The hot-folder watcher starts only when `HOT_FOLDER_INGEST_TOKEN` is set. If Docker is not running, start Docker Desktop and run the command again.

For Next.js without Docker startup or the hot-folder watcher:

```bash
pnpm dev:next
```

Open [http://localhost:3000](http://localhost:3000).

## Default local accounts

The seeded Registrar administrator is:

| Field | Value |
|---|---|
| Email | `admin.registrar@pup.local` |
| Password | Value of `DEFAULT_STAFF_PASSWORD` (default: `pupstaff`) |
| Role | Admin |
| Office | Registrar |

The sample staff account is `records.marcus@pup.local` and uses the same default password.

Change default passwords before using the system beyond local testing.

## Apple Vision OCR setup (macOS)

The PSA coordinate-recognition workflow uses the native OCR binary. Build it once from `next-app/`:

```bash
mkdir -p bin
swiftc -O scripts/apple-vision-ocr/ocr.swift -o bin/apple-vision-ocr
```

The binary must exist at `next-app/bin/apple-vision-ocr`. If it is missing, normal database and upload features still run, but OCR requests will report that the native OCR engine is unavailable.

## Windows OCR setup

On Windows, install the .NET 8 SDK and build the included Windows OCR helper:

```bat
scripts\windows-media-ocr\build.bat
```

The build script places the executable where the application expects it.

## PSA coordinate-template workflow

1. Log in as the Registrar Admin.
2. Open **Data → PSA Recognition**.
3. Select the PSA document type.
4. Under **Fields to OCR**, click `First name`, `Middle name`, or `Last name`.
5. Click **Load PSA PDF or image** and choose a representative scan.
6. Drag a rectangle around the printed value for the selected field.
7. Repeat until all three fields show `Set`.
8. Click **Save template** at the bottom of the panel.

Coordinates are normalized from `0` to `1`, so templates work across scan resolutions. Calibrate using multiple PSA layouts and verify that parent/informant fields are outside the selected regions. Recognition presents database candidates; staff confirmation is still required before association.

## Useful commands

Run from `next-app/`:

```bash
pnpm lint                 # ESLint
pnpm build                # production build
pnpm test:recognition     # coordinate/name recognition tests
pnpm db:verify            # PostgreSQL health and row-count checks
pnpm db:backup            # create a local encrypted backup
pnpm populate-sample-data # seed/update sample data
```

Resetting the database is destructive. The legacy helper requires the app to be running and should only be used for local testing:

```bash
pnpm reset-db
```

After a reset, restart the Next.js server and run `pnpm db:seed:sample` again.

## Project structure

- `src/app/` — Next.js pages and API routes
- `src/components/admin/` — administrator tabs, including PSA calibration
- `src/components/staff/` — scanning, upload, archive, and request workflows
- `src/lib/` — PostgreSQL access, repositories, authentication, OCR, and utilities
- `migrations/` — ordered PostgreSQL schema and seed migrations
- `scripts/` — database, OCR, hot-folder, and verification utilities
- `.local/` — local uploads, backups, and runtime data; do not commit it

## Troubleshooting

### Docker API or socket error

Start Docker Desktop, wait until it reports that Docker is running, then retry `pnpm dev`.

### `DATABASE_URL is required`

Confirm that `next-app/.env.local` exists and contains `DATABASE_URL`, then run `docker compose up -d --wait postgres`.

### PostgreSQL connection refused

Check the container:

```bash
docker compose ps
docker compose logs postgres
```

### OCR binary not found

Build the platform-specific binary described above. OCR is local and does not use a cloud OCR service.

### Duplicate key error while seeding

Run `pnpm db:verify` first. The sample seed is designed to update existing sample rows, but manually inserted records must use unique student numbers, document IDs, and emails.
