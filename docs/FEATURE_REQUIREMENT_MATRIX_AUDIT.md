# Comprehensive Codebase Audit: Thesis Table 5 (Requirements – Features Matrix) vs. PUPSJ-RMS Prototype

> **Audit Date:** September 2026  
> **Target Object:** Table 5. Requirements – Features Matrix (Manuscript / Thesis Specification)  
> **System Analyzed:** PUPSJ Records Management System (PUPSJ-RMS Prototype)  
> **Primary Source Verification:** Validated directly against PostgreSQL migrations (`001_initial.sql` to `041_student_security_answers.sql`), Next.js 16 App Router API endpoints (`src/app/api/**`), backend data repositories (`src/lib/*Repo.js`), and React 19 UI components (`src/components/**`).

---

## 1. Executive Summary & Verdict

The 8-feature by 5-requirement matrix presented in **Table 5** contains **four valid alignments**, **one critical technical error**, and **three unjustified empty rows**:

1. **Exact Alignments (4 rows):**
   - `F3: Document/Record Upload` properly maps to `R1 (Record Digitization Module)` and `R3 (OCR Module)`.
   - `F5: Backup File Encryption` properly maps to `R5 (Backup & Recovery Module)`.
   - `F7: Manage Digital Records` properly maps to `R1 (Record Digitization Module)`.
   - `F8: Search/Retrieve Records` properly maps to `R2 (Storage Layout Visualization)` and `R4 (Search & Retrieval Module)`.
2. **Critical Technical Error (Row F4):**
   - `F4: Document backup and Archiving` currently has a checkmark under `R3: OCR Module`. **In the codebase, OCR is 100% absent from the backup and recovery pipeline.** The backup system creates AES-256-GCM encrypted `.zip.enc` snapshots of PostgreSQL tables and file system directories. Checking R3 for backup is a false positive (likely a column copy slip).
3. **Empty / Orphaned Rows (Rows F1, F2, F6):**
   - `F1: Login` and `F2: Manage User accounts` have **zero checkmarks**. In formal software engineering (IEEE 830 / ISO/IEC/IEEE 29148), an empty row indicates an unmapped "orphan feature". This occurred because the thesis defined R1–R5 as domain-specific records modules, omitting a **User Authentication & Security Module (RBAC)**.
   - `F6: Dashboard Analytics` has **zero checkmarks**. In the codebase, the primary analytics engine is the **Digitization Compliance Matrix** (`DigitizationComplianceTab.js`), which evaluates **R1: Record Digitization Module**. Leaving F6 blank is an omission of core functionality.
4. **Scope Truncation:**
   - Table 5 lists only 8 features, whereas the actual PUPSJ-RMS codebase implements **15 full enterprise modules**, including the Online Document Request System (ODRS), Scanner Hot-Folder Ingestion Feeder, 2D Floor Plan Layout Editor, Multi-Office Tenancy, and Tamper-Evident Audit Logging (see `docs/FEATURE_REQUIREMENT_MATRIX.md`).

---

## 2. Granular Traceability Audit (Cell-by-Cell)

