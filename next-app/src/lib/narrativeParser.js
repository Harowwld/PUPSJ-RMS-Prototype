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

export const KNOWN_ACCOUNT_NAMES = {
  "student@pup.local": "Juan Dela Cruz",
  "test.student@pup.local": "Maria Clara Santos",
  "superadmin@pup.local": "System Administrator",
  "admin.default@pup.local": "System Administrator",
  "admin.registrar@pup.local": "Elias Austria",
  "staff.registrar@pup.local": "Marcus Reyes",
  "admin.osas@pup.local": "Sandra Gomez",
  "staff.osas@pup.local": "Juanito Rizal",
  "student@pup.com": "Juan Dela Cruz",
  "test.student@pup.com": "Maria Clara Santos",
  "superadmin@pup.com": "Ramon Villanueva",
  "admin.registrar@pup.com": "Elias Austria",
  "staff.registrar@pup.com": "Marcus Reyes",
  "admin.osas@pup.com": "Sandra Gomez",
  "staff.osas@pup.com": "Juanito Rizal",
};

/**
 * Resolves an email, username, or formatted name to the canonical human-friendly display name.
 * e.g. student@pup.local -> Juan Dela Cruz
 *      DELA CRUZ, JUAN A. -> Juan Dela Cruz
 */
export function resolveUserDisplayName(val) {
  if (!val || typeof val !== "string") return val || "";
  let clean = val.trim();
  if (clean.startsWith("@")) clean = clean.slice(1).trim();

  // 1. Direct match in known accounts
  const lower = clean.toLowerCase();
  if (KNOWN_ACCOUNT_NAMES[lower]) {
    return KNOWN_ACCOUNT_NAMES[lower];
  }

  // 2. Direct fallback for username "student"
  if (lower === "student") {
    return "Juan Dela Cruz";
  }

  // 3. Email address formatting: e.g. "firstname.lastname@domain.com"
  if (lower.includes("@")) {
    const localPart = lower.split("@")[0];
    const words = localPart.split(/[._-]+/).filter(Boolean);
    if (words.length >= 2) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  }

  // 4. Inverted name format: "LASTNAME, FIRSTNAME M."
  if (clean.includes(",")) {
    const [last, first] = clean.split(",").map((s) => s.trim());
    if (first && last) {
      const cleanFirst = first.replace(/\s+[A-Z]\.?$/, "");
      return `${cleanFirst} ${last}`.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  // 5. All-caps name format: "JUAN DELA CRUZ"
  if (/^[A-Z\s.'-]+$/.test(clean) && clean.length > 3 && clean.includes(" ")) {
    return clean.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return clean;
}

/**
 * Checks if a token likely represents a person's name:
 * 1. Preceded by contextual words like "student", "account for", "officer", "by", "for", "user".
 * 2. 2-4 capitalized words containing only letters/periods (e.g. "Juan Dela Cruz", "Marcus Reyes").
 */
export function isPersonName(candidate, precedingProse = "") {
  const trimmed = (candidate || "").trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) return false;

  // Known account emails or usernames are always person/account identifiers
  const lower = trimmed.toLowerCase();
  if (KNOWN_ACCOUNT_NAMES[lower] || lower === "student" || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
    return true;
  }

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
export function parseNarrativeTokens(details, highlightedPhrases = []) {
  const text = formatLogDetails(details) || "";
  if (!text) return [];

  const highlights = highlightedPhrases.filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  // Named capture groups regex
  const masterRegex = new RegExp(
    [
      ...(highlights.length ? [`(?<highlight>${highlights.join("|")})`] : []),
      // 1. Status transition: from → to
      "(?<transition>\\b[A-Za-z]+\\s*(?:→|->)\\s*[A-Za-z]+\\b)",
      // 2. Key-Value: Key: Value (handles common audit attributes)
      "(?<kv>\\b(?:Role|Section|Office|Reason|Note|Document|Status|Action|Details):\\s*[^,;.)\\n]+)",
      // 3. Email address (matches bare email or inside parens/brackets, before mention capture)
      "(?<email>\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b)",
      // 4. Mention: @username (excluding trailing sentence periods)
      "(?<mention>@[a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9_-]+)*)",
      // 5. Record ID: #123, #REQ-123, ID: ABC, Student No, or Form codes (SF10-SHS, Form 138, SF9)
      "(?<record_id>#(?:[A-Za-z0-9_-]+)|\\b(?:ID:\\s*|id:\\s*)[A-Za-z0-9_-]+|\\b\\d{4}-\\d{5}(?:-[A-Za-z0-9-]+)?\\b|\\b(?:SF-?\\d+(?:-[A-Za-z0-9]+)?|Form\\s+\\d+)\\b)",
      // 6. Quoted strings: '...', "...", `...`
      "(?<quoted>'[^']+'|\"[^\"]+\"|`[^`]+`)",
      // 7. IPv4 address
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

    if (groups.highlight) {
      tokens.push({ type: "quoted_entity", value: fullMatch, raw: fullMatch });
    } else if (groups.transition) {
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
    } else if (groups.email) {
      const resolved = resolveUserDisplayName(groups.email);
      tokens.push({
        type: "mention",
        value: resolved,
        email: groups.email,
        raw: fullMatch,
      });
    } else if (groups.mention) {
      const rawVal = groups.mention.slice(1);
      const resolved = resolveUserDisplayName(rawVal);
      tokens.push({
        type: "mention",
        value: resolved,
        email: rawVal.includes("@") ? rawVal : null,
        raw: fullMatch,
      });
    } else if (groups.record_id) {
      const cleanVal = groups.record_id.replace(/^(?:#|ID:\s*|id:\s*)/i, "");
      tokens.push({
        type: "record_id",
        value: cleanVal,
        raw: fullMatch,
      });
    } else if (groups.quoted) {
      const inner = groups.quoted.slice(1, -1);
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(inner)) {
        const resolved = resolveUserDisplayName(inner);
        tokens.push({
          type: "mention",
          value: resolved,
          email: inner,
          raw: fullMatch,
        });
      } else if (isPersonName(inner, precedingText)) {
        const resolved = resolveUserDisplayName(inner);
        tokens.push({
          type: "mention",
          value: resolved,
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
