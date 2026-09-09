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

## 4. UI/UX & Storage Layout Exploration Polish (May 2026)

### 4.1 Upgraded Storage Layout Map Preview
*   **AutoCAD-Inspired Style**: Re-skinned the `RoomMap2D` visualization component in the staff's Records Archive view to match the premium, professional, AutoCAD precision styling of the administrator's layout editor. Added exact background precision grids, standardized entrance markers, and detailed depth outlines to all cabinets.
*   **Double Legend Resolution**: Resolved a double legend rendering bug where both the card header and the inner layout header displayed the "Empty, Occupied, Target" key.

### 4.2 Floating Cabinet Drawer Details Overlay
*   **Uncluttered Viewport**: Removed the drawer grid list from rendering inside tiny cabinet tiles to keep the layout map completely clean and visually proportioned.
*   **Glassmorphic Floating Panel**: Replaced it with a gorgeous, absolute-positioned glassmorphic overlay modal showing drawer details (Target, Occupied, and Empty slots) with clean indicators and direct drawer selection controls.
*   **Hover-Over Auto-Hide**: Implemented an automated 2-second auto-hide timeout when the cursor hovers over the drawer modal, allowing it to easily clear out of the way so users can reveal and click on cabinets underneath. Leaving the modal cancels the countdown.
*   **Active Click Reset**: Added a click-to-reset listener to the details overlay, ensuring that clicking inside the panel (e.g., selecting a drawer) immediately restarts the 2-second countdown to keep the panel open during active use.

### 4.3 Normalized Cabinet ID Database Matching
*   **Robust Backend Matching**: Upgraded the `GET` and `PUT` validator logic inside `/api/storage-layout/route.js` to normalize cabinet IDs.
*   **Matching Resolution**: Successfully handles matching cabinet names like `C` (stored in the database) with template visual block keys like `CAB-C` (saved in the layout JSON), resolving a bug where saving the layout would fail with a false-alarm "Cannot delete occupied cabinet locations" block.

---
*End of Update Log*
