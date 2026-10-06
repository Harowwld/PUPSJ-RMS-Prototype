# eManage / PUPSJ Records Management System

Local records-management application for PUP San Juan. The current development setup uses **PostgreSQL running locally through Docker Compose**. SQLite is retained only for legacy migration utilities; it is not the active application database.

## Prerequisites

- Git
- Node.js 20 or newer
- pnpm
- Docker Desktop, running before starting the app
- macOS for Apple Vision OCR, or Windows 10/11 with the .NET 8 SDK for Windows OCR
- Docker mode uses Tesseract OCR in its Linux app container

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

Create `next-app/.env` from the example file:

```bash
cp -n .env.example .env
```

Set private values for the JWT secret and default staff password. Set a hot-folder token if you want the scanner watcher enabled during host-based development:

```dotenv
DATABASE_URL=postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms
JWT_SECRET=replace_with_a_long_random_value
DEFAULT_STAFF_PASSWORD=replace_with_a_private_password
HOT_FOLDER_INGEST_TOKEN=replace_with_a_random_token_at_least_32_chars
LOCAL_DATA_DIR=.local
APP_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="PUPSJ RMS <no-reply@example.com>"
```

Do not commit `.env`. The default Docker Compose database values are intended for local development only.

SMTP settings are needed for credential emails after staff creation, office-admin provisioning, and student self-registration. `SMTP_FROM` must be an address permitted by your mail provider. Use port 465 with `SMTP_SECURE=true`, or port 587 with `SMTP_SECURE=false`. Docker Compose passes these values to the app container. Without SMTP configured, account creation still succeeds and its API response reports `credentialEmail.sent: false`. Newly provisioned accounts receive their assigned password; student self-registration confirms the email username and tells the student to use the password they chose, without repeating it in email.

## Run the complete application with Docker

From `next-app/`, create the Compose environment file and replace the sample secrets:

```bash
cp -n .env.example .env
```

Set private values for `JWT_SECRET`, `DEFAULT_STAFF_PASSWORD`, `HOT_FOLDER_INGEST_TOKEN`, and `POSTGRES_PASSWORD` in `.env`. Production startup requires the first three; the token also authenticates the scanner watcher.

Build and start the web app, PostgreSQL, migrations, and hot-folder watcher:

```bash
docker compose up -d --build --wait
docker compose ps
```

Open [http://localhost:3000](http://localhost:3000). Application uploads and backups persist in the `pupsj_rms_app_data` Docker volume; PostgreSQL persists separately in `pupsj_rms_postgres`. The scanner inbox is a host folder mounted into the app container. By default, put scanner files in `/tmp/pupsj-rms-hot-folder/INBOUND`; set `HOT_FOLDER_HOST_PATH` in `.env` to choose another Docker-shared host folder. The watcher moves files through `PROCESSING`, then to `DONE` or `FAILED`, and uses the configured token to authenticate with the app. Database migrations run automatically before the web server starts. OCR uses Tesseract inside the Linux app container.

Stop the containers while preserving the PostgreSQL database volume with:

```bash
docker compose down
```

`docker compose down -v` removes the PostgreSQL and app-data volumes, permanently deleting their contents. The scanner inbox is a host folder and remains in place.

## Start PostgreSQL and initialize the database

### Linux Startup Sequence (AI Agents & Developers)
On Linux environments, ensure your active shell session has Docker permissions before running services:
```bash
newgrp docker
docker compose up -d --wait postgres
pnpm dev
```

### General / Desktop Workflow
Start Docker Desktop (or the Docker daemon on Linux), then from `next-app/` run:

```bash
docker compose up -d --wait postgres
pnpm db:migrate
pnpm db:seed:sample
pnpm db:verify
```

`db:migrate` applies every numbered SQL migration once. `db:seed:sample` is safe to run again because the sample records use conflict-safe inserts. It creates sample courses, sections, document types, staff, students, documents, requests, and the default room/cabinet/drawer layout. When run from the terminal, it prints credentials for the staff and student demo accounts it seeds; staff passwords use `DEFAULT_STAFF_PASSWORD` or default to `pupstaff`, and student passwords are `student123`.

For host-based development, use:

```bash
pnpm dev
```

This starts PostgreSQL, waits for it to become healthy, runs migrations, and starts Next.js. The hot-folder watcher starts only when `HOT_FOLDER_INGEST_TOKEN` is set. If Docker is not running, start Docker Desktop (or verify Docker daemon) and run the command again.

For Next.js without Docker startup or the hot-folder watcher:

```bash
pnpm dev:next
```

Open [http://localhost:3000](http://localhost:3000).

## Default demo & local accounts

The system includes pre-seeded demo accounts for all administrative, office, and student roles. Personnel use the `DEFAULT_STAFF_PASSWORD` value configured in `.env`. Student demo credentials depend on which seed script created the account.

| Role | Office / Scope | Account ID / Student No | Email Identifier | Default Password | Dashboard Route & Purpose |
|---|---|---|---|---|---|
| **SuperAdmin** | Global (`NULL`) | `PUPSUPERADMIN-001` | `superadmin@pup.local` *(or `admin.default@pup.local`)* | `DEFAULT_STAFF_PASSWORD` from `.env` or `.env` | `/systemadmin` (System-wide administration, office provisioning, system health) |
| **Registrar Admin** | Office of the Registrar | `PUPREGISTRAR-003` | `admin.registrar@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` or `.env` | `/admin` (Registrar compliance, storage layout, document review, batch scanning) |
| **Registrar Staff** | Office of the Registrar | `PUPREGISTRAR-002` | `staff.registrar@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` or `.env` | `/staff` (Digitization, scan & upload, student records, document request fulfillment) |
| **OSAS Admin** | Office of Student Affairs and Services | `PUPOSAS-001` | `admin.osas@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` or `.env` | `/admin` (OSAS records review, student organization event proposals) |
| **OSAS Staff** | Office of Student Affairs and Services | `PUPOSAS-002` | `staff.osas@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` or `.env` | `/staff` (Student organization operations and OSAS workflows) |
| **Student** | Student Portal | `2022-10001-MN-1` (Juan Dela Cruz) | `student@pup.local` *(or `2022-10001-MN-1`)* | Set by the seed script | `/student` (Online Document Request System & Student Org Event Submissions) |

> **Note**: Demo personnel accounts are pre-seeded with recovery answers so they bypass first-time password setup modals during presentations. You can also use the **Demo Accounts** quick-fill pills located on the sign-in page (`/`).

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

To inspect request counts without deleting anything, run this from `next-app/`:

```bash
pnpm requests:clear
```

To delete all document requests and their request-owned attachments, feedback, and timeline updates, explicitly confirm:

```bash
pnpm requests:clear -- --confirm
```

This preserves students, accounts, official documents, staff, and OSAS event-proposal updates.

Resetting the database is destructive. The local helper requires the app to be running and a SuperAdmin account. Running the command starts the reset without prompts. It uses `DEFAULT_STAFF_PASSWORD` from `.env` (or `pupstaff` if unset); set `RESET_PASSWORD` or `RESET_USERNAME` to override the login values:

```bash
pnpm reset-db
```

After a reset, restart the Next.js server if needed and run `pnpm populate-sample-data` to restore sample records.

To clear current rate-limit hits and lockouts without changing the configured protections, run:

```bash
pnpm reset-rate-limit
```

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

Confirm that `next-app/.env` exists and contains `DATABASE_URL`, then run `docker compose up -d --wait postgres`.

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
