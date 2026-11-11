export const TABLE_DENSITIES = Object.freeze({
  compact: { label: "Compact", height: 40, padding: 4 },
  normal: { label: "Normal", height: 52, padding: 8 },
  comfortable: { label: "Comfortable", height: 64, padding: 12 },
});

export const LIST_DENSITIES = Object.freeze({
  compact: Object.freeze({ paddingY: "py-2.5", paddingX: "px-4 sm:px-5", gap: "gap-2.5", minHeight: "min-h-[48px]" }),
  normal: Object.freeze({ paddingY: "py-3.5", paddingX: "px-5 sm:px-6", gap: "gap-3.5", minHeight: "min-h-[58px]" }),
  comfortable: Object.freeze({ paddingY: "py-4.5", paddingX: "px-6 sm:px-7", gap: "gap-4.5", minHeight: "min-h-[68px]" }),
});

export function getListDensityClasses(density) {
  const norm = normalizeTableDensity(density);
  return LIST_DENSITIES[norm] || LIST_DENSITIES.normal;
}

export const TABLE_PAGE_SIZES = Object.freeze([10, 20, 50, 100]);

export function normalizeTableDensity(value) {
  return Object.hasOwn(TABLE_DENSITIES, value) ? value : "normal";
}

export function tablePreferenceKey(user) {
  if (!user?.id) return null;
  const principal = user.role === "Student" ? "student" : "staff";
  return `pup_table_density_${principal}_${encodeURIComponent(String(user.id))}`;
}

export function paginationRange({ page = 1, pageSize = 10, totalCount = 0, displayedCount }) {
  const total = Math.max(0, Math.floor(Number(totalCount) || 0));
  const size = Math.max(1, Math.floor(Number(pageSize) || 10));
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(totalPages, Math.max(1, Math.floor(Number(page) || 1)));
  const start = total ? (currentPage - 1) * size + 1 : 0;
  const count = displayedCount == null ? size : Math.max(0, Number(displayedCount) || 0);
  const end = total && count ? Math.min(total, start + Math.min(size, count) - 1) : 0;
  return { page: currentPage, totalPages, start: end ? start : 0, end, total };
}

export function tableStatusTone(value) {
  const status = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (["approved", "active", "completed", "complete", "compliant", "verified", "success", "valid", "enabled", "uploaded", "available"].includes(status)) return "success";
  if (["declined", "rejected", "failed", "error", "overdue", "noncompliant", "critical", "high", "invalid"].includes(status)) return "danger";
  if (["pending", "pendingpayment", "warning", "medium", "incomplete", "missing", "notsubmitted", "unverified", "awaitingreview", "needsrevision", "returned"].includes(status)) return "warning";
  if (["inprogress", "processing", "underreview", "ready", "info", "low", "submitted"].includes(status)) return "info";
  return "neutral";
}

const COLUMN_MIN_WIDTHS = {
  identifier: 144, text: 180, date: 140, status: 100, year: 64, category: 80, number: 64,
};

export function sizeContentColumns(columns, bodyLengths, headerLengths, targetWidth, viewportWidth = targetWidth) {
  const sizes = columns.map(({ kind, width, minWidth, maxWidth, growthWeight }, index) => {
    const control = kind === "selection" || kind === "actions";
    const fixed = control ? 48 : width;
    if (fixed) return { width: fixed, limit: fixed, weight: 0, fallbackWeight: 0, control };

    const minimum = minWidth ?? COLUMN_MIN_WIDTHS[kind] ?? 112;
    const limit = Math.max(minimum, maxWidth ?? (kind === "text" ? Math.max(340, targetWidth) : 340));
    const textWidth = Math.ceil(Math.max(bodyLengths[index], headerLengths[index]) * 7.1 + 36);
    return {
      width: Math.min(limit, Math.max(minimum, Math.min(textWidth, maxWidth ?? 340))),
      limit,
      weight: growthWeight ?? (kind === "text" ? 1 : 0),
      fallbackWeight: growthWeight == null && maxWidth == null && kind !== "text" ? 1 : 0,
    };
  });

  let remaining = targetWidth - sizes.reduce((sum, column) => sum + column.width, 0);
  // Give long text first use of spare room. Uncapped metadata can absorb any remainder.
  for (const weightKey of ["weight", "fallbackWeight"]) {
    while (remaining > 0.01) {
      const flexible = sizes.filter((column) => column.width < column.limit && column[weightKey] > 0);
      if (!flexible.length) break;
      const totalWeight = flexible.reduce((sum, column) => sum + column[weightKey], 0);
      const space = remaining;
      for (const column of flexible) {
        const addition = Math.min(column.limit - column.width, space * column[weightKey] / totalWeight);
        column.width += addition;
        remaining -= addition;
      }
    }
  }

  // Once preferred widths are exhausted, fill the viewport with the visible data columns.
  const unfilledViewportWidth = viewportWidth - sizes.reduce((sum, column) => sum + column.width, 0);
  if (unfilledViewportWidth > 0) {
    const textColumns = sizes.filter((_, index) => columns[index].kind === "text");
    const fillColumns = textColumns.length ? textColumns : sizes.filter((column) => !column.control);
    const share = unfilledViewportWidth / (fillColumns.length || 1);
    for (const column of fillColumns) column.width += share;
  }

  return sizes.map(({ width }) => width);
}
