export function formatPHDateTime(dateString) {
  if (!dateString) return "—";
  try {
    const date = new Date(String(dateString).replace(" ", "T") + "Z");
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
    const date = new Date(String(dateString).replace(" ", "T") + "Z");
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

