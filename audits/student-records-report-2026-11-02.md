# Individual Student Records Report

Implemented: 2026-11-02 (Asia/Manila)

## Acceptance criteria

- [x] **Report Trigger:** Student Directory → Student Details → **Generate Report**. The action is available for student profiles, including archived students, and is omitted for organization profiles.
- [x] **Student Metadata Summary:** Full name, student number, year/section, program, and record status.
- [x] **Digitized Records:** All approved document rows for this student and authorized office, with document type and persisted upload timestamp (`documents.created_at`). The report does not depend on the directory's cached document list or its pagination limits.
- [x] **Missing/Pending Requirements:** Current active inward compliance types from system preferences, using the same requirement and evidence rules as global compliance reporting. Missing, Awaiting Review, and Needs Correction remain distinct; declined review notes are preserved.
- [x] **Print & Export:** **PDFPreviewModal**, extracted from Compliance Analysis's existing report preview, displays an actual A4 PDF with **Print PDF** and **Download PDF** actions. Printing and downloading use the same PDF shown in the preview. Tables repeat their headings across pages.
- [x] **Visual Design:** The shared institutional letterhead supplies the configured logo(s), institution/campus, office line, document ID, and brand divider. The body uses standard report tables, a student metadata summary, embedded Plus Jakarta Sans, and page-number/generated-time footers. Loading, retry, empty-archive, and unconfigured-requirement states remain explicit.

## Implementation

- [Student profile trigger](../next-app/src/components/staff/StudentProfileSheet.js)
- [Report preview and print action](../next-app/src/components/shared/StudentRecordsReportDialog.js)
- [Office-scoped report endpoint](../next-app/src/app/api/students/[studentNo]/report/route.js)
- [Shared compliance snapshot and individual report](../next-app/src/lib/digitizationComplianceRepo.js)
- [PDF report generation](../next-app/src/lib/studentRecordsReportPdf.js)
- [Shared report preview](../next-app/src/components/shared/PDFPreviewModal.js)
- [Shared institutional header](../next-app/src/lib/pdfGenerator.js)
- [Shared embedded report font](../next-app/src/lib/pdfFonts.js)

The report reads identity, configured requirements, and approved documents in one database statement for a consistent student snapshot. Fully compliant students still receive a report. Zero configured requirements produce an explicit configuration message rather than a claim of compliance. The endpoint requires staff/admin authentication, enforces office membership, rejects cross-office requests by ordinary personnel, and logs report generation.

The endpoint supplies the authorized JSON snapshot, and the preview releases its PDF object URL on close and ignores generation results after cancellation.

The current system-wide preview policy opens at 100% on desktop and fits the whole page in narrow panels. See [system-wide PDF preview consistency](./pdf-preview-systemwide-2026-11-02.md).

## Preview consistency correction

The first PDF implementation reused the scanned-document viewer. Reviewing the actual Compliance Analysis implementation showed a different report pattern: a report-specific title, 20px vertical / 24px horizontal header padding, a footer fullscreen control, and Close / Print PDF / Download PDF actions. The activity-history report uses the same footer arrangement; the SLA report retains its report-switching header.

The Compliance Analysis report, individual student report, and incomplete-records list now use one shared `PDFPreviewModal`. Records, attachments, and generated reports now share this modal. The existing compliance download callback, filename, log action, and toast remain connected. All dismissal routes now run the report owner's cleanup, including the footer Close action. Fullscreen expands the preview to the viewport, and printing waits for the active iframe load event.

Design direction: an existing administrative report inspection flow, following the project's institutional visual language; ENERGY 1 / RHYTHM 1 / MOTION 1. The document is the focal point, the primary accent identifies download, and spacing follows the existing Compliance Analysis layout.

## Verification

- **19 focused tests passed.** PostgreSQL coverage uses temporary tables and rollback, including more than 200 approved files, office isolation, archived students, pending requirements, and no configured requirements. Actual PDF text/layout checks cover institutional branding, all three zones, correction notes, empty archives, fully compliant students, long names, 205 documents, page numbering, repeated headings, and clipping boundaries. Existing SLA/CSM PDF smoke tests also pass with the shared header changes.
- **Production build and targeted ESLint passed.**
- Browser validation exercised Student Details → Preview PDF in the shared viewer, Print PDF handler invocation, a downloaded PDF matching the preview bytes, fullscreen controls, mobile/dark layout, object-URL cleanup, and a failed request followed by a successful retry. No browser page errors occurred.
- A side-by-side browser comparison confirmed identical dialog dimensions, header/footer padding, title typography, control order, button variants, and iframe title across student, compliance, and incomplete-list previews. Each preview's print handler, byte-identical download, viewport fullscreen, and dismissal cleanup passed. Keyboard Enter toggles fullscreen with focus moving to the exit control and returning to the footer control. Student error/retry and 390px dark-mode layout passed.
- Endpoint authorization checks from the initial implementation returned 200 for authorized JSON, 401 without authentication, 403 for an ordinary cross-office request, and 404 for an unknown student. The authorization and repository rules are unchanged by the viewer replacement.
- Generated PDFs were rendered and visually inspected. A live report with eleven outstanding requirements fits one A4 page; larger reports retain their final requirements and repeated table headings.

Printing uses printers available to the browser/operating system; validation did not send a physical print job. Reports reflect the generated snapshot, not immutable document-version history.

## Design delivery gate

- **Hard gate PASS:** Existing report data and assets are used; browser checks covered printing, downloading, fullscreen, keyboard Escape, error/retry, and mobile/dark layout without page errors.
- **Purpose gate PASS:** Existing institutional typography, role-aware buttons, and report canvas establish hierarchy; the common component introduces no decorative media or new motion.
- **Liveliness PASS:** The stated restrained administrative direction retains the institutional document as the focal point and the primary download action as its accent.
- **Craftsmanship PASS:** The three report previews share one implementation, and browser comparisons verify matching styles and working controls; document and compliance tests remain green.

Current consolidation and action-label findings are recorded in [the PDF preview UI/UX audit](./pdf-preview-ui-ux-consolidation-2026-11-02.md).
