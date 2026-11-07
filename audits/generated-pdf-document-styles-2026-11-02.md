# Generated PDF Document Style Review — 2026-11-02

## Scope

This change establishes one institutional document style for generated PDF reports and adds saved typeface choices to System Admin → Institutional Branding. The application interface remains Plus Jakarta Sans; the selected report font applies only to newly generated PDFs. Uploaded scans and source documents are not modified.

## Implemented

- Added shared branding defaults, normalization, latest-settings retrieval, offline cache fallback, logo conversion, and accent-color contrast handling.
- Added three self-hosted, embedded Unicode typeface choices:
  - Plus Jakarta Sans
  - Arial-compatible Liberation Sans
  - Times New Roman-compatible Liberation Serif
- The Arial and Times New Roman options are explicitly labeled compatible alternatives, not Microsoft font files. Liberation Fonts are metrically compatible open replacements ([Liberation Fonts project](https://github.com/liberationfonts/liberation-fonts)). Font assets and their license notices are bundled under `next-app/public/assets/fonts/reports/`.
- Added a shared A4 report layout with institutional letterhead and seals, report title and date, numbered sections, monochrome data tables, continuation headers, page numbering, and a source/review/signature block.
- Migrated report generation to the shared layout: audit logs, digitization compliance, organization compliance, processing time/SLA, client satisfaction/CSM, combined SLA/CSM, sample branding, student compliance slip, student records report, and compliance roster.
- Updated Branding settings with a report-font selector and a preview produced by the actual shared PDF generator. Preview, print, and download use the app's common PDF viewer.
- Updated repository guidance to clarify that report typography is configurable while interface typography remains Plus Jakarta Sans.
- Corrected the SLA PDF to use the analytics API's `days` value, respect calendar versus working days, label classification totals accurately, and keep source and sign-off context together when the review block moves to a continuation page.

## Validation

- Focused report, branding, preview, download, and compliance suites: **41 passed, 0 failed**.
- ESLint on the touched report, branding, preview, and focused test files: passed with no output.
- `git diff --check`: passed.
- Browser QA: **7 branding checks passed** with no page errors, including all font choices, persistence after reload, actual preview font embedding, 100% common preview, print action, byte-identical PDF download, mobile layout, rejected unsupported font, current branding retrieval, and role authorization.
- Shared PDF preview regression: **16 checks passed**, covering 10 preview sources, with no page errors.
- Generated PDFs were rendered and visually inspected. `pdffonts` confirms Liberation Serif is embedded in the inspected Times-compatible sample and SLA report. The SLA continuation page contains the review heading, source, and all three sign-off roles.
- A production build passed earlier in this work. A final build after the last pagination/data-label adjustments remains unverified because the automatic approval review for the build command hit its usage limit before execution. The review response said it was a review failure, not a safety determination; the command did not run.

## Review notes

- Reports use current saved branding when generated in the browser and a cached branding value if the API is unavailable.
- Previews reflect unsaved Branding form values; saving applies them to future reports.
- If a proprietary Microsoft font is specifically required, its licensed font files must be supplied and reviewed separately. The current choices are clearly labeled compatible substitutes.
- Verification above is specific to this work; it does not imply the unrelated changes in the shared working tree have been reviewed.

## Follow-up spacing adjustment

Analytics report sections now add 14 pt of space before each numbered heading, including digitization, organization compliance, SLA, CSM, and combined reports. Other generated report types retain their existing section spacing. This is a layout-only follow-up; the focused test suite was not rerun for this adjustment.

## Follow-up document metadata adjustment

Removed machine-style document IDs and generation timestamps from printed pages and replaced the “Generated on” metadata row with a simple local report date. Page numbering remains in the footer. Assertions were updated to reflect the printed-document content; tests were not run for this adjustment.
