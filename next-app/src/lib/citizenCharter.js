/**
 * Citizen's Charter (RA 11032 / ARTA) Turnaround Standards
 * Mandated for State Universities and Colleges (SUCs) including PUP.
 * 
 * 3-7-20 Rule (Working Days, excluding weekends & non-working holidays):
 * - Simple Transactions: 3 working days (72h)
 * - Complex Transactions: 7 working days (168h)
 * - Highly Technical Transactions: 20 working days (480h)
 */

export const DEFAULT_SLA_STANDARDS = {
  frameworkName: "Citizen's Charter (ARTA RA 11032)",
  frameworkType: "ARTA",
  simpleDays: 3,
  complexDays: 7,
  highlyTechnicalDays: 20,
  workingDaysOnly: true,
};

/**
 * Builds tier configuration objects dynamically based on configured standards.
 */
export function buildSlaTiers(standards = DEFAULT_SLA_STANDARDS) {
  const std = { ...DEFAULT_SLA_STANDARDS, ...standards };
  const simpleDays = Math.max(1, parseInt(std.simpleDays, 10) || 3);
  const complexDays = Math.max(1, parseInt(std.complexDays, 10) || 7);
  const techDays = Math.max(1, parseInt(std.highlyTechnicalDays, 10) || 20);
  const unit = std.workingDaysOnly !== false ? "d" : "cd";

  return {
    SIMPLE: {
      key: "Simple",
      name: "Simple Transaction",
      days: simpleDays,
      hours: simpleDays * 24,
      shortLabel: `Simple · ${simpleDays}${unit}`,
      description: "Standard clerical checking & direct generation from digital records",
      badgeClass:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30",
    },
    COMPLEX: {
      key: "Complex",
      name: "Complex Transaction",
      days: complexDays,
      hours: complexDays * 24,
      shortLabel: `Complex · ${complexDays}${unit}`,
      description: "Multi-stage archive vault retrieval, course evaluation, and multi-signatory endorsements",
      badgeClass:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30",
    },
    HIGHLY_TECHNICAL: {
      key: "HighlyTechnical",
      name: "Highly Technical Transaction",
      days: techDays,
      hours: techDays * 24,
      shortLabel: `Technical · ${techDays}${unit}`,
      description: "Multi-agency validation, board resolutions, legal affidavits, or archival reconstruction",
      badgeClass:
        "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/30",
    },
  };
}

export const ARTA_TIERS = buildSlaTiers(DEFAULT_SLA_STANDARDS);

/**
 * Determine the Tier classification based on the document type name.
 * Uses university registrar document classification rules.
 */
export function getArtaClassification(docTypeName, tiers = ARTA_TIERS) {
  const norm = String(docTypeName || "").trim().toLowerCase();
  const activeTiers = tiers || ARTA_TIERS;

  // 1. Highly Technical Transactions
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
    return activeTiers.HIGHLY_TECHNICAL;
  }

  // 2. Complex Transactions
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
    return activeTiers.COMPLEX;
  }

  // 3. Simple Transactions (Default for standard certifications)
  return activeTiers.SIMPLE;
}

/**
 * Calculate deadline by adding days (either working days Monday-Friday, or calendar days).
 */
