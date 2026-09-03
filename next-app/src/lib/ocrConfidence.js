const WORD_RE = /[A-Z0-9]+/gi;

function normalize(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[.,'’`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value).match(WORD_RE) || [];
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const matrix = Array.from({ length: b.length + 1 }, (_, row) => [row]);
  for (let column = 1; column <= a.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      matrix[row][column] = b[row - 1] === a[column - 1]
        ? matrix[row - 1][column - 1]
        : Math.min(matrix[row - 1][column - 1] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column] + 1);
    }
  }
  return Math.max(0, 1 - matrix[b.length][a.length] / Math.max(a.length, b.length));
}

function tokenCoverage(extractedName, candidateName) {
  const extracted = tokens(extractedName);
  const candidate = tokens(candidateName);
  if (!extracted.length || !candidate.length) return 0;
  const matched = candidate.filter((candidateToken) => extracted.some((token) => similarity(token, candidateToken) >= 0.75)).length;
  return matched / candidate.length;
}

function tokenSetSimilarity(extractedName, candidateName) {
  const extracted = tokens(extractedName);
  const candidate = tokens(candidateName);
  if (!extracted.length || !candidate.length) return 0;
  const used = new Set();
  let matched = 0;
  for (const extractedToken of extracted) {
    let bestIndex = -1;
    let bestScore = 0;
    candidate.forEach((candidateToken, index) => {
      if (used.has(index)) return;
      const score = similarity(extractedToken, candidateToken);
      if (score >= 0.75 && score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    if (bestIndex >= 0) {
      used.add(bestIndex);
      matched += 1;
    }
  }
  return (2 * matched) / (extracted.length + candidate.length);
}

export function confidenceBand(score, conflict = false) {
  if (conflict) return "Conflict";
  if (score >= 0.95) return "Very strong";
  if (score >= 0.85) return "Strong";
  if (score >= 0.70) return "Possible";
  if (score > 0) return "Weak";
  return "No match";
}

export function calculateOcrQuality({ text = "", observations = [], templateFields = {} } = {}) {
  const textScore = Math.min(1, String(text).trim().length / 160) * 0.30;
  const observationScore = Math.min(1, (Array.isArray(observations) ? observations.length : 0) / 20) * 0.25;
  const fields = Object.values(templateFields || {});
  const populatedFields = fields.filter((field) => String(field?.text || "").trim()).length;
  const fieldScore = fields.length ? (populatedFields / fields.length) * 0.45 : 0;
  const score = Math.max(0, Math.min(1, textScore + observationScore + fieldScore));
  return { score, percent: Math.round(score * 100), band: confidenceBand(score) };
}

export function calculateOcrConfidence({
  extractedName = "",
  candidate = null,
  candidates = [],
  studentNumberMatched = false,
  extractionSource = "none",
  templateFields = {},
  text = "",
  observations = [],
  conflictingCandidates = [],
} = {}) {
  const candidateRows = (Array.isArray(candidates) ? candidates : []).map((item) => {
    const name = item?.name || item?.Name || "";
    const similarityScore = similarity(extractedName, name);
    const coverage = tokenCoverage(extractedName, name);
    const orderIndependent = tokenSetSimilarity(extractedName, name);
    return {
      studentNo: item?.studentNo || item?.student_no || null,
      name,
      similarity: Number(similarityScore.toFixed(4)),
      tokenCoverage: Number(coverage.toFixed(4)),
      tokenSetSimilarity: Number(orderIndependent.toFixed(4)),
      score: Number(Math.min(1, similarityScore * 0.15 + coverage * 0.25 + orderIndependent * 0.60).toFixed(4)),
    };
  }).sort((left, right) => right.score - left.score);

  const best = candidateRows.find((item) => String(item.studentNo) === String(candidate?.studentNo || candidate?.student_no)) || candidateRows[0];
  const conflict = Array.isArray(conflictingCandidates) && conflictingCandidates.some((item) => String(item?.studentNo || item?.student_no) !== String(best?.studentNo));
  let score = 0;
  let reason = "No reliable student match";
  if (studentNumberMatched) {
    score = 1;
    reason = "Exact student number match";
  } else if (best) {
    score = best.score;
    reason = extractionSource === "template" ? "Template-extracted name match" : "Full-page OCR name match";
    if (candidateRows.length > 1) {
      score -= Math.min(0.20, (candidateRows.length - 1) * 0.05);
      reason = "Multiple similar student candidates";
    }
  }
  if (conflict) {
    // Birth certificates contain parents, informants, physicians, and
    // registrars. Their names are useful evidence but should not erase a
    // strong template match.
    score -= 0.05;
    reason = "Template and full-page OCR identify different names";
  }
  score = Math.max(0, Math.min(1, score));
  const quality = calculateOcrQuality({ text, observations, templateFields });
  return {
    matchConfidence: Number(score.toFixed(4)),
    matchPercent: Math.round(score * 100),
    matchBand: confidenceBand(score, conflict),
    ocrQualityScore: quality.score,
    ocrQualityPercent: quality.percent,
    ocrQualityBand: quality.band,
    matchMethod: studentNumberMatched ? "student_number" : extractionSource,
    matchStatus: conflict ? "Conflict" : score > 0 ? "Matched" : "Unmatched",
    evidence: {
      extractedName,
      normalizedExtractedName: normalize(extractedName),
      extractionSource,
      studentNumber: { matched: studentNumberMatched },
      template: { fields: Object.fromEntries(Object.entries(templateFields || {}).map(([key, value]) => [key, { text: value?.text || "", detected: Boolean(String(value?.text || "").trim()) }])) },
      candidates: candidateRows,
      conflicts: conflictingCandidates || [],
      reason,
    },
  };
}
