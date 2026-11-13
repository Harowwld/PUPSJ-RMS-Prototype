# PUPSJ RMS — System Unit Test Suite

This directory contains automated unit tests specifically structured to validate the 26 items listed in the **System Unit Testing Verification Checklist** (`system-unit-testing-checklist.md`).

All unit tests are isolated and run in-memory using Node.js's native test runner (`node:test` and `node:assert/strict`) without requiring external services or databases.

---

## Quick Start

### Run all unit tests:
From the `next-app/` directory:
```bash
pnpm test:unit
```
*Or using the Node test runner directly:*
```bash
node --test test/system-unit-tests/*.test.mjs
```

### Run an individual module:
```bash
node --test test/system-unit-tests/01-authentication-rbac.test.mjs
node --test test/system-unit-tests/02-student-records.test.mjs
node --test test/system-unit-tests/03-ocr-ingestion.test.mjs
node --test test/system-unit-tests/04-document-requests-workflow.test.mjs
node --test test/system-unit-tests/05-storage-and-backups.test.mjs
node --test test/system-unit-tests/06-audit-trail-reliability.test.mjs
```

---

## Test Mapping to Verification Checklist

| File | Checklist Section | Items Tested | Description |
|------|-------------------|--------------|-------------|
| [`01-authentication-rbac.test.mjs`](./01-authentication-rbac.test.mjs) | **1. Authentication & RBAC** | 1.1 – 1.4 | JWT session signing/verification, role-based page gating (`canAccessPage`), password hashing & recovery schemas, token tamper/expiration rejection. |
| [`02-student-records.test.mjs`](./02-student-records.test.mjs) | **2. Student Records** | 2.1 – 2.4 | Registration schema parsing, student name & student number normalization, dummy/malicious input rejection, contact number format integrity. |
| [`03-ocr-ingestion.test.mjs`](./03-ocr-ingestion.test.mjs) | **3. OCR & Ingestion (OCR Module)** | 3.1 – 3.7 | **Ideal Case** (coordinate extraction), **Doc Type Detection** (keyword clustering), **Name Formatting** (Philippine surname particles), **Low-Quality Case** (fuzzy edit-distance matching), **Edge Case - Rotation** (90°/180°/270°), **Edge Case - Caching** (context reuse), **Negative Case** (invalid format rejection). |
| [`04-document-requests-workflow.test.mjs`](./04-document-requests-workflow.test.mjs) | **4. Document Requests** | 4.1 – 4.4 | Request status state machine transitions (`canTransitionRequestStatus`), terminal state protection, batch review selection helpers, sensitive student PII AES-256 encryption/decryption. |
| [`05-storage-and-backups.test.mjs`](./05-storage-and-backups.test.mjs) | **5. Storage & Backups** | 5.1 – 5.4 | Physical storage location code formatting (`R1-CabA-D2`) & archival paths, backup manifest generation & SHA-256 computation, backup file encryption/decryption roundtrip, GFS retention classification. |
| [`06-audit-trail-reliability.test.mjs`](./06-audit-trail-reliability.test.mjs) | **6. Audit Trail & Reliability** | 6.1 – 6.3 | Audit log details capitalization, acronym normalization (TOTP, 2FA), raw JSON payload preservation, staff/student actor resolution, zero-leak execution. |
