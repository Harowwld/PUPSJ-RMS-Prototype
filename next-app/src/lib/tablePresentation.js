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
