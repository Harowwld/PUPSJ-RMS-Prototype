# SYSTEM.md — PUPSJ Records Keeping System (PUPSJ-RKS)
## Systems Architecture & Engineering Contract

> **Phase:** Phase 2 — Verified Architecture & Rules-to-Tests Mapping  
> **Status:** Phase 1 Approved; Phase 2 Contracts Active  
> **Rule of Numbers:** Every number is explicitly labeled `[MEASURED]`, `[TARGET]`, or `[GUESS]`.

---

## 1. System Intake

### 1.1 Scope
* **In-Scope Use Cases:**
  * **Master Student Records Directory:** Institutional registry of student demographics, academic status, course, year, and section with physical 2D archive mapping (Room, Cabinet, Drawer).
  * **Document Ingestion & Local Native OCR:** Multi-format digitization (PDF, JPEG, PNG) up to 25 MB `[TARGET]`, coordinate-based PSA birth certificate parsing, and OCR student candidate fuzzy suggestion matching with <= 10% `[TARGET]` edit distance.
  * **Batch Scanner Feeder Pipeline:** Real-time hot-folder monitoring via daemon watcher, multi-page batch splitting, and human-in-the-loop review station.
  * **Digital Records Quality Review (QA):** Administrative verification queue, zoomable/pan PDF preview modal, metadata validation, approval (`Approved`), and mandatory feedback on rejection (`Declined`).
  * **Online Document Request System (ODRS):** Student/alumni self-service request submission, public tracking reference code, multi-state fulfillment workflow (`Pending`, `InProgress`, `Ready`, `Completed`, `Cancelled`), and document attachment linking.
  * **OSAS Student Organization Governance:** Event proposal submissions with attached PDF documentation, revision loops, and status approval workflows.
  * **Digitization Compliance & SLA Analytics:** Degree document compliance checklists, deficiency reporting, fulfillment SLA duration tracking, and operational bottleneck visualization.
  * **Multi-Office Tenancy & Dynamic Modules:** System module toggles per campus office (Registrar, OSAS), preserving isolation between office workspaces.
  * **Identity, Auth & Audit Trail:** 4-tier RBAC (`SuperAdmin`, `Admin`, `Staff`, `Student`), Scrypt password hashing, HS256 JWT cookies, RFC 6238 TOTP 2FA, 2+3 security questions, and database-backed activity logging for selected security and record actions.
  * **Encrypted 3-2-1 Backup & Disaster Recovery:** AES-256-GCM encrypted snapshot packaging, SHA-256 checksum verification, and automated background sync to immutable external storage.
* **Out-of-Scope Use Cases:**
  * Public cloud blob storage (AWS S3, Azure Blob, GCS) — campus governance mandates on-premise local disk persistence.
  * Live Student Information System (SIS) course enrollment, grading computation, and billing ledger calculation.
  * Direct payment gateway processing (landbank/credit card/e-wallet checkout) — payment receipt verification is staff-mediated via reference number.
  * Real-time audio/video streaming or messaging.
* **Who Uses It:**
  * **Registrar Staff & Admins:** Daily ingestion, scanning review, student profile updates, physical archive coordination, document request fulfillment.
  * **OSAS Staff & Admins:** Student organization roster management, event proposal review, compliance validation.
  * **SuperAdmin / Campus IT:** System-wide governance, office tenant provisioning, backup/restore drills, audit review.
  * **Students & Alumni:** Self-service document requests, tracking status, organization event submissions.
* **How They Use It:**
  * Modern desktop/tablet web browsers across the campus local area network (LAN) and authorized VPN.
  * Dedicated network scanner stations pushing TIFF/PDF/JPEG files to monitored hot-folders via local SMB mount.
* **Inputs & Outputs:**
  * **Inputs:** Scanned PDF/JPEG/PNG documents, student demographic CSV files, ODRS request forms, OSAS event proposals, security answers, TOTP codes.
  * **Outputs:** Encrypted `.zip.enc` backup archives, student record search indices, institutional compliance summaries, downloadable PDF transcripts/certifications, CSV audit trail exports.
