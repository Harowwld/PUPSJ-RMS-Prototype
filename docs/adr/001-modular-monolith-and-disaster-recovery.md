# ADR 001: Modular Monolith Architecture & 3-2-1 Immutable Disaster Recovery Strategy

## Status
Accepted

## Date
2026-11-07

## Context
The Polytechnic University of the Philippines San Juan Campus (PUPSJ) requires a robust, tamper-evident digital records keeping and archival system (PUPSJ-RMS) to manage permanent academic student records, document verification workflows, organization event proposals, and disaster recovery.

The campus operates primarily within an on-premise local area network (LAN) environment with constrained IT operations staffing and zero tolerance for data loss or unauthorized access to student Personally Identifiable Information (PII). A prior proposal considered a distributed microservices or multi-database SQLite architecture (`docs/archive/plans/multi-office-architecture.md`).

## Decision
1. **Unified Modular Monolith on PostgreSQL 16:**
   Instead of distributed services or multi-database isolation, the system is consolidated into a single Next.js 16 (App Router) modular monolith backed by a centralized PostgreSQL 16 relational database running in Docker Compose (`pupsj-rms-postgres` on port 5433). Office tenancy (Registrar vs. OSAS) is partitioned logically via schema columns (`office_id`), repository scopes, and dynamic module config tables (`offices`, `modules`, `office_modules`).

2. **Local Blob Storage with Immutable Air-Gap Backup (3-2-1 Rule):**
   Scanned PDFs and binary assets are stored in the local server filesystem under `.local/uploads/` with immutable UUID-indexed filenames. Disaster recovery is achieved through automated, AES-256-GCM encrypted ZIP archives containing complete PostgreSQL dumps and physical assets (`.zip.enc`).

3. **Append-Only External Media Policy:**
   Backups synced to external physical storage (`.local/external_media/` / mounted drive) are strictly **append-only**. Web application endpoints, administrative users, and AI coding agent roles are programmatically barred from deleting or modifying archives stored on the external volume. Deletion actions in the dashboard purge only local server copies and database metadata.

## Consequences
* **Positive:**
  * Eliminates distributed transaction failures, network partitioning bugs, and cross-database joins.
  * Provides strong ACID transactional consistency across student records, physical drawer locations, and audit logs.
  * Guarantees institutional continuity: if the local server fails or is completely compromised, the air-gapped external drive retains uncorrupted, tamper-evident archives with full cold-start recovery capability.
  * Extremely low operational overhead for campus IT administrators.
* **Negative / Tradeoffs:**
  * High-volume OCR rasterization or bulk backup encryption tasks run on the same host and must be carefully bounded with timeouts and asynchronous worker execution to avoid CPU saturation.
