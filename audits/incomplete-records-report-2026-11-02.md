# System-Wide Incomplete Records (Non-Compliance) Report

Reviewed: 2026-11-02 (Asia/Manila)

**Implementation update: aligned within the existing compliance workflow.**

The original findings below describe the pre-implementation state. The implementation now extends **Missing Documents by Type** and shares its student roster with the staff matrix. It does not add a separate report tab.

## Current workflow and architecture

1. **Administrator:** Compliance Analysis → Missing Documents by Type → View Missing Students for a selected type, or View Incomplete Students for all requirements.
2. **Staff:** Student Documents → Batch Compliance Matrix → View Incomplete Students, preserving program, search, and outstanding-requirement filters.
3. Both entry points open the same [ComplianceStudentsSheet](../next-app/src/components/shared/ComplianceStudentsSheet.js): paginated student identities and outstanding requirements, CSV export, PDF preview/download, and printing.
4. Summary metrics, per-type counts, the matrix, and exports use the same [compliance repository](../next-app/src/lib/digitizationComplianceRepo.js). One PostgreSQL statement reads requirements, office membership, student population, and evidence on a consistent database snapshot. Response pagination follows compliance calculation; exports include every matching student.
5. Approved evidence satisfies verified compliance by default. Pending, Declined, and absent evidence remain distinct as Awaiting Review, Needs Correction, and Missing. The administrator's explicit All Uploads mode counts Pending submissions and passes that choice to the roster and exports.
6. The existing [missing-students API](../next-app/src/app/api/analytics/digitization-compliance/missing-students/route.js) accepts either one document type or all outstanding requirements and now admits staff within their own office scope. Explicit cross-office requests are rejected for ordinary staff/admin users. Analytics remains administrator-only.

Removed redundancy: the staff page's old `refreshDocuments` compliance calculation, associated form/row/loading state, unused matrix callbacks, and duplicate compliance-type fetch were removed. The former administrator-only deficiency sheet and its independent fetch/pagination code were replaced by the shared sheet. The matrix no longer infers requirements from uploaded files or hardcoded defaults.

## Implementation coverage

| Original gap | Current behavior |
| --- | --- |
| Student/document response caps distort matrix results | Shared repository evaluates the entire authorized population before paginating response rows. |
| Roster export/print missing | The existing roster supports full-result CSV export and a printable PDF with student numbers, names, program/section, and outstanding requirement states. |
| Staff cannot use reporting | The staff matrix opens the same roster/export component; reporting authorization retains office boundaries. |
| Approval defaults disagree | Approved evidence is the default throughout; upload coverage remains an explicit administrator choice. |
| Empty/failed configuration creates requirements | No fabricated fallback requirements; empty configuration has a distinct state and blocks roster export. Query errors surface as errors. |
| Declined evidence disappears | Requirements retain declined review state and correction reason. |
| Old requests overwrite newer filters | Superseded requests are aborted; changing roster filters remounts its query-specific state and cancels pending export work. |

## Validation after implementation

- **12 focused tests passed**, covering shared calculations, more than 200 students, full-result exports, empty requirements, pending/declined evidence, search, sorting, and CSV escaping/formula protection. Matrix tests now exercise production calculation code instead of a copied implementation.
- A PostgreSQL test uses temporary tables and rollback to verify 205 students, older approved evidence, selected-type/count agreement, requestable-type exclusion, archived/program filters, and same-name requirements in different offices. It leaves application records untouched.
- Live admin/staff authentication and roster access were checked. Ordinary cross-office requests return 403. CSV responses include student-level requirements.
- Browser checks exercised the existing administrator entry, per-type roster, all-requirements roster, pagination, and PDF preview. The staff matrix/shared roster was checked at a 390px viewport without horizontal sheet overflow. Generated PDF uses embedded Plus Jakarta Sans and avoids splitting ordinary student rows across pages.
- Production build passed. It reports existing filesystem-tracing warnings in unrelated avatar/ingest routes.
- Targeted feature-file ESLint passes. The staff page retains nine existing React-hook/compiler lint findings; comparison against HEAD shows ten there before this change, with the removed legacy compliance effect accounting for the reduction. These unrelated findings were not suppressed.

