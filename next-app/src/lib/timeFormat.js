export function formatPHDateTime(dateString) {
  if (!dateString) return "—";
  try {
    // If it already has T or Z, don't append Z again.
    let normalized = String(dateString);
    if (!normalized.includes("T") && !normalized.includes("Z")) {
      normalized = normalized.replace(" ", "T") + "Z";
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) throw new Error("Invalid");

    const datePH = date.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
    });
    const timePH = date.toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePH}, ${timePH}`;
  } catch {
    return String(dateString);
  }
}

export function formatPHDateTimeParts(dateString) {
  if (!dateString) return { date: "—", time: "" };
  try {
    let normalized = String(dateString);
    if (!normalized.includes("T") && !normalized.includes("Z")) {
      normalized = normalized.replace(" ", "T") + "Z";
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) throw new Error("Invalid");

    const datePart = date.toLocaleDateString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timePart = date.toLocaleTimeString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date: datePart, time: timePart };
  } catch {
    return { date: String(dateString), time: "" };
  }
}

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago", "Yesterday")
 * for dates within the last 48 hours.
 */
export function formatRelativeTime(dateString) {
  if (!dateString || dateString === "—") return { relative: "", date: "—", time: "" };
  try {
    let normalized = String(dateString);
    if (!normalized.includes("T") && !normalized.includes("Z")) {
      normalized = normalized.replace(" ", "T") + "Z";
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return { relative: "", date: String(dateString), time: "" };

    const parts = formatPHDateTimeParts(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // If date is slightly in the future (due to clock drift) or within 5 minutes, treat as 'Active Now'
    if (diffInSeconds >= -30 && diffInSeconds < 300) {
      return { ...parts, relative: "Active Now" };
    }
    
    // If date is more than 30s in the future or more than 48 hours ago, return only parts
    if (diffInSeconds < -30 || diffInSeconds > 172800) {
      return { ...parts, relative: "" };
    }

    let relative = "";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      relative = `${mins} ${mins === 1 ? "minute" : "minutes"} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      relative = `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      relative = days === 1 ? "yesterday" : `${days} days ago`;
    }
    
    return { ...parts, relative };
  } catch {
    return { relative: "", date: String(dateString), time: "" };
  }
}

/**
 * Formats a decimal hour value (e.g. 12.5) into a human-readable duration (e.g. 12h 30m)
 */
export function formatDurationHuman(decimalHours) {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) {
    return "N/A";
  }
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

