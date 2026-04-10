let workerPromise = null;
let langChecked = false;

let nlpPromise = null;
async function loadNlp() {
  if (typeof window === "undefined") return null;
  if (window.nlp) return window.nlp;
  if (!nlpPromise) {
    nlpPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/compromise.min.js";
      script.onload = () => resolve(window.nlp);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return nlpPromise;
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLoose(value) {
  return normalizeText(value).toLowerCase();
}

function makeUpperSafe(value) {
  return String(value || "").toUpperCase();
}

/**
 * Normalize any extracted name into ALL-CAPS "LASTNAME, FIRSTNAME MI." format.
 * Handles:
 *  - Already-formatted: "DELA CRUZ, MARIA CLARA" → unchanged
 *  - First-name-first (PSA, cert):  "LUIS ESPINOSA TORRES" → "TORRES, LUIS ESPINOSA"
 *  - Title-prefixed (Good Moral): "Ms. MARICAR D. REYES" → "REYES, MARICAR D."
 *  - Filipino surname particles:  "JUAN DE LA CRUZ" → "DE LA CRUZ, JUAN"
 */
const _TITLE_STRIP = /^\b(?:MS|MR|MRS|MISS|DR|ENGR|ATTY|PROF|HON|REV)\.?\s+/i;
const _PARTICLES = new Set([
  "DE", "DEL", "DELA", "DA", "DI", "LA", "LAS", "LOS",
  "SAN", "SANTA", "SANTO", "VON", "VAN",
]);

export function normalizeExtractedName(raw) {
  if (!raw) return "";
  // Strip title prefix and uppercase
  let s = String(raw).trim().replace(_TITLE_STRIP, "").trim().toUpperCase();
  // Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return "";

  // Already in LASTNAME, FIRSTNAME order — just clean and return.
  if (s.includes(",")) {
    const commaIdx = s.indexOf(",");
    const lastName = s.slice(0, commaIdx).trim();
    const firstName = s.slice(commaIdx + 1).trim();
    if (lastName && firstName) return `${lastName}, ${firstName}`;
    return lastName || firstName;
  }

  // No comma — detect surname (last word, with optional preceding particles).
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0];
  if (words.length < 2) return s;

  // Walk backwards to find where the surname starts (last surname particle + last word).
  let surnameStart = words.length - 1;
  // Check up to 2 preceding words for known surname particles.
  if (surnameStart >= 1 && _PARTICLES.has(words[surnameStart - 1])) {
    surnameStart--;
    // e.g. "DE LA CRUZ" — also consume an extra preceding particle
    if (surnameStart >= 1 && _PARTICLES.has(words[surnameStart - 1])) {
      surnameStart--;
    }
  }

  const surname = words.slice(surnameStart).join(" ");
  const givenNames = words.slice(0, surnameStart).join(" ");
  if (!givenNames) return surname;
  return `${surname}, ${givenNames}`;
}

function detectName(lines) {
  const blacklist = [
    "SECONDARY",
    "PERMANENT",
    "RECORD",
    "FORM",
    "STUDENT NO",
    "STUDENT",
    "ACADEMIC",
    "REGISTRAR",
    "REPUBLIC",
    "DEPARTMENT",
    "MINISTRY",
    "OFFICE",
    "PHILIPPINES",
    "STATISTICS",
    "AUTHORITY",
    "CERTIFICATE",
    "BIRTH",
    "ATTENDING",
    "PHYSICIAN",
    "INFORMANT",
    "SIGNATURE",
    "CIVIL",
    "CHURCH",
    "PROVINCE",
    "MUNICIPALITY",
    "MOTHER",
    "FATHER",
    "CHILD",
  ];

  const isBlacklisted = (upper) =>
    blacklist.some((b) => upper.includes(b));

  /**
   * Strip trailing numbered-field suffixes that PSA/DepEd forms pack on the same line.
   * e.g. "LUIS ESPINOSA TORRES 2. Sex: MALE" → "LUIS ESPINOSA TORRES"
   */
  const stripTrailingFields = (raw) => {
    return raw
      // Remove anything after a numbered label like "2." or "2)" mid-string
      .replace(/\s+\d+[.)][\s\S]*/g, "")
      // Remove anything after known field keywords: Sex, Date, Birth Order, etc.
      .replace(
        /\s+\b(SEX|DATE|DOB|BIRTH\s*ORDER|WEIGHT|PLACE|RELIGION|OCCUPATION|CITIZENSHIP|NATIONALITY|TYPE\s*OF\s*BIRTH|MULTIPLE)\b[\s\S]*/gi,
        ""
      )
      .trim();
  };

  const extractFromSurnameLine = (line) => {
    const raw = String(line || "");
    const upper = makeUpperSafe(raw);

    // DepEd Form 137-A often has something like:
    // "Surname _ DELA CRUZ MARIA CLARA Date of Birth: ..."
    // OCR may render Surname as "Sumame", underscores, or missing punctuation.
    const m = upper.match(
      /\b(SURNAME|SUMAME|SURNAMF|SURNANE)\b[\s:_-]*([A-Z][A-Z '.-]{4,}?)(?=\bDATE\s+OF\s+BIRTH\b|\bSEX\b|$)/
    );
    if (!m?.[2]) return "";
    const candidate = normalizeText(m[2]);
    const candidateUpper = makeUpperSafe(candidate);
    if (!candidateUpper) return "";
    if (isBlacklisted(candidateUpper)) return "";
    if (/[0-9]/.test(candidateUpper)) return "";

    // Try to format as "SURNAME, GIVEN NAMES" if we can infer a surname chunk.
    const parts = candidateUpper.split(/\s+/g).filter(Boolean);
    if (parts.length >= 2) {
      // Heuristic for common PH surname particles
      const particles = new Set(["DE", "DEL", "DELA", "DELLA", "DA", "DI", "VON", "VAN"]);
      let surnameEnd = 0;
      // If it starts with particles, include the next token as part of surname.
      if (particles.has(parts[0]) && parts.length >= 3) {
        surnameEnd = 1; // include particle + next token
      } else {
        surnameEnd = 0; // first token as surname
      }
      const surname = parts.slice(0, surnameEnd + 1).join(" ");
      const given = parts.slice(surnameEnd + 1).join(" ");
      if (given) return `${surname}, ${given}`;
    }

    return candidateUpper;
  };

  const isLikelyName = (candidateUpper, originalLine) => {
    const upper = candidateUpper.trim();
    if (upper.length < 4 || upper.length > 60) return false;
    if (/[0-9]/.test(upper)) return false;
    if (isBlacklisted(upper)) return false;

    // Avoid grabbing label text like "NAME" or "STUDENT NAME" alone.
    if (/^(STUDENT\s*NAME|NAME)$/.test(upper)) return false;

    // Each word must be at least 2 characters (reject "To Li" type garbage)
    const words = upper.split(/\s+/g).filter(Boolean);
    if (words.length < 2) return false;
    if (words.some((w) => w.length < 2 && !/^[A-Z]\.?$/i.test(w))) return false;
    // No word should be longer than 20 chars (not a realistic name word)
    if (words.some((w) => w.length > 20)) return false;

    const hasComma = upper.includes(",");
    if (hasComma) {
      // e.g. LASTNAME, FIRSTNAME
      return /^[A-Z .,'-]+,\s*[A-Z .,'-]+$/.test(upper);
    }

    // Prefer 2+ words (first/last or compound).
    return words.length >= 2;
  };

  /**
   * Extracts name from certification-style sentences.
   * Handles: "This is to certify that Ms. MARICAR D. REYES (Learner Reference Number: ...)"
   * Also plain title-prefix in any line: "Ms. MARICAR D. REYES"
   */
  const TITLE_PREFIXES = "Ms|Mr|Mrs|Miss|Dr|Engr|Atty|Prof|Hon|Rev";
  const TITLE_RE = new RegExp(
    `\\b(?:${TITLE_PREFIXES})\\.?\\s+([A-Z][A-Z][A-Z .'-]*)`,
    "i"
  );

  const extractFromCertifyPhrase = (rawText) => {
    // Priority: "certify/certifies that [Title?] NAME" patterns (certificate documents)
    const certifyRe = new RegExp(
      `\\bcertif(?:y|ies|ied)\\s+that\\s+(?:(?:${TITLE_PREFIXES})\\.?\\s+)?([A-Z][A-Z][A-Z .'-]{3,})`,
      "i"
    );
    const mc = rawText.match(certifyRe);
    if (mc?.[1]) {
      // Strip trailing parenthetical like "(Learner Reference Number: ...)"
      const raw = mc[1].replace(/\s*[\(\[].*/, "").trim();
      const upper = makeUpperSafe(raw);
      if (upper && isLikelyName(upper, raw)) return raw;
    }
    return "";
  };

  const extractFromTitlePrefix = (line) => {
    const m = line.match(TITLE_RE);
    if (!m?.[1]) return "";
    // Strip anything after parenthetical or comma-separated role
    const raw = m[1]
      .replace(/\s*[\(\[].*/, "")    // strip "(LRN: ...)"
      .replace(/\s*,.*/, "")         // strip ", Guidance Counselor" etc
      .trim();
    const upper = makeUpperSafe(raw);
    if (!upper || !isLikelyName(upper, line)) return "";
    // Reject signatories that are known to appear at the bottom (Guidance / Principal / President)
    const lowerLine = line.toLowerCase();
    if (/(guidance|counselor|principal|registrar|dean|superintendent|president|director|chancellor|chairperson)/i.test(lowerLine)) return "";
    return raw;
  };

  // ======= DOCUMENT STRATEGY ROUTER =======
  const fullText = lines.join(" ");
  const lowerText = fullText.toLowerCase();

  let category = "UNKNOWN";
  if (
    /(diploma|conferred)/i.test(lowerText) ||
    (/certifies\s+that/i.test(lowerText) && /awarded\s+the\s+degree\s+of/i.test(lowerText))
  ) {
    category = "DIPLOMA";
  } else if (/(certif(?:y|ies|ied)\s+that|certificate of enrollment|good moral|certification)/i.test(lowerText)) {
    category = "CERTIFICATION";
  } else if (/(form 137|sf\s?10|permanent record)/i.test(lowerText)) {
    category = "FORM137";
  } else if (/(transcript of record|official transcript|transcript of academic)/i.test(lowerText)) {
    category = "TRANSCRIPT";
  } else if (/(certificate of live birth|registry no\.?)/i.test(lowerText)) {
    category = "PSA_BIRTH";
  }

  // --- STRATEGY 1: DIPLOMA ---
  if (category === "DIPLOMA") {
    // Pattern A: Grab the uppercase block immediately following "certifies that"
    const m = fullText.match(/certifies\s+that\s+([A-Z][A-Z .,'-]{3,})/i);
    if (m?.[1]) {
      const candidate = makeUpperSafe(m[1].trim());
      if (isLikelyName(candidate, fullText)) return candidate;
    }
    // Pattern B: The line directly below "certifies that" is almost always the name
    for (let i = 0; i < lines.length - 1; i++) {
      if (/certifies\s+that/i.test(lines[i])) {
        const nextLineRaw = lines[i+1].trim();
        const nextLine = makeUpperSafe(nextLineRaw);
        if (isLikelyName(nextLine, nextLineRaw)) return nextLineRaw;
      }
    }
  }

  // --- STRATEGY 2: CERTIFICATION (Enrollment / Good Moral) ---
  if (category === "CERTIFICATION") {
    // Uses the certified phrase parser that expects Title format.
    const certifyCandidate = extractFromCertifyPhrase(fullText);
    if (certifyCandidate) return certifyCandidate;
  }

  // --- STRATEGY 3: STRUCTURED FORMS (Form 137, PSA, Transcript, Unknown) ---
  // Look for label-based patterns: "1. Name: LUIS ESPINOSA TORRES 2. Sex: ..."
  // Or DepEd Surname field, or any NAME: label.
  for (let i = 0; i < lines.length; i += 1) {
    const originalLine = String(lines[i] || "");
    const line = originalLine.trim();
    const upper = makeUpperSafe(line);

    // Special-case DepEd Form 137-A block patterns.
    const surnameCandidate = extractFromSurnameLine(line);
    if (surnameCandidate) return surnameCandidate;

    if (!/\bNAME\b/i.test(upper)) continue;
    if (!/[:\-]/.test(line)) continue;

    const parts = line.split(/[:\-]/);
    // Strip trailing same-line fields (e.g. "2. Sex: MALE" attached to PSA name line)
    const rawCandidate = normalizeText(parts.slice(1).join(" "));
    const cleaned = stripTrailingFields(rawCandidate);
    const candidateUpper = makeUpperSafe(cleaned);
    if (candidateUpper && isLikelyName(candidateUpper, line)) return cleaned;
  }

  // --- GENERIC FALLBACK: STANDALONE TITLES ---
  // Find "Ms. / Mr. / Dr. / Engr." followed by an uppercase name. Skips signatory lines.
  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || "").trim();
    const titleCandidate = extractFromTitlePrefix(line);
    if (titleCandidate) return titleCandidate;
  }

  return "";
}


function normalizeNameForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[.,'\u2019`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find all students whose stored name matches the OCR name (normalized equality).
 * Used when student number is missing or does not match, to detect existing records.
 */
export function findStudentsByOcrName(ocrName, students) {
  if (!ocrName || !Array.isArray(students)) return [];
  const o = normalizeNameForMatch(ocrName);
  if (o.length < 2) return [];
  const matches = [];
  for (const s of students) {
    const n = normalizeNameForMatch(s?.name || s?.Name || "");
    if (!n) continue;
    if (n === o) matches.push(s);
  }
  return matches;
}

function normalizeForFuzzy(str) {
  return String(str || "")
    .toUpperCase()
    .replace(/[ .,'\u2019`-]/g, "")
    .replace(/[1I]/g, "I")
    .replace(/[0O]/g, "O")
    .replace(/[5S]/g, "S")
    .replace(/[8B]/g, "B");
}

export function findStudentsInText(rawText, students) {
  if (!rawText || !Array.isArray(students)) return [];
  const txt = normalizeForFuzzy(rawText);
  if (!txt) return [];

  const matches = [];
  for (const s of students) {
    const sName = normalizeForFuzzy(s?.name || s?.Name);
    if (!sName || sName.length < 5) continue;
    if (txt.includes(sName)) {
      matches.push(s);
    }
  }
  return matches;
}

function detectDocType(rawText, docTypes) {
  const hay = normalizeLoose(rawText);
  if (!hay || !Array.isArray(docTypes)) return "";

  // Special case: Map "Certificate of Live Birth" / "Live Birth" to "Birth Certificate"
  if (hay.includes("live birth")) {
    const bcType = docTypes.find(
      (t) =>
        normalizeLoose(t) === "birth certificate" ||
        normalizeLoose(t).includes("birth cert")
    );
    if (bcType) return bcType;
  }

  const withScores = docTypes
    .map((type) => {
      const t = normalizeLoose(type);
      if (!t) return { type, score: 0 };
      if (hay.includes(t)) return { type, score: t.length + 1000 };
      const words = t.split(" ").filter(Boolean);
      const hitCount = words.filter((w) => hay.includes(w)).length;
      return { type, score: hitCount > 0 ? hitCount : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return withScores[0]?.type || "";
}

async function getPdfTextFromFirstPage(file, worker) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  const bytes = new Uint8Array(await file.arrayBuffer());

  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    disableStream: true,
    disableRange: true,
    disableAutoFetch: true,
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.75 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas initialization failed");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvasContext: context, viewport }).promise;

  const result = await worker.recognize(canvas);
  const text = String(result?.data?.text || "");
  return text;
}

async function getImageText(file, worker) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas initialization failed");
  canvas.width = Math.max(1, bitmap.width);
  canvas.height = Math.max(1, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  const result = await worker.recognize(canvas);
  const text = String(result?.data?.text || "");
  return text;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      if (!langChecked) {
        const langRes = await fetch("/tesseract/eng.traineddata.gz", {
          method: "HEAD",
          cache: "no-store",
        }).catch(() => null);
        langChecked = true;
        if (!langRes || !langRes.ok) {
          throw new Error(
            "Missing OCR language file: /public/tesseract/eng.traineddata.gz"
          );
        }
      }

      const Tesseract = await import("tesseract.js");

      // Some Tesseract.js builds still rely on GlobalWorkerOptions.workerSrc.
      // Setting it prevents: "No GlobalWorkerOptions.workerSrc specified."
      if (Tesseract?.GlobalWorkerOptions) {
        Tesseract.GlobalWorkerOptions.workerSrc = "/tesseract/worker.min.js";
      }

      const worker = await Tesseract.createWorker("eng", 1, {
        workerPath: "/tesseract/worker.min.js",
        // corePath should be the directory containing the core wasm js files.
        corePath: "/tesseract",
        langPath: "/tesseract",
      });

      await worker.setParameters({
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      });

      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

export async function warmupOcrWorker() {
  await getWorker();
}

export async function scanPdfForSuggestion({ file, students, docTypes }) {
  return scanFileForSuggestion({ file, students, docTypes });
}

export async function scanFileForSuggestion({ file, students, docTypes }) {
  if (!file) throw new Error("Missing file");
  const worker = await getWorker();
  const mimeType = String(file?.type || "").toLowerCase();
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(String(file?.name || ""));
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) throw new Error("Unsupported file for OCR");
  const text = isPdf ? await getPdfTextFromFirstPage(file, worker) : await getImageText(file, worker);
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const ocrTextPreview = text.slice(0, 2000);
  const ocrLinesPreview = lines.slice(0, 18);

  const name = detectName(lines);
  const docType = detectDocType(text, docTypes);

  let nameMatchesByName =
    name && Array.isArray(students) ? findStudentsByOcrName(name, students) : [];

  // If no name extracted structurally, try reverse raw text fuzzy matching.
  if (nameMatchesByName.length === 0 && Array.isArray(students)) {
    const fuzzyMatches = findStudentsInText(text, students);
    if (fuzzyMatches.length > 0) {
      nameMatchesByName = fuzzyMatches;
    }
  }

  const matchedStudent =
    nameMatchesByName.length === 1 ? nameMatchesByName[0] : null;

  let suggestedName = matchedStudent
    // DB match — already stored as LASTNAME, FIRSTNAME; just ensure uppercase.
    ? String(matchedStudent.name || matchedStudent.Name || name || "").toUpperCase().trim()
    // Structural OCR raw name — normalize to LASTNAME, FIRSTNAME MI.
    : normalizeExtractedName(name);

  // STRATEGY A: NLP Fallback for new students (Zero dependency/Offline)
  if (!suggestedName) {
    try {
      const nlp = await loadNlp();
      if (nlp) {
        // Run NLP over raw text to find grammatically viable person names
        const doc = nlp(text);
        const people = doc.people().out('array');
        if (people && people.length > 0) {
          // Filter: every person name must be at least 2 words, each word ≥ 2 chars
          // This prevents fragments like "To Li" from being accepted
          const validPeople = people.filter((p) => {
            const words = String(p || "").trim().split(/\s+/).filter(Boolean);
            if (words.length < 2) return false;
            // Reject words strictly < 2 chars UNLESS they are a middle initial like "A" or "A."
            if (words.some((w) => w.length < 2 && !/^[a-zA-Z]\.?$/.test(w))) return false;
            // Reject if any word starts with punctuation or number
            if (words.some((w) => /^[^a-zA-Z]/.test(w))) return false;
            return true;
          });
          if (validPeople.length > 0) {
            // Also normalize the NLP-extracted name.
            suggestedName = normalizeExtractedName(validPeople[0]);
          }
        }
      }
    } catch (err) {
      console.warn("NLP extraction failed:", err);
    }
  }

  return {
    name: suggestedName,
    docType,
    matchedStudent,
    nameMatchesByName,
    ocrTextPreview,
    ocrLinesPreview,
  };
}
