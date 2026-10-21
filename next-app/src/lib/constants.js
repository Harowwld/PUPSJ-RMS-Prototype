/**
 * Global application constants
 */

export const STATUS_COLORS = {
  // Document Request Statuses
  Pending: "#800000",      // Maroon
  Deficient: "#d97706",    // Amber
  PendingPayment: "#d97706", // Amber
  InProgress: "#f59e0b",   // Amber/Yellow
  Ready: "#3b82f6",        // Blue
  Completed: "#059669",    // Green
  Cancelled: "#9ca3af",    // Gray

  // Account/Student Statuses
  Active: "#059669",
  Inactive: "#9ca3af",
  Archived: "#d97706",
};

export const TARGET_SLA_HOURS = 72; // Default 3 working days (Simple Transactions)
export const STANDARD_PROCESSING_DAYS_MIN = 3;
export const STANDARD_PROCESSING_DAYS_MAX = 20;

export { ARTA_TIERS, getArtaClassification } from "./citizenCharter.js";

export const REQUEST_STATUSES = [
  "Pending",
  "Deficient",
  "PendingPayment",
  "InProgress",
  "Ready",
  "Completed",
  "Cancelled",
  "Shredded",
];

export const TERMINAL_REQUEST_STATUSES = ["Completed", "Cancelled", "Shredded"];

export const DEFAULT_REQUEST_STATUS_MESSAGES = {
  Pending: "Request submitted and queued for evaluation.",
  Deficient: "The Registrar identified missing requirements. Please review the comment and submit the missing items.",
  PendingPayment: "Payment is required before the Registrar can continue. Upload your payment proof or receipt here.",
  InProgress: "Request evaluation in progress. Documents are being retrieved from archives.",
  Ready: "Document is prepared, dry-sealed, and ready for release/claiming.",
  Completed: "Document successfully released and claimed. Transaction completed.",
  Cancelled: "Request was cancelled.",
  Shredded: "Unclaimed document was shredded in accordance with the 90-day retention schedule.",
};

export const ALLOWED_STATUS_TRANSITIONS = {
  Pending: ["Pending", "Deficient", "PendingPayment", "InProgress", "Ready", "Cancelled"],
  Deficient: ["Deficient", "Pending", "PendingPayment", "InProgress", "Cancelled"],
  PendingPayment: ["PendingPayment", "InProgress", "Cancelled"],
  InProgress: ["InProgress", "Deficient", "PendingPayment", "Ready", "Cancelled"],
  Ready: ["Ready", "Completed", "Cancelled", "Shredded"],
  Completed: ["Completed"],
  Cancelled: ["Cancelled"],
  Shredded: ["Shredded"],
};

export const ALLOWED_REOPEN_TRANSITIONS = {
  Cancelled: ["Pending", "InProgress"],
  Completed: ["InProgress", "Ready"],
  Shredded: ["Pending", "InProgress"],
};

export function isTerminalRequestStatus(status) {
  return Array.isArray(TERMINAL_REQUEST_STATUSES) && TERMINAL_REQUEST_STATUSES.includes(status);
}

export function canReopenRequestStatus(currentStatus, newStatus) {
  if (!currentStatus || !newStatus) return false;
  const allowed = ALLOWED_REOPEN_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(newStatus);
}

export function canTransitionRequestStatus(currentStatus, newStatus, { allowReopen = false } = {}) {
  if (!currentStatus || !newStatus) return false;
  if (currentStatus === newStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus];
  if (Array.isArray(allowed) && allowed.includes(newStatus)) return true;
  if (allowReopen && canReopenRequestStatus(currentStatus, newStatus)) return true;
  return false;
}

