# Institutional Sample Data & Fixtures (`_SAMPLE_DATA`)

This directory houses fixture datasets, sample student rosters, curriculum taxonomies, and mock institutional PDF documents used by test suites and database seed scripts.

---

## 📁 Directory Structure

```
_SAMPLE_DATA/
├── cleaned_student_data.csv                    # Student directory records for real-data seeding
├── osas_system_data - final.csv                # OSAS document classifications & requirements
├── pup_emanage_birth_certificate_students.csv  # Standard student roster for sample population
├── registrar_system_data - final.csv           # Registrar taxonomy & courses (primary)
├── sample_osas_organizations.csv               # Recognized student organization profiles
├── security_questions.csv                      # Canonical security recovery questions
├── system_data - final.csv                     # Fallback institutional taxonomy
├── pdfs/
│   ├── osas/                                   # Generated sample OSAS PDFs
│   │   ├── sample_activity_request_and_safety_clearance.pdf
│   │   ├── sample_event_proposal_glitch.pdf
│   │   ├── sample_event_proposal_jfinex.pdf
│   │   ├── sample_event_proposal_lente_filikulas.pdf
│   │   ├── sample_event_proposal_pylon_esports.pdf
│   │   ├── sample_financial_liquidation_report_glitch.pdf
│   │   ├── sample_financial_liquidation_report_jfinex.pdf
│   │   ├── sample_osas_document.pdf
│   │   ├── sample_post_event_compliance_clearance_certificate.pdf
│   │   ├── sample_post_event_narrative_report_glitch.pdf
│   │   └── sample_post_event_narrative_report_jfinex.pdf
│   └── registrar/
│       └── sample pdf.pdf                      # Sample PSA / Form 137 student record PDF
└── README.md
```

---

## 🚀 Script References

*   **`pnpm db:seed:sample`** (`scripts/populate-sample-data.mjs`): Reads `pup_emanage_birth_certificate_students.csv`.
*   **`pnpm db:seed:real`** (`scripts/seed-real-data.mjs`): Reads `registrar_system_data - final.csv`, `cleaned_student_data.csv`, `osas_system_data - final.csv`, and `pdfs/registrar/sample pdf.pdf`.
*   **`pnpm generate:sample-docs`** (`scripts/generate-sample-osas-documents.mjs`): Regenerates all mock OSAS PDFs in `pdfs/osas/`.
*   **Automated Tests**:
    *   `test/security-questions-import.test.mjs` verifies `security_questions.csv`.
    *   `test/bulk-import-classification.test.mjs` verifies `registrar_system_data - final.csv`.
    *   `test/osas-scan-upload-polymorphic.test.mjs` verifies `sample_osas_organizations.csv`.

