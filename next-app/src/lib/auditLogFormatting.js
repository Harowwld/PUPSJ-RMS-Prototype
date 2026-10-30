/**
 * Audit log details formatting utility.
 * Formats audit log details into correct grammar styling:
 * - Capitalizes the first letter of each narrative sentence.
 * - Properly handles leading quotes, parentheses, and brackets.
 * - Normalizes common acronyms (IP, 2FA, CSV, PDF, SLA, TOTP, OSAS, PUP).
 * - Leaves raw JSON payloads intact.
 *
 * @param {string} text - Raw audit log details
 * @returns {string} Formatted audit log details
 */
export function formatLogDetails(text) {
  if (!text || typeof text !== "string") return text || "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Preserve raw JSON payloads
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed;
  }

  // Capitalize the first letter at the start of string or after sentence-ending punctuation (. ! ?)
  // Accounts for optional leading quotes, parentheses, and brackets.
  let formatted = trimmed.replace(
    /(^\s*['"“‘(\[]*\s*|[.!?]\s+['"“‘(\[]*\s*)([a-z])/g,
    (match, prefix, letter) => prefix + letter.toUpperCase()
  );

  // Normalize common acronyms at sentence starts or after punctuation
  formatted = formatted.replace(
    /(^\s*|['"“‘(\[]\s*|[.!?]\s+)\b(ip|2fa|csv|pdf|sla|totp|osas|pup|rms|id)\b/gi,
    (match, prefix, word) => {
      const lower = word.toLowerCase();
      if (lower === "2fa") return prefix + "2FA";
      return prefix + lower.toUpperCase();
    }
  );

  return formatted;
}