* **Success Criteria:**
  * Zero unverified student record overwrites.
  * 100% tamper detection on corrupted backup archives prior to restore.
  * p99 API metadata read response time < 150 ms `[TARGET]`.
  * Disaster recovery RPO <= 24 hours `[TARGET]` and RTO <= 15 minutes `[TARGET]`.

---

### 1.2 Scale
* **Users Now:**
  * Staff & Admin accounts: 5 `[MEASURED]`
  * Student test accounts: 2 `[MEASURED]`
  * Registered student records in master directory: 86 `[MEASURED]`
* **Users in 3 Years:**
  * Active students & alumni requestors: ~3,500 `[TARGET]`
  * Staff & Administrator accounts: 20 `[TARGET]`
  * Master student records: ~12,000 `[TARGET]`
* **Data Size Now:**
  * PostgreSQL 16 database disk size: 12 MB `[MEASURED]`
  * Total database tables: 48 tables `[MEASURED]`
  * Database schema migrations: 92 migration records `[MEASURED]`
  * Local uploads directory (`.local/uploads`): 84 KB `[MEASURED]`
  * Local backups directory (`.local/backups`): 52 KB `[MEASURED]`
  * Total active filesystem storage footprint: ~13 MB `[MEASURED]`
* **Growth Per Month:**
  * New scanned documents ingested per month: 500 documents `[GUESS]`
  * Average file size per scanned PDF/JPEG document: 1.2 MB `[GUESS]`
  * Monthly binary document storage growth: 500 * 1.2 MB = 600 MB / month `[GUESS]`
  * Monthly database metadata, transaction updates, and audit trail growth: 15 MB / month `[GUESS]`
  * Total raw storage growth: 615 MB / month `[GUESS]`
* **Storage After 3 Years:**
  * Active binary and relational data: 36 months * 615 MB/month = 22,140 MB ≈ 22.14 GB `[GUESS]`
  * With 3-2-1 backup rotation (7 daily + 4 weekly + 12 monthly AES-256-GCM archives): ~45 GB `[TARGET]` total disk allocation required.
* **Request Throughput (RPS):**
  * **Reads:**
    * Average RPS (reads): 0.15 RPS `[GUESS]` (assuming ~4,300 queries distributed over an 8-hour campus operational shift)
    * Peak RPS (reads): 15 RPS `[TARGET]` (peak enrollment, graduation clearance, ODRS batch release)
  * **Writes:**
    * Average RPS (writes): 0.02 RPS `[GUESS]` (~570 write transactions per 8-hour campus shift)
    * Peak RPS (writes): 3 RPS `[TARGET]` (concurrent scanner hot-folder ingestion + bulk student CSV import)
  * **Read-to-Write Ratio:** ~8:1 `[GUESS]` (predominantly read/query heavy for lookups, verification, and status tracking)
  * **Peak Factor:** ~100x `[GUESS]` over baseline idle RPS during institutional operational bursts.

---

### 1.3 Math
* **Time Conversion:**  
  1 month = 30 days * 24 hours * 3,600 seconds = 2,592,000 seconds ≈ 2.5M seconds.  
  Therefore, sustained 1 RPS ≈ 2.5M requests per month.
* **Throughput Translation:**
  * Average Throughput: 0.17 RPS combined (0.15 read + 0.02 write) `[GUESS]` = 0.17 * 2.5M ≈ 425,000 requests / month `[GUESS]`.
  * Peak Throughput: 18 RPS combined (15 read + 3 write) `[TARGET]`.
* **Storage Projection:**
  * Monthly storage rate: 600 MB (blobs) + 15 MB (DB) = 615 MB / month `[GUESS]`.
  * Storage after 12 months (Year 1): 12 * 615 MB = 7.38 GB `[GUESS]`.
  * Storage after 36 months (Year 3): 36 * 615 MB = 22.14 GB `[GUESS]`.
  * Redundant 3-2-1 local + external media capacity requirement (including snapshots): 50 GB `[TARGET]`.

---

### 1.4 Concurrency
* **Peak RPS ($\lambda$):** 18 requests / second `[TARGET]`
* **Average Time in System ($W$):**
  * Metadata query / read endpoint: 50 ms = 0.05 s `[TARGET]`
  * Document upload & OCR pipeline: 800 ms = 0.80 s `[TARGET]`
  * Weighted average system latency across traffic mix: 100 ms = 0.10 s `[TARGET]`