export const FOLDER_COLORS = {
  yellow: {
    name: "Classic Manila",
    backStart: "#E09F1C",
    backEnd: "#B57E12",
    frontStart: "#F5C242",
    frontEnd: "#D99614",
    border: "border-[#D99614]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-[#f1b82d]",
  },
  amber: {
    name: "Warm Amber",
    backStart: "#D97706",
    backEnd: "#B45309",
    frontStart: "#F59E0B",
    frontEnd: "#D97706",
    border: "border-[#D97706]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-amber-500",
  },
  orange: {
    name: "Tangerine",
    backStart: "#EA580C",
    backEnd: "#C2410C",
    frontStart: "#F97316",
    frontEnd: "#EA580C",
    border: "border-[#EA580C]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-orange-500",
  },
  red: {
    name: "PUP Crimson",
    backStart: "#A81616",
    backEnd: "#800000",
    frontStart: "#C72C2C",
    frontEnd: "#9B1111",
    border: "border-[#9B1111]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-red-600",
  },
  pink: {
    name: "Rose Pink",
    backStart: "#D94681",
    backEnd: "#A32457",
    frontStart: "#EC4899",
    frontEnd: "#C22F75",
    border: "border-[#C22F75]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-pink-500",
  },
  purple: {
    name: "Royal Purple",
    backStart: "#8C4FE6",
    backEnd: "#622FB5",
    frontStart: "#9B51E0",
    frontEnd: "#783ABF",
    border: "border-[#783ABF]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-purple-500",
  },
  indigo: {
    name: "Deep Indigo",
    backStart: "#5850EC",
    backEnd: "#3B33C7",
    frontStart: "#6366F1",
    frontEnd: "#4F46E5",
    border: "border-[#4F46E5]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-indigo-500",
  },
  blue: {
    name: "Ocean Blue",
    backStart: "#2563EB",
    backEnd: "#1D4ED8",
    frontStart: "#3B82F6",
    frontEnd: "#1E40AF",
    border: "border-[#1E40AF]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-blue-500",
  },
  teal: {
    name: "Lagoon Teal",
    backStart: "#0D9488",
    backEnd: "#0F766E",
    frontStart: "#14B8A6",
    frontEnd: "#0F766E",
    border: "border-[#0F766E]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-teal-500",
  },
  green: {
    name: "Emerald Green",
    backStart: "#16A34A",
    backEnd: "#15803D",
    frontStart: "#22C55E",
    frontEnd: "#16A34A",
    border: "border-[#16A34A]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-emerald-500",
  },
  slate: {
    name: "Graphite Slate",
    backStart: "#475569",
    backEnd: "#334155",
    frontStart: "#64748B",
    frontEnd: "#475569",
    border: "border-[#475569]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-slate-500",
  },
  gray: {
    name: "Classic Neutral",
    backStart: "#6B7280",
    backEnd: "#4B5563",
    frontStart: "#9CA3AF",
    frontEnd: "#6B7280",
    border: "border-[#6B7280]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-gray-500",
  },
};

export const PROPOSAL_STATUSES = [
  "Submitted",
  "Under Review",
  "Needs Revision",
  "Approved",
  "Declined",
];

export function normalizeProposalStatus(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "submitted" || s === "pending") return "Submitted";
  if (s === "under review" || s === "underreview" || s === "inprogress" || s === "processing") return "Under Review";
  if (s === "needs revision" || s === "revisionsrequested" || s === "revision") return "Needs Revision";
  if (s === "approved" || s === "completed" || s === "ready") return "Approved";
  if (s === "declined" || s === "rejected" || s === "cancelled") return "Declined";
  if (s === "archived") return "Archived";
  return status || "";
}

export const BANNER_GRADIENT_PRESETS = [
  {
    id: "maroon",
    label: "PUP Maroon",
    description: "Heritage",
    classes: "from-[#800000] via-[#6d0000] to-[#4a0000]",
    previewGradient: "linear-gradient(135deg, #800000 0%, #6d0000 50%, #4a0000 100%)",
  },
  {
    id: "navy",
    label: "Midnight Navy",
    description: "Engineering & Tech",
    classes: "from-[#1e3a8a] via-[#1e293b] to-[#0f172a]",
    previewGradient: "linear-gradient(135deg, #1e3a8a 0%, #1e293b 50%, #0f172a 100%)",
  },
  {
    id: "emerald",
    label: "Forest Emerald",
    description: "Science & Nature",
    classes: "from-[#064e3b] via-[#065f46] to-[#022c22]",
    previewGradient: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #022c22 100%)",
  },
  {
    id: "violet",
    label: "Royal Violet",
    description: "Arts & Humanities",
    classes: "from-[#4c1d95] via-[#5b21b6] to-[#2e1065]",
    previewGradient: "linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #2e1065 100%)",
  },
  {
    id: "crimson",
    label: "Crimson Ember",
    description: "Leadership",
    classes: "from-[#991b1b] via-[#7f1d1d] to-[#450a0a]",
    previewGradient: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #450a0a 100%)",
  },
  {
    id: "azure",
    label: "Ocean Azure",
    description: "Media & Comms",
    classes: "from-[#0369a1] via-[#0284c7] to-[#0c4a6e]",
    previewGradient: "linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0c4a6e 100%)",
  },
  {
    id: "amber",
    label: "Golden Amber",
    description: "Business & Finance",
    classes: "from-[#78350f] via-[#92400e] to-[#451a03]",
    previewGradient: "linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)",
  },
  {
    id: "slate",
    label: "Obsidian Slate",
    description: "Honor & Research",
    classes: "from-[#18181b] via-[#27272a] to-[#09090b]",
    previewGradient: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #09090b 100%)",
  },
];

export const getOrgBannerGradientClasses = (gradientId) => {
  const preset = BANNER_GRADIENT_PRESETS.find((p) => p.id === gradientId);
  return preset ? preset.classes : BANNER_GRADIENT_PRESETS[0].classes;
};

