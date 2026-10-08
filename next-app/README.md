# eManage / PUPSJ Records Management System

Local records-management application for PUP San Juan. The current development setup uses **PostgreSQL running locally through Docker Compose**. SQLite is retained only for legacy migration utilities; it is not the active application database.

## One-click desktop installation

### macOS

On a supported macOS release, download and extract the project ZIP, then double-click `next-app/installer/mac/Install-PUPSJRMS.command`. It downloads the official Docker Desktop build for Apple silicon or Intel when needed, installs the app and database containers, creates private secrets, secures the initial staff password, and adds Start/Stop launchers to your Desktop. No Homebrew, Git, Node.js, or pnpm is required.

The Mac needs internet access for Docker Desktop and the first container build, and an administrator password may be required to install Docker. Open Docker Desktop and accept its first-run terms if prompted. Docker Desktop currently supports the latest macOS release and the two previous major releases, with at least 4 GB of RAM. The RMS app and `.env` are stored under `~/Library/Application Support/PUPSJ-RMS`; the `.env` is readable only by your Mac user. Database and uploaded files persist in Docker volumes when the app is stopped. The scanner inbox is in the same application support folder.

If macOS blocks the downloaded `.command` file, use Finder's **Open** action for the installer. To update, extract the newer project ZIP and run its installer; it preserves `.env` and Docker volumes. Back up the system before upgrades that include database migrations.

### Windows

For a Windows 10/11 workstation, use the installer in `installer/windows`. It installs Docker Desktop if needed, builds the application and PostgreSQL containers, creates private secrets, secures the initial staff password, and adds Start/Stop and Configure Email shortcuts to the Public Desktop. No Git, Node.js, pnpm, or manual Docker commands are needed on the workstation.

1. Download and extract the project ZIP on the workstation.
2. Open `next-app/installer/windows` and double-click `Install-PUPSJRMS.bat`.
3. Approve the Windows administrator prompt and choose an installation folder, such as `D:\PUPSJ-RMS`, or accept the default `%ProgramData%\PUPSJ-RMS`. Updates reuse the existing installation location.
4. Choose an initial staff password with at least 12 letters or numbers, then choose whether to configure email. The optional wizard asks for SMTP host, port, encryption, authentication, sender address, and the application address recipients can access. SMTP passwords are hidden. You can skip this step and configure email later.
5. After setup, optionally send a test email to an address you choose. A successful SMTP response means the mail server accepted it; check the recipient's Inbox and Spam folder to confirm delivery.
6. Open **PUPSJ RMS** on the desktop, or visit the HTTP address printed by the installer (normally `http://127.0.0.1:3000/`).

The workstation needs internet access for Docker Desktop and the initial container build. Installing a missing Docker Desktop requires Windows Package Manager (`winget`); if it is missing, install or update **App Installer** from Microsoft Store. An existing Docker Desktop is detected through its CLI location, Windows installation records, and standard folders, including installations on another drive. A Docker CLI alone does not count as Docker Desktop. Docker Desktop may ask for first-run approval or a Windows restart. Re-run the installer after restarting if setup did not finish. The scanner inbox is under the chosen installation folder at `hot-folder`.

The installer's `.env` is stored under the chosen installation folder at `app\.env` (normally `C:\ProgramData\PUPSJ-RMS\app\.env`) and access is restricted to Windows administrators and SYSTEM. Windows stores the installation location so updates and Configure Email find the same settings. Keep the chosen staff password private. The initial SuperAdmin account is `superadmin@pup.local`. Start and Stop desktop shortcuts detect Docker's current location when launched.

The app and database run locally in Docker; database and upload data persist in Docker volumes when the app is stopped. Choosing a different RMS installation folder does not move Docker Desktop's internal storage or migrate an existing installation.

Connect a USB external drive before installing or launching **PUPSJ RMS**. The Windows installer and Start shortcut detect one connected removable or USB disk, create `PUPSJ-RMS-Backups` on it, and generate `docker-compose.external-backup.yml` to mount that folder at `/backups/external`. Internal drives, including an alternate internal installation drive, are excluded. If several external drives are connected, set `EXTERNAL_BACKUP_HOST_PATH=E:/PUPSJ-RMS-Backups` (using your drive letter) in the existing `app\.env` to select one. No new secrets or extra environment file are needed. When no eligible drive is available or the folder is not writable, the app starts with local backups only; reconnect the drive and use Start again to configure it. Docker Desktop must allow sharing the selected drive. Keep the drive connected during scheduled backups. This provides the external copy; an offsite copy still needs separate storage.

Enable each office's automatic backup schedule in its Backup & Recovery page. The Docker app uses `Asia/Manila` for the schedule time. The installer configures storage without enabling or changing schedules. Scheduled backups retain the local archive if the external copy fails. SuperAdmin platform backups and office backups cover different data; schedule both where needed.

