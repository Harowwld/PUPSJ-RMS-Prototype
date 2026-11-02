# System-wide PDF preview consistency

Implemented: 2026-11-02 (Asia/Manila).

The opening view now uses 100% zoom in desktop-sized panels. Panels narrower than 820px fit the whole page. This replaces fit-to-width behavior that enlarged paper excessively in wide inspection dialogs.

## Shared implementation

- `src/components/shared/PDFPreview.js` owns the document iframe and observes its available width.
- `src/lib/pdfPreview.js` normalizes viewer fragments, keeps page destinations, and replaces conflicting zoom or fit-to-width settings.
- `PDFPreviewModal` and embedded `ResilientPDFViewer` share one file availability/replacement implementation. Missing files retain PDF re-attachment, and availability checks bypass stale cache entries.
- Image files render as temporary PDFs through `src/lib/imagePdfPreview.js`; the source image remains the download target. Preview object URLs are revoked on replacement, close, or unmount. Unsupported file formats show a download state rather than opening an alternate viewer.
- Generated reports retain their report-specific controls and use the same PDF preview body. The student compliance slip now previews and prints its generated PDF, replacing its separate HTML preview and print renderer.

## Coverage

| Workflow | Shared preview path |
| --- | --- |
| Admin, staff, and student document actions | `PDFPreviewModal` → `ResilientPDFViewer` → `PDFPreview` |
| Student profiles, request attachments, Registrar ODRS, organizations, campus operations | Existing modal callbacks use the same path |
| Document matrix and notification panels | `ResilientPDFViewer` → `PDFPreview`; expanded viewing opens `PDFPreviewModal` |
| Batch review | Inline PDFs use `PDFPreview`; opening PDFs or scan images uses `PDFPreviewModal` |
| OSAS proposal review | The embedded document uses `PDFPreview`; its open action uses the shared modal |
| Compliance summary, incomplete list, student records report | `ReportPreviewDialog` → `PDFPreview` |
| Activity history, SLA/CSM, OSAS compliance reports | Their existing report shells use `PDFPreview` |
| Student compliance slip | Generated PDF → `ReportPreviewDialog` → `PDFPreview` |

Document thumbnails and the OCR/template region editors retain their navigation/editing canvases. Full document viewing uses the shared preview. Map embeds retain their map iframes.

## Verification

- 22 focused tests cover default zoom, compact fitting, conflicting fragments, report content/layout, compliance rules, office boundaries, CSV export, and existing SLA/CSM generation.
- Browser checks cover the actual student portal slip, stored-document desktop/mobile views, image-to-PDF conversion and cleanup, original downloads, unsupported-format handling, missing-file recovery, activity-history reports, and SLA/CSM switching.
- File and replacement responses for record edge cases are isolated browser fixtures. Validation does not overwrite stored documents.
- The existing three-report comparison covers shared styling, printing, downloads, fullscreen, keyboard focus, close cleanup, and error/retry behavior.
- A source scan finds the document iframe only in `PDFPreview.js`; the remaining page iframes are map embeds.
- Targeted ESLint and the production build passed. Native browser screenshots confirm the paper opens at 100% on desktop, rather than filling the modal width.

## Design delivery gate

Direction: the existing institutional inspection UI for administrators, personnel, and students; ENERGY 1 / RHYTHM 1 / MOTION 1. The paper remains the focal point, and the established role-aware controls retain their visual hierarchy.

- **Hard gate PASS:** Real report flows and isolated edge-case fixtures were exercised in the browser; desktop/mobile zoom, print controls, downloads, error/retry, and file recovery work.
- **Purpose gate PASS:** A single PDF body and a restrained opening scale make the page structure readable; existing institutional assets and controls remain in use.
- **Liveliness PASS:** Institutional paper styling and the existing primary action provide the intended identity and focal hierarchy without additional decoration or motion.
- **Craftsmanship PASS:** File recovery is shared, original files remain intact, and full document viewers use one component and zoom policy.
