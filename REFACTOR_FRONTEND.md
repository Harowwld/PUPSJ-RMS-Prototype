# Frontend Refactor Standards

This file is an agent-facing UI standard for the whole app. When a request references `REFACTOR_FRONTEND.md`, read and apply the relevant rules across analogous pages, roles, and components. Inspect existing implementations first, reuse shared components, and update every affected instance when a rule is cross-app. Keep one-off page changes limited to the explicitly requested scope. Use it alongside `COMPONENT_STANDARDS.md`, which documents the shared component APIs and patterns.

## Shared UI Rules

### Person Identity

- In person metadata and identity surfaces, show the person as one compact badge containing the shared profile avatar and display name. When a role or position appears with a person, emphasize that label separately in bold; do not put the person's name in parentheses.

### Sheets

- Use `SheetSectionHeading` for detail-sheet section headings across all roles. Pair a relevant icon with bold, uppercase text.

- Use the shared `Button` with `variant="ghost"` for icon-only actions in sheets. Give every icon-only action an accessible name and a tooltip.
- Use `<Badge size="compact">` for badges in sheet headers, metadata, and sheet content. Apply compact sizing to label/value badges too.
- Put concise record context beneath a sheet title into a structured metadata treatment instead of leaving it as loose, repeated helper text.

### Banners

- Use the shared campus-photo `NoticeBanner` for status and workflow notices across roles. Choose the semantic tone that matches the status.

### Motion and Navigation

- Use a shared-layout indicator for active navigation links and tabs so selection moves continuously between items. Use the app motion tokens (`SPRING_LAYOUT`) and honor the app's reduced-motion preference (`useAppReducedMotion`).
- For in-page navigation, move the active indicator directly to the clicked link and keep it there throughout the scroll. Resume tracking the visible section once the scroll reaches its destination or is interrupted. During manual scrolling, derive the active link from the scroll position.
- Keep tabbed sections that precede a footer at the height of their tallest tab panel so switching tabs does not move the footer. For dynamic content, derive the reserved height from the available panels instead of guessing a fixed value.
- Navbar actions must share the navbar's control height and center their content on both axes.

### Buttons

- Keep card, list, and table icon actions visible at rest. Use hover and focus styling for feedback.

- Use the shared `Button` for button actions and the project's standard `rounded-xl` control shape. Avoid one-off button geometry when the shared button already fits.

### Grouped Data Views

- Use `DataGroupHeader` for grouped lists, grids, and tables across dashboard roles. Place the group label and a compact count side by side. Use the same grouping and count logic across views of the same records.
- Show the disclosure control for collapsible groups. Keep the same collapsed groups when switching between equivalent views that support collapsing.
- Hide **Group By** in Kanban views. The board columns already organize records by workflow status. Preserve the saved grouping when switching back to a list, grid, or table.

## Completed Refactors

### Landing Page

- [x] **P2 — Smooth the navbar active indicator** (`next-app/src/components/landing/LandingNavbar.js`): keep the active underline continuous as it moves between navigation buttons; avoid snapping or fading out and back in.
- [x] **P2 — Standardize the Request button shape** (`next-app/src/components/landing/LandingHero.js`): apply the shared rounded button geometry (`rounded-xl`) to the hero CTA.
- [x] **P2 — Animate the FAQ category tabs** (`next-app/src/components/landing/FAQSection.js`): add a smooth active-state transition when switching categories, including “All Questions.”
- [x] **P2 — Align the Sign In button** (`next-app/src/components/landing/LandingNavbar.js`): center its label vertically and horizontally, and align its height and position with the navbar controls.
- [x] **P2 — Stabilize the FAQ section height** (`next-app/src/components/landing/FAQSection.js`): reserve space for the tallest category panel so changing categories does not move the footer.