Use **Configure Email** on the Public Desktop to change email settings later, or run `Configure-PUPSJRMSEmail.bat` from the installed `installer/windows` folder. The same wizard preserves other `.env` settings and keeps existing values when you accept their defaults. Saving changes recreates the app container so they take effect; it does not reset accounts or the database. Use an application URL recipients can reach, such as the workstation's LAN address, for recovery links. If email setup is skipped, security-question recovery remains available for accounts with saved answers; sending account emails and email-link recovery require SMTP.

The installer and Start shortcut read all of Docker's published ports for the app's internal port `3000`, then check HTTP directly from Windows without a proxy. Each retry tries IPv4 loopback (`http://127.0.0.1:<port>/`) first, then falls back to IPv6 loopback (`http://[::1]:<port>/`). Setup reports success only after an address returns a successful response; the Start shortcut opens that exact validated address in your default browser. Docker Desktop and the Windows host must expose the port on the address family used; the installer does not enable IPv6 or change Docker networking. If every address fails, the error lists the IPv4 and IPv6 addresses tested, their last errors, and Docker commands to inspect the app. Container health alone does not confirm Windows can reach the published port.

To use another Windows port, change `APP_PORT` in the installed `.env` (for example, `APP_PORT=3001`), then use the Start shortcut to recreate the app's port mapping. Docker still uses port `3000` inside the app container.

To install an application update, extract the newer project ZIP and run its installer again. It reuses the existing `.env` and Docker volumes. Back up the system before upgrades that include database migrations.

## Session renewal

