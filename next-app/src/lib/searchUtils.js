/**
 * Universal Search Utilities
 * Provides resilient, case-insensitive, punctuation-tolerant, and order-independent search matching.
 */

/**
 * Normalizes text for search indexing/comparison:
 * - Strips diacritics / accents (e.g., Peña -> Pena)
 * - Lowercases all characters
 * - Replaces punctuation (commas, dots, semicolons, hyphens, slashes) with spaces
 * - Collapses repeated whitespace
 */
export function normalizeSearchText(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,;:.#\/\\_\-+()[\]{}|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips all non-alphanumeric characters for compact identifier matching
 * (e.g., student number "2024-0001-SJ-0" -> "20240001sj0").
 */
export function condenseAlphanumeric(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");
}

/**
 * Splits query string into distinct normalized word tokens.
 */
export function tokenizeSearchQuery(query) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

/**
 * Resilient multi-field search matcher.
 * Matches if:
 * 1. Target contains the raw query (case-insensitive substring)
 * 2. Condensed alphanumeric target contains condensed query (e.g. barcode / keypad student IDs)
 * 3. Every token in query is found in the normalized target text (order and punctuation independent)
 *
 * @param {string|string[]|any} targets - Single string, array of strings, or property values
 * @param {string} query - The search query
 * @returns {boolean}
 */
export function matchesSearchQuery(targets, query) {
  if (!query) return true;
  const rawQuery = String(query).trim().toLowerCase();
  if (!rawQuery) return true;

  const targetList = (Array.isArray(targets) ? targets : [targets])
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v));

  if (targetList.length === 0) return false;

  // 1. Direct raw case-insensitive substring match
  if (targetList.some((t) => t.toLowerCase().includes(rawQuery))) {
    return true;
  }

  // 2. Condensed alphanumeric match (e.g. "20240001" on "2024-0001")
  const condensedQ = condenseAlphanumeric(rawQuery);
  if (condensedQ.length >= 3) {
    if (targetList.some((t) => condenseAlphanumeric(t).includes(condensedQ))) {
      return true;
    }
  }

  // 3. Multi-token normalized match (ignoring commas, periods, word order)
  const tokens = tokenizeSearchQuery(rawQuery);
  if (tokens.length === 0) return true;

  const combinedNormalized = targetList
    .map((t) => normalizeSearchText(t))
    .join(" ");

  return tokens.every((token) => combinedNormalized.includes(token));
}

/**
 * Returns common registrar and academic document acronyms/aliases for search indexing.
 * E.g., "Transcript of Records" -> ["tor"], "Birth Certificate" -> ["psa", "nso", "birth cert"]
 */
export function getDocTypeSearchAliases(docType) {
  if (!docType) return [];
  const dt = String(docType).toLowerCase();
  const aliases = [];
  if (dt.includes("transcript")) aliases.push("tor");
  if (dt.includes("registration") && (dt.includes("certificate") || dt.includes("cert"))) aliases.push("cor");
  if (dt.includes("good moral")) aliases.push("gmc", "good moral");
  if (dt.includes("birth")) aliases.push("psa", "nso", "birth cert");
  if (dt.includes("137") || dt.includes("sf10") || dt.includes("report card")) {
    aliases.push("sf10", "f137", "form 137", "report card");
  }
  if (dt.includes("medical")) aliases.push("med cert");
  if (dt.includes("diploma")) aliases.push("diploma");
  if (dt.includes("candidacy")) aliases.push("coc");
  if (dt.includes("completion")) aliases.push("coc");
  if (dt.includes("proposal")) aliases.push("event proposal");
  return aliases;
}