Operational limit: snapshots are consistent per generated response/export, but they are not stored as immutable historical reports. Separate exports can reflect intervening review or configuration changes. The repository currently calculates the authorized snapshot in server memory; very large deployments may need database-side aggregation/pagination or export jobs while preserving this shared contract.

Design scope: an existing administrative reporting screen for staff, using the established PUP interface, ENERGY 1 / RHYTHM 1 / MOTION 1. The shared sheet preserves the established colors, role-aware buttons, typography, loading/error/empty states, and modal primitives. Its single-column layout supports long requirement names; print output embeds the same font. No additional motion, decorative media, dashboard cards, or navigation entries were introduced.

Changed-flow design checks:

- **Roster list refinement:** all-requirements rows prioritize identity and the real outstanding count, with native keyboard-accessible disclosures for document groups. Needs Correction, Missing, and Awaiting Review stay distinct; correction notes remain visible in their group. Single-document rosters show status without repeating the selected document name in every row. This reduces scrolling while retaining all requirement details. Typography and semantic colors preserve the project standards; row loading skeletons match the compact layout.
- Browser checks cover keyboard disclosure, both roster modes, mixed statuses, correction notes, long unbroken identifiers/notes, and 390px light/dark layouts. CSV export and table-style pagination continue to work with collapsed rows.

- **Hard gate PASS:** real CSV/PDF handlers exercised in a browser; loading/error/empty branches exist; the 390px sheet has no horizontal overflow. No placeholder statistics, testimonials, or navigation were added.
- **Purpose gate PASS:** the existing sheet is reused to avoid another reporting destination; role colors and shared controls retain their established purpose. The PDF's table groups each student with actionable deficiencies.
- **Liveliness PASS:** the existing restrained administrative layout and shared modal motion are retained; Preview List is the roster's primary action. No additional animation was introduced.
- **Craft checks PASS:** light/dark roster screenshots were inspected after transitions settled, the PDF was rendered and inspected, and Plus Jakarta Sans is embedded. These checks apply to the changed reporting flow, not a new audit of the entire application.

---

## Original audit (before implementation)

The following verdict, workflow descriptions, and line references record the original review and are superseded by the implementation update above.

**Original verdict at audit time: partially implemented.** This historical verdict and the acceptance table below are superseded by the implementation update at the top of this report.

The application has useful compliance views, but it does not deliver a complete, reliable student-level non-compliance report with batch CSV/PDF export and printing for both administrators and staff.

Scope: current working tree, including existing uncommitted changes. This was a source and workflow audit, with focused tests and execution of the matrix calculation extracted from production source. No application behavior was changed. No browser, live API, or database integration verification was performed.

“System-wide” is interpreted first as all eligible students within the user's authorized reporting scope, across pages and programs. Campus-wide access across offices requires an explicit authorization policy; existing office isolation should not be removed to satisfy this feature.

## Acceptance coverage

| Objective | Status | Evidence |
| --- | --- | --- |
| Identify students with outstanding requirements at a glance | Partial | Staff → Student Documents → Batch Compliance Matrix → Incomplete / Missing. Its client-side population is truncated. |
| Aggregate all eligible students into one non-compliance roster | Partial | Matrix aggregates loaded rows only. Admin analytics returns aggregates and a separate roster for one document type at a time. |
| Show each student's outstanding document requirements | Partial | Matrix has per-document cells. Admin missing-student response only includes student number, name, and course for the selected document type. |
| Let administrators and staff use the reporting workflow | Partial | Analytics and missing-student APIs require an administrator role. Staff has the matrix but no report output actions. |
| Batch-export the non-compliant student list | Missing | Analytics CSV contains summary metrics and course totals, not student rows or outstanding requirements. |
| Print the non-compliant student list | Missing | Analytics PDF/print operates on an executive summary and program breakdown, not a student roster. |