New sign-ins receive a 15-minute access JWT and an HTTP-only refresh cookie with a fixed seven-day expiry. The browser renews before access expires and retries a same-origin API request once after a `401`. A `403` remains a permission error and is not retried. Refresh credentials stay in cookies; the database stores their hashes and rotates them on each renewal. Replay outside a short window for simultaneous requests revokes that browser session. This follows the rotation and reuse-detection pattern described in [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

Staff and student sign-ins, completed two-factor authentication, and password changes issue refresh credentials. Pending two-factor challenges cannot renew. Logout revokes the browser session even after its access JWT has expired. Password resets, account or role changes, inactive offices, and session revocation continue to prevent renewal. Refresh does not change office or document permissions.

Apply migration `071_auth_refresh_tokens.sql` with `pnpm db:migrate` before starting this version (Docker startup applies migrations automatically). Existing eight-hour access sessions remain valid until their original expiry; sign in again to receive refresh credentials. Cookies retain the existing HTTP behavior for `localhost`, `127.0.0.1`, and `[::1]`, and use secure cookies for hosted production addresses. Refresh does not transfer a login between these different hosts. After restoring a full system backup, rotate `JWT_SECRET` and restart the app to invalidate credentials restored with the backup.

## Developer prerequisites

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

## Clone and install for development

Clone the branch you want to run. The latest OCR work is on `OCR-Improvements`:

```bash
git clone -b OCR-Improvements https://github.com/Harowwld/PUPSJ-RMS-Prototype.git
cd PUPSJ-RMS-Prototype/next-app
pnpm install
```

To run the stable `main` branch, omit `-b OCR-Improvements` from the clone command.

## Configure the environment

Development scripts and Docker Compose use the same `next-app/.env` file. From `next-app/`, create it from the example file if it does not already exist:

```bash
cp -n .env.example .env
```

If you previously used `.env.local`, merge its settings into `.env`, preserving any existing values you still need, then remove `.env.local`. Next.js gives `.env.local` priority over `.env`, so leaving the old file can override your updated settings. Restart the development server after changing `.env`; for Docker Compose, run `docker compose up -d --build --wait` to apply the changes.

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

SMTP settings are needed for credential emails after staff creation, office-admin provisioning, student self-registration, and staff password recovery. `SMTP_FROM` must be an address permitted by your mail provider. Use port 465 with `SMTP_SECURE=true`, or port 587 with `SMTP_SECURE=false`. Docker Compose passes these values to the app container. Without SMTP configured, account creation still succeeds and its API response reports `credentialEmail.sent: false`. Newly provisioned accounts receive their assigned password; student self-registration confirms the email username and tells the student to use the password they chose, without repeating it in email.

For staff password recovery, enter the registered email address or Staff ID, then click **Reset Password** in the recovery email and enter the new password twice. Links expire after 15 minutes and cannot be reused. A new request replaces previous links, and a successful reset invalidates earlier login sessions. Recovery requires configured SMTP and a deliverable registered email address; demo `@pup.local` addresses cannot receive mail through a public email provider. The request response does not disclose whether an account exists.

Alternatively, select **Use security questions**, enter the email address or Staff ID, select one of the account's previously answered questions, and provide its answer with the new password. Answers ignore leading/trailing spaces and letter case. This method works without SMTP; accounts with no saved answers must use email recovery or contact an administrator. Both recovery methods enforce password policy and rate limits and invalidate earlier login sessions after a successful reset.

Set `APP_URL` to the address recipients can reach, such as the registrar PC's LAN address or the deployed HTTPS URL. This trusted address is used for recovery links; non-local requests require it. When it is unset, localhost requests use their local origin. The recovery credential is carried in the URL fragment and removed from the address bar after the form opens. Restart the app after changing SMTP or `APP_URL` environment variables.

## Run the complete application with Docker

From `next-app/`, use the same `.env` configured above. If it does not exist yet, create it and replace the sample secrets:

```bash
cp -n .env.example .env
```

Set private values for `JWT_SECRET`, `DEFAULT_STAFF_PASSWORD`, `HOT_FOLDER_INGEST_TOKEN`, and `POSTGRES_PASSWORD` in `.env`. Production startup requires the first three; the token also authenticates the scanner watcher.

Build and start the web app, PostgreSQL, migrations, and hot-folder watcher:

```bash
docker compose up -d --build --wait
docker compose ps
```

Open [http://localhost:3000](http://localhost:3000). Application uploads and backups persist in the `pupsj_rms_app_data` Docker volume; PostgreSQL persists separately in `pupsj_rms_postgres`. The scanner inbox is a host folder mounted into the app container. By default, put scanner files in `/tmp/pupsj-rms-hot-folder/INBOUND`; set `HOT_FOLDER_HOST_PATH` in `.env` to choose another Docker-shared host folder. The watcher moves files through `PROCESSING`, then to `DONE` or `FAILED`, and uses the configured token to authenticate with the app. After the ingest API acknowledges receipt, the app owns a separate copy in `.local/ingest/` (under `LOCAL_DATA_DIR`); promotion stores the document in `.local/storage/<office>/uploads/`, or the office's configured storage path. `DONE` means accepted by ingest, not that OCR has finished. The watcher deletes regular scanner files from `DONE` after each accepted upload, on startup, and every 60 seconds; cleanup errors are logged and retried on the next sweep. It preserves `INBOUND`, `PROCESSING`, `FAILED`, symlinks, and subfolders for recovery. Database migrations run automatically before the web server starts. OCR uses Tesseract inside the Linux app container.

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

In System Admin → Office Management → Edit Office Details → Scanning Workstation, use **Browse** beside **Scanner Inbound Watch Path** to choose a folder on the computer running `pnpm dev`. The native folder picker supports macOS, Windows, and Linux desktops; the selected path is checked for read/write access, saved, and the watcher switches to it automatically. On a headless Linux host, install `zenity` and run the app in a graphical session. A folder on a different computer must be mounted or shared on the watcher host first. Docker deployments need the selected host folder mounted into the app container at the same path.

For Next.js without Docker startup or the hot-folder watcher:

```bash
pnpm dev:next
```

Open [http://localhost:3000](http://localhost:3000).

## Default demo & local accounts

The system includes pre-seeded demo accounts for all administrative, office, and student roles. Personnel use the `DEFAULT_STAFF_PASSWORD` value configured in `.env`. Student demo credentials depend on which seed script created the account.

| Role | Office / Scope | Account ID / Student No | Email Identifier | Default Password | Dashboard Route & Purpose |
|---|---|---|---|---|---|
| **SuperAdmin** | Global (`NULL`) | `PUPSUPERADMIN-001` | `superadmin@pup.local` *(or `admin.default@pup.local`)* | `DEFAULT_STAFF_PASSWORD` from `.env` | `/systemadmin` (System-wide administration, office provisioning, system health) |
| **Registrar Admin** | Office of the Registrar | `PUPREGISTRAR-003` | `admin.registrar@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` | `/admin` (Registrar compliance, storage layout, document review, batch scanning) |
| **Registrar Staff** | Office of the Registrar | `PUPREGISTRAR-002` | `staff.registrar@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` | `/staff` (Digitization, scan & upload, student records, document request fulfillment) |
| **OSAS Admin** | Office of Student Affairs and Services | `PUPOSAS-001` | `admin.osas@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` | `/admin` (OSAS records review, student organization event proposals) |
| **OSAS Staff** | Office of Student Affairs and Services | `PUPOSAS-002` | `staff.osas@pup.local` | `DEFAULT_STAFF_PASSWORD` from `.env` | `/staff` (Student organization operations and OSAS workflows) |
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

Resetting the database is destructive. The local helper connects directly to PostgreSQL using `DATABASE_URL` from `next-app/.env`; only the database needs to be running. It does not require an app login or a running Next.js server. It accepts only local database hosts (`localhost`, `127.0.0.1`, or `::1`) and refuses to run with `NODE_ENV=production`. Running the command starts the reset without prompts and seeds the demo staff accounts using `DEFAULT_STAFF_PASSWORD` (or `pupstaff` if unset):

```bash
pnpm reset-db
```

The package command supplies the required `--confirm` flag. Direct invocation also requires confirmation: `node scripts/reset-db.mjs --confirm`. After a reset, restart the Next.js server if needed and run `pnpm populate-sample-data` to restore sample records.

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
