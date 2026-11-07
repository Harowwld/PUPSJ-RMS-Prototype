# SuperAdmin table columns and saved views

The existing table layouts and default columns are preserved. Additional columns are available through each table's Columns menu.

| Page | Additional optional columns | Purpose |
| --- | --- | --- |
| Departments / Offices | Date Added, Last Updated | Identify newly configured or recently edited departments. |
| Global Personnel Directory | Last Updated | Distinguish account edits from the existing last sign-in and creation dates. |
| Campus Services & Operations | Last Updated | Identify requests or proposals that have recently changed. |
| Global Audit Logs | IP Address | Inspect the recorded source of an action. Missing addresses display N/A. |
| Platform Backups | External Copy, Offsite Copy | Inspect the recorded copy status alongside local storage status. |

Feature matrices retain their existing feature and department columns. Form and content-editor pages do not gain artificial table columns.

## Saved preferences

SuperAdmin preferences use browser localStorage, scoped by signed-in account, page and individual setting. Search, filter rules, status/scope tabs, date ranges, visible columns, sorting, grouping, row counts and available view selectors restore after navigation or reload. Feature matrix department visibility and FAQ editor/preview filters also persist. My Activity uses the same behavior within the SuperAdmin portal.

Explicit office and audit-search links continue to take priority when opened. Pagination starts from the existing page defaults; selected records, credentials and unsaved form content are not persisted by this feature. Clear-filter actions save the cleared values. Other signed-in accounts and other role portals do not inherit these preferences.

Changes synchronize across browser tabs. Malformed JSON, removed column keys and invalid dates fall back safely. If browser storage is unavailable, controls remain usable in memory. Preferences stay on the current browser and device.

The shared implementation is `next-app/src/hooks/useViewPreference.js`, backed by validation and storage handling in `next-app/src/lib/viewPreferences.js`. Loading tables follow the selected column schema.
