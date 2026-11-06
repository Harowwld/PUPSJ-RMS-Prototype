# PUPSJ RKS Prototype — Complete Technology Stack Documentation

> [!NOTE]
> For operational developer guides, startup sequences, and agent conventions, see [`AGENTS.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/AGENTS.md).
> For design system and Apple HIG button/modal rules, see [`COMPONENT_STANDARDS.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/COMPONENT_STANDARDS.md).

---

## 1. Core Framework & Runtime

### **Next.js 16.3.5** (React 19.2.3)
- **Architecture**: Next.js App Router (`next-app/src/app/`)
- **Runtime**: Node.js 20+ server-side runtime
- **Package Manager**: `pnpm`
- **Build Tool**: Turbopack & Next.js production compiler

---

## 2. Database & Persistence Layer

### **PostgreSQL 16 (Local Docker)**
- **Container**: `pupsj-rms-postgres` (defined in `next-app/docker-compose.yml`)
- **Port Mapping**: Host port `5433` mapped to container port `5432`
- **Connection**: `postgres://pupsj_rms:pupsj_rms_local@localhost:5433/pupsj_rms`
- **Driver**: `pg` (v8.23.0) with shared connection pooling (`src/lib/postgres.js`)
- **Schema & Migrations**: Numbered SQL migrations in `next-app/migrations/` managed via `scripts/run-migrations.mjs`
- **Multi-Tenancy Model**: Unified relational schema with `offices`, `modules`, `office_modules`, and office-partitioned transactions and records
- **Pattern**: Repository pattern via `src/lib/*Repo.js`

---

## 3. UI Framework & Styling

### **Tailwind CSS v4**
- **Configuration**: CSS-first configuration via `@theme` tokens in `src/app/globals.css`
- **Brand Colors**: PUP Maroon (`#800000`), Dark Maroon (`#5a0000`)
- **Typography**: Plus Jakarta Sans (self-hosted variable font)
- **Component Primitives**: Base UI (`@base-ui/react`), Radix / shadcn/ui primitives
- **Icons**: Hugeicons (`@hugeicons/react`, `hugeicons-react`, `@hugeicons/core-free-icons`) using direct named imports (Phosphor icons deprecated)
- **Toasts**: `sonner` (`<Toaster />`)
- **Motion**: `framer-motion`, `motion`, `tw-animate-css`

---

## 4. Authentication & Security

### **JWT Session Management**
- **Library**: `jose` (HS256)
- **Storage**: HTTP-only cookie (`pup_session`)
- **Principal Verification**: Mandatory server-side DB validation of active status on all protected routes
- **CSRF Protection**: State-changing endpoints verified with CSRF headers/tokens

### **Two-Factor Authentication (TOTP)**
- **Libraries**: `speakeasy`, `otpauth`, `qrcode`
- **Encryption**: AES-256 for secrets at rest

### **Role-Based Access Control (RBAC)**
- **Roles**:
  - `SuperAdmin` (`/superadmin` / `/systemadmin`)
  - `Admin` (`/admin`)
  - `Staff` (`/staff`)
  - `Student` (`/student`)

---

## 5. Document Processing, OCR & Ingestion

### **OCR & Parsing Pipeline**
- **Local OCR / Extraction**: Apple Vision native worker & `pdfjs-dist` text layer extraction
- **NLP Normalization**: `wink-nlp` & `wink-eng-lite-web-model` for names and dates
- **PDF Generation & Manipulation**: `jspdf`, `jspdf-autotable`, `pdf-lib`
- **Hot-Folder Ingest**: Real-time file system watcher via `chokidar` with bearer-token authenticated ingestion API

---

## 6. Backup & Disaster Recovery

- **Encryption**: AES-256-GCM authenticated encryption for snapshots (`.zip.enc`)
- **Packaging**: `adm-zip`
- **Integrity**: SHA-256 cryptographic checksums stored in database
- **Strategy**: 3-2-1 strategy with append-only immutable external archive policy (see [`BACKUP_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/BACKUP_SPEC.md))

---

## 7. Key Dependencies Overview

### **Production**
```json
{
  "@base-ui/react": "^1.8.0",
  "@hugeicons/react": "^1.1.10",
  "adm-zip": "^0.6.1",
  "chokidar": "^4.0.3",
  "clsx": "^2.1.1",
  "date-fns": "^4.4.0",
  "framer-motion": "^12.43.0",
  "hugeicons-react": "^0.3.0",
  "jose": "^5.10.0",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.8",
  "next": "16.3.5",
  "otpauth": "^9.5.2",
  "pdf-lib": "^1.17.1",
  "pdfjs-dist": "^4.10.38",
  "pg": "^8.23.0",
  "qrcode": "^1.5.4",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "recharts": "^3.10.1",
  "socket.io": "^4.8.3",
  "socket.io-client": "^4.8.3",
  "sonner": "^2.0.8",
  "speakeasy": "^2.0.0",
  "tailwind-merge": "^3.7.0",
  "wink-nlp": "^2.4.0",
  "zod": "^4.6.5"
}
```
