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
let _workerPromise = null;
let _langOk = false;
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

// ─── 1. TESSERACT WORKER ───────────────────────────────────────────────────

async function getWorker() {
  if (_workerPromise) return _workerPromise;

  _workerPromise = (async () => {
    // One-time check that the language data is served
    if (!_langOk) {
      const r = await fetch("/tesseract/eng.traineddata.gz", {
        method: "HEAD",
        cache: "no-store",
      }).catch(() => null);
      if (!r?.ok) throw new Error("Missing /tesseract/eng.traineddata.gz");
      _langOk = true;
    }

    const Tesseract = await import("tesseract.js");
    if (Tesseract?.GlobalWorkerOptions) {
      Tesseract.GlobalWorkerOptions.workerSrc = "/tesseract/worker.min.js";
    }

    const worker = await Tesseract.createWorker("eng", 1, {
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract",
      langPath: "/tesseract",
    });
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
    });
    return worker;
  })().catch((e) => {
    _workerPromise = null;
    throw e;
  });

  return _workerPromise;
}

export async function warmupOcrWorker() {
  await getWorker();
}

// ─── 2. TEXT EXTRACTION (PDF / Image → string) ─────────────────────────────

async function ocrFromPdf(file, worker) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    disableStream: true,
    disableRange: true,
    disableAutoFetch: true,
    disableWorker: true,
  }).promise;

  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1.75 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas init failed");
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  return String((await worker.recognize(canvas))?.data?.text ?? "");
}

async function ocrFromImage(file, worker) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas init failed");
  canvas.width = Math.max(1, bmp.width);
  canvas.height = Math.max(1, bmp.height);
  ctx.drawImage(bmp, 0, 0);
  return String((await worker.recognize(canvas))?.data?.text ?? "");
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

  /* eslint-disable-next-line no-console */
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
  "EDUCATION", "UNIVERSITY", "POLYTECHNIC",
]);