### F1: Login
* **Current Matrix State:** Blank (0 checkmarks).
* **Codebase Implementation:**
  - Route: [`POST /api/auth/login`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/login/route.js#L63-L262) & [`POST /api/auth/student/login`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/student/login/route.js).
  - Middleware: [`next-app/src/middleware.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/middleware.js#L1-L60) (JWT verification on all edge routes).
  - Security Core: [`staffPassword.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/staffPassword.js) (scrypt hashing), [`jwt.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/jwt.js) (HS256 tokens in HTTP-only `pup_session` cookies), [`rateLimiter.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/rateLimiter.js), and [`TotpModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/auth/TotpModal.js) (TOTP 2FA).
* **Audit Finding:**
  - **Misaligned via Omission:** The feature is fully implemented, but has no requirement to map to. The requirement columns R1–R5 represent records operations, omitting an access control module.
* **Correction:** Introduce `R6: User Authentication & Security Module (RBAC)` or add a defensive footnote stating that Login serves as the cross-cutting security gateway protecting R1–R5.

---

### F2: Manage User accounts
* **Current Matrix State:** Blank (0 checkmarks).
* **Codebase Implementation:**
  - UI: [`StaffDirectoryTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/StaffDirectoryTab.js), [`RegisterAccountTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/RegisterAccountTab.js), and [`GlobalStaffTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalStaffTab.js).
  - Repositories & APIs: [`staffRepo.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/staffRepo.js), [`studentAccountsRepo.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/studentAccountsRepo.js), [`/api/staff`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/staff/route.js), [`/api/staff/[id]`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/staff/%5Bid%5D/route.js).
  - Database: `staff` table with roles (`SuperAdmin`, `Admin`, `Staff`) and `student_accounts` with status toggles (`Active`, `Inactive`, `Archived`).
* **Audit Finding:**
  - **Misaligned via Omission:** Fully implemented, but orphaned due to the lack of an authentication/RBAC column.
* **Correction:** Map to `R6 (User Authentication & RBAC)`.

---

### F3: Document/Record Upload
* **Current Matrix State:** Checked under `R1: Record Digitization Module` (✓) and `R3: OCR Module` (✓).
* **Codebase Implementation:**
  - Multipart Handling: [`POST /api/documents`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/route.js#L51-L85) accepts PDF files up to 25MB, writes sanitized UUID files to `.local/uploads/`, and creates records in the `documents` table.
  - OCR Pipeline: [`ScanUploadTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/ScanUploadTab.js#L1465-L1475) calls [`ocrClient.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/ocrClient.js), passing scans to local native OCR (Apple Vision / Windows Media / Tesseract.js fallback) and fuzzy name matching.
  - PSA Coordinate Recognition: [`POST /api/recognition/match`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/recognition/match/route.js) applies user-calibrated bounding box templates to extract names from birth certificates.
* **Audit Finding:**
  - **Fully Aligned (Exact Match):** Record upload directly integrates file digitization (R1) with OCR extraction (R3).

---

### F4: Document backup and Archiving
* **Current Matrix State:** Checked under `R3: OCR Module` (✓) and `R5: Backup & Recovery Module` (✓).
* **Codebase Implementation:**
  - Backup Engine: [`backupsRepo.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/backupsRepo.js#L10-L120), [`scripts/backup-database.mjs`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/scripts/backup-database.mjs), [`POST /api/system/backup`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/backup/route.js).
  - Physical Archiving: `students` table (`storage_room`, `storage_cabinet`, `storage_drawer`), [`RecordsArchiveTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RecordsArchiveTab.js).
  - Code search for "ocr" across the backup codebase: **0 matches.**
* **Audit Finding:**
  - **CRITICAL ERROR:** R3 (OCR Module) is completely unrelated to backups. Backups execute database dumps and file compression. No character recognition takes place.
* **Correction:** **Remove checkmark under R3.** Check `R5 (Backup & Recovery)` as the primary requirement. If "Archiving" refers to the physical archive, also check `R2 (Storage Layout Visualization)`; if it refers to digital record retention, check `R1 (Record Digitization)`.

---

### F5: Backup File Encryption
* **Current Matrix State:** Checked under `R5: Backup & Recovery Module` (✓).
* **Codebase Implementation:**
  - Encryption: [`backupsRepo.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/backupsRepo.js#L12) uses `aes-256-gcm` authenticated encryption with `PUPSBK1` magic header and SHA-256 cryptographic verification.
  - Specifications: [`docs/BACKUP_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/BACKUP_SPEC.md#L23-L35).
* **Audit Finding:**
  - **Fully Aligned (Exact Match):** F5 directly satisfies R5.

---

### F6: Dashboard Analytics
* **Current Matrix State:** Blank (0 checkmarks).
* **Codebase Implementation:**
  - Digitization Compliance Analytics: [`DigitizationComplianceTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/DigitizationComplianceTab.js), [`digitizationComplianceRepo.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/digitizationComplianceRepo.js#L54-L189), [`GET /api/analytics/digitization-compliance`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/analytics/digitization-compliance/route.js). Calculates compliance rates per course/year/section against required credentials (PSA, Form 137, etc.).
  - Request SLA Analytics: [`SLAAnalyticsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/SLAAnalyticsTab.js), [`GET /api/analytics/document-requests`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/analytics/document-requests/route.js).
  - Storage Capacity Analytics: [`StorageExplorerTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StorageExplorerTab.js) displays drawer occupancy percentages.
* **Audit Finding:**
  - **Misaligned via Omission:** The primary dashboard is literally titled **Digitization Compliance** and exists to monitor `R1: Record Digitization Module`. Leaving this row blank disconnects the system's reporting subsystem from its domain module.
* **Correction:** **Check R1 (Record Digitization Module)**. Optionally check `R4` (for Request SLA metrics) and `R2` (for Storage Capacity metrics).

---

### F7: Manage Digital Records
* **Current Matrix State:** Checked under `R1: Record Digitization Module` (✓).
* **Codebase Implementation:**
  - UI: [`DigitalRecordsReviewTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/DigitalRecordsReviewTab.js) (approval queue), [`DocumentsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/DocumentsTab.js), [`PDFPreviewModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/PDFPreviewModal.js).
  - Backend: [`GET /api/documents`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/route.js) (filtering by student, doc type, approval status), [`PATCH /api/documents/[id]`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/%5Bid%5D/route.js) (approving/declining records with review notes).
* **Audit Finding:**
  - **Aligned:** Digital records management directly belongs to R1.
  - **Enhancement:** Since managing records requires querying, filtering, and previewing stored files, it also leverages `R4: Search & Retrieval Module`.

---

### F8: Search/Retrieve Records
* **Current Matrix State:** Checked under `R2: Storage Layout Visualization` (✓) and `R4: Search & Retrieval Module` (✓).
* **Codebase Implementation:**
  - Digital Retrieval: [`StudentDirectoryTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StudentDirectoryTab.js), [`/api/students?q=...`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/students/route.js).
  - Physical Retrieval & 2D Floor Plan: [`RecordsArchiveTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RecordsArchiveTab.js), [`StorageExplorerTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StorageExplorerTab.js), and [`RoomMap2D.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RoomMap2D.js). When a user searches for a student, the 2D blueprint animates and highlights the specific Room, Cabinet (A–H), and Drawer (1–4).
* **Audit Finding:**
  - **Fully Aligned (Exact Match):** The dual checkmark under R2 (physical location visualization) and R4 (database search and retrieval) accurately reflects the dual-retrieval design of PUPSJ-RMS.
  - *Note:* In the manuscript, the label for F8 was sliced across a table break ("F8: Search/R" and "etrieve Records"); this is a typography/formatting issue.

---

## 3. Recommended Matrices for Capstone Defense

### Option A: In-Place Remediation (Preserving Existing 8×5 Matrix)
*Use this option if the thesis document strictly restricts the requirements columns to the original five.*

| Features | R1: Record Digitization Module | R2: Storage Layout Visualization | R3: OCR Module | R4: Search & Retrieval Module | R5: Backup & Recovery Module | Justification / Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **F1: Login** | — | — | — | — | — | *Cross-cutting security gateway (see footnote below).* |
| **F2: Manage User accounts** | — | — | — | — | — | *System administration capability governing access to R1–R5.* |
| **F3: Document/Record Upload** | **✓** | — | **✓** | — | — | **Aligned.** Ingests scans into digital repository (R1) via OCR (R3). |
| **F4: Document backup and Archiving** | — | — | <del>✓</del> **[REMOVED]** | — | **✓** | **Corrected.** OCR (R3) removed; backup/restore is handled by R5. |
| **F5: Backup File Encryption** | — | — | — | — | **✓** | **Aligned.** AES-256-GCM authenticated encryption fulfills R5. |
| **F6: Dashboard Analytics** | **✓** **[ADDED]** | — | — | **✓** **[ADDED]** | — | **Corrected.** Directly tracks Digitization Compliance (R1) and SLA metrics (R4). |
| **F7: Manage Digital Records** | **✓** | — | — | **✓** **[ADDED]** | — | **Expanded.** Records review (R1) intrinsically requires query/retrieval (R4). |
| **F8: Search/Retrieve Records** | — | **✓** | — | **✓** | — | **Aligned.** Searches database (R4) and highlights 2D physical cabinet/drawer (R2). |

> **Mandatory Footnote for Defense:**  
> *"Note: Features F1 (Login) and F2 (Manage User accounts) represent cross-cutting security infrastructure (Role-Based Access Control and Session Management). They do not map to domain modules R1–R5 directly, but enforce authorization across all five operational modules."*

---

### Option B: Comprehensive 8×6 Matrix (Defensively Robust)
*Recommended for software defense to completely eliminate unmapped rows.*

| Features | R1: Record Digitization | R2: Storage Layout | R3: OCR Module | R4: Search & Retrieval | R5: Backup & Recovery | R6: User Auth & RBAC [NEW] | Primary Implementation File |
|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **F1: Login** | — | — | — | — | — | **✓** | `next-app/src/app/api/auth/login/route.js` |
| **F2: Manage User accounts** | — | — | — | — | — | **✓** | `next-app/src/app/api/staff/route.js` |
| **F3: Document/Record Upload** | **✓** | — | **✓** | — | — | — | `next-app/src/components/staff/ScanUploadTab.js` |
| **F4: Document backup and Archiving** | — | — | — | — | **✓** | — | `next-app/src/lib/backupsRepo.js` |
| **F5: Backup File Encryption** | — | — | — | — | **✓** | — | `next-app/src/lib/encryption.js` |
| **F6: Dashboard Analytics** | **✓** | — | — | **✓** | — | — | `next-app/src/components/admin/DigitizationComplianceTab.js` |
| **F7: Manage Digital Records** | **✓** | — | — | **✓** | — | — | `next-app/src/components/admin/DigitalRecordsReviewTab.js` |
| **F8: Search/Retrieve Records** | — | **✓** | — | **✓** | — | — | `next-app/src/components/staff/StorageExplorerTab.js` |

---

## 4. Key Defense Talking Points for Examiners

1. **If asked: "Why was OCR checked for Document Backup in Table 5?"**  
   *Response:* "That was an artifact of an earlier table draft. In the finalized architecture, optical character recognition is strictly decoupled into the document upload and batch ingestion pipelines (`ocrClient.js`). The backup module (`backupsRepo.js`) is deliberately isolated from OCR to produce deterministic, tamper-proof AES-256-GCM snapshots of the database and raw assets without overhead."

2. **If asked: "Why were Login and User Management empty in your original matrix?"**  
   *Response:* "Table 5 originally categorized only the core domain-specific records management requirements (R1–R5). Login and User Management are cross-cutting foundational security requirements that gate access to the entire application. We have revised the matrix to include R6 (User Authentication & RBAC) so that every functional capability has 100% formal traceability."

3. **If asked: "What does Dashboard Analytics actually do if it had no checkmarks?"**  
   *Response:* "The core dashboard in PUPSJ-RMS is the **Digitization Compliance Analytics** tab (`DigitizationComplianceTab.js`). It evaluates whether students have satisfied mandatory admission credentials (PSA Birth Certificate, Form 137, Good Moral), tracking compliance rates across degree programs and year levels. It directly measures and validates **R1: Record Digitization Module**."
