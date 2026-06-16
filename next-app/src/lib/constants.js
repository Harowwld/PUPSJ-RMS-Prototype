/**
 * Global application constants
 */

export const STATUS_COLORS = {
  // Document Request Statuses
  Pending: "#800000",      // Maroon
  InProgress: "#f59e0b",   // Amber/Yellow
  Ready: "#3b82f6",        // Blue
  Completed: "#059669",    // Green
  Cancelled: "#9ca3af",    // Gray

  // Account/Student Statuses
  Active: "#059669",
  Inactive: "#9ca3af",
  Archived: "#d97706",
};

export const TARGET_SLA_HOURS = 72;
export const STANDARD_PROCESSING_DAYS_MIN = 3;
export const STANDARD_PROCESSING_DAYS_MAX = 5;

export const FOLDER_COLORS = {
  yellow: {
    name: "Yellow",
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
  red: {
    name: "Red",
    backStart: "#D63E3E",
    backEnd: "#A82424",
    frontStart: "#EB5757",
    frontEnd: "#C73838",
    border: "border-[#C73838]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-red-500",
  },
  blue: {
    name: "Blue",
    backStart: "#2B7DE3",
    backEnd: "#1D559C",
    frontStart: "#4A90E2",
    frontEnd: "#2A6FBA",
    border: "border-[#2A6FBA]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-blue-500",
  },
  green: {
    name: "Green",
    backStart: "#219653",
    backEnd: "#186D3C",
    frontStart: "#27AE60",
    frontEnd: "#1F8E4E",
    border: "border-[#1F8E4E]/30",
    icon: "text-white/90",
    title: "text-white",
    subtitle: "text-white/80",
    bubble: "bg-emerald-500",
  },
  purple: {
    name: "Purple",
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
  pink: {
    name: "Pink",
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
  indigo: {
    name: "Indigo",
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
  gray: {
    name: "Gray",
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
