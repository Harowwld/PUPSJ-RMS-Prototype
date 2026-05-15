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