export function calculateDeadline(startDateInput, days = 3, workingDaysOnly = true) {
  const date = new Date(startDateInput);
  if (isNaN(date.getTime())) return new Date();

  const numDays = Math.max(1, parseInt(days, 10) || 1);

  if (!workingDaysOnly) {
    date.setDate(date.getDate() + numDays);
    return date;
  }

  let added = 0;
  while (added < numDays) {
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
 * Backward compatibility alias for calculateDeadline with workingDaysOnly = true
 */
export function calculateWorkingDayDeadline(startDateInput, workingDays = 3) {
  return calculateDeadline(startDateInput, workingDays, true);
}

/**
 * Calculate the count of days between two dates (working days or calendar days).
 */
export function countDaysBetween(startDate, endDate, workingDaysOnly = true) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const isPast = start > end;
  const [d1, d2] = isPast ? [end, start] : [start, end];

  if (!workingDaysOnly) {
    const diffMs = d2.getTime() - d1.getTime();
    const count = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return isPast ? -count : count;
  }

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
 * Backward compatibility alias for countDaysBetween with workingDaysOnly = true
 */
export function countWorkingDaysBetween(startDate, endDate) {
  return countDaysBetween(startDate, endDate, true);
}

/**
 * Format a Date object into a readable PH time string.
 */
export function formatCharterDeadline(dateInput) {
  if (!dateInput) return "—";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "—";
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
 * Comprehensive compliance status evaluator for a document request with optional dynamic standards.
 */
export function getRequestCharterStatus(request, dynamicStandards = null) {
  const standards = dynamicStandards ? { ...DEFAULT_SLA_STANDARDS, ...dynamicStandards } : DEFAULT_SLA_STANDARDS;
  const tiers = buildSlaTiers(standards);
  const workingDaysOnly = standards.workingDaysOnly !== false;
  const unitLabel = workingDaysOnly ? "working day(s)" : "calendar day(s)";

  if (!request) {
    return {
      tier: tiers.SIMPLE,
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

  const tier = getArtaClassification(request.doc_type, tiers);
  const rawCreatedAt = request.created_at ? new Date(request.created_at) : new Date();
  const createdAt = isNaN(rawCreatedAt.getTime()) ? new Date() : rawCreatedAt;
  const deadline = calculateDeadline(createdAt, tier.days, workingDaysOnly);
  const deadlineFormatted = formatCharterDeadline(deadline);

  const reqStatus = String(request.status || "Pending");

  if (reqStatus === "Completed") {
    const rawCompletedAt = request.updated_at ? new Date(request.updated_at) : new Date();
    const completedAt = isNaN(rawCompletedAt.getTime()) ? new Date() : rawCompletedAt;
    const metSla = completedAt.getTime() <= deadline.getTime();

    if (metSla) {
      return {
        tier,
        deadline,
        deadlineFormatted,
        status: "Compliant",
        label: "Met SLA",
        detail: `Completed within target ${tier.days}-${unitLabel} limit`,
        isOverdue: false,
        isDueSoon: false,
        isCompliant: true,
        badgeClass:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30",
        icon: "ph-seal-check",
      };
    }

    const lateDaysRaw = countDaysBetween(deadline, completedAt, workingDaysOnly);
    const lateDays = Math.max(1, Number.isFinite(lateDaysRaw) ? lateDaysRaw : 1);
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: "Delayed",
      label: `Completed (+${lateDays}d)`,
      detail: `Completed ${lateDays} ${unitLabel} after target limit`,
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
    const overdueDaysRaw = countDaysBetween(deadline, now, workingDaysOnly);
    const overdueDays = Math.max(1, Number.isFinite(overdueDaysRaw) ? overdueDaysRaw : 1);
    return {
      tier,
      deadline,
      deadlineFormatted,
      status: "Overdue",
      label: `Overdue (${overdueDays}d)`,
      detail: `Target turnaround breached by ${overdueDays} ${unitLabel}`,
      isOverdue: true,
      isDueSoon: false,
      isCompliant: false,
      badgeClass:
        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200/50 dark:border-red-800/30",
      icon: "ph-warning-circle",
    };
  }

  const hoursRemainingRaw = Math.ceil(diffMs / (1000 * 60 * 60));
  const hoursRemaining = Math.max(0, Number.isFinite(hoursRemainingRaw) ? hoursRemainingRaw : 0);
  const daysRemainingRaw = countDaysBetween(now, deadline, workingDaysOnly);
  const daysRemaining = Number.isFinite(daysRemainingRaw) ? daysRemainingRaw : 0;

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
    detail: `${daysRemaining} ${unitLabel} remaining before deadline`,
    isOverdue: false,
    isDueSoon: false,
    isCompliant: true,
    badgeClass:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30",
    icon: "ph-clock",
  };
}
