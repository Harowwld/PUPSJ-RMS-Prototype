# PDF preview UI/UX consolidation

## Executive Summary

The PDF renderer was shared, but report pages still implemented separate dialog layouts and inconsistent action names. Records, attachments, and reports now use one `PDFPreviewModal`, with 100% desktop zoom, whole-page fitting in narrow panels, a common footer, and shared keyboard/fullscreen behavior. PDF actions are defined centrally so opening a preview is distinct from printing or saving it.

## Prioritized Audit Matrix

| Severity | Component / Flow | Pillar | Issue Description | Implemented Solution |
| --- | --- | --- | --- | --- |
| P1 | Activity history, global activity history, SLA/CSM, OSAS compliance | Component consistency | Separate report dialog markup drifted in spacing, controls, fullscreen, and dismissal behavior. | Move every report to `PDFPreviewModal`; remove the separate report dialog modules. Preserve SLA/CSM switching through `headerActions`. |
| P1 | Student request attachments | Navigation and ergonomics | Images bypassed the shared preview and opened in a browser tab. | Send every attachment through the existing preview callback; supported images become temporary PDFs. |
| P1 | File-card and attachment download fallbacks | Interaction design | A file-card download called `window.open`, and attachment links retained a new-tab target, potentially opening another viewer. | Fetch authenticated file bytes and save a blob download with the original filename; show an error on failure. Apply the same helper to file cards, shared attachment cards, and registrar request attachments. |
| P1 | Closing or switching generated reports | State coverage | Late generation could reopen a closed preview or retain object URLs. | Share a versioned preview session that rejects stale results and revokes replaced or closed URLs. |
| P2 | Analytics PDF actions | Visual hierarchy and copy | `Export PDF Report` actually opened a preview. | Use `Preview PDF` for the opening action and `Download PDF` for saving. |
| P2 | Modal, file-card, and attachment actions | Component consistency | `Download File`, `Download Report`, and `Download PDF` described similar actions; image originals complicated the terminology. | Centralize `Preview PDF`, `Print PDF`, `Download PDF`, and the distinct `Download Original` action. The PDF download saves the displayed PDF, including image conversions. |
| P2 | Shared preview controls | Accessibility | Compact close/fullscreen controls and report switches needed predictable keyboard and mobile behavior. | Keep a 16px title, 20px/24px header padding, 16px/24px footer padding, 44px mobile targets, visible focus, pressed report-switch states, and focus restoration after fullscreen. |
| P2 | Branding sample action | Copy and feedback | A button labeled `Preview Sample PDF` downloaded a file directly. | Label the actual download `Download PDF`. |
| P2 | Student portal synchronization | Interaction and feedback | Two existing effects synchronously triggered state updates while synchronizing route/CBL data. | Schedule cancellable synchronization callbacks, following the existing repository pattern, so the touched page passes the hooks lint checks. |

## Detailed Breakdown & Implementation Fixes

### Shared preview component

- **Problem:** `ReportPreviewDialog`, the activity-history `PdfPreviewDialog`, and inline SLA/OSAS dialogs duplicated the inspection shell.
- **Before:** Records and reports used different dialog implementations even though their PDF body was shared.
- **After:** `PDFPreviewModal` accepts `preview` or `pdfUrl`, contextual `title`/`description`, generation/error/retry states, existing download/logging callbacks, and optional `headerActions`. One component owns readiness, fullscreen, focus, close actions, and the footer.

### Action vocabulary

| Before | After | Behavior |
| --- | --- | --- |
| Export PDF Report / Generate Report / Preview List | Preview PDF | Open the PDF preview |
| Print Report / Print Slip | Print PDF | Print the active PDF |
| Download File / Download Report / Download PDF Slip | Download PDF | Save the displayed PDF |
| Original image download | Download Original | Save the original uploaded format |

The canonical strings live in `src/lib/pdfPreview.js`. Existing report filenames, CSV exports, download feedback, and historical audit action values are preserved.

### File and generation lifecycle

- **Problem:** External tab fallbacks broke the single-viewer flow, and independently owned generation promises could outlive their dialogs.
- **After:** `downloadDocument` saves bytes instead of opening a viewer. `createPdfPreviewSession` owns generated URLs and invalidates stale generations; `usePdfPreviewSession` cancels on unmount. `ResilientPDFViewer` exposes the prepared PDF and frame readiness to the shared modal, retaining missing-file replacement and image conversion.

SLA/CSM report switches commit the selected type only after the replacement PDF is ready. A failed switch retains the prior report's title, selection, and download filename.

### Design direction

The direction is the existing institutional administrative inspection UI for students, staff, and administrators: ENERGY 1 / RHYTHM 1 / MOTION 1. The paper remains the focal point; existing role-aware buttons and typography are retained. The added slot serves the existing analytics workflow rather than introducing another modal variant.

## Validation

- **Automated tests:** 26 passed, with no failures or skips. Coverage includes zoom normalization, stale generation rejection and URL cleanup, authenticated file downloads and failure handling, student report layout and long records, office-scoped compliance, exports, and SLA/CSM PDF generation.
- **Lint:** The changed preview and consumer files have no errors. Two existing image optimization warnings remain in `GoogleDrivePdfCard.js`.
- **Browser:** Passed 16 flow checks with no page errors. Exercised student records, stored PDFs, image scans, student image attachments, compliance, incomplete lists, office/global activity history, SLA, CSM, combined analytics, and OSAS reports. The common dialog's computed header/title/footer styles match across 10 report/document cases. PDF downloads match the active source bytes; original image bytes and filenames are preserved. Verified print callbacks, Escape dismissal, fullscreen bounds and focus restoration, dark mode, 100% desktop zoom, and whole-page fitting at 390 × 844 with 44px footer targets and no horizontal overflow. Physical print jobs were not submitted.
- **Production build:** `pnpm exec next build --webpack` passed, including all 91 static pages. The default Turbopack attempt encountered a local worker port restriction; the alternate compiler completed successfully.
- **Data isolation:** Record and attachment edge cases use browser-only responses without overwriting stored documents. Fixture labels in screenshots are explicitly browser validation data.

The component audit covers shared preview behavior and layout. It does not certify all configurable office palettes or the contents of every uploaded PDF against WCAG contrast requirements.

## Delivery checks for the changed preview flows

- **Hard gate PASS:** Browser checks exercised actual preview, print, download, close, fullscreen, and report-switch actions; mobile bounds and touch sizes passed, and fixtures are explicitly labeled. Loading, missing-file recovery, unsupported-format, and retry states remain in the shared viewer.
- **Purpose gate PASS:** Institutional typography and role-aware shared buttons preserve the existing identity; spacing separates context, paper, and actions without decorative sections or added motion.
- **Liveliness PASS:** ENERGY 1 / RHYTHM 1 / MOTION 1 remains consistent. The paper is the focal point, with the primary download action as the functional accent.
- **Craftsmanship PASS:** Duplicate report dialogs are removed, 10 computed shell comparisons match, 26 tests pass, lint has no errors, and the production build passes.