function isPlausibleName(s) {
  const u = up(s).trim();
  if (u.length < 4 || u.length > 60) return false;
  if (/\d/.test(u)) return false;
  for (const b of BLACKLIST) if (u.includes(b)) return false;
  if (/^(NAME|STUDENT\s*NAME)$/i.test(u)) return false;

  const words = u.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  if (words.some((w) => w.length < 2 && !/^[A-Z]\.?$/.test(w))) return false;
  if (words.some((w) => w.length > 20)) return false;
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

function detectName(lines) {
  const full = lines.join(" ");

  // ── Strategy 1: "certify / certifies / certified that [Title] NAME" ──
  {
    const m = full.match(
      /\bcertif(?:y|ies|ied)\s+that\s+(?:(?:Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev)\.?\s+)?([A-Z][A-Za-z .,''-]{3,}?)(?=\s+(?:has|is|having|was|of|a\s+bona|a\s+student|,?\s*(?:with|born|student))|[.(]|$)/i
    );
    if (m?.[1]) {
      const c = m[1].replace(/\s*[(\[].*/, "").trim();
      if (isPlausibleName(c)) return c;
    }
  }

  // ── Strategy 2: "conferred upon / awarded to NAME" ──
  {
    const m = full.match(
      /(?:conferred\s+upon|awarded\s+to)\s+([A-Z][A-Za-z .,''-]{3,})/i
    );
    if (m?.[1]) {
      const c = m[1].replace(/\s*[(\[].*/, "").trim();
      if (isPlausibleName(c)) return c;
    }
  }

  // ── Strategy 3: line-by-line label scan ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const upper = up(line);

    // 3a — DepEd surname field
    {
      const m = upper.match(
        /\b(?:SURNAME|SUMAME|SURNAMF|SURNANE)\b[\s:_-]*([A-Z][A-Z '.–-]{4,}?)(?=\bDATE\s+OF\s+BIRTH\b|\bSEX\b|$)/
      );
      if (m?.[1]) {
        const c = norm(m[1]);
        if (c && isPlausibleName(c)) return c;
      }
    }

    // 3b — "NAME:" / "STUDENT NAME:" / "NAME OF STUDENT:" label
    if (/\bNAME\b/i.test(upper)) {
      // Same-line value after colon / dash
      const colonM = line.match(/\bNAME\b[^:–-]*[:–-]\s*(.*)/i);
      if (colonM?.[1]) {
        const c = stripTrailing(norm(colonM[1]));
        if (c && isPlausibleName(c)) return c;
      }
      // Value on the NEXT line (common in scanned forms)
      if (i + 1 < lines.length) {
        const next = stripTrailing(norm(lines[i + 1]));
        if (next && isPlausibleName(next) && !/^(NAME|STUDENT)/i.test(next)) return next;
      }
    }
  }

  // ── Strategy 4: first stand-alone Title-prefix line that isn't a signatory ──
  for (const line of lines) {
    const t = line.trim();
    const m = t.match(
      /\b(?:Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev)\.?\s+([A-Z][A-Z][A-Z .,''-]*)/i
    );
    if (m?.[1]) {
      const raw = m[1].replace(/\s*[(\[].*/, "").replace(/\s*,.*/, "").trim();
      if (!isPlausibleName(raw)) continue;
      // skip signatories
      if (/(guidance|counselor|principal|registrar|dean|president|director|chairperson)/i.test(t)) continue;
      return raw;
    }
  }

  // ── Strategy 5: raw ALL-CAPS "LASTNAME, FIRSTNAME" line ──
  for (const line of lines) {
    const t = line.trim();
    if (/^[A-Z\s.'-]+,\s*[A-Z\s.'-]+$/.test(t) && t === up(t)) {
      if (isPlausibleName(t)) return t;
    }
  }

  return "";
}

// ─── 5. NAME NORMALISATION → "LASTNAME, FIRSTNAME MI." ─────────────────────

const PARTICLES = new Set([
  "DE", "DEL", "DELA", "DA", "DI", "LA", "LAS", "LOS",
  "SAN", "SANTA", "SANTO", "VON", "VAN",
]);

export function normalizeExtractedName(raw) {
  if (!raw) return "";
  let s = up(raw).replace(TITLE_PREFIX_RE, "").replace(/\s+/g, " ").trim();
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

// ─── 6. STUDENT MATCHING ────────────────────────────────────────────────────

function normNameMatch(v) {
  return lo(v).replace(/[.,''\u2019`]/g, " ").replace(/\s+/g, " ").trim();
}

export function findStudentsByOcrName(ocrName, students) {
  if (!ocrName || !Array.isArray(students)) return [];
  const o = normNameMatch(ocrName);
  if (o.length < 2) return [];
  return students.filter((s) => normNameMatch(s?.name || s?.Name || "") === o);
}

export function findStudentsInText(rawText, students) {
  if (!rawText || !Array.isArray(students)) return [];
  const hay = up(rawText).replace(/\s+/g, " ");

  const matches = [];
  for (const s of students) {
    const name = up(s?.name || s?.Name || "").replace(/\s+/g, " ").trim();
    if (name.length < 5) continue;

    // Direct match
    if (hay.includes(name)) { matches.push(s); continue; }

    // Without comma  "DELA CRUZ MARIA" vs "DELA CRUZ, MARIA"
    const noComma = name.replace(/,/g, " ").replace(/\s+/g, " ").trim();
    if (noComma !== name && hay.includes(noComma)) { matches.push(s); continue; }

    // Reversed: "FIRSTNAME LASTNAME" ↔ "LASTNAME, FIRSTNAME"
    if (name.includes(",")) {
      const [last, first] = name.split(",").map((x) => x.trim());
      if (first && last && hay.includes(`${first} ${last}`)) { matches.push(s); continue; }
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

export async function scanFileForSuggestion({ file, students, docTypes }) {
  if (!file) throw new Error("Missing file");

  const worker = await getWorker();
  const mime = lo(file?.type);
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(file?.name ?? "");
  const isImg = mime.startsWith("image/");
  if (!isPdf && !isImg) throw new Error("Unsupported file type");

  // ── Extract raw text ──
  const rawText = isPdf ? await ocrFromPdf(file, worker) : await ocrFromImage(file, worker);

  /* eslint-disable-next-line no-console */
  console.log("=== OCR RAW TEXT ===\n" + rawText + "\n====================");

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => norm(l))
    .filter(Boolean);

  // ── Detect doc type ──
  const docType = detectDocType(rawText, docTypes);

  // ── Detect name ──
  const extractedName = detectName(lines);

  // ── Match against student roster ──
  let nameMatchesByName =
    extractedName && Array.isArray(students)
      ? findStudentsByOcrName(extractedName, students)
      : [];

  // Fallback: full-text fuzzy scan
  if (nameMatchesByName.length === 0 && Array.isArray(students)) {
    const fuzzy = findStudentsInText(rawText, students);
    if (fuzzy.length > 0) nameMatchesByName = fuzzy;
  }

  const matchedStudent = nameMatchesByName.length === 1 ? nameMatchesByName[0] : null;

  // ── Build final suggested name ──
  let suggestedName = matchedStudent
    ? up(matchedStudent.name || matchedStudent.Name || extractedName || "").trim()
    : normalizeExtractedName(extractedName);

  // ── NLP fallback if still blank ──
  if (!suggestedName) {
    try {
      const nlp = await loadNlp();
      if (nlp) {
        const people = nlp(rawText).people().out("array");
        const valid = (people || []).filter((p) => {
          const w = String(p || "").trim().split(/\s+/).filter(Boolean);
          if (w.length < 2) return false;
          if (w.some((x) => x.length < 2 && !/^[a-zA-Z]\.?$/.test(x))) return false;
          if (w.some((x) => /^[^a-zA-Z]/.test(x))) return false;
          return true;
        });
        if (valid.length > 0) suggestedName = normalizeExtractedName(valid[0]);
      }
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.warn("[OCR] NLP fallback failed:", e);
    }
  }

  return {
    name: suggestedName,
    docType,
    matchedStudent,
    nameMatchesByName,
    ocrTextPreview: rawText.slice(0, 2000),
    ocrLinesPreview: lines.slice(0, 18),
  };
}