* **Average In-Flight Requests at Peak (Little's Law: $L = \lambda \times W$):**  
  $$L = 18 \text{ req/s} \times 0.10 \text{ s} = 1.8 \approx 2 \text{ requests in-flight floor} \ [TARGET]$$
* **Rule on Concurrency Floor vs. Pool Size:**  
  $L = 2$ represents the *concurrency floor* (minimum simultaneously active execution contexts), **NOT** the database connection pool size.  
  * Current PostgreSQL client connection pool size: 20 connections `[MEASURED]`.  
  * PostgreSQL server max connections: 100 connections `[MEASURED]`.  
  * Headroom factor: 10x over peak concurrency floor to absorb slow synchronous operations.

---

### 1.5 System Component Map & Call Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Client Layer                                     │
│  ┌─────────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Web Client (React 19)   │  │ Hardware Scanner│  │ Student/Alumni ODRS │  │
│  │ Staff/Admin/SuperAdmin  │  │ Network Feeder  │  │ Public Portal       │  │
│  └────────────┬────────────┘  └────────┬────────┘  └──────────┬──────────┘  │
└───────────────┼────────────────────────┼──────────────────────┼─────────────┘
                │ HTTPS                  │ SMB / Hot-Folder     │ HTTPS
┌───────────────▼────────────────────────┼──────────────────────▼─────────────┐
│                          Edge / Ingress Layer                               │
│  ┌─────────────────────────────────────▼─────────────────────────────────┐  │
│  │ TLS Termination & Reverse Proxy (Port 443 -> Host 3000)               │  │
│  │ Static Caching (Fonts, Icons, CSS, Client JS bundles)                 │  │
│  └─────────────────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────────────────┼────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────┐
│                    Application Layer (Modular Monolith)                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Next.js 16 App Router Server Runtime (Node.js 20)                     │  │
│  │                                                                       │  │
│  │ ┌───────────────────────────────────────────────────────────────────┐ │  │
│  │ │ Middleware: JWT Cookie Verification, RBAC Gate, Rate Limit Check   │ │  │
│  │ └─────────────────────────────────┬─────────────────────────────────┘ │  │
│  │                                   │                                   │  │
│  │ ┌─────────────────────────────────▼─────────────────────────────────┐ │  │
│  │ │ API Route Handlers (/api/*)                                       │ │  │
│  │ │ • /api/auth/*       • /api/documents/*    • /api/students/*       │ │  │
│  │ │ • /api/system/*     • /api/ingest/*       • /api/analytics/*      │ │  │
│  │ └─────────────────────────────────┬─────────────────────────────────┘ │  │
│  │                                   │                                   │  │
│  │ ┌─────────────────────────────────▼─────────────────────────────────┐ │  │
│  │ │ Repositories Layer (src/lib/*Repo.js)                             │ │  │
│  │ │ (studentsRepo, documentsRepo, auditLogsRepo, backupsRepo, etc.)   │ │  │
│  │ └───────────────────┬───────────────────────────────┬───────────────┘ │  │
│  └─────────────────────┼───────────────────────────────┼─────────────────┘  │
│                        │                               │                    │
│  ┌─────────────────────▼────────────────┐  ┌───────────▼─────────────────┐  │
│  │ Local OCR Engine                     │  │ Hot-Folder Watcher Daemon   │  │
│  │ Apple Vision / Windows Media / PDFjs │  │ scripts/hot-folder-watcher  │  │
│  └──────────────────────────────────────┘  └─────────────────────────────┘  │
└────────────────────────┼───────────────────────────────┼────────────────────┘
                         │                               │
┌────────────────────────▼───────────────────────────────▼────────────────────┐
│                        Persistence & Storage Layer                          │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │ PostgreSQL 16 (Docker Container)    │  │ File System Storage          │  │
│  │ • Container: pupsj-rms-postgres     │  │ • Active: .local/uploads/    │  │
│  │ • Port: 5433 (mapped from 5432)     │  │ • Hot: .local/hot-folder/    │  │
│  │ • Driver: pg (v8.23.0) Pool         │  │ • Backups: .local/backups/   │  │
│  │ • 48 Relational Tables              │  │ • Air-Gap: External Drive    │  │
│  └─────────────────────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Concept Decisions & Rules

| # | Concept Decision | System Architecture Rule | Target Metric | Red Test Name | Status |
|---|---|---|---|---|---|
| **R1** | **Performance vs Scalability** | Heavy compute tasks (OCR page parsing, PDF rendering, AES-256 compression) must execute out-of-process/asynchronously to keep event loop and pool unblocked. | Max CPU spike <= 70% `[TARGET]` | `heavy_compute_async_non_blocking` | `UNTESTED` *(Hardware scanner dependent)* |
| **R2** | **Latency vs Throughput** | Every outbound call and database query must enforce an explicit timeout shorter than the caller budget; return 504 on timeout. | Query timeout 5,000ms `[TARGET]`, p99 < 150ms `[TARGET]` | `api_call_timeout_returns_504` | `TESTED` |
| **R3** | **Availability vs Consistency** | Core tables (`students`, `documents`, `backups`, `staff`) require strict serializable consistency (ACID) on primary. Authors read their own writes immediately. | Read lag = 0ms `[TARGET]` | `consistent_reads_read_own_writes` | `TESTED` |
| **R4.1** | **Disaster Recovery (RPO/RTO)** | Restore from encrypted AES-256-GCM `.zip.enc` must recover database schema, rows, and files within SLA. Corrupted checksums or tampered ciphertext abort before restore. | RPO <= 24h `[TARGET]`, RTO <= 15m `[TARGET]` | `restore_meets_rpo` | `TESTED` |
| **R4.2** | **Immutable External Archive** | Application UI and agent roles cannot delete backups from external archive media. External sync is strictly append-only. | Deletion calls to external drive = 0 `[TARGET]` | `agent_role_cannot_destroy` | `TESTED` |
| **R5** | **Edge & Caching** | Static assets cached publicly; viewer-dependent & authenticated endpoints must return `Cache-Control: private, no-store, no-cache`. | Cache leakage = 0 `[TARGET]` | `authenticated_cache_control_private` | `TESTED` |
| **R6** | **Application Layer** | Stateless modular monolith running Next.js 16 + 1 PostgreSQL container + local blob storage. No unapproved distributed queues or microservices. | Service count = 1 `[MEASURED]` | `stateless_monolith_isolated_store` | `TESTED` |
| **R7** | **Database Schema Evolution** | Migrations follow expand-migrate-contract pattern using numbered forward SQL scripts. N+1 queries forbidden via batched joins. | N+1 queries = 0 `[TARGET]` | `migration_idempotent_no_n_plus_one` | `TESTED` |
| **R8** | **Taxonomic Cache & Deduplication** | In-memory lookup tables (`courses`, `sections`, `document_types`) use 300s TTL. Concurrent misses use single-flight deduplication. Cache flush falls back to DB cleanly. | TTL = 300s `[TARGET]`, DB queries on burst miss = 1 `[TARGET]` | `hot_key_miss_loads_once` | `TESTED` |
| **R9** | **Jobs & Retries** | Background sync jobs bound retries to 3 attempts with exponential backoff and jitter. Tasks include unique `x-request-id` and SHA-256 idempotency key. | Max retries = 3 `[TARGET]` | `full_queue_sheds_load` | `TESTED` |
| **R10** | **Communication & Circuit Breaker** | Subprocess calls (OCR, external drive sync) trip circuit breaker after 5 consecutive failures for 60 seconds, returning fallback response. | Failure threshold = 5 `[TARGET]`, Reset = 60s `[TARGET]` | `circuit_breaker_trips_on_failure` | `UNTESTED` *(Managed external mount failure)* |
| **R11** | **Identity, Auth & Burst Shedding** | Zero unparameterized SQL queries. Passwords hashed with Scrypt. Sensitive operations require TOTP. Rate limit table sheds burst traffic over 5 attempts with 429. | Burst limit = 5/15m `[TARGET]`, SQL injection surface = 0 `[TARGET]` | `pool_holds_at_burst` | `TESTED` |

---

## 3. Limits & Verification Principles
* A test catches only the fault you defined.
* Staging numbers are `MEASURED` for staging only.
* Never weaken or delete a red test to make a change pass.
* Context files guide you. The tests are the check.
