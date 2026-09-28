function parseToDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  let s = String(input).trim();
  if (!s || s === "—") return null;
  if (!s.includes("T") && !s.includes("Z")) {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      s = s.replace(" ", "T") + "Z";
    }
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatPHDateTime(dateInput) {
  if (!dateInput) return "—";
  try {
    const date = parseToDate(dateInput);
    if (!date) return String(dateInput);

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
    return String(dateInput);
  }
}

export function formatPHDateTimeParts(dateInput) {
  if (!dateInput) return { date: "—", time: "" };
  try {
    const date = parseToDate(dateInput);
    if (!date) return { date: String(dateInput), time: "" };

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
    return { date: String(dateInput), time: "" };
  }
}

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago", "Yesterday")
 * for dates within the last 48 hours.
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput || dateInput === "—") return { relative: "", date: "—", time: "" };
  try {
    const date = parseToDate(dateInput);
    if (!date) return { relative: "", date: String(dateInput), time: "" };

    const parts = formatPHDateTimeParts(date);
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
    return { relative: "", date: String(dateInput), time: "" };
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

