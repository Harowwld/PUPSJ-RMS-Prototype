# PUPSJ Records Keeping System (RKS) Prototype

A modern, secure, and highly visual Records Keeping System built for institutional document tracking, digitization compliance, and physical storage mapping.

## 🚀 Key Features

### 🏢 Physical Storage & Mapping
- **2D Room Map:** Interactive visualization of physical storage locations (Cabinets/Drawers).
- **Physical-Digital Synchronization:** Track exactly where a physical folder is located while viewing its digital counterpart.
- **Drawer Utilization:** Real-time analytics on storage density and availability.

### 🔐 Advanced Security Protocol
- **Dual-Layer Authentication:** Multi-factor authentication via TOTP (Time-based One-Time Password).
- **Self-Service Recovery:** Secure account recovery through configurable security questions.
- **Audit Compliance:** Comprehensive logging of every administrative and staff action with IP and role tracking.

### 📂 Records & Requests
- **Digital Records Review:** Streamlined workflow for approving or declining digitized student records.
- **Document Request Tracking:** Manage student/alumnus requests from "Pending" to "Done".
- **Intelligent Ingest:** Hot-folder watcher for automatic scanning integration with automated OCR support.

### 📊 Analytics & Maintenance
- **SLA Analytics:** Monitor processing times and operational efficiency.
- **Digitization Compliance:** Track percentage of physical records converted to digital formats.
- **Volume Backups:** Integrated AES-256 encrypted system backups with support for external drive synchronization.

---

## 🛠️ Technical Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** SQLite (Local-first, highly portable)
- **Icons:** Phosphor Icons (Duotone/Bold theme)
- **Real-time:** Socket.io for live staff activity tracking
- **Styling:** Tailwind CSS with custom brand primitives

---

## 🏁 Getting Started

### 1. Installation
```bash
pnpm install
```

### 2. Environment Configuration
Create a `.env.local` in the `next-app` directory:
```bash
JWT_SECRET=your_super_secret_jwt_key
TOTP_SECRET_KEY=your_encryption_key_for_totp_secrets
HOT_FOLDER_ROOT=C:/Users/YourUser/Scans/HotFolder
```

### 3. Database Initialization
Seed the prototype with sample courses and student data:
```bash
pnpm db:reset
```

### 4. Run Development Environment
```bash
pnpm dev
```
This command concurrently starts the **Next.js server** and the **Hot Folder Watcher**.

---

## 📁 Project Structure

- `/src/app/admin`: Administrative dashboard (User management, system config, analytics).
- `/src/app/staff`: Staff portal (Records upload, document requests, room mapping).
- `/src/components/shared`: Reusable institutional UI components (TOTP challenges, Modals).
- `/src/lib`: Core logic including repository patterns, encryption, and JWT handling.
- `/scripts/hot-folder-watcher`: Background service monitoring `INBOUND` directories for new scans.

## 📠 Hot Folder Scanner Ingest

The system monitors a designated root folder with the following lifecycle:
1. **INBOUND**: Scanner writes new PDF/Image files here.
2. **PROCESSING**: Files are locked while being uploaded to the RKS.
3. **DONE**: Files successfully moved here after database registration.
4. **FAILED**: Preserved for manual retry if network or validation fails.

---
*Developed for the PUP San Juan Campus Records Office.*
