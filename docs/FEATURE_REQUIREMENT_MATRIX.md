# PUPSJ Records Management System (PUPSJ-RMS)
## Feature Requirement Matrix (FRM) & Technical Specification

> **Document Version:** 1.0.0
> **Last Updated:** September 2026
> **Target System:** PUPSJ-RMS Prototype (PostgreSQL 16 + Next.js 16 App Router)
> **Primary Source Verification:** Derived directly from active codebase routes, database migrations (`migrations/001_initial.sql` to `migrations/041_student_security_answers.sql`), repository implementations (`src/lib/*Repo.js`), and React UI components (`src/components/*`).

---

## 1. Executive Summary & Specification Model

In software engineering and systems architecture, a **Feature Requirement Matrix (FRM)** establishes end-to-end traceability between high-level institutional capabilities (**Features**), the operational subsystem building blocks (**Modules**), and the granular, testable rules (**Functional & Technical Requirements**) that deliver them.

```
┌────────────────────────────────────────────────────────┐
│               HIGH-LEVEL FEATURE (F#)                  │
│       e.g., F1: Record Upload & Digitization           │
└──────────────────────────┬─────────────────────────────┘
                           │ requires
┌──────────────────────────▼─────────────────────────────┐
│             SUBSYSTEM MODULES / ENGINES                │
│    • Scan & Upload Module (`scan_upload`)              │
│    • Local Native OCR Engine (`ocrClient.js`)          │
│    • Coordinate Recognition Engine (`psaRecognition`)  │
│    • Storage & Document Repository (`documentsRepo`)   │
└──────────────────────────┬─────────────────────────────┘
                           │ decomposes into
┌──────────────────────────▼─────────────────────────────┐
│          GRANULAR FUNCTIONAL REQUIREMENTS (FR)         │
│    • FR-1.1: Multi-format Scanned Image/PDF Ingestion  │
│    • FR-1.2: Native Coordinate OCR Field Extraction    │
│    • FR-1.3: Fuzzy Name-to-Student Record Correlation  │
│    • FR-1.4: Document Type Taxonomy Association        │
│    • FR-1.5: Pending Verification Queue Handoff        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Master Feature-to-Requirements Traceability Matrix

The table below presents the primary mapping across all 15 operational features of the PUPSJ Records Management System:

| Feature ID | Feature Name | Primary Subsystem Modules | Core Requirements Summary | User Roles | Primary Implementation Artifacts |
|---|---|---|---|---|---|
| **F1** | **Record Upload & Digitization** | `scan_upload`, `ocrClient`, `documentsRepo`, `psaRecognitionRepo` | Multi-format upload, local native OCR text extraction, coordinate-based PSA template recognition, fuzzy student matching, UUID storage pipeline. | Staff, Admin | `ScanUploadTab.js`, `ContinuousScanningPanel.js`, `/api/documents`, `/api/ingest/ocr` |
| **F2** | **Automated Ingest Pipeline & Batch Feeder Review** | `batch_review`, `ingest_queue`, `hot-folder-watcher` | Hot-folder scanner station monitoring (`chokidar`), multi-page batch splitting, OCR confidence scoring, side-by-side staging verification. | Staff | `BatchReviewTab.js`, `scripts/hot-folder-watcher.mjs`, `/api/ingest/batches/*`, `/api/ingest/review/*` |
| **F3** | **Digital Records Quality Review & Approval** | `records_review`, `documentsRepo`, `auditLogsRepo` | Administrative QA queue, zoomable/pan PDF preview, metadata verification, two-state approval (`Approved`/`Declined`), required rejection feedback. | Admin | `DigitalRecordsReviewTab.js`, `PDFPreviewModal.js`, `/api/documents/[id]` |
| **F4** | **Student Master Directory & Profile Management** | `student_directory`, `studentsRepo`, `studentOfficeMembershipsRepo` | Master student records (`YYYY-XXXXX`), demographic profile CRUD, academic section assignment, physical storage coordinate mapping, bulk CSV batch import. | Staff, Admin | `StudentDirectoryTab.js`, `StudentProfileSheet.js`, `RegisterStudentModal.js`, `/api/students/*` |
| **F5** | **2D Interactive Physical Archive & Storage Explorer** | `storage_layout`, `records_archive`, `storage_explorer`, `storageLayoutRepo` | AutoCAD-inspired 2D canvas room layout, normalized 0..1 coordinates, Room/Cabinet/Drawer allocation, real-time drawer occupancy calculation, deletion safeguard. | Staff, Admin | `StorageLayoutEditorTab.js`, `StorageExplorerTab.js`, `RecordsArchiveTab.js`, `RoomMap2D.js`, `/api/storage-layout` |
| **F6** | **Online Document Request System (ODRS)** | `document_requests`, `documentRequestsRepo`, `transactionUpdatesRepo` | Student self-service request submission, public tracking reference, multi-stage state machine (`Pending` to `Completed`), staff fulfillment, digital record linking. | Student, Staff | `DocumentRequestsTab.js`, `RegistrarODRSTab.js`, `/student`, `/api/student/document-requests`, `/api/document-requests/*` |
| **F7** | **OSAS Event Proposal Monitoring & Requirement Review** | `osas_monitoring`, `eventProposalsRepo`, `transactionUpdatesRepo` | Student organization proposal submission with PDF attachment, review workflow (`Submitted` to `Approved`/`Declined`), revision requests, timeline history. | Student, OSAS Staff | `OsasMonitoringTab.js`, `/student`, `/api/student/event-proposals`, `/api/osas/event-proposals/*` |
| **F8** | **Student Digitization Compliance & Records Tracking** | `compliance_analytics`, `digitizationComplianceRepo` | Degree document checklist matrix, student-facing compliance checklist, institutional compliance analytics by course/year, deficiency report export. | Student, Admin | `DigitizationComplianceTab.js`, `StudentComplianceTab.js`, `/api/analytics/digitization-compliance`, `/api/student/compliance` |
| **F9** | **Request SLA & Operational Turnaround Analytics** | `request_analytics`, `documentRequestsRepo`, `recharts` | SLA fulfillment duration metrics, request volume distribution by document type/status, bottleneck detection, interactive trend visualization. | Admin | `SLAAnalyticsTab.js`, `/api/analytics/document-requests` |
| **F10** | **Multi-Office Tenancy & Dynamic Module Configuration** | `office_management`, `modules_matrix`, `officesRepo`, `modulesRepo` | Multi-tenant office registry, dynamic feature toggle matrix (enabling/disabling modules per office), system module enforcement, cross-office data isolation. | SuperAdmin | `OfficeManagementTab.js`, `ModuleConfigTab.js`, `/api/offices/*`, `/api/modules/matrix` |
| **F11** | **Role-Based Access Control & Multi-Tier Identity Security** | `staffRepo`, `studentAccountsRepo`, `jwt`, `staffPassword` (scrypt), `rateLimitRepo` | 4-tier RBAC (`SuperAdmin`, `Admin`, `Staff`, `Student`), Scrypt password hashing, HS256 JWT in HTTP-only cookie, TOTP 2FA, 2+3 Security Questions, IP rate-limiting. | All Roles | `StaffDirectoryTab.js`, `GlobalStaffTab.js`, `TotpModal.js`, `/api/auth/*`, `middleware.js` |
| **F12** | **Comprehensive Audit Trail & Accountability Logging** | `audit_logs`, `global_audit_logs`, `auditLogsRepo`, `globalAuditLogsRepo` | Tamper-evident centralized audit logging, IP & actor attribution, severity classification (`INFO`, `WARNING`, `CRITICAL`), full-text search, CSV export. | Admin, SuperAdmin | `AuditLogsTab.js`, `GlobalAuditLogsTab.js`, `/api/audit-logs/*`, `/api/audit-logs/global/*` |
| **F13** | **Encrypted Backup, Air-Gap Disaster Recovery & Campus Ops** | `backup`, `backupsRepo`, `externalBackup`, `campus_operations` | Full PostgreSQL & file archive generation, AES-256-CBC encryption, SHA-256 integrity checksums, automated background air-gap sync to external drive, system diagnostics. | Admin, SuperAdmin | `BackupTab.js`, `SystemBackupsTab.js`, `CampusOperationsTab.js`, `/api/system/backup/*`, `/api/system/health` |
| **F14** | **Academic Taxonomy & System Configuration** | `system_config`, `coursesRepo`, `sectionsRepo`, `docTypesRepo` | Degree programs & course code catalog, academic sections by year level, document type registry with fuzzy normalizers (`name_norm`), bulk CSV data import. | Admin | `SystemConfigTab.js`, `/api/courses`, `/api/sections`, `/api/doc-types`, `/api/system/bulk-import` |
| **F15** | **Public Information Portal & Landing Page CMS** | `landingRepo`, `landing_bento`, `landing_catalog`, `landing_faq` | Responsive university public landing portal, interactive document catalog & SLA guide, unauthenticated request tracking lookup, SuperAdmin CMS editor. | Public, SuperAdmin | `LandingPageCmsTab.js`, `src/app/page.js`, `src/components/landing/*`, `/api/landing/*` |

---

## 3. Detailed Feature Specifications & Requirement Breakdowns

---

### Feature 1 (F1): Record Upload & Digitization

* **User Objective:** Enable office staff and administrators to ingest paper records into the digital archive through manual upload or flatbed/camera scanning, automatically identifying student identity and document type through local OCR.
* **Target Roles & Portals:** Registrar Staff, OSAS Staff, Office Admin (`/staff`, `/admin`).
* **Required Subsystems & Modules:**
  1. `scan_upload` (Scan & Upload Module)
  2. `ocrClient.js` (Local OCR Engine Abstraction)
  3. `psaRecognitionRepo.js` (Coordinate-based PSA Template Engine)
  4. `documentsRepo.js` (Document Ingestion & File Storage Pipeline)
  5. `nameMatcher.js` (Fuzzy Levenshtein & Token Matcher)

#### Detailed Functional Requirements (FR):
* **FR-1.1 (File Validation & Ingestion):** The system shall accept PDF, PNG, and JPEG formats up to 25MB per document. It must sanitize filenames, assign an immutable UUID filename, and persist physical assets into `.local/uploads/` (or office-isolated storage).
* **FR-1.2 (Continuous & Feeder Scanning):** The system shall support rapid consecutive page captures via connected webcam or TWAIN/WIA scanner feeder without leaving the active session.
* **FR-1.3 (Native Platform OCR Text Extraction):** The system shall utilize local native platform OCR binaries (`scripts/apple-vision-ocr/ocr.swift` on macOS or `scripts/windows-media-ocr` on Windows; fallback `tesseract.js`) to extract raw text blocks and normalized bounding box coordinates without external cloud telemetry.
* **FR-1.4 (PSA Coordinate Template Extraction):** The system shall apply user-calibrated coordinate bounding boxes (`0..1` normalized rectangle coordinates) to extract First Name, Middle Name, and Last Name from standard Philippine Statistics Authority (PSA) birth certificates.
* **FR-1.5 (Fuzzy Student Correlation):** The system shall query the active student database and rank candidates using token matching and Levenshtein distance, automatically proposing matching student numbers and names.
* **FR-1.6 (Document Classification):** The system shall associate the file with an authorized document type taxonomy entry (e.g., Form 137 / SF10, PSA Birth Certificate, Good Moral Character) and register the document in `Pending` status.

#### Technical & Primary Source Traceability:
* **UI Components:** [`ScanUploadTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/ScanUploadTab.js), [`ContinuousScanningPanel.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/ContinuousScanningPanel.js), [`OCRPromptModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/OCRPromptModal.js).
* **API Routes:** [`POST /api/documents`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/route.js), [`POST /api/ingest/ocr`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/ocr/route.js), [`POST /api/recognition/match`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/recognition/match/route.js), [`/api/recognition/templates`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/recognition/templates/route.js).
* **Database Tables:** `documents`, `psa_recognition_templates`, `document_types`.
* **Migrations:** `001_initial.sql`, `013_psa_recognition_templates.sql`, `018_restore_scan_session_tables.sql`.

---

### Feature 2 (F2): Automated Ingest Pipeline & Batch Scanner Review

* **User Objective:** Ingest high-volume document batches generated by automated network scanners, perform asynchronous OCR parsing, and provide a human-in-the-loop review station to confirm or reject batches before archival.
* **Target Roles & Portals:** Registrar Staff (`/staff`).
* **Required Subsystems & Modules:**
  1. `batch_review` (Batch Scanning & Review Module)
  2. `hot-folder-watcher.mjs` (Daemon File System Watcher)
  3. `ingestBatchRepo.js` (Batch Staging & Queue Repository)

#### Detailed Functional Requirements (FR):
* **FR-2.1 (Hot Folder Inbound Monitoring):** The system shall continuously monitor dedicated filesystem folders (`.local/hot-folder/INBOUND/`) using `chokidar`, automatically moving incoming scanner outputs to `PROCESSING/` to prevent partial-file race conditions.
* **FR-2.2 (Batch Splitting & Token Authentication):** External scanner stations shall securely authenticate against `/api/ingest/hot-folder` using a pre-shared bearer token (`HOT_FOLDER_INGEST_TOKEN`).
* **FR-2.3 (Confidence Scoring):** The system shall compute an OCR recognition confidence score (`0% - 100%`) based on dictionary validation and token density, flagging low-confidence documents for manual review.
* **FR-2.4 (Human-in-the-Loop Verification Console):** The system shall display uncommitted batches in `BatchReviewTab.js`, offering side-by-side verification: original scan preview on the left, OCR-extracted metadata fields on the right.
* **FR-2.5 (Batch Lifecycle Operations):** The staff user shall have the ability to `Confirm & Promote` (moves to permanent `documents` table), `Retry OCR` (re-runs OCR with adjusted threshold), or `Reject & Purge`.

#### Technical & Primary Source Traceability:
* **UI Components:** [`BatchReviewTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/BatchReviewTab.js).
* **API Routes:** [`/api/ingest/batches`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/batches/route.js), [`/api/ingest/batches/[id]/process`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/batches/[id]/process/route.js), [`/api/ingest/review/[id]/confirm`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/review/[id]/confirm/route.js), [`/api/ingest/hot-folder`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/hot-folder/route.js).
* **Database Tables:** `ingest_batches`, `ingest_queue`, `batch_ocr_regions`.
* **Migrations:** `010_restore_ingest_queue.sql`, `021_batch_scanning_review.sql`, `023_batch_ocr_regions.sql`, `024_ocr_confidence_scoring.sql`.

---

### Feature 3 (F3): Digital Records Quality Review & Approval

* **User Objective:** Provide administrators with a centralized quality assurance checkpoint to inspect staff-uploaded documents, verify legibility and indexing accuracy, and approve or reject them.
* **Target Roles & Portals:** Office Admin (`/admin`).
* **Required Subsystems & Modules:**
  1. `records_review` (Digital Records Review Module)
  2. `documentsRepo.js`
  3. `auditLogsRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-3.1 (Pending Triage Queue):** The system shall aggregate all pending digitized files across the office into an administrative triage queue, filterable by date, document type, student number, and uploading staff.
* **FR-3.2 (Inspection Viewport):** The system shall render an integrated document viewer (`PDFPreviewModal.js`) supporting high-resolution multi-page rendering, zoom controls, rotation, and side-by-side metadata comparisons.
* **FR-3.3 (Approval Workflow):** The administrator shall be able to mark a document as `Approved`, setting `reviewed_by = admin_id`, `reviewed_at = NOW()`, immediately releasing the document to student compliance and request fulfillment pipelines.
* **FR-3.4 (Rejection Feedback Loop):** When marking a document as `Declined`, the system shall require a non-empty review note specifying the reason (e.g., blurry scan, missing page, mismatched student number), triggering an alert in the staff notifications center.

#### Technical & Primary Source Traceability:
* **UI Components:** [`DigitalRecordsReviewTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/DigitalRecordsReviewTab.js), [`PDFPreviewModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/shared/PDFPreviewModal.js).
* **API Routes:** [`GET /api/documents`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/route.js), [`PATCH /api/documents/[id]`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/documents/[id]/route.js).
* **Database Tables:** `documents` (columns: `approval_status`, `reviewed_by`, `reviewed_at`, `review_note`).
* **Migrations:** `001_initial.sql`.

---

### Feature 4 (F4): Student Master Directory & Academic Profile Management

* **User Objective:** Manage the master registry of enrolled students and alumni, their academic programs, section assignments, status, and physical archive allocation.
* **Target Roles & Portals:** Registrar Staff, OSAS Staff, Admin (`/staff`, `/admin`).
* **Required Subsystems & Modules:**
  1. `student_directory` (Student Directory Module)
  2. `studentsRepo.js`
  3. `studentOfficeMembershipsRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-4.1 (Unique Identification):** The system shall enforce unique student numbering formatted according to PUP standards (`YYYY-XXXXX`).
* **FR-4.2 (Demographic & Academic Profile):** The system shall store student name, course code (foreign key to `courses`), section, year level, and enrollment status (`Active`, `Inactive`, `Archived`).
* **FR-4.3 (Physical Coordinate Binding):** For registrar students, the profile shall bind to a physical storage triplet: `room` (integer), `cabinet` (letter A-H), and `drawer` (integer 1-4).
* **FR-4.4 (Student Profile Sheet):** The system shall provide an Apple HIG slide-over sheet (`StudentProfileSheet.js`) summarizing personal data, physical storage location, uploaded digitized credentials, and active requests.
* **FR-4.5 (Batch Student Population):** The system shall provide a CSV batch import endpoint with header validation, conflict handling (`ON CONFLICT DO UPDATE`), and a summary audit report.

#### Technical & Primary Source Traceability:
* **UI Components:** [`StudentDirectoryTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StudentDirectoryTab.js), [`StudentProfileSheet.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StudentProfileSheet.js), [`RegisterStudentModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RegisterStudentModal.js), [`EditStudentModal.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/EditStudentModal.js).
* **API Routes:** [`/api/students`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/students/route.js), [`/api/students/[studentNo]`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/students/[studentNo]/route.js), [`/api/students/batch`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/students/batch/route.js).
* **Database Tables:** `students`, `student_office_memberships`.
* **Migrations:** `001_initial.sql`, `034_add_student_directory_module.sql`, `036_student_office_memberships.sql`, `040_allow_archived_taxonomy_and_student_status.sql`.

---

### Feature 5 (F5): 2D Interactive Physical Archive & Storage Layout Mapping

* **User Objective:** Provide an interactive AutoCAD-styled 2D blueprint of the university archive room, enabling administrators to design the physical floor plan and staff to quickly locate and retrieve hard-copy folders.
* **Target Roles & Portals:** Registrar Admin (Editor), Registrar Staff (Locator/Explorer) (`/admin`, `/staff`).
* **Required Subsystems & Modules:**
  1. `storage_layout` (Admin Layout Editor Module)
  2. `records_archive` / `storage_explorer` (Staff Archive Explorer Module)
  3. `storageLayoutRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-5.1 (2D CAD Floor Plan Editor):** The system shall render an interactive 2D canvas with precision grid lines, door placements, room boundaries, and movable cabinets with rotation controls.
* **FR-5.2 (Normalized Coordinate Model):** All coordinates (cabinet position `x, y`, width `w`, height `h`, and door anchors) shall be stored as normalized float values (`0.0` to `1.0`), ensuring responsive rendering across varied screen resolutions.
* **FR-5.3 (Interactive Drawer Details Overlay):** Clicking on any cabinet shall display a glassmorphic floating panel indicating drawer status (Target Drawer, Occupied, Empty) with direct folder count indicators and auto-hide timers.
* **FR-5.4 (Capacity & Occupancy Analytics):** The system shall dynamically compute drawer utilization percentages based on live counts from the `students` table.
* **FR-5.5 (Data Integrity Protection):** The system shall validate cabinet deletions; any attempt to delete or alter a cabinet/drawer holding active student physical files shall be rejected with a descriptive error.

#### Technical & Primary Source Traceability:
* **UI Components:** [`StorageLayoutEditorTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/StorageLayoutEditorTab.js), [`StorageExplorerTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/StorageExplorerTab.js), [`RecordsArchiveTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RecordsArchiveTab.js), [`RoomMap2D.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RoomMap2D.js).
* **API Routes:** [`GET /api/storage-layout`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/storage-layout/route.js), [`PUT /api/storage-layout`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/storage-layout/route.js), [`/api/storage-layout/templates`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/storage-layout/templates/route.js).
* **Database Tables:** `settings` (key: `storage_layout`), `office_settings`, `students` (`room`, `cabinet`, `drawer`).
* **Migrations:** `001_initial.sql`, `037_scope_storage_settings.sql`.

---

### Feature 6 (F6): Online Document Request System (ODRS) & Fulfillment Lifecycle

* **User Objective:** Allow enrolled students and alumni to submit requests for official academic records online, track status via an append-only timeline, and allow staff to process and fulfill these requests.
* **Target Roles & Portals:** Students, Alumni, Registrar Staff (`/student`, `/staff`, `/`).
* **Required Subsystems & Modules:**
  1. `document_requests` (formerly `alumni_requests`) (Document Requests Module)
  2. `documentRequestsRepo.js`
  3. `transactionUpdatesRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-6.1 (Request Initiation):** The system shall allow students to select requested document types (e.g., Transcript of Records, Certificate of Registration, Form 137, Good Moral), add notes, and submit.
* **FR-6.2 (Tracking Reference Code):** The system shall generate a unique reference tracking code allowing unauthenticated public tracking on the landing page (`/api/public/track-request`).
* **FR-6.3 (State Machine Workflow):** Requests shall advance through standardized lifecycle states: `Pending` -> `Under Review` -> `In Progress` -> `Ready for Pickup` -> `Completed` (or `Declined`/`Cancelled`).
* **FR-6.4 (Digital Document Linking):** Staff shall be able to link an approved digital document (`linked_document_id`) directly to the request for paperless fulfillment.
* **FR-6.5 (Append-Only Transaction Updates):** Every status transition and staff message shall create an immutable, student-visible entry in `transaction_updates` displaying actor, status, message, and local timestamp.

#### Technical & Primary Source Traceability:
* **UI Components:** [`src/app/student/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/student/page.js), [`DocumentRequestsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/DocumentRequestsTab.js), [`RegistrarODRSTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/RegistrarODRSTab.js).
* **API Routes:** [`/api/student/document-requests`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/student/document-requests/route.js), [`/api/registrar/document-requests`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/registrar/document-requests/route.js), [`/api/document-requests`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/document-requests/route.js), [`/api/public/track-request`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/public/track-request/route.js).
* **Database Tables:** `document_requests`, `transaction_updates`.
* **Migrations:** `001_initial.sql`, `030_allow_nullable_student_no_in_document_requests.sql`, `032_add_course_code_to_document_requests.sql`, `033_add_requester_name_to_document_requests.sql`, `039_rename_alumni_requests_module.sql`.

---

### Feature 7 (F7): OSAS Event Proposal Monitoring & Requirement Review

* **User Objective:** Enable student organizations to submit event proposals, activity clearances, and compliance documents to the Office of Student Affairs and Services (OSAS), while giving OSAS staff an evaluation workbench.
* **Target Roles & Portals:** Students, OSAS Staff (`/student`, `/staff`).
* **Required Subsystems & Modules:**
  1. `osas_monitoring` (OSAS Monitoring Module)
  2. `eventProposalsRepo.js`
  3. `transactionUpdatesRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-7.1 (Proposal Submission):** Students shall be able to submit event proposals specifying organization name, event title, target date, description, and an attached PDF document.
* **FR-7.2 (OSAS Review Workbench):** OSAS staff shall inspect submitted proposals in `OsasMonitoringTab.js` with integrated PDF preview.
* **FR-7.3 (Review Lifecycle Transitions):** Staff shall transition proposals through states: `Submitted`, `Under Review`, `Needs Revision`, `Approved`, `Declined`, or `Archived`.
* **FR-7.4 (Revision Feedback):** Staff shall attach actionable revision instructions that immediately appear on the student's proposal timeline.
* **FR-7.5 (Cross-Office Isolation):** The system shall enforce strict office boundaries: Registrar staff cannot access or review OSAS proposals (returns HTTP 403).

#### Technical & Primary Source Traceability:
* **UI Components:** [`OsasMonitoringTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/OsasMonitoringTab.js), [`src/app/student/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/student/page.js).
* **API Routes:** [`/api/student/event-proposals`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/student/event-proposals/route.js), [`/api/osas/event-proposals`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/osas/event-proposals/route.js), [`/api/osas/event-proposals/[id]`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/osas/event-proposals/[id]/route.js).
* **Database Tables:** `event_proposals`, `transaction_updates`.
* **Migrations:** `001_initial.sql`, `008_event_proposal_archiving.sql`, `011_allow_archived_proposal_status.sql`, `012_backfill_archived_proposal_status.sql`.

---

### Feature 8 (F8): Student Digitization Compliance & Records Completeness Tracking

* **User Objective:** Provide real-time tracking of student credential submissions against institutional admission requirements (e.g., PSA Birth Certificate, Form 137 / SF10, Good Moral), alerting students of deficiencies and providing administrative compliance metrics.
* **Target Roles & Portals:** Students, Registrar Admin (`/student`, `/admin`).
* **Required Subsystems & Modules:**
  1. `compliance_analytics` (Digitization Compliance Module)
  2. `digitizationComplianceRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-8.1 (Requirement Matrix Rule Engine):** The system shall compare the master list of required documents for a degree program against the student's approved uploaded files.
* **FR-8.2 (Student Compliance Checklist):** The student portal (`StudentComplianceTab.js`) shall display an intuitive checklist marking each credential as `Submitted & Approved`, `Pending Review`, or `Missing / Deficient`.
* **FR-8.3 (Institutional Compliance Analytics):** The admin dashboard (`DigitizationComplianceTab.js`) shall aggregate compliance percentages across cohorts, grouped by Degree Program, Section, and Academic Year.
* **FR-8.4 (Graduation Clearance Audit):** The system shall identify students with missing mandatory credentials to prevent graduation clearance bottlenecks.

#### Technical & Primary Source Traceability:
* **UI Components:** [`DigitizationComplianceTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/DigitizationComplianceTab.js), [`StudentComplianceTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/student/StudentComplianceTab.js).
* **API Routes:** [`/api/analytics/digitization-compliance`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/analytics/digitization-compliance/route.js), [`/api/student/compliance`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/student/compliance/route.js).
* **Database Tables:** `students`, `documents`, `document_types`.
* **Migrations:** `001_initial.sql`, `016_seed_all_modules.sql`.

---

### Feature 9 (F9): Request SLA & Operational Turnaround Analytics

* **User Objective:** Provide administrators with quantitative insight into office productivity, Service Level Agreement (SLA) adherence, document request turnaround times, and operational bottlenecks.
* **Target Roles & Portals:** Registrar Admin (`/admin`).
* **Required Subsystems & Modules:**
  1. `request_analytics` (SLA Analytics Module)
  2. `documentRequestsRepo.js`
  3. `recharts` Data Visualization Engine

#### Detailed Functional Requirements (FR):
* **FR-9.1 (Fulfillment Duration Metric):** The system shall compute elapsed time from request creation (`created_at`) to final completion (`updated_at` where status is `Completed`), comparing against the institutional 3-day and 5-day SLA targets.
* **FR-9.2 (Volume & Status Distribution):** The system shall break down requests by document type (TOR, Diploma, Good Moral) and current status (`Pending`, `In Progress`, `Completed`, `Declined`).
* **FR-9.3 (Bottleneck Identification):** The system shall highlight lingering requests that have exceeded standard processing thresholds.
* **FR-9.4 (Interactive Visual Reporting):** The system shall render interactive bar and trend charts with filtering by month, quarter, and academic semester.

#### Technical & Primary Source Traceability:
* **UI Components:** [`SLAAnalyticsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/SLAAnalyticsTab.js).
* **API Routes:** [`/api/analytics/document-requests`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/analytics/document-requests/route.js).
* **Database Tables:** `document_requests`.
* **Migrations:** `001_initial.sql`, `016_seed_all_modules.sql`.

---

### Feature 10 (F10): Multi-Office Tenancy & Dynamic Module Configuration Matrix

* **User Objective:** Support multiple independent campus offices (Registrar, OSAS, Alumni Affairs) on a single unified platform, allowing the SuperAdmin to dynamically toggle which functional modules are enabled for each office.
* **Target Roles & Portals:** SuperAdmin (`/superadmin`, `/systemadmin`).
* **Required Subsystems & Modules:**
  1. `office_management` (Office Management Module)
  2. `modules_matrix` (Module Config Matrix Module)
  3. `officesRepo.js`
  4. `modulesRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-10.1 (Office Provisioning & Branding):** SuperAdmin shall be able to create and configure offices with custom display names, short codes, accent colors (e.g. Maroon `#800000` for Registrar, Orange `#EA580C` for OSAS), and sidebar icons.
* **FR-10.2 (Dynamic Module Toggle Matrix):** SuperAdmin shall be able to view an interactive toggle grid (`ModuleConfigTab.js`) listing all system modules against all offices and toggle access via `PUT /api/offices/[id]/modules`.
* **FR-10.3 (System Module Invariants):** Modules designated with `is_system = TRUE` (such as `audit_logs` and `notifications`) shall be permanently locked and cannot be disabled by administrators.
* **FR-10.4 (Strict Multi-Tenant Route Isolation):** The system middleware and API handlers shall inspect session office context; requests to access another office's records shall be rejected with HTTP 403 Forbidden.
* **FR-10.5 (Dynamic Navigation Filtering):** The client sidebar (`Sidebar.js`) shall query `/api/auth/me` to render only those navigation items authorized for the user's assigned office.

#### Technical & Primary Source Traceability:
* **UI Components:** [`OfficeManagementTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/OfficeManagementTab.js), [`ModuleConfigTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/ModuleConfigTab.js).
* **API Routes:** [`/api/offices`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/offices/route.js), [`/api/offices/[id]/modules`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/offices/[id]/modules/route.js), [`/api/modules`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/modules/route.js), [`/api/modules/matrix`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/modules/matrix/route.js).
* **Database Tables:** `offices`, `modules`, `office_modules`.
* **Migrations:** `001_initial.sql`, `016_seed_all_modules.sql`, `034_add_student_directory_module.sql`, `039_rename_alumni_requests_module.sql`.

---

### Feature 11 (F11): Role-Based Access Control (RBAC) & Multi-Tier Identity Security

* **User Objective:** Enforce strict access control across institutional personnel and students, protect authentication credentials using modern cryptography, and provide multi-factor authentication and self-service recovery.
* **Target Roles & Portals:** All Roles (SuperAdmin, Admin, Staff, Student).
* **Required Subsystems & Modules:**
  1. `staffRepo.js`, `studentAccountsRepo.js`
  2. `jwt.js` (Stateless Token Service via `jose`)
  3. `staffPassword.js` (Scrypt Key Derivation)
  4. `rateLimitRepo.js` (Brute-Force Protection)
  5. `authSessionRepo.js` (Session Versioning & Revocation)

#### Detailed Functional Requirements (FR):
* **FR-11.1 (Four-Tier Role Hierarchy):** The system shall strictly partition privileges: `SuperAdmin` (global campus settings), `Admin` (office administrative QA & settings), `Staff` (day-to-day scanning, records, and requests), and `Student` (self-service ODRS and compliance).
* **FR-11.2 (Cryptographic Password Protection):** Passwords shall be hashed using `scrypt` with random salt strings; legacy SHA-256 hashes shall be automatically upgraded to scrypt upon successful login.
* **FR-11.3 (HTTP-Only Cookie Sessions):** Sessions shall be issued as tamper-proof HS256 JWTs stored in HTTP-only, SameSite cookies (`pup_session`), checked by Next.js edge middleware.
* **FR-11.4 (TOTP Two-Factor Authentication):** Users shall have the option to configure Time-Based One-Time Passwords (TOTP) compatible with standard authenticator apps, verified via `/api/auth/totp`.
* **FR-11.5 (2+3 Security Questions Policy):** Users shall configure 2 mandatory and up to 3 optional security recovery questions for automated identity verification during password resets.
* **FR-11.6 (Rate Limiting & Lockout):** The system shall track failed login attempts per IP address, enforcing temporary lockouts upon repeated failures to neutralize brute-force attacks (`RateLimitingTab.js`).

#### Technical & Primary Source Traceability:
* **UI Components:** [`src/app/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/page.js), [`StaffDirectoryTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/StaffDirectoryTab.js), [`GlobalStaffTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalStaffTab.js), [`RateLimitingTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/RateLimitingTab.js).
* **API Routes:** [`/api/auth/login`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/login/route.js), [`/api/auth/student/login`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/student/login/route.js), [`/api/auth/totp`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/totp/route.js), [`/api/auth/forgot-password/*`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/auth/forgot-password/identify/route.js), [`/api/admin/rate-limits`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/admin/rate-limits/route.js).
* **Database Tables:** `staff`, `student_accounts`, `security_questions`, `staff_security_answers`, `student_security_answers`, `auth_sessions`, `rate_limit_events`.
* **Migrations:** `001_initial.sql`, `003_staff_security_fields.sql`, `004_rate_limits.sql`, `032_auth_session_revocations.sql`, `035_auth_sessions.sql`, `041_student_security_answers.sql`.

---

### Feature 12 (F12): Comprehensive Audit Trail & Accountability Logging

* **User Objective:** Maintain an immutable, tamper-evident log of all institutional actions (logins, uploads, approvals, status updates, system backups, and configuration edits) for data privacy and regulatory compliance.
* **Target Roles & Portals:** Office Admin, SuperAdmin (`/admin`, `/systemadmin`).
* **Required Subsystems & Modules:**
  1. `audit_logs` (Office Audit Logs Module)
  2. `global_audit_logs` (SuperAdmin Global Audit Logs Module)
  3. `auditLogsRepo.js`, `globalAuditLogsRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-12.1 (Server-Side Automated Interception):** The system shall generate audit log entries exclusively on the server to prevent client-side log tampering or double-logging.
* **FR-12.2 (Standardized Metadata Attribution):** Every audit entry shall record: `created_at` (timestamp), `actor` (display name), `role`, `office_id`, `action` (e.g. `DOCUMENT_APPROVE`), `details`, `severity` (`INFO`, `WARNING`, `CRITICAL`), and client `ip`.
* **FR-12.3 (Dual-Tier Partitioning):** Office-specific actions shall be stored in `audit_logs` accessible to the respective office admin; platform-wide actions and cross-office interventions shall be stored in `global_audit_logs` accessible to the SuperAdmin.
* **FR-12.4 (Search, Filtering & Export):** The audit interface shall support keyword search, date range filtering, actor filtering, and CSV export for official accreditation audits.

#### Technical & Primary Source Traceability:
* **UI Components:** [`AuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/AuditLogsTab.js), [`GlobalAuditLogsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/GlobalAuditLogsTab.js).
* **API Routes:** [`/api/audit-logs`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/audit-logs/route.js), [`/api/audit-logs/stats`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/audit-logs/stats/route.js), [`/api/audit-logs/global`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/audit-logs/global/route.js).
* **Database Tables:** `audit_logs`, `global_audit_logs`.
* **Migrations:** `001_initial.sql`.

---

### Feature 13 (F13): Encrypted Backup, Air-Gap Disaster Recovery & Campus Operations

* **User Objective:** Protect university records against data loss, hardware failure, or ransomware through strong encryption, automated backup scheduling, and immutable physical air-gap replication.
* **Target Roles & Portals:** Office Admin, SuperAdmin (`/admin`, `/systemadmin`).
* **Required Subsystems & Modules:**
  1. `backup` (Backup & Restore Module)
  2. `campus_operations` / `system_health` (System Diagnostics Module)
  3. `backupsRepo.js`, `externalBackup.js`, `scripts/backup-database.mjs`

#### Detailed Functional Requirements (FR):
* **FR-13.1 (Full PostgreSQL Database & Filesystem Dump):** The system shall create point-in-time snapshots combining the PostgreSQL database schema/records and active uploaded student document files.
* **FR-13.2 (AES-256-CBC Encryption & SHA-256 Checksums):** Backups shall be encrypted at rest using AES-256-CBC using keys derived from `JWT_SECRET` / `BACKUP_ENCRYPTION_KEY`, appending a SHA-256 cryptographic checksum to detect file tampering.
* **FR-13.3 (Automated Air-Gap External Drive Replication):** Upon backup creation, the system shall asynchronously copy the encrypted archive to a detected mounted external physical drive (`EXTERNAL_BACKUP_PATH`).
* **FR-13.4 (Append-Only External Drive Policy):** The system shall strictly enforce an "Append-Only" rule for external physical storage; deleting a backup from the web dashboard deletes the local server file but is programmatically prohibited from deleting files on the physical external volume.
* **FR-13.5 (Real-Time WebSocket Sync Updates):** Socket.io events shall push live progress indicators to `BackupTab.js` during multi-megabyte backup replication.
* **FR-13.6 (Campus Operations Health Metrics):** SuperAdmin shall monitor real-time CPU, RAM, PostgreSQL connection pool metrics, and disk storage utilization (`CampusOperationsTab.js`).

#### Technical & Primary Source Traceability:
* **UI Components:** [`BackupTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/BackupTab.js), [`SystemBackupsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/SystemBackupsTab.js), [`CampusOperationsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/CampusOperationsTab.js).
* **API Routes:** [`/api/system/backup`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/backup/route.js), [`/api/system/backup/restore`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/backup/restore/route.js), [`/api/system/backup/sync-external`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/backup/sync-external/route.js), [`/api/system/external-drive`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/external-drive/route.js), [`/api/system/health`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/health/route.js).
* **Database Tables:** `backups`.
* **Migrations:** `001_initial.sql`, `027_isolated_backup_scopes.sql`.
* **Specifications:** [`docs/BACKUP_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/BACKUP_SPEC.md).

---

### Feature 14 (F14): Academic Taxonomy & System Configuration Management

* **User Objective:** Configure academic lookup structures including Degree Programs (Courses), Sections, and Document Types, with automated normalization for OCR parsing and bulk import capabilities.
* **Target Roles & Portals:** Office Admin (`/admin`).
* **Required Subsystems & Modules:**
  1. `system_config` (Data Configuration Module)
  2. `coursesRepo.js`, `sectionsRepo.js`, `docTypesRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-14.1 (Course Catalog Management):** The system shall maintain academic course codes (e.g., `BSIT`, `BSBA`, `BSED`) and full program titles with active/archived status toggles.
* **FR-14.2 (Section & Year Level Hierarchy):** The system shall manage course sections tied to academic year levels (e.g., `BSIT 1-1`, `BSIT 2-1`), ensuring students can only be assigned to existing sections.
* **FR-14.3 (Document Taxonomy & Fuzzy Normalization):** The system shall maintain the approved document catalog (e.g., `Transcript of Records`, `Form 137`, `Good Moral Certificate`), generating a normalized alphanumeric string (`name_norm`) used by the OCR engine for fuzzy matching.
* **FR-14.4 (Bulk CSV Taxonomy Import):** Administrators shall be able to import academic lookup tables in bulk via CSV, receiving immediate statistical reports (Added vs. Skipped).

#### Technical & Primary Source Traceability:
* **UI Components:** [`SystemConfigTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/admin/SystemConfigTab.js).
* **API Routes:** [`/api/courses`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/courses/route.js), [`/api/sections`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/sections/route.js), [`/api/doc-types`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/doc-types/route.js), [`/api/system/bulk-import`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/system/bulk-import/route.js).
* **Database Tables:** `courses`, `sections`, `document_types`.
* **Migrations:** `001_initial.sql`, `017_normalize_registrar_document_types.sql`, `040_allow_archived_taxonomy_and_student_status.sql`.

---

### Feature 15 (F15): Public Information Portal & Landing Page CMS

* **User Objective:** Provide a university public landing page informing students and alumni of available services, document requirements, and status tracking, fully manageable via a SuperAdmin Content Management System (CMS).
* **Target Roles & Portals:** Public Visitors, SuperAdmin (`/`, `/systemadmin`).
* **Required Subsystems & Modules:**
  1. Landing Page UI (`src/components/landing/*`)
  2. `LandingPageCmsTab.js` (SuperAdmin CMS Workbench)
  3. `landingRepo.js`

#### Detailed Functional Requirements (FR):
* **FR-15.1 (Modern Apple HIG Public UI):** The landing page shall feature responsive Apple HIG aesthetics, infinite document card carousels, responsive typography, and dark/light theme switching.
* **FR-15.2 (Document Service Catalog & SLA Guide):** The portal shall present a public directory of all issuing offices, required credentials, fees, and standard turnaround times.
* **FR-15.3 (Unauthenticated Tracking Lookup):** Public visitors shall be able to enter their request tracking reference code directly in the hero search box to immediately view status without signing in.
* **FR-15.4 (SuperAdmin Dynamic CMS):** The SuperAdmin portal shall provide live editing tabs for all public landing components:
  * `Hero CMS` (Header titles, CTA buttons, hero badge text)
  * `Bento Grid CMS` (Interactive bento cards highlighting system features)
  * `Document Catalog CMS` (Service cards and processing requirements)
  * `Workflow Steps CMS` (Visual 4-step request guide)
  * `FAQ CMS` (Collapsible question-and-answer accordions)
  * `Footer CMS` (Campus contacts, official hours, social links)

#### Technical & Primary Source Traceability:
* **UI Components:** [`src/app/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/page.js), [`LandingPageCmsTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/LandingPageCmsTab.js), [`LandingBentoCmsView.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/LandingBentoCmsView.js), [`LandingCatalogCmsView.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/LandingCatalogCmsView.js), [`LandingFaqCmsView.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/systemadmin/LandingFaqCmsView.js).
* **API Routes:** [`/api/landing/hero`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/hero/route.js), [`/api/landing/catalog`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/catalog/route.js), [`/api/landing/bento`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/bento/route.js), [`/api/landing/workflow`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/workflow/route.js), [`/api/landing/faq`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/faq/route.js), [`/api/landing/footer`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/landing/footer/route.js).
* **Database Tables:** `landing_hero`, `landing_catalog`, `landing_bento`, `landing_workflow`, `landing_faq`, `landing_footer`.
* **Migrations:** `001_initial.sql`.

---

## 4. Module Registry Mapping (Database Seed)

In PUPSJ-RMS, modules are registered in the PostgreSQL `modules` table (seeded via `migrations/016_seed_all_modules.sql`, `migrations/034_add_student_directory_module.sql`, and `migrations/039_rename_alumni_requests_module.sql`). The table below outlines how each module maps to features:

| Module Identifier (`modules.id`) | Display Name | Category | Sidebar Group | System Locked? | Corresponding Features | Target React Component (`component_key`) |
|---|---|---|---|---|---|---|
| `scan_upload` | Scan & Upload | staff | Operations | No | **F1** | `ScanUploadTab` |
| `batch_review` | Batch Review | staff | Operations | No | **F2** | `BatchReviewTab` |
| `records_review` | Records Review | admin | Operations & Analytics | No | **F3** | `DigitalRecordsReviewTab` |
| `student_directory` | Student Directory | staff | Operations | No | **F4** | `StudentDirectoryTab` |
| `storage_layout` | Storage | admin | System Configuration | No | **F5** | `StorageLayoutEditorTab` |
| `storage_explorer` | Storage Explorer | staff | Records Archive | No | **F5** | `StorageExplorerTab` |
| `records_archive` | Records & Archive | staff | Records Archive | No | **F4, F5** | `RecordsArchiveTab` |
| `document_requests` *(formerly `alumni_requests`)* | Document Requests | staff | Operations | No | **F6** | `DocumentRequestsTab` |
| `osas_monitoring` | OSAS Monitoring | staff | Operations | No | **F7** | `OsasMonitoringTab` |
| `compliance_analytics` | Compliance | admin | Operations & Analytics | No | **F8** | `DigitizationComplianceTab` |
| `request_analytics` | Requests | admin | Operations & Analytics | No | **F9** | `SLAAnalyticsTab` |
| `staff_directory` | Staff Directory | admin | User Management | No | **F11** | `StaffDirectoryTab` |
| `audit_logs` | Audit Log | admin | System Configuration | **Yes** | **F12** | `AuditLogsTab` |
| `backup` | Backup | admin | System Configuration | No | **F13** | `BackupMaintenanceTab` |
| `system_config` | Data | admin | System Configuration | No | **F14** | `SystemConfigTab` |
| `notifications` | Notifications | staff | Operations | **Yes** | **Cross-cutting** | `NotificationsTab` |

---

## 5. Verification & Academic Evaluation Guidelines

When presenting or validating this Feature Requirement Matrix in capstone evaluations or software defense, use the following validation pathways:

1. **Feature Traceability:** Every feature (F1 - F15) directly links to an operational user workflow and is backed by real, numbered migrations and live API endpoints.
2. **Role Boundaries:** Verify that unauthorized roles are blocked at the middleware layer (`next-app/src/middleware.js`) and database repository layer (e.g. Student calling staff routes returns HTTP 401/403).
3. **Local PostgreSQL Invariant:** The entire feature set operates on the local Docker PostgreSQL container (`localhost:5433` / container `5432`) without cloud telemetry or external third-party database dependencies.
4. **Primary Documentation Cross-Reference:**
   - Architecture & Data Layer: [`docs/TECHNOLOGY_STACK.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/TECHNOLOGY_STACK.md)
   - Backup & Air-Gap Specifications: [`docs/BACKUP_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/BACKUP_SPEC.md)
   - Migration Verification Status: [`docs/IMPLEMENTATION_CHECKLIST.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/IMPLEMENTATION_CHECKLIST.md)
   - Multi-Tenant Office Architecture: [`docs/plans/multi-office-architecture.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/plans/multi-office-architecture.md)
