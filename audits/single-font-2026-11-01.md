# Single application font — 2026-11-01

The root layout loads the variable Plus Jakarta Sans font. The project guide previously named Inter, and IDs/timestamps/code labels used a monospace stack while a document preview used serif text. Those mismatches have been removed.

- Updated 84 source files from monospace or serif utilities to Plus Jakarta Sans; numeric labels keep `tabular-nums` for stable alignment.
- Set Tailwind's `font-mono` and `font-serif` aliases to the single app font for compatibility with external content. The related global selectors inherit Plus Jakarta Sans.
- Updated the compliance print view to load the local Jakarta Sans font and wait for it before printing.
- Account email templates now declare Plus Jakarta Sans with a generic sans-serif fallback for mail clients that do not have the font installed.
- Updated `AGENTS.md`, `COMPONENT_STANDARDS.md`, and the prior typography report to establish the single-family rule.

At the time of this report, the single-font follow-up had not yet received a fresh browser check or production build. See the validation update below.

## Source recheck — 2026-11-02

A source scan found only Plus Jakarta Sans declarations in application font rules and inline print/email templates. `font-mono` and `font-serif` remain compatibility aliases to the same Plus Jakarta Sans family. This confirms the source policy, but no fresh browser render or production build was run after this follow-up edit.

## Validation update — 2026-11-02

The production build now passes after the follow-up and the Hugeicons sizing migration. A fresh browser visual comparison of all font-sensitive screens has not been run, so visual rendering across authenticated routes remains unverified.
