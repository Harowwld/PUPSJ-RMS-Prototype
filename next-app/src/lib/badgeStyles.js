/**
 * Standardized Borderless Badge System
 * Clean, borderless tinted pills with uniform padding and rounded-full curvature.
 */

// Universal badge geometry: rounded-full with px-2.5 py-0.5
export const BADGE_BASE =
  "inline-flex items-center justify-center rounded-full font-semibold text-[11px] px-2.5 py-0.5 shrink-0 whitespace-nowrap"

// Curated pool of borderless badge colors
// Light mode: soft pastel background with deep dark-800 text
// Dark mode: translucent 950/40 background with crisp 300 text
// Zero border line color
export const BADGE_PALETTES = {
  maroon: "bg-[#800000]/10 text-[#800000] dark:bg-red-950/40 dark:text-red-300",
  blue: "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  orange: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  rose: "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  purple: "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
  indigo: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  sky: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  gray: "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300",
}

/**
 * Standard department badge resolver.
 * Registrar is always PUP Maroon (#800000), OSAS is always Blue.
 */
export function getDepartmentBadgeClass(isRegistrar) {
  return isRegistrar ? BADGE_PALETTES.maroon : BADGE_PALETTES.blue
}

/**
 * Standard stage status badge resolver.
 */
export function getStatusBadgeClass(status) {
  const s = String(status || "").toUpperCase()
  if (s === "PENDING" || s === "SUBMITTED") {
    return BADGE_PALETTES.amber
  }
  if (s === "PROCESSING" || s === "INPROGRESS" || s === "UNDER REVIEW") {
    return BADGE_PALETTES.blue
  }
  if (s === "READY" || s === "APPROVED" || s === "DONE" || s === "COMPLETED") {
    return BADGE_PALETTES.emerald
  }
  if (s === "NEEDS REVISION" || s === "REVISION") {
    return BADGE_PALETTES.orange
  }
  if (s === "CANCELLED" || s === "DECLINED" || s === "SHREDDED") {
    return BADGE_PALETTES.rose
  }
  return BADGE_PALETTES.gray
}
