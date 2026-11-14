/**
 * Standardized Borderless Badge System
 * Clean, borderless tinted pills with uniform padding and rounded-full curvature.
 */

// Status badges share the same height, type, and horizontal spacing.
export const BADGE_BASE =
  "inline-flex h-6 min-h-6 max-w-full items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-4 tracking-[-0.01em] shrink-0 whitespace-nowrap border-0 shadow-none"

export const SUPERADMIN_BADGE_BASE = BADGE_BASE

// Semantic colors stay readable in both themes.
export const BADGE_PALETTES = {
  maroon: "bg-[#800000]/10 text-[#800000] dark:bg-red-950/40 dark:text-red-300",
  slate: "bg-[#F1F5F9] text-[#334155] dark:bg-slate-800 dark:text-slate-200",
  zinc: "bg-[#F4F4F5] text-[#52525B] dark:bg-zinc-800 dark:text-zinc-200",
  red: "bg-[#FFE4E6] text-[#9F1239] dark:bg-rose-950/50 dark:text-rose-200",
  orange: "bg-[#FFEDD5] text-[#9A3412] dark:bg-orange-950/50 dark:text-orange-200",
  amber: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/50 dark:text-amber-200",
  yellow: "bg-[#FEFCE8] text-[#854D0E] dark:bg-yellow-950/50 dark:text-yellow-200",
  lime: "bg-[#ECFCCB] text-[#3F6212] dark:bg-lime-950/50 dark:text-lime-200",
  green: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/50 dark:text-emerald-200",
  teal: "bg-[#CCFBF1] text-[#115E59] dark:bg-teal-950/50 dark:text-teal-200",
  cyan: "bg-[#CFFAFE] text-[#155E75] dark:bg-cyan-950/50 dark:text-cyan-200",
  sky: "bg-[#E0F2FE] text-[#075985] dark:bg-sky-950/50 dark:text-sky-200",
  blue: "bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-950/50 dark:text-blue-200",
  indigo: "bg-[#E0E7FF] text-[#3730A3] dark:bg-indigo-950/50 dark:text-indigo-200",
  violet: "bg-[#EDE9FE] text-[#5B21B6] dark:bg-violet-950/50 dark:text-violet-200",
  purple: "bg-[#F3E8FF] text-[#6B21A8] dark:bg-purple-950/50 dark:text-purple-200",
  fuchsia: "bg-[#FAE8FF] text-[#86198F] dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
  pink: "bg-[#FCE7F3] text-[#9D174D] dark:bg-pink-950/50 dark:text-pink-200",
  emerald: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/50 dark:text-emerald-200",
  rose: "bg-[#FFE4E6] text-[#9F1239] dark:bg-rose-950/50 dark:text-rose-200",
  gray: "bg-[#F1F5F9] text-[#334155] dark:bg-slate-800 dark:text-slate-200",
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
  const s = String(status || "").trim().toUpperCase()
  if (s === "PENDING" || s === "SUBMITTED") {
    return BADGE_PALETTES.amber
  }
  if (s === "PROCESSING" || s === "INPROGRESS" || s === "IN PROGRESS" || s === "UNDER REVIEW") {
    return BADGE_PALETTES.blue
  }
  if (s === "READY") return BADGE_PALETTES.sky
  if (s === "APPROVED" || s === "DONE" || s === "COMPLETED") {
    return BADGE_PALETTES.emerald
  }
  if (s === "NEEDS REVISION" || s === "REVISION") {
    return BADGE_PALETTES.orange
  }
  if (s === "CANCELLED" || s === "SHREDDED") return BADGE_PALETTES.zinc
  if (s === "DECLINED") {
    return BADGE_PALETTES.rose
  }
  return BADGE_PALETTES.gray
}
