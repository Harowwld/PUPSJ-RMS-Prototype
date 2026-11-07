import { formatLogDetails } from "./auditLogFormatting.js";

// Deterministic Apple macOS Contacts vibrant palette
export const MAC_AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-purple-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-indigo-600 text-white",
  "bg-teal-600 text-white",
  "bg-pup-maroon text-white",
];

export function getDeterministicColor(str) {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return MAC_AVATAR_COLORS[Math.abs(hash) % MAC_AVATAR_COLORS.length];
}

/**
 * Checks if a token likely represents a person's name:
 * 1. Preceded by contextual words like "student", "account for", "officer", "by", "for", "user".
 * 2. 2-4 capitalized words containing only letters/periods (e.g. "Juan Dela Cruz", "Marcus Reyes").
 */
export function isPersonName(candidate, precedingProse = "") {
  const trimmed = (candidate || "").trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) return false;

  // Contextual clue from preceding prose
  const proseLower = (precedingProse || "").toLowerCase().slice(-30);
  if (
    proseLower.includes("student") ||
    proseLower.includes("account for") ||
    proseLower.includes("officer") ||
    proseLower.includes("personnel") ||
    proseLower.includes("user") ||
    proseLower.includes("by ") ||
    proseLower.includes("for ")
  ) {
    // If it has at least 1 letter and no special symbols like path slashes, file extensions, or JSON syntax
    if (!/[/{}[\]<>:;=+\\]/.test(trimmed) && !trimmed.includes(".pdf") && !trimmed.includes(".csv")) {
      return true;
    }
  }

  // Capitalized Name heuristic: 2 to 4 capitalized words (e.g. "Marcus Reyes", "Dr. Elias Austria")
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    const isAllCapitalized = words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w));
    if (isAllCapitalized && !trimmed.includes("Office of") && !trimmed.includes("Department of")) {
      return true;
    }
  }

  return false;
}

/**
 * Tokenizes audit descriptions and narrative prose into rich structured entity tokens.
 */
export function parseNarrativeTokens(details) {
  const text = formatLogDetails(details) || "";
  if (!text) return [];

  // Named capture groups regex
  const masterRegex = new RegExp(
    [
      // 1. Status transition: from → to
      "(?<transition>\\b[A-Za-z]+\\s*(?:→|->)\\s*[A-Za-z]+\\b)",
      // 2. Key-Value: Key: Value (handles common audit attributes)
      "(?<kv>\\b(?:Role|Section|Office|Reason|Note|Document|Status|Action|Details):\\s*[^,;.)\\n]+)",
      // 3. Mention: @username (excluding trailing sentence periods)
      "(?<mention>@[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*)",
      // 4. Record ID: #123, ID: ABC, or Student No
      "(?<record_id>#(?:[0-9]+)|\\b(?:ID:\\s*|id:\\s*)[A-Za-z0-9_-]+|\\b\\d{4}-\\d{5}(?:-[A-Za-z0-9-]+)?\\b)",
      // 5. Quoted strings: '...', "...", `...`
      "(?<quoted>'[^']+'|\"[^\"]+\"|`[^`]+`)",
      // 6. IPv4 address
      "(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)",
    ].join("|"),
    "g"
  );

  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = masterRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    const fullMatch = match[0];

    // Push preceding plain text if any
    if (matchIndex > lastIndex) {
      const prose = text.slice(lastIndex, matchIndex);
      tokens.push({ type: "text", value: prose });
    }

    const precedingText = text.slice(Math.max(0, matchIndex - 30), matchIndex);
    const groups = match.groups || {};

    if (groups.transition) {
      const [from, to] = groups.transition.split(/\s*(?:→|->)\s*/);
      tokens.push({
        type: "transition",
        from: from.trim(),
        to: to.trim(),
        raw: fullMatch,
      });
    } else if (groups.kv) {
      const colonIdx = groups.kv.indexOf(":");
      const key = groups.kv.slice(0, colonIdx).trim();
      const val = groups.kv.slice(colonIdx + 1).trim();
      tokens.push({
        type: "key_value",
        key,
        value: val,
        raw: fullMatch,
      });
    } else if (groups.mention) {
      tokens.push({
        type: "mention",
        value: groups.mention.slice(1),
        raw: fullMatch,
      });
    } else if (groups.record_id) {
      const cleanVal = groups.record_id.replace(/^(?:ID:\s*|id:\s*)/i, "");
      tokens.push({
        type: "record_id",
        value: cleanVal,
        raw: fullMatch,
      });
    } else if (groups.quoted) {
      const inner = groups.quoted.slice(1, -1);
      if (isPersonName(inner, precedingText)) {
        tokens.push({
          type: "mention",
          value: inner,
          raw: fullMatch,
        });
      } else {
        tokens.push({
          type: "quoted_entity",
          value: inner,
          raw: fullMatch,
        });
      }
    } else if (groups.ip) {
      tokens.push({
        type: "ip_address",
        value: groups.ip,
        raw: fullMatch,
      });
    } else {
      tokens.push({
        type: "text",
        value: fullMatch,
      });
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}