## 1. Workflow Architecture Map

### Existing staff flow

1. Staff opens `/staff?view=documents`.
2. The page fetches `/api/students` once. The default response contains at most 200 active students in the staff member's office scope.
3. The page fetches `/api/documents?excludeDeclined=1&limit=500` once. The repository clamps this request to **200 documents**, ordered newest first.
4. Compliance document types are loaded from `/api/doc-types?scope=compliance`. An empty result falls back to the general document-type list; the matrix can further fall back to document types inferred from loaded files or four hardcoded requirements.
5. `DocumentsTab` joins the loaded students and documents in memory. A requirement is verified only when its matching document is Approved. Missing or pending requirements make the student incomplete.
6. The Incomplete / Missing filter selects those computed rows; search, program, missing-document filters, sorting, and pagination operate on that local subset.
7. The workflow ends at an on-screen matrix. There are no roster export or print actions in this component.

Sources:

- [Staff data loading](../next-app/src/app/staff/page.js#L428), [document fetch](../next-app/src/app/staff/page.js#L498), [matrix wiring](../next-app/src/app/staff/page.js#L2492).
- [Student API default limit](../next-app/src/app/api/students/route.js#L32), [student SQL pagination](../next-app/src/lib/studentsRepo.js#L208), [document limit and ordering](../next-app/src/lib/documentsRepo.js#L361).
- [Requirement selection and calculation](../next-app/src/components/staff/DocumentsTab.js#L192), [incomplete filter](../next-app/src/components/staff/DocumentsTab.js#L312).

### Existing administrator flow

1. Admin opens `/admin?view=digitization`.
2. `/api/analytics/digitization-compliance` checks the administrator role and resolves office scope. Regular office administrators are scoped to their own office; system administrators can request an office or omit it.
3. The repository reads active, inward compliance document types and aggregates student/document coverage by course and year. These queries do not use the staff matrix's response limits.
4. By default, Pending and Approved uploads count toward digitization; Declined uploads do not. Approved Only changes the qualification rule.
5. Selecting a document type opens a paginated missing-student sheet. `/missing-students` requires one document-type ID and returns students missing that particular requirement.
6. CSV export uses summary and course aggregates. PDF generation creates an executive summary, year distribution, program table, and certification statement. Printing uses that PDF preview.
7. There is no shared all-requirements student roster feeding list, export, and print.

Sources:

- [Admin screen wiring](../next-app/src/app/admin/page.js#L2085), [analytics authorization and scope](../next-app/src/app/api/analytics/digitization-compliance/route.js#L21).
- [Qualification rule](../next-app/src/lib/digitizationComplianceRepo.js#L5), [aggregate queries](../next-app/src/lib/digitizationComplianceRepo.js#L70), [per-type missing roster](../next-app/src/lib/digitizationComplianceRepo.js#L255).
- [CSV contents](../next-app/src/components/admin/DigitizationComplianceTab.js#L506), [PDF contents](../next-app/src/lib/pdfGenerator.js#L472), [print action](../next-app/src/components/admin/DigitizationComplianceTab.js#L485).

OSAS is explicitly routed to an organization-compliance view, which is a different subject and workflow from student-record compliance ([routing](../next-app/src/components/admin/DigitizationComplianceTab.js#L103)). There is no student non-compliance reporting screen wired into the system-administrator page.

## 2. Failure-Mode Threat Matrix

| Failure Mode / Edge Case | Architectural Vulnerability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **P1: Students or older documents fall outside initial API responses** | Matrix computes compliance from one student page and one document page. The requested document limit of 500 is clamped to 200. | Eligible students disappear; approved files outside the document response are treated as missing. Notification lists cannot be trusted. | Compute student compliance in the repository over the full authorized population, then paginate the resulting roster. Export all matching results independently of display pagination. |
| **P1: Export/print does not contain the requested list** | CSV and PDF handlers consume summary/course aggregates. The matrix and per-type student sheet do not supply roster output actions. | Staff must manually transcribe student names and deficiencies; the batch notification objective is unmet. | Provide CSV and printable PDF from the same student-level query used by the report. Include number, name, program, section, outstanding requirements, and per-requirement reason. |
| **P1: Staff cannot use the centralized reporting APIs** | Both analytics routes call `requireAdmin`; the Staff role is excluded. Staff's alternative is the limited matrix. | The feature cannot support both stated audiences through a common reporting workflow. | Add an authorized reporting capability for staff within their permitted office/population. Keep campus-wide access separately guarded. |
| **P2: Pending uploads produce different answers across views** | Matrix requires all Approved documents; analytics defaults to any non-Declined upload. | A student awaiting review is incomplete in the matrix but absent from the default missing-student roster for those uploaded requirements. | Define one default compliance policy, preferably approved evidence for verified compliance. Separate Missing, Awaiting Review, and Needs Correction; expose upload coverage as a distinct metric. |
| **P2: No configured requirements, or failed requirement fetch** | Empty compliance types fall back to all document types, observed file types, or hardcoded requirements. `fetchData` does not require successful HTTP/`ok` responses before accepting arrays. | Outward credentials or obsolete requirements can become mandatory; an infrastructure error can appear as non-compliance or an empty population. | Treat failed configuration fetches as errors. Treat a valid empty requirement set as Not Configured, disable report generation, and require administrative configuration. |
| **P2: Rejection becomes indistinguishable from no submission** | Staff document fetch and `staffDocs` remove Declined documents; matrix presents no Declined/Needs Correction state. Analytics only tests whether qualifying evidence exists. | A notification list cannot distinguish students who never submitted from those who need to correct a rejected document. | Preserve latest review outcome and reason alongside qualifying approved evidence. Report Missing, Pending, and Declined separately without treating rejected evidence as compliant. |
| **P2: Results from an earlier request overwrite newer selection** | Analytics `load` and `loadMissingStudents` write state without cancellation or request-generation checks. | With slow responses and quick filter/document navigation, the current labels can accompany an earlier roster or dataset. This is a source-inferred race; it was not reproduced in a browser. | Abort superseded requests or guard state writes by request ID and query key. Generate reports from an explicit snapshot/query version. |

Additional evidence:

- Role guard: [requireAdmin](../next-app/src/lib/authHelpers.js#L236); [missing-student API](../next-app/src/app/api/analytics/digitization-compliance/missing-students/route.js#L13).
- Different defaults: [matrix Approved check](../next-app/src/components/staff/DocumentsTab.js#L233); [analytics initial state](../next-app/src/components/admin/DigitizationComplianceTab.js#L143); [analytics SQL](../next-app/src/lib/digitizationComplianceRepo.js#L5).
- Empty configuration fallbacks: [page wiring](../next-app/src/app/staff/page.js#L2498); [matrix fallback](../next-app/src/components/staff/DocumentsTab.js#L193).
- Rejected evidence removal: [fetch](../next-app/src/app/staff/page.js#L501); [staffDocs](../next-app/src/app/staff/page.js#L837).
- Unprotected async state writes: [analytics load](../next-app/src/components/admin/DigitizationComplianceTab.js#L233); [missing roster load](../next-app/src/components/admin/DigitizationComplianceTab.js#L263).

## 3. State Machine & Recovery Architecture

### Existing evidence lifecycle

Documents are persisted separately from report results. Creation writes Pending; review writes Approved or Declined and reviewer metadata. Replacement resets a document to Pending and clears reviewer metadata. Declined rows and their files remain available in storage, although the staff matrix excludes those rows.

Sources: [creation](../next-app/src/lib/documentsRepo.js#L253), [replacement](../next-app/src/lib/documentsRepo.js#L472), [review](../next-app/src/lib/documentsRepo.js#L543), [decline preservation](../next-app/src/lib/documentsRepo.js#L596).

For the matrix, a student is compliant only when every current requirement has an Approved match. For default analytics, every requirement having a non-Declined upload is enough. There is no persisted student non-compliance report state or report snapshot in these paths.

### Recommended derived requirement states

| State | Trigger / Guard | Outcome / Recovery |
| --- | --- | --- |
| Not Configured | Valid requirement query returns zero applicable types | Do not classify students as compliant/non-compliant; show configuration action and block report output. |
| Missing | Applicable requirement has no submitted evidence | Student appears in the outstanding-requirements roster; upload this requirement to recover. |
| Awaiting Review | Evidence exists but is not approved | Remain incomplete for verified compliance; route follow-up to the review queue rather than asking for another upload. |
| Needs Correction | Review declined evidence and no qualifying approved evidence remains | Include the review reason and corrective action; resubmission returns this requirement to Awaiting Review. |
| Satisfied | Applicable evidence is Approved | Requirement is complete. Replacing that evidence returns it to Awaiting Review. |
| Compliant student | Every applicable requirement is Satisfied | Exclude student from the non-compliance roster. |

These are derived reporting states. Avoid storing an independent `students.is_compliant` flag that can drift from document reviews and changing requirements.

### Concrete reporting contract

Introduce one server-side query/service shared by the roster, CSV, and PDF paths:

- Authorize role/capability and resolve scope before querying. Standard staff/admin scope is their office; global scope needs explicit permission.
- Build applicable requirements from active inward compliance types. Preserve `(office_id, document_type_id)` identity when combining offices; a name-only union must not apply every office's requirements to every student.
- Derive outstanding requirements for all eligible students in SQL, then paginate students with stable ordering. Return an exact filtered total.
- Return each student once with `studentNo`, `name`, `courseCode`, `section`, `yearLevel`, `officeId`, `requiredCount`, `approvedCount`, and `outstandingRequirements[]`.
- Each outstanding requirement should include `documentTypeId`, `name`, `state`, and applicable `documentId`, `reviewNote`, and `reviewedAt`. Existing review fields can support the initial implementation.
- Return `generatedAt`, normalized filters, scope, and compliance-policy metadata. For reproducible multi-page exports, add a report snapshot identity or materialize the export from one consistent database snapshot; export must not repeatedly read unrelated live pages while reviews change.
- Record export/print-generation audit events with actor, scope, filter/snapshot identity, format, and row count. Existing client callbacks record analytics output intent, but do not identify a student-roster snapshot.
- Keep notification sending separate from this feature unless explicitly requested. The objective requires actionable exported/printed lists, not an automatic messaging pipeline.

## Validation and remaining checks

Executed:

```sh
cd next-app
node --experimental-test-module-mocks --test test/digitization-compliance.test.mjs test/documents-compliance-matrix.test.mjs
```

Result: **9 tests passed**. The analytics tests mock the database. The matrix test file reimplements its calculation rather than importing production behavior, so its passing tests do not establish end-to-end correctness.

Also executed the actual `complianceDocTypes` and `matrixRecords` calculation blocks extracted from `DocumentsTab.js` in a temporary Node VM, without changing source:

1. **201 fully compliant students:** full inputs produced 201 students and zero incomplete. With 200 student rows and the newest 200 document rows, the same calculation produced 200 students and one false incomplete student. The 201st student was omitted.
2. **Zero configured requirements and no documents:** production calculation invented four fallback requirements and marked the student incomplete.
3. **One required document, uploaded Pending:** matrix classified the student as incomplete, consistent with its approval rule and different from default analytics qualification.

Before closing the feature, add checks against production reporting code for: more than 200 students/documents; no uploaded documents; pending-only and declined evidence; correction/review transitions; empty and failed requirement configuration; staff/admin scope enforcement; one row per student with multiple deficiencies; exports spanning all pages; list/CSV/PDF agreement; and filter changes with out-of-order responses. Validate printable output in a browser once roster generation exists.
