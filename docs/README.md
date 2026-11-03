# PUPSJ-RMS Documentation Directory

This directory contains technical specifications, architectural references, and quality verification documents for the **PUPSJ Records Management System (PUPSJ-RMS)** prototype.

---

## 📚 Active Technical Documentation

| Document | Description |
| :--- | :--- |
| [`FEATURE_REQUIREMENT_MATRIX.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/FEATURE_REQUIREMENT_MATRIX.md) | **Core Spec:** End-to-end traceability mapping Features (F1–F15) to PostgreSQL migrations, API endpoints, backend repositories, and UI components. |
| [`FEATURE_REQUIREMENT_MATRIX_AUDIT.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/FEATURE_REQUIREMENT_MATRIX_AUDIT.md) | **Academic / Thesis Audit:** Comprehensive alignment audit between the capstone manuscript (Table 5) and the 15 enterprise modules implemented. |
| [`QA-TEST-CHECKLIST.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/QA-TEST-CHECKLIST.md) | **Quality Assurance:** Active, role-based manual testing checklist across SuperAdmin, Registrar, Staff, and Student workflows. |
| [`BACKUP_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/BACKUP_SPEC.md) | **Security & Disaster Recovery:** 3-2-1 backup strategy, AES-256-GCM encryption standards, and immutable external archiving policy. |
| [`TECHNOLOGY_STACK.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/TECHNOLOGY_STACK.md) | **Architecture & Dependencies:** Current framework (Next.js 16 / React 19), PostgreSQL 16 container, Tailwind CSS v4 design tokens, and package dependencies. |

## UI & Implementation References

| Document | Description |
| :--- | :--- |
| [`ui-patterns/superadmin-departments-stations.md`](ui-patterns/superadmin-departments-stations.md) | Reusable page-level reference for title summaries, divider-connected tabs, record toolbars, rounded controls, configurable columns, sorting/grouping, and bounded text truncation. |
| [`../audits/table-consistency-2026-11-02.md`](../audits/table-consistency-2026-11-02.md) | Shared table primitives, density, selection, action, pagination, and width contracts across the application. |

---

## 🗄️ Document Archive (`docs/archive/`)

Historical milestones, completed implementation checklists, and superseded design proposals are archived in [`docs/archive/`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive) for institutional auditability:

| Document | Archive Reason |
| :--- | :--- |
| [`archive/auth-security-remediation-checklist.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/auth-security-remediation-checklist.md) | Completed 10-phase security audit and API remediation checklist (retained for verification). |
| [`archive/IMPLEMENTATION_CHECKLIST.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/IMPLEMENTATION_CHECKLIST.md) | Completed SQLite-to-PostgreSQL migration checklist. |
| [`archive/QA-EXECUTION-REPORT-2026-09-16.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/QA-EXECUTION-REPORT-2026-09-16.md) | Snapshot execution report from a specific manual QA pass on 2026-09-16. |
| [`archive/MODAL_SPEC.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/MODAL_SPEC.md) | Superseded by the Apple HIG component rules in [`COMPONENT_STANDARDS.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/COMPONENT_STANDARDS.md). |
| [`archive/SYSTEM_UPDATES.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/SYSTEM_UPDATES.md) / [`archive/CHANGELOG.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/CHANGELOG.md) | Sprint update logs from prototype cycles (May & September 2026). |
| [`archive/plans/multi-office-architecture.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/docs/archive/plans/multi-office-architecture.md) | Early planning proposal for multi-database SQLite; superseded by unified PostgreSQL 16 schema. |

---

## 🔗 Related Root Documentation

*   [`AGENTS.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/AGENTS.md) — Host startup commands, database credentials, API routes, and operational guide for agents and engineers.
*   [`COMPONENT_STANDARDS.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/COMPONENT_STANDARDS.md) — Apple HIG standards, button rules, dialog guidelines, and Hugeicons design tokens.
*   [`README.md`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/README.md) — Repository overview and contributor guide.

