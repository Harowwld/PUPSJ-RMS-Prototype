# Institutional Backup & Disaster Recovery Specification
## PUP E-Manage Records Management System

This document outlines the architecture, security protocols, and operational workflows of the system's backup infrastructure. The system is designed to ensure maximum data integrity and institutional continuity through automated, encrypted redundancy.

---

## 1. Standardized Naming Convention
To ensure clarity for administrative and non-IT personnel, all system archives follow a strict human-readable naming pattern.

### 1.1 Manual System Backups
Generated when an Administrator initiates a backup from the dashboard.
*   **Format:** `PUP-RECORDS-BACKUP-YYYY-MM-DD-HHMM.zip.enc`
*   **Example:** `PUP-RECORDS-BACKUP-2026-05-09-1430.zip.enc`

### 1.2 Automated Safety Snapshots
Generated automatically by the system immediately before a restoration process begins.
*   **Format:** `PUP-RECORDS-SAFETY-SNAPSHOT-YYYY-MM-DD-HHMM.zip.enc`
*   **Example:** `PUP-RECORDS-SAFETY-SNAPSHOT-2026-05-09-1500.zip.enc`

---

## 2. Security & Encryption Architecture

### 2.1 Encryption Standard (AES-256-GCM)
All backups are encrypted **at rest** and **in transit** using military-grade AES-256 (Advanced Encryption Standard).
*   **Mode:** GCM (Galois/Counter Mode).
*   **Authenticity:** GCM provides built-in tamper-proofing. If a single byte of the backup file is altered, the system will detect the corruption and refuse to restore the file.
*   **TOTP Gating:** High-privilege backup operations (Creation and Deletion) require a valid 6-digit Multi-Factor Authentication (2FA) code.

### 2.2 Data Integrity (SHA-256)
Every backup is hashed using the SHA-256 algorithm. This unique "fingerprint" is stored in the database to verify that the file has not been corrupted or modified since its creation.

---

## 3. Redundancy Workflow (3-2-1 Strategy)

The system automatically implements a redundant storage strategy without manual intervention.

### 3.1 Event-Driven Background Sync
1.  **Creation:** The system creates a local snapshot on the primary server.
2.  **Notification:** The user receives an immediate "Success" message.
3.  **Automatic Transfer:** In the background, the system initiates a transfer to the configured external media (e.g., an attached physical hard drive or network volume).
4.  **Live Monitoring:** The system uses WebSockets to update the "NODE 2: External" status icon in real-time as soon as the background transfer completes.

### 3.2 Immutable External Archive Policy
To protect against accidental data loss or malicious "wipe" attempts, the web application follows an **Append-Only** rule for external drives:
*   **Manual Sync:** Allowed (copies data to the drive).
*   **Auto Sync:** Allowed (copies data to the drive).
*   **Deletion:** **FORBIDDEN.** 
    *   Clicking "Delete" in the dashboard removes the record from the database and the file from the local server (to save disk space).
    *   The copy on the external drive is **never touched**. It remains as a permanent, immutable archive that can only be cleared by physical IT intervention.

---

## 4. Disaster Recovery (Restoration)
The system supports two primary restoration pathways:

1.  **Dashboard Recovery:** Select an existing backup from the history table and click restore.
2.  **Cold-Start Recovery:** If the system is completely wiped, an administrator can manually grab a `.zip.enc` file from the physical external drive and use the **"UPLOAD SYSTEM IMAGE"** button to rebuild the entire repository (Database + Physical PDFs) in one step.

---
**Institutional Policy Note:** It is recommended that the external media drive be rotated weekly or moved to a fireproof safe to satisfy standard institutional compliance.
