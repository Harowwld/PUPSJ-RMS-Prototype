# System Update Log: May 2026
## PUP E-Manage Records Management System

This document summarizes the major enhancements and architectural changes implemented to improve system security, operational efficiency, and user experience.

---

## 1. Backup & Disaster Recovery Enhancements

### 1.1 Immutable External Archiving (Air-Gap Strategy)
*   **Safety Policy:** Implemented an "Append-Only" rule for external drives. The web dashboard can now trigger backups and syncs, but it is strictly prohibited from deleting files on the external drive.
*   **Logic:** Deleting a backup from the dashboard only removes the local server copy and the database record, preserving the external archive as a fail-safe.

### 1.2 Automated Background Synchronization
*   **Zero-Touch Redundancy:** New backups now automatically trigger a background copy process to the external storage volume immediately upon local creation.
*   **Asynchronous Processing:** The UI remains responsive; users receive instant confirmation while the file transfer proceeds quietly in the background.

### 1.3 Real-Time UI Updates & Manual Controls
*   **WebSockets:** Integrated Socket.io to push live status updates to the Admin Dashboard. The "External Sync" status icon now updates automatically without page reloads.
*   **Manual Refresh:** Added a dedicated `REFRESH` button to the Backup History table for immediate data verification.

### 1.4 Standardized Human-Readable Naming
*   **Backups:** `PUP-RECORDS-BACKUP-YYYY-MM-DD-HHMM.zip.enc`
*   **Safety Snapshots:** `PUP-RECORDS-SAFETY-SNAPSHOT-YYYY-MM-DD-HHMM.zip.enc`

---

## 2. Security Logic & Audit Optimization

### 2.1 Simplified Account Setup (2+3 Policy)
*   **Reduced Friction:** Changed the security challenge requirement from 5 mandatory questions to **2 Required and 3 Optional**.
*   **Smart Recovery:** The "Forgot Password" system dynamically detects which questions a user has answered, only presenting the relevant challenges during identity verification.
*   **Visual Guidance:** Added clear labels and red asterisks (`*`) in both Admin and Personnel UIs to distinguish mandatory fields.

### 2.2 Global Audit Log De-duplication
*   **Centralized Strategy:** Migrated all administrative logging (Backups, User Management, Taxonomy) to the server-side APIs.
*   **Resolution:** Eliminated duplicate log entries that were previously triggered by both the browser and the server.
*   **Accuracy:** Improved IP tracking and severity reporting (e.g., automatic `WARNING` logs for partial batch failures).

### 2.3 Bulk Taxonomy & Record Imports
*   **Enhanced Reporting:** Optimized the Bulk Import backend to provide granular statistics (Added vs. Skipped) in a single audit entry.
*   **Intelligent Logging:** The system now correctly identifies duplicates during batch ingestion and logs them as non-critical informational events.

---

## 3. Infrastructure & Asset Management

### 3.1 Static Asset Restoration
*   **Fixed Font 404s:** Restored the missing `assets/` directory (Inter fonts and Phosphor icons) to the `next-app/public/` folder to ensure consistent rendering across all browsers.
*   **Directory Synchronization:** Re-aligned the root `assets/` folder with the legacy prototypes for development consistency.

### 3.2 Standardized Project Organization
*   Renamed auxiliary folders to **ALL CAPS** with an **underscore prefix** for high visibility at the top of the project structure:
    *   `_BACKUP_SPEC\`
    *   `_LEGACY_PROTOTYPE\`
    *   `_SAMPLE_DATA\`

---
*End of Update Log*
