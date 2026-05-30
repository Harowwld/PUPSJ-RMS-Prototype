/**
 * ocrClient.js — Offline OCR pipeline for PUPSJ Records Management System
 *
 * Exports consumed by staff/page.js and useHotFolderInbox.js:
 *   - scanFileForSuggestion({ file, students, docTypes })  → suggestion object
 *   - scanPdfForSuggestion(…)                               → alias
 *   - warmupOcrWorker()                                     → pre-initialise worker
 *   - normalizeExtractedName(raw)                           → "LASTNAME, FIRSTNAME MI."
 *
 * Return shape of scanFileForSuggestion:
 *   { name, docType, matchedStudent, nameMatchesByName, ocrTextPreview, ocrLinesPreview }
 */

// ─── Singleton state ────────────────────────────────────────────────────────
let _nlpPromise = null;

// ─── Tiny helpers ───────────────────────────────────────────────────────────

/** Collapse whitespace, trim. */
function norm(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/** Lowercase + collapse whitespace. */
function lo(v) {
  return norm(v).toLowerCase();
}

/** Uppercase safely. */
function up(v) {
  return String(v ?? "").toUpperCase();
}

/**
 * Normalise a line to a single-spaced uppercase string for label comparisons.
 * Handles OCR artefacts like "LAST  NAME" (double space) or "LASTNAME" (no space).
 */
function normLabel(s) {
  return up(s).replace(/\s+/g, " ").trim();
}

/**
 * Returns true if normLabel(line) matches any of the given candidate labels,
 * also checking a no-space variant to catch "FIRSTNAME" vs "FIRST NAME".
 */
function labelIs(line, ...candidates) {
  const nl = normLabel(line);
  const nlns = nl.replace(/\s/g, "");
  return candidates.some((c) => {
    const cu = c.toUpperCase();
    return nl === cu || nlns === cu.replace(/\s/g, "");
  });
}

// ─── 1. TESSERACT WORKER REMOVED (NATIVE SYSTEM OCR IS USED EXCLUSIVELY) ───

export async function warmupOcrWorker() {
  // Platform-native OCR executes entirely on-demand via the server
}

// ─── 3. DOCUMENT-TYPE DETECTION ────────────────────────────────────────────
//
// Strategy: We define "keyword clusters" that describe what OCR text looks like
// for each common PH document category.  We score the raw text against every
// cluster, pick the winner, then map it to the closest DB doc-type label.
//
// Even if nothing matches at all we still return docTypes[0] — never "".

const DOC_CLUSTERS = [
  {
    id: "birth",
    /** phrases likely in PSA / NSO birth certificates */
    phrases: [
      "certificate of live birth",
      "live birth",
      "registry no",
      "civil registrar",
      "philippine statistics authority",
      "national statistics office",
      "psa",
      "nso",
      "maiden name",
      "mother",
      "father",
      "attendant",
      "informant",
    ],
    /** match DB labels containing any of these */
    labelHints: ["birth", "psa", "nso"],
  },
  {
    id: "form137",
    phrases: [
      "form 137",
      "form-137",
      "137-a",
      "sf10",
      "sf 10",
      "school form",
      "permanent record",
      "scholastic record",
      "learner's permanent",
      "learning areas",
      "action taken",
      "final rating",
      "deped",
      "department of education",
    ],
    labelHints: ["137", "form", "permanent", "sf10", "sf 10", "137-a", "137a", "f137"],
  },
  {
    id: "transcript",
    phrases: [
      "transcript of records",
      "official transcript",
      "transcript of academic",
      "collegiate",
      "grading system",
      "course description",
      "units earned",
      "academic record",
    ],
    labelHints: ["transcript", "tor"],
  },
  {
    id: "diploma",
    phrases: [
      "diploma",
      "has conferred",
      "is hereby conferred",
      "conferred upon",
      "awarded the degree",
      "degree of",
      "bachelor of",
      "graduated",
    ],
    labelHints: ["diploma"],
  },
  {
    id: "goodmoral",
    phrases: [
      "good moral",
      "good moral character",
      "moral character",
      "character certificate",
    ],
    labelHints: ["moral", "character"],
  },
  {
    id: "enrollment",
    phrases: [
      "certificate of enrollment",
      "currently enrolled",
      "enrollment",
      "bona fide",
      "bonafide",
      "certification",
    ],
    labelHints: ["enrollment", "certification"],
  },
];

function detectDocType(rawText, docTypes) {
  if (!Array.isArray(docTypes) || docTypes.length === 0) return "";
  const fallback = docTypes[0]; // guaranteed non-blank

  const hay = String(rawText ?? "").toLowerCase();
  if (!hay.trim()) return fallback;

  // --- Phase A: score every cluster against the OCR text ---
  let bestCluster = null;
  let bestClusterScore = 0;

  for (const cl of DOC_CLUSTERS) {
    let score = 0;
    for (const ph of cl.phrases) {
      if (hay.includes(ph)) score += ph.includes(" ") ? 6 : 3; // multi-word phrases worth more
    }
    if (score > bestClusterScore) {
      bestClusterScore = score;
      bestCluster = cl;
    }
  }

  // --- Phase B: score every DB doc type ---
  let bestType = fallback;
  let bestScore = -1;

  for (const dt of docTypes) {
    if (!dt) continue;
    let score = 0;
    const dtLo = lo(dt);
    const dtNoSpace = dtLo.replace(/[^a-z0-9]/g, "");

    // B1 — exact substring of the rawText (strongest signal)
    if (hay.includes(dtLo)) score += 1000 + dtLo.length;

    // B2 — compressed match (catches OCR spacing issues)
    const hayNoSpace = hay.replace(/[^a-z0-9]/g, "");
    if (dtNoSpace.length > 4 && hayNoSpace.includes(dtNoSpace)) score += 500;

    // B3 — cluster-winner boost: if this label relates to the winning cluster
    if (bestCluster && bestClusterScore > 0) {
      for (const hint of bestCluster.labelHints) {
        if (dtLo.includes(hint)) {
          score += 800;
          break; // one hit is enough
        }
      }
    }

    // B4 — individual keyword hits (words ≥ 3 chars only)
    const words = dtLo.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    let hits = 0;
    for (const w of words) {
      if (hay.includes(w)) hits++;
    }
    if (hits > 0) {
      score += hits * 10;
      if (words.length > 0 && hits === words.length) score += 50;
    }

    if (score > bestScore) {
      bestScore = score;
      bestType = dt;
    }
  }

   
  console.log("[OCR] docType →", bestType, { cluster: bestCluster?.id, clScore: bestClusterScore, dtScore: bestScore });
  return bestType;
}

// ─── 4. NAME EXTRACTION ────────────────────────────────────────────────────
//
// Multi-strategy pipeline — tries the most precise patterns first, loosening
// progressively.  Returns raw extracted text (caller normalizes).

const TITLE_PREFIX_RE = /\b(?:Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev)\.?\s+/gi;

const BLACKLIST = new Set([
  "SECONDARY", "PERMANENT", "RECORD", "FORM", "STUDENT NO", "STUDENT",
  "ACADEMIC", "REGISTRAR", "REPUBLIC", "DEPARTMENT", "MINISTRY", "OFFICE",
  "PHILIPPINES", "STATISTICS", "AUTHORITY", "CERTIFICATE", "BIRTH",
  "ATTENDING", "PHYSICIAN", "INFORMANT", "SIGNATURE", "CIVIL", "CHURCH",
  "PROVINCE", "MUNICIPALITY", "MOTHER", "FATHER", "CHILD", "SCHOOL",
  "EDUCATION", "UNIVERSITY", "POLYTECHNIC", "SN",
  "STATISTICIAN", "PRINTED", "GENERIC", "OFFICIAL", "REPRESENTATIVE", "GUARDIAN",
  "REGISTRY", "REGISTRY NO", "REGISTRY_NO", "REG", "NO."
]);

function isPlausibleName(s) {
  const u = up(s).trim();
  if (u.length < 4 || u.length > 60) return false;
  if (/\d/.test(u)) return false;
  if (/[#$@*()]/.test(u)) return false; // Avoid junk and parenthesized labels
  for (const b of BLACKLIST) if (u.includes(b)) return false;
  if (/^(NAME|STUDENT\s*NAME)$/i.test(u)) return false;

  const words = u.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  if (words.some((w) => w.length < 2 && !/^[A-Z]\.?$/.test(w))) return false;
  if (words.some((w) => w.length > 20)) return false;
  return true;
}

function isPlausibleNameComponent(s) {
  const u = up(s).trim();
  if (u.length < 2 || u.length > 30) return false;
  if (/\d/.test(u)) return false;
  if (/[#$@*()]/.test(u)) return false; // Avoid junk and parenthesized labels
  for (const b of BLACKLIST) if (u === b || u.includes(" " + b) || u.includes(b + " ")) return false;
  return true;
}

/** Remove trailing same-line field noise (PSA/DepEd forms). */
function stripTrailing(s) {
  return s
    .replace(/\s+\d+[.)]\s*[\s\S]*/g, "")
    .replace(
      /\s+\b(SEX|DATE|DOB|BIRTH\s*ORDER|WEIGHT|PLACE|RELIGION|OCCUPATION|CITIZENSHIP|NATIONALITY)\b[\s\S]*/gi,
      ""
    )
    .trim();
}

/**
 * detectName — score-based multi-strategy name extractor.
 *
 * Every strategy pushes candidates into a shared pool with a numeric confidence
 * score. After all strategies run, the highest-scoring plausible name wins.
 * This prevents an early weak match from shadowing a stronger one found later.
 *
 * @param {string[]} lines
 * @param {{ engine?: string }} opts  engine: "apple-vision"|"windows-media"|"unknown"
 * @returns {string}
 */
function detectName(lines, { engine = "unknown", nlp = null } = {}) {
  const full = lines.join(" ");
  /** @type {{ name: string; score: number; strategy: string }[]} */
  const candidates = [];

  function addCandidate(raw, score, strategy) {
    const cleaned = stripTrailing(norm(String(raw || ""))).replace(/[,]+$/, "").trim();
    if (!cleaned || !isPlausibleName(cleaned)) return;
    const existing = candidates.find((c) => c.name.toUpperCase() === cleaned.toUpperCase());
    if (existing) { if (score > existing.score) existing.score = score; return; }
    candidates.push({ name: cleaned, score, strategy });
  }

  // ── Strategy A0-PSA-BirthCert-Scattered (98): Birth Certificate Scattered Column Matching ──
  // Specifically designed to handle layout-bounded multi-column reads from NSO/PSA Birth Certificates.
  // When OCR outputs first, middle, and last name columns in a split/scattered vertical sequence,
  // we look for specific column/field headers and capture the values underneath.
  {
    let firstName = "";
    let middleName = "";
    let lastName = "";
    
    let firstIdx = -1;
    let middleIdx = -1;
    let lastIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineUpper = up(lines[i]).trim();
      
      // Stop scanning child's name once we hit parent sections (maiden name, father, informant, etc.)
      if (/\b(?:MAIDEN|FATHER|MOTHER|PARENT|INFORMANT|ATTENDANT)\b/i.test(lineUpper)) {
        break;
      }
      
      const cleanLine = lineUpper.replace(/[^A-Z0-9]/g, "");

      // Match First Name labels (e.g. First), (First), PIST, Fist, 1st)
      if (firstIdx === -1 && /^(?:FIRST|GIVEN|PIST|FIST|PIRST|1ST|F1ST)$/i.test(cleanLine)) {
        firstIdx = i;
      }
      // Match Middle Name labels (e.g. (Modie), (Middle), (Middie), (Miidie))
      if (middleIdx === -1 && /^(?:MIDDLE|MIDDIE|MIIDIE|MODIE|NIDDIE|NIDDE)$/i.test(cleanLine)) {
        middleIdx = i;
      }
      // Match Last Name labels (e.g. (Last), (LAST), LAST)
      if (lastIdx === -1 && /^(?:LAST|SURNAME)$/i.test(cleanLine)) {
        lastIdx = i;
      }
    }

    const extractValue = (idx) => {
      if (idx === -1) return "";
      for (let j = 1; j <= 3; j++) {
        if (idx + j >= lines.length) break;
        const cand = stripTrailing(norm(lines[idx + j]));
        if (!cand) continue;
        
        const candUpper = up(cand).trim();
        // Skip label-like lines or lines that start/end with parentheses
        if (candUpper.startsWith("(") && candUpper.endsWith(")")) continue;
        if (/^(?:NAME|PIST|FIRST|GIVEN|MIDDLE|MIDDIE|MIIDIE|LAST|SURNAME|SEX|DATE|DOB|PLACE|MALE|FEMALE|SINGLE|TWIN|TRIPLET|2\.\s*SEX|3\.\s*DATE|4\.\s*PLACE|Sa\.)/i.test(candUpper)) continue;
        
        if (isPlausibleNameComponent(cand)) {
          return cand;
        }
      }
      return "";
    };

    if (firstIdx !== -1 || middleIdx !== -1 || lastIdx !== -1) {
      firstName = extractValue(firstIdx);
      middleName = extractValue(middleIdx);
      lastName = extractValue(lastIdx);
      
      if (firstName && lastName) {
        const combined = middleName
          ? `${lastName}, ${firstName} ${middleName}`
          : `${lastName}, ${firstName}`;
        addCandidate(combined, 98, "A0-PSA-BirthCert-Scattered");
      }
    }
  }

  // ── Strategy A0-PSA-Area (95): Area-Bounded Name Scan ──
  // This is a premium layout-bounded scanner. It isolates the lines between
  // the "1. NAME" header block and the "2. SEX" field, ensuring that any
  // text from other regions (e.g., place of birth, parents' names, informant)
  // is mathematically ignored. Inside the area, we look for (First), (Middle), (Last) 
  // columns and grab the corresponding name values.
  {
    let nameHeaderIdx = -1;
    let sexBoundaryIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const lineUpper = up(lines[i]);
      if (nameHeaderIdx === -1 && (/\b1\.\s*NAME\b/i.test(lineUpper) || (/^\(?first\b/i.test(lineUpper) && /^\(?last\b/i.test(lineUpper)))) {
        nameHeaderIdx = i;
      }
      if (nameHeaderIdx !== -1 && sexBoundaryIdx === -1 && i > nameHeaderIdx) {
        if (/\b(?:2\.\s*SEX|SEX|3\.\s*DATE|DATE\s+OF\s+BIRTH|4\.\s*PLACE)\b/i.test(lineUpper)) {
          sexBoundaryIdx = i;
          break;
        }
      }
    }

    // Bounded search window
    if (nameHeaderIdx !== -1) {
      const endIdx = sexBoundaryIdx !== -1 ? sexBoundaryIdx : Math.min(lines.length, nameHeaderIdx + 8);
      const nameAreaLines = lines.slice(nameHeaderIdx, endIdx);
      
      // If we stopped at a boundary line (e.g. "DELA PENA  2. SEX"), grab the text before the boundary
      if (sexBoundaryIdx !== -1) {
        const boundaryLine = lines[sexBoundaryIdx];
        const boundaryMatch = boundaryLine.match(/^(.*?)\b(?:2\.\s*SEX|SEX|3\.\s*DATE|DATE\s+OF\s+BIRTH|4\.\s*PLACE)\b/i);
        if (boundaryMatch && boundaryMatch[1].trim()) {
          nameAreaLines.push(boundaryMatch[1].trim());
        }
      }
      
      let firstVal = "", middleVal = "", lastVal = "";
      const valueTokens = [];

      for (const rawLine of nameAreaLines) {
        const line = rawLine.trim();
        const lineUpper = up(line);
        // Ignore the main field labels
        if (/\b1\.\s*NAME\b/i.test(lineUpper)) continue;
        if (/^\((?:first|midd|last)/i.test(lineUpper)) continue;
        // Skip purely numeric values or registry noise
        if (/^\d{4}-\d{6}/.test(line) || /^\d{5,}/.test(line)) continue;
        
        // Split line by double-space or tab to preserve column alignment
        const columns = line.split(/\s{2,}/).filter(Boolean);
        for (const col of columns) {
          const val = stripTrailing(norm(col));
          if (val && isPlausibleNameComponent(val)) {
            valueTokens.push(val);
          }
        }
      }

      if (valueTokens.length >= 2) {
        // If we found separate column tokens (First, Middle, Last)
        // Usually, in a left-to-right reading: First = 0, Middle = 1, Last = 2
        if (valueTokens.length === 3) {
          firstVal = valueTokens[0];
          middleVal = valueTokens[1];
          lastVal = valueTokens[2];
        } else if (valueTokens.length === 2) {
          firstVal = valueTokens[0];
          lastVal = valueTokens[1];
        }
        
        if (firstVal && lastVal) {
          const combined = middleVal
            ? `${lastVal}, ${firstVal} ${middleVal}`
            : `${lastVal}, ${firstVal}`;
          addCandidate(combined, 95, "A0-PSA-Area-Bounded");
        }
      }
    }
  }

  // ── Strategy A (90): Scattered component labels — PSA/DepEd vertical layout ──
  // Looks for standalone "LAST NAME" / "FIRST NAME" / "MIDDLE NAME" header lines
  // and reads the value from the line(s) immediately below. labelIs() tolerates
  // OCR spacing artefacts like "LASTNAME" or "LAST  NAME".
  {
    let extractedFirst = "", extractedMiddle = "", extractedLast = "";

    for (let i = 0; i < lines.length; i++) {
      const isLastLabel  = labelIs(lines[i], "LAST NAME", "LASTNAME", "SURNAME", "FAMILY NAME", "APELLIDO");
      const isFirstLabel = labelIs(lines[i], "FIRST NAME", "FIRSTNAME", "GIVEN NAME", "GIVENNAME");
      const isMiddleLabel = labelIs(lines[i], "MIDDLE NAME", "MIDDLENAME");

      const extractNextValue = () => {
        for (let j = 1; j <= 2; j++) {
          if (i + j >= lines.length) break;
          const val = stripTrailing(norm(lines[i + j]));
          if (val && isPlausibleNameComponent(val) &&
              !/^(LAST|FIRST|MIDDLE|NAME|SEX|PLACE|DATE|TYPE|MAIDEN|CITIZENSHIP|RELIGION|AGE|RESIDENCE)/i.test(val))
            return val;
        }
        return "";
      };

      if (isLastLabel && !extractedLast)   extractedLast   = extractNextValue();
      else if (isFirstLabel && !extractedFirst)  extractedFirst  = extractNextValue();
      else if (isMiddleLabel && !extractedMiddle) extractedMiddle = extractNextValue();
    }

    if (extractedFirst && extractedLast) {
      const n = extractedMiddle
        ? `${extractedLast}, ${extractedFirst} ${extractedMiddle}`
        : `${extractedLast}, ${extractedFirst}`;
      addCandidate(n, 90, "A-scattered-labels");
    }
  }

  // ── Strategy A-PSA (88): Parenthesized vertical sub-labels — PSA birth cert ──
  // Apple Vision OCR reads PSA birth certs with each column label on its own line,
  // FOLLOWED by each column value on its own line:
  //
  //   (First)          ← standalone label line
  //   (Middie)         ← "Middle" OCR-misspelled as "Middie", standalone
  //   (Last)           ← standalone label line
  //   RJ JACK          ← value for (First)
  //   APURA            ← value for (Middle)
  //   FLORIDA          ← value for (Last)
  //
  // The old implementation read ONLY the first line after (Last) and got "RJ JACK",
  // missing APURA and FLORIDA entirely. Updated to read the next 3 lines as
  // (First value), (Middle value), (Last value) in order, then assemble the name.
  {
    for (let i = 0; i < lines.length; i++) {
      // Match (Last) / (LAST) / (last) as a standalone label line
      if (!/^\(last\)$/i.test(lines[i].trim())) continue;

      // Check the preceding 8 lines for (First) label and no parent/signatory context
      let hasParenFirst = false;
      let hasParentContext = false;
      for (let k = Math.max(0, i - 8); k < i; k++) {
        if (/^\((?:first|given)\b/i.test(lines[k].trim())) hasParenFirst = true;
        if (/\b(?:MAIDEN|FATHER|MOTHER|PARENT|INFORMANT|WITNESS|GUARDIAN)\b/i.test(lines[k])) hasParentContext = true;
      }

      // Require (First) seen before (Last) and no parent/signatory context nearby
      if (!hasParenFirst || hasParentContext) continue;

      // Collect the next 1-5 non-empty, non-label lines as name value tokens
      const valueLines = [];
      for (let j = 1; j <= 5 && valueLines.length < 3; j++) {
        if (i + j >= lines.length) break;
        const cand = stripTrailing(norm(lines[i + j]));
        // Skip bare "NAME" artefacts or parenthesized label lines
        if (!cand || /^NAME$/i.test(cand.trim()) || /^\([^)]+\)$/.test(cand.trim())) continue;
        // Stop if we hit a clearly non-name line (date, sex, numbers, etc.)
        if (/^\d{1,2}$/.test(cand.trim()) || /\b(?:SEX|DATE|BIRTH|PLACE|MALE|FEMALE|SINGLE|TWIN|TRIPLET)\b/i.test(cand)) break;
        // Require at least one plausible name token
        if (/[A-Za-z]{2,}/.test(cand)) valueLines.push(cand);
      }

      if (valueLines.length === 0) { break; }

      if (valueLines.length === 1) {
        // Single combined line (old format): "GABRIEL MATEO SANTOS RAMIREZ"
        if (isPlausibleName(valueLines[0])) {
          addCandidate(valueLines[0], 88, "A-PSA-vertical-labels");
        }
      } else {
        // Multiple lines: valueLines[0]=First, valueLines[1]=Middle, valueLines[2]=Last
        // (The column values follow the same left-to-right order as the labels above)
        const firstVal  = valueLines[0] || "";
        const middleVal = valueLines[1] || "";
        const lastVal   = valueLines[2] || "";
        if (firstVal && lastVal) {
          const combined = middleVal
            ? `${lastVal}, ${firstVal} ${middleVal}`
            : `${lastVal}, ${firstVal}`;
          addCandidate(combined, 88, "A-PSA-vertical-labels");
        } else if (firstVal && middleVal) {
          // Only 2 value lines: treat as first + last (no middle)
          addCandidate(`${middleVal}, ${firstVal}`, 88, "A-PSA-vertical-labels");
        }
      }

      break; // Only use the first qualifying (Last) group — the child's section
    }
  }


  // ── Strategy A-PSA-H (87): Horizontal (First)/(Middle)/(Last) on one line ──
  // Apple Vision OCR reads PSA birth cert column headers as a single combined
  // line like:  "1. NAME (First) (Middle) (Last)"
  // and the actual name values appear on the NEXT line as separate columns
  // that Vision may join into one line: "RJ APURA JACK"
  // In this layout, the column order is FIRST MIDDLE LAST (left to right),
  // so the raw joined line is in First-Middle-Last order and can be passed
  // directly to normalizeExtractedName for surname detection.
  {
    for (let i = 0; i < lines.length; i++) {
      const upperLine = up(lines[i]);
      // Must contain (First) and (Last) on the same line
      if (!/(^|\s)\(first\b/i.test(upperLine) || !/(^|\s)\(last\b/i.test(upperLine)) continue;
      // Must be related to the NAME field (row 1 of PSA cert)
      if (!/\bname\b/i.test(upperLine) && !/^\(?first\b/i.test(upperLine)) {
        // Allow if the line only has sub-labels
        if (!/(^\s*\(first\b|\(middle\b|\(last\b)/i.test(upperLine)) continue;
      }
      // Avoid parent/signatory rows
      if (/\b(?:MAIDEN|FATHER|MOTHER|PARENT|INFORMANT|WITNESS|GUARDIAN)\b/i.test(upperLine)) continue;

      // Read the next 1-3 non-empty lines for the actual name value
      for (let j = 1; j <= 3; j++) {
        if (i + j >= lines.length) break;
        const cand = stripTrailing(norm(lines[i + j]));
        if (!cand || cand.startsWith("(")) continue;
        // Must look like a plausible multi-word name (at least 2 alpha tokens)
        const tokens = cand.split(/\s+/).filter(t => /^[A-Za-z.'-]{2,}$/.test(t));
        if (tokens.length >= 2 && isPlausibleName(cand)) {
          addCandidate(cand, 87, "A-PSA-H-horizontal-header");
          break;
        }
      }
      break;
    }
  }


  // ── Strategy A2 (85): Parenthesized same-line components — all engines ──
  // PSA birth certificates have horizontal column headers on the same line:
  //   "1. NAME  (First)  (Middle)  (Last)"
  // Apple Vision OCR (macOS) may emit this with the name values following each
  // label on the same line, or on a nearby line after the label token.
  // Previously gated to windows-media only, which caused the middle name to be
  // silently dropped on macOS scans. Now runs for ALL engines.
  {
    for (const line of lines) {
      const upperLine = up(line);
      if (/\b(?:MAIDEN|FATHER|MOTHER|PARENT|INFORMANT|REGISTRAR|ATTENDANT|PHYSICIAN|WITNESS|OFFICER|CLERK|ADMINISTRATOR|SECRETARY|PREPARED|STATISTICIAN|PRINTED|SIGNATURE|GENERIC|REPRESENTATIVE|GUARDIAN)\b/i.test(upperLine)) continue;
      const numM = upperLine.match(/^(\d+)/);
      if (numM && numM[1] !== "1" && numM[1] !== "01") continue;
      if (!(upperLine.includes("(FIRST") || upperLine.includes("(LAST") || upperLine.includes("(MIDD"))) continue;

      const matches = [...line.matchAll(/\(([^)]+)\)\s*([^()]*)/g)];
      let firstVal = "", middleVal = "", lastVal = "";
      for (const m of matches) {
        const label = up(m[1]).trim();
        let val = m[2].trim()
          .replace(/\s*\b(FEMALE|MALE|SEX|REGISTRY|REG\.?|NO\.?|\d+)\b[\s\S]*/gi, "")
          .replace(/[^a-zA-Z\s.-]/g, "").trim();
        if (label.includes("FIRST") || label.includes("F1RST") || label.includes("GIVEN")) {
          if (isPlausibleNameComponent(val)) firstVal = val;
        } else if (label.includes("MIDD") || label.includes("MIDDLE")) {
          if (isPlausibleNameComponent(val)) middleVal = val;
        } else if (label.includes("LAST") || label.includes("SURNAME") || label.includes("FAMILY")) {
          if (isPlausibleNameComponent(val)) lastVal = val;
        }
      }
      if (firstVal && lastVal) {
        const n = middleVal ? `${lastVal}, ${firstVal} ${middleVal}` : `${lastVal}, ${firstVal}`;
        addCandidate(n, 85, "A2-horizontal-parenthesized");
        break;
      }
    }
  }

  // ── Strategy 1 (80): "certify/certifies/certified that NAME" ──
  {
    const m = full.match(
      /\bcertif(?:y|ies|ied)\s+that\s+(?:(?:Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev)\.?\s+)?([A-Z][A-Za-z .,''-]{3,}?)(?=\s+(?:has|is|having|was|of|a\s+bona|a\s+student|,?\s*(?:with|born|student))|[.(]|$)/i
    );
    if (m?.[1]) addCandidate(m[1].replace(/\s*[(\[].*/, ""), 80, "1-certify-that");
  }

  // ── Strategy 2 (75): "conferred upon / awarded to NAME" ──
  {
    const m = full.match(/(?:conferred\s+upon|awarded\s+to)\s+([A-Z][A-Za-z .,''-]{3,})/i);
    if (m?.[1]) addCandidate(m[1].replace(/\s*[(\[].*/, ""), 75, "2-conferred-upon");
  }

  // ── Strategy 3 (72–55): Line-by-line label scan ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upper = up(line);

    if (/\b(?:MAIDEN|FATHER|MOTHER|PARENT|INFORMANT|REGISTRAR|ATTENDANT|PHYSICIAN|WITNESS|OFFICER|CLERK|ADMINISTRATOR|SECRETARY|PREPARED|STATISTICIAN|PRINTED|SIGNATURE|GENERIC|REPRESENTATIVE|GUARDIAN)\b/i.test(upper)) continue;
    if (/[\[(].*NAME.*[\])]/i.test(upper)) continue;

    // 3a — "STUDENT NAME:" (72/71)
    if (/\bSTUDENT\s+NAME\b/i.test(upper)) {
      const colonM = line.match(/\bSTUDENT\s+NAME\b[^:–-]*[:–-]\s*(.*)/i);
      if (colonM?.[1]) addCandidate(colonM[1], 72, "3a-student-name-colon");
      if (i + 1 < lines.length) {
        const next = stripTrailing(norm(lines[i + 1]));
        if (next && !/^(NAME|STUDENT|NUMBER|DATE)/i.test(next)) addCandidate(next, 71, "3a-student-name-nextline");
      }
    }

    // 3b — generic "NAME:" (65/62)
    // Guard: skip a bare "NAME" line that appears after MAIDEN in the preceding lines.
    // PSA birth certs split "6. MAIDEN NAME" across two lines; the orphaned "NAME"
    // would otherwise incorrectly match the mother's name instead of the child's.
    if (/\bNAME\b/i.test(upper)) {
      // Check if this NAME occurrence is part of a MAIDEN NAME split
      const precedingContext = lines.slice(Math.max(0, i - 6), i).join(" ").toUpperCase();
      const isOrphanedMaidenName = /^NAME$/i.test(line.trim()) && /\bMAIDEN\b/.test(precedingContext);
      if (!isOrphanedMaidenName) {
        const colonM = line.match(/\bNAME\b[^:–-]*[:–-]\s*(.*)/i);
        if (colonM?.[1]) addCandidate(colonM[1], 65, "3b-name-colon");
        // Extended lookahead (10 lines) so deeply nested name values are reachable.
        // The PSA birth cert has 6 lines between "1. NAME" and the actual name:
        //   MANILA, 2011-012345, (First), (Middle), (Last), then the name at j=6.
        for (let j = 1; j <= 10; j++) {
          if (i + j >= lines.length) break;
          const cand = stripTrailing(norm(lines[i + j]));
          const candUpper = up(cand);
          if (cand.startsWith("(") && cand.endsWith(")")) continue;
          if (/\b(?:FIRST|MIDDLE|MIDDIE|LAST|SURNAME|GIVEN|FAMILY|NAME)\b/i.test(candUpper)) continue;
          if (cand && isPlausibleName(cand)) { addCandidate(cand, 62, "3b-name-nextlines"); break; }
        }
      }
    }

    // 3c — DepEd SURNAME inline (55)
    {
      const m = upper.match(
        /\b(?:SURNAME|SUMAME|SURNAMF|SURNANE)\b[\s:_-]*([A-Z][A-Z '.–-]{4,}?)(?=\bDATE\s+OF\s+BIRTH\b|\bSEX\b|$)/
      );
      if (m?.[1]) addCandidate(m[1], 55, "3c-deped-surname");
    }
  }

  // ── Strategy 4 (50): Title-prefix line (Mr./Ms./Dr. NAME) ──
  for (const line of lines) {
    const t = line.trim();
    const m = t.match(/\b(?:Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev)\.?\s+([A-Z][A-Z][A-Z .,''-]*)/i);
    if (m?.[1]) {
      const raw = m[1].replace(/\s*[(\[].*/, "").replace(/\s*,.*/, "").trim();
      if (/(guidance|counselor|principal|registrar|dean|president|director|chairperson)/i.test(t)) continue;
      addCandidate(raw, 50, "4-title-prefix");
    }
  }

  // ── Strategy 5 (40): Raw ALL-CAPS "LASTNAME, FIRSTNAME" line (last resort) ──
  for (const line of lines) {
    const m = line.trim().match(/^([A-Z\s.'-]+,\s*[A-Z\s.'-]+)(?:\s{3,}|$)/);
    if (m?.[1]) addCandidate(m[1], 40, "5-raw-caps-lastname-first");
  }

  // ── Strategy NLP (45): Natural Language processing (compromise.js) ──
  if (nlp) {
    try {
      const doc = nlp(full);
      const people = doc.people().out("array");
      for (const p of people) {
        if (p && p.trim().length >= 4) {
          addCandidate(p, 45, "NLP-compromise");
        }
      }
    } catch (e) {
      console.warn("[OCR] NLP compromise failed:", e);
    }
  }

  if (candidates.length === 0) return "";
  candidates.sort((a, b) => b.score - a.score);
  console.log("[OCR Name] candidates:", candidates.map((c) => `${c.strategy}(${c.score}):${c.name}`).join(" | "));
  console.log("[OCR Name] winner:", candidates[0].name, "->", candidates[0].strategy);
  return candidates[0].name;
}

// ─── 5. NAME NORMALISATION → "LASTNAME, FIRSTNAME MI." ─────────────────────

const PARTICLES = new Set([
  "DE", "DEL", "DELA", "DA", "DI", "LA", "LAS", "LOS",
  "SAN", "SANTA", "SANTO", "VON", "VAN",
]);

export function normalizeExtractedName(raw) {
  if (!raw) return "";
  let s = up(raw)
    .replace(TITLE_PREFIX_RE, "")
    .replace(/[\]\[{}|\\<>]/g, "") // Remove bracket-like garbage from OCR
    .replace(/\.{2,}/g, ".") // Collapse multiple dots
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/[.,]+$/g, "").trim(); // Trim trailing punctuation
  if (!s) return "";

  // Already "LAST, FIRST"
  if (s.includes(",")) {
    const [last, first] = [s.slice(0, s.indexOf(",")), s.slice(s.indexOf(",") + 1)];
    const l = last.trim(), f = first.trim();
    return l && f ? `${l}, ${f}` : l || f;
  }

  const w = s.split(/\s+/).filter(Boolean);
  if (w.length < 2) return w[0] || s;

  // Walk backwards for surname particles
  let si = w.length - 1;
  if (si >= 1 && PARTICLES.has(w[si - 1])) { si--; if (si >= 1 && PARTICLES.has(w[si - 1])) si--; }

  const surname = w.slice(si).join(" ");
  const given = w.slice(0, si).join(" ");
  return given ? `${surname}, ${given}` : surname;
}

export function formatToLNFnMi(name) {
  if (!name) return "";
  const normalized = normalizeExtractedName(name);
  if (!normalized) return "";
  
  const { firstName, middleName, lastName } = splitNameComponents(normalized);
  if (!lastName) return normalized;
  
  let cleanFirst = firstName.trim();
  let mi = "";
  if (middleName) {
    const cleanMid = middleName.replace(/[^A-Z]/g, "");
    if (cleanMid.length > 0) {
      mi = ` ${cleanMid[0]}.`;
    }
  } else {
    const words = cleanFirst.split(/\s+/);
    if (words.length > 1) {
      const lastWord = words[words.length - 1].replace(/\.$/, "");
      if (lastWord.length === 1 && /^[A-Z]$/.test(lastWord)) {
        mi = ` ${lastWord}.`;
        cleanFirst = words.slice(0, -1).join(" ");
      }
    }
  }
  return `${lastName}, ${cleanFirst}${mi}`;
}

export function splitNameComponents(fullName) {
  if (!fullName) return { firstName: "", middleName: "", lastName: "" };
  const s = String(fullName).trim().toUpperCase();
  
  if (s.includes(",")) {
    const commaIdx = s.indexOf(",");
    const lastName = s.slice(0, commaIdx).trim();
    const rest = s.slice(commaIdx + 1).trim();
    
    const words = rest.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return { firstName: "", middleName: "", lastName };
    }
    if (words.length === 1) {
      // Only one given name word — it's the first name, no middle name
      return { firstName: words[0], middleName: "", lastName };
    }
    // Philippine convention: middle name = last word (mother's maiden surname)
    // First name = everything before the last word
    const middleName = words[words.length - 1];
    const firstName = words.slice(0, -1).join(" ");
    return { firstName, middleName, lastName };
  }
  
  // No comma — space-separated, last word = last name
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (words.length === 1) {
    return { firstName: "", middleName: "", lastName: words[0] };
  }
  if (words.length === 2) {
    return { firstName: words[0], middleName: "", lastName: words[1] };
  }
  // 3+ words: last = surname, second-to-last = middle name, rest = first name
  const lastName = words[words.length - 1];
  const middleName = words[words.length - 2];
  const firstName = words.slice(0, -2).join(" ");
  return { firstName, middleName, lastName };
}


// ─── 6. STUDENT MATCHING ────────────────────────────────────────────────────

/** Regex matching PUP Student Number format allowing common OCR replacements for digits */
const STUDENT_NO_PATTERN = /\b[0-9OILTZEGSB]{4}[-\s]?[0-9OILTZEGSB]{5}[-\s]?[A-Z]{2}[-\s]?[0-9OILTZEGSB]\b/gi;

function sanitizeStudentNoCandidate(s) {
  const clean = s.toUpperCase().replace(/[\s-]/g, "");
  if (clean.length !== 12) return null;
  
  let yyyy = clean.slice(0, 4);
  let nnnnn = clean.slice(4, 9);
  const aa = clean.slice(9, 11);
  let d = clean.slice(11);
  
  const mapToDigit = (str) => {
    return str
      .replace(/O/g, "0")
      .replace(/I/g, "1")
      .replace(/L/g, "1")
      .replace(/T/g, "1")
      .replace(/Z/g, "2")
      .replace(/S/g, "5")
      .replace(/G/g, "6")
      .replace(/B/g, "8");
  };
  
  yyyy = mapToDigit(yyyy);
  nnnnn = mapToDigit(nnnnn);
  d = mapToDigit(d);
  
  if (/^\d{4}$/.test(yyyy) && /^\d{5}$/.test(nnnnn) && /^[A-Z]{2}$/.test(aa) && /^\d$/.test(d)) {
    return `${yyyy}-${nnnnn}-${aa}-${d}`;
  }
  return null;
}

export function detectStudentNo(rawText) {
  if (!rawText) return null;
  const matches = rawText.match(STUDENT_NO_PATTERN);
  if (!matches) return null;
  for (const m of matches) {
    const sanitized = sanitizeStudentNoCandidate(m);
    if (sanitized) return sanitized;
  }
  return null;
}

function normNameMatch(v) {
  return lo(v).replace(/[.,''\u2019`]/g, " ").replace(/\s+/g, " ").trim();
}

function stripMiddleInitial(normalizedName) {
  const words = normalizedName.split(/\s+/);
  if (words.length > 2 && words[words.length - 1].length === 1) {
    return words.slice(0, words.length - 1).join(" ");
  }
  return normalizedName;
}


function levenshteinSimilarity(s1, s2) {
  const a = String(s1 || "").trim().toUpperCase();
  const b = String(s2 || "").trim().toUpperCase();
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLength = Math.max(a.length, b.length);
  return 1.0 - distance / maxLength;
}

export function findStudentsByOcrName(ocrName, students) {
  if (!ocrName || !Array.isArray(students)) return [];
  
  // Normalize the input OCR name to "Last, First MI." standard format to align with DB format
  const formatted = formatToLNFnMi(ocrName) || ocrName;
  const o = normNameMatch(formatted);
  if (o.length < 2) return [];
  
  // 1. Exact normalized match
  const exact = students.filter((s) => {
    const dbNorm = normNameMatch(s?.name || s?.Name || "");
    return dbNorm === o || dbNorm === normNameMatch(ocrName);
  });
  if (exact.length > 0) return exact;
  
  // 2. Fuzzy match stripping middle initial
  const oStripped = stripMiddleInitial(o);
  const rawOStripped = stripMiddleInitial(normNameMatch(ocrName));
  const strippedMatches = students.filter((s) => {
    const dbNorm = normNameMatch(s?.name || s?.Name || "");
    const dbStripped = stripMiddleInitial(dbNorm);
    return dbStripped === oStripped || dbStripped === rawOStripped;
  });
  if (strippedMatches.length > 0) return strippedMatches;

  // 3. Token-based intersection matching (extremely robust for split 3-field formats)
  // Splits both name strings into individual word tokens and checks for heavy overlap.
  const getAlphaTokens = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1); // skip single-letter initials like "E"
  
  const ocrTokens = getAlphaTokens(o);
  const rawOcrTokens = getAlphaTokens(normNameMatch(ocrName));
  
  if (ocrTokens.length >= 2 || rawOcrTokens.length >= 2) {
    const tokenMatches = students.filter((s) => {
      const dbNorm = normNameMatch(s?.name || s?.Name || "");
      const dbTokens = getAlphaTokens(dbNorm);
      if (dbTokens.length < 2) return false;
      
      // Check if DB tokens exist in the OCR tokens (with fuzzy tolerance for typos)
      const matchesCount = dbTokens.filter((dt) => 
        ocrTokens.some((ot) => ot === dt || levenshteinSimilarity(ot, dt) >= 0.75) ||
        rawOcrTokens.some((ot) => ot === dt || levenshteinSimilarity(ot, dt) >= 0.75)
      ).length;
      
      const matchRatio = matchesCount / Math.min(dbTokens.length, Math.max(ocrTokens.length, rawOcrTokens.length));
      return matchRatio >= 0.80; // 80% token overlap
    });
    if (tokenMatches.length > 0) {
      return tokenMatches;
    }
  }

  // 4. 70% Levenshtein similarity fuzzy match
  const fuzzyCandidates = students
    .map((s) => {
      const dbNorm = normNameMatch(s?.name || s?.Name || "");
      // Compare both full name and space-separated versions
      const simDirect = levenshteinSimilarity(o, dbNorm);
      const simNoComma = levenshteinSimilarity(
        o.replace(/,/g, " ").replace(/\s+/g, " "),
        dbNorm.replace(/,/g, " ").replace(/\s+/g, " ")
      );
      
      const simDirectRaw = levenshteinSimilarity(normNameMatch(ocrName), dbNorm);
      const simNoCommaRaw = levenshteinSimilarity(
        normNameMatch(ocrName).replace(/,/g, " ").replace(/\s+/g, " "),
        dbNorm.replace(/,/g, " ").replace(/\s+/g, " ")
      );
      
      const score = Math.max(simDirect, simNoComma, simDirectRaw, simNoCommaRaw);
      return { student: s, score };
    })
    .filter((c) => c.score >= 0.70)
    .sort((a, b) => b.score - a.score);

  if (fuzzyCandidates.length > 0) {
    // Return all matching students above 70% sorted by score (for quality autocomplete)
    return fuzzyCandidates.map((c) => c.student);
  }

  return [];
}

export function findStudentsInText(rawText, students) {
  if (!rawText || !Array.isArray(students)) return [];
  const hay = up(rawText).replace(/\s+/g, " ");

  // Tokenize the whole OCR raw text into clean uppercase alphanumeric words
  const ocrTokens = up(rawText)
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const matches = [];
  for (const s of students) {
    const name = up(s?.name || s?.Name || "").replace(/\s+/g, " ").trim();
    if (name.length < 5) continue;

    // 1. Direct sub-string match check (ultra-fast exact match)
    if (hay.includes(name)) { matches.push(s); continue; }

    // Without comma  "DELA CRUZ MARIA" vs "DELA CRUZ, MARIA"
    const noComma = name.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (noComma !== name && hay.includes(noComma)) { matches.push(s); continue; }

    // 2. Reversed exact check
    if (name.includes(",")) {
      const [last, first] = name.split(",").map((x) => x.trim());
      if (first && last && hay.includes(`${first} ${last}`)) { matches.push(s); continue; }
      
      const firstStripped = stripMiddleInitial(lo(first)).toUpperCase();
      if (firstStripped && last && hay.includes(`${firstStripped} ${last}`)) {
        matches.push(s);
        continue;
      }
    }

    // 3. Robust token-based fuzzy/typo-tolerant matching
    // Extract tokens from the DB name (ignoring commas and single-letter initials)
    const dbTokens = name
      .replace(/[^A-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (dbTokens.length >= 2) {
      const matchedTokensCount = dbTokens.filter((dt) =>
        ocrTokens.some((ot) => ot === dt || levenshteinSimilarity(dt, ot) >= 0.75)
      ).length;

      const matchRatio = matchedTokensCount / dbTokens.length;
      if (matchRatio >= 0.75) {
        matches.push(s);
      }
    }
  }
  return matches;
}

// ─── 7. NLP FALLBACK (compromise.js) ────────────────────────────────────────

async function loadNlp() {
  if (typeof window === "undefined") return null;
  if (window.nlp) return window.nlp;
  if (!_nlpPromise) {
    _nlpPromise = new Promise((resolve) => {
      const el = document.createElement("script");
      el.src = "/compromise.min.js";
      el.onload = () => resolve(window.nlp);
      el.onerror = () => resolve(null);
      document.head.appendChild(el);
    });
  }
  return _nlpPromise;
}

// ─── 8. MAIN ENTRY POINT ───────────────────────────────────────────────────

export async function scanPdfForSuggestion(payload) {
  return scanFileForSuggestion(payload);
}

export async function scanFileForSuggestion({ file, students, docTypes, rotation = 0 }) {
  if (!file) throw new Error("Missing file");

  const mime = lo(file?.type);
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(file?.name ?? "");
  const isImg = mime.startsWith("image/");
  if (!isPdf && !isImg) throw new Error("Unsupported file type");

  // ── Extract raw text ──
  let rawText = "";
  let usedNative = false;
  let ocrErrorMsg = "";
  // ocrEngine is returned by the server so detectName() picks the correct layout
  // strategy without sniffing navigator.userAgent (client OS !== server OS).
  let ocrEngine = "unknown";

  try {
    const formPayload = new FormData();
    formPayload.append("file", file);
    const res = await fetch("/api/ingest/ocr", {
      method: "POST",
      body: formPayload,
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && typeof data?.text === "string") {
      rawText = data.text;
      usedNative = true;
      ocrEngine = data?.engine ?? "unknown";
      console.log(`[OCR] Platform-native offline OCR complete (engine: ${ocrEngine})`);
    } else {
      ocrErrorMsg = data?.error || `Server returned status ${res.status}`;
    }
  } catch (e) {
    ocrErrorMsg = e.message || String(e);
    console.warn("[OCR] Platform-native offline OCR endpoint failed:", e);
  }

  if (!usedNative) {
    throw new Error(
      `Native offline OCR extraction failed.\n` +
      `Details: ${ocrErrorMsg}\n\n` +
      `Please ensure the native OCR binaries are compiled inside next-app/bin/:\n` +
      `- For macOS: swiftc -O scripts/apple-vision-ocr/ocr.swift -o bin/apple-vision-ocr\n` +
      `- For Windows: Run scripts\\windows-media-ocr\\build.bat (requires .NET 8.0+ SDK)`
    );
  }

  console.log("=== OCR RAW TEXT ===\n" + rawText + "\n====================");

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => norm(l))
    .filter(Boolean);

  // ── Detect doc type ──
  const docType = detectDocType(rawText, docTypes);

  // ── Detect student number ──
  const extractedStudentNo = detectStudentNo(rawText);
  let matchedStudent = null;
  let nameMatchesByName = [];

  if (extractedStudentNo && Array.isArray(students)) {
    matchedStudent = students.find((s) => {
      const dbNo = String(s?.studentNo || s?.student_no || "").trim().toUpperCase();
      return dbNo === extractedStudentNo;
    });
    if (matchedStudent) {
      nameMatchesByName = [matchedStudent];
    }
  }

  // ── Load NLP engine if available ──
  const nlp = await loadNlp().catch(() => null);

  const rawExtracted = matchedStudent ? "" : detectName(lines, { engine: ocrEngine, nlp });

  // ── Detect name (fallback when student number did not match) ──
  if (!matchedStudent) {
    if (rawExtracted && Array.isArray(students)) {
      nameMatchesByName = findStudentsByOcrName(rawExtracted, students);
    }
    if ((!nameMatchesByName || nameMatchesByName.length === 0) && Array.isArray(students)) {
      nameMatchesByName = findStudentsInText(rawText, students);
    }
    matchedStudent = nameMatchesByName.length === 1 ? nameMatchesByName[0] : null;
  }

  // ── Build final suggested name ──
  let suggestedName = "";
  if (matchedStudent) {
    suggestedName = up(matchedStudent.name || matchedStudent.Name || "").trim();
  } else if (rawExtracted) {
    suggestedName = formatToLNFnMi(rawExtracted);
  }

  const nameComponents = splitNameComponents(suggestedName);

  return {
    name: suggestedName,
    firstName: nameComponents.firstName,
    middleName: nameComponents.middleName,
    lastName: nameComponents.lastName,
    docType,
    matchedStudent,
    nameMatchesByName,
    ocrTextPreview: rawText.slice(0, 2000),
    ocrLinesPreview: lines.slice(0, 18),
  };
}

