/**
 * Citizen's Charter (RA 11032 / ARTA) Turnaround Standards
 * Mandated for State Universities and Colleges (SUCs) including PUP.
 * 
 * 3-7-20 Rule (Working Days, excluding weekends & non-working holidays):
 * - Simple Transactions: 3 working days (72h)
 * - Complex Transactions: 7 working days (168h)
 * - Highly Technical Transactions: 20 working days (480h)
 */

export const ARTA_TIERS = {
  SIMPLE: {
    key: "Simple",
    name: "Simple Transaction",
    days: 3,
    hours: 72,
    shortLabel: "Simple · 3d",
    description: "Standard clerical checking & direct generation from digital records",
    badgeClass:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30",
  },
  COMPLEX: {
    key: "Complex",
    name: "Complex Transaction",
    days: 7,
    hours: 168,
    shortLabel: "Complex · 7d",
    description: "Multi-stage archive vault retrieval, course evaluation, and multi-signatory endorsements",
    badgeClass:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30",
  },
  HIGHLY_TECHNICAL: {
    key: "HighlyTechnical",
    name: "Highly Technical Transaction",
    days: 20,
    hours: 480,
    shortLabel: "Technical · 20d",
    description: "Multi-agency validation, board resolutions, legal affidavits, or archival reconstruction",
    badgeClass:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30",
  },
};

/**
 * Determine the ARTA Tier based on the document type name.
 * Uses university registrar document classification rules.
 */
export function getArtaClassification(docTypeName) {
  const norm = String(docTypeName || "").trim().toLowerCase();

  // 1. Highly Technical Transactions (20 Working Days)
  if (
    norm.includes("diploma") ||
    norm.includes("cav") ||
    norm.includes("red ribbon") ||
    norm.includes("apostille") ||
    norm.includes("rectification") ||
    norm.includes("special order") ||
    norm.includes("historical") ||
    norm.includes("reconstruction")
  ) {
    return ARTA_TIERS.HIGHLY_TECHNICAL;
  }

  // 2. Complex Transactions (7 Working Days)
  if (
    norm.includes("transcript") ||
    norm.includes("tor") ||
    norm.includes("form 137") ||
    norm.includes("dismissal") ||
    norm.includes("transfer") ||
    norm.includes("course description") ||
    norm.includes("syllabus") ||
    norm.includes("curriculum") ||
    norm.includes("clearance")
  ) {
    return ARTA_TIERS.COMPLEX;
  }

  // 3. Simple Transactions (3 Working Days - Default for standard certifications)
  return ARTA_TIERS.SIMPLE;
}

/**
 * Calculate deadline by adding business working days (Monday-Friday),
 * skipping Saturdays and Sundays.
 */
export function calculateWorkingDayDeadline(startDateInput, workingDays = 3) {
  const date = new Date(startDateInput);
  if (isNaN(date.getTime())) return new Date();

  let added = 0;
  while (added < workingDays) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return date;
}

/**
 * Calculate the count of working days between two dates.
 */
export function countWorkingDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const isPast = start > end;
  const [d1, d2] = isPast ? [end, start] : [start, end];

  let count = 0;
  const curr = new Date(d1);
  while (curr < d2) {
    curr.setDate(curr.getDate() + 1);
    const day = curr.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return isPast ? -count : count;
}

/**
 * Format a Date object into a readable PH time string.
 */
export function formatCharterDeadline(date) {
  if (!date || isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/**
 * Comprehensive compliance status evaluator for a document request.
 */
export function getRequestCharterStatus(request) {
  if (!request) {
    return {
      tier: ARTA_TIERS.SIMPLE,
      deadline: null,
      deadlineFormatted: "—",
      status: "Unknown",
      label: "Unknown",
      isOverdue: false,
      isDueSoon: false,
      isCompliant: true,
      badgeClass: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
    };
  }

  const tier = getArtaClassification(request.doc_type);
  const createdAt = new Date(request.created_at || Date.now());
  const deadline = calculateWorkingDayDeadline(createdAt, tier.days);
  const deadlineFormatted = formatCharterDeadline(deadline);

  const reqStatus = String(request.status || "Pending");

  if (reqStatus === "Completed") {
    const completedAt = request.updated_at ? new Date(request.updated_at) : new Date();
    const metSla = completedAt.getTime() <= deadline.getTime();

    if (metSla) {
      return {
        tier,
        deadline,
        deadlineFormatted,
        status: "Compliant",
        label: "Met SLA",
        detail: `Completed within statutory ${tier.days}-day limit`,
        isOverdue: false,
        isDueSoon: false,
        isCompliant: true,
        badgeClass:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30",
        icon: "ph-seal-check",
      };
    }

    const workingDaysLate = Math.max(1, countWorkingDaysBetween(deadline, completedAt));
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: "Delayed",
      label: `Completed (+${workingDaysLate}d)`,
      detail: `Completed ${workingDaysLate} working day(s) after deadline`,
      isOverdue: true,
      isDueSoon: false,
      isCompliant: false,
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30",
      icon: "ph-clock-afternoon",
    };
  }

  if (["Cancelled", "Shredded"].includes(reqStatus)) {
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: reqStatus,
      label: reqStatus,
      detail: `Request was ${reqStatus.toLowerCase()}`,
      isOverdue: false,
      isDueSoon: false,
      isCompliant: true,
      badgeClass: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
      icon: "ph-x-circle",
    };
  }

  // Active Request: Pending, InProgress, Ready
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) {
    // Overdue
    const overdueDays = Math.max(1, countWorkingDaysBetween(deadline, now));
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: "Overdue",
      label: `Overdue (${overdueDays}d)`,
      detail: `Statutory turnaround breached by ${overdueDays} working day(s)`,
      isOverdue: true,
      isDueSoon: false,
      isCompliant: false,
      badgeClass:
        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50 dark:border-red-800/30",
      icon: "ph-warning-circle",
    };
  }

  const hoursRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const daysRemaining = countWorkingDaysBetween(now, deadline);

  if (hoursRemaining <= 24 || daysRemaining <= 0) {
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: "DueSoon",
      label: "Due Today",
      detail: `Target deadline arrives today (${hoursRemaining}h remaining)`,
      isOverdue: false,
      isDueSoon: true,
      isCompliant: true,
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30",
      icon: "ph-clock-countdown",
    };
  }

  return {
    tier,
    deadline,
    deadlineFormatted,
    status: "OnTrack",
    label: `Due in ${daysRemaining}d`,
    detail: `${daysRemaining} working day(s) remaining before deadline`,
    isOverdue: false,
    isDueSoon: false,
    isCompliant: true,
    badgeClass:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30",
    icon: "ph-clock",
  };
}
