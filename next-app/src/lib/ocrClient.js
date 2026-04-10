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
  ];

  const isBlacklisted = (upper) =>
    blacklist.some((b) => upper.includes(b));

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
    if (upper.length < 6 || upper.length > 55) return false;
    if (/[0-9]/.test(upper)) return false;
    if (isBlacklisted(upper)) return false;

    // Avoid grabbing label text like "NAME" or "STUDENT NAME".
    if (/\b(STUDENT\s*NAME|NAME)\b/i.test(originalLine)) return false;

    const hasComma = upper.includes(",");
    if (hasComma) {
      // e.g. LASTNAME, FIRSTNAME
      return /^[A-Z .,'-]+,\s*[A-Z .,'-]+$/.test(upper);
    }

    const words = upper
      .split(/\s+/g)
      .filter(Boolean);

    // Prefer 2+ words (first/last or compound).
    return words.length >= 2;
  };

  // 1) Prefer lines that contain an explicit delimiter after NAME.
  for (let i = 0; i < lines.length; i += 1) {
    const originalLine = String(lines[i] || "");
    const line = originalLine.trim();
    const upper = makeUpperSafe(line);

    // Special-case DepEd Form patterns that explicitly carry the name after "Surname".
    const surnameCandidate = extractFromSurnameLine(line);
    if (surnameCandidate) return surnameCandidate;

    if (!/\bNAME\b/i.test(upper)) continue;
    if (!/[:\-]/.test(line)) continue;

    const parts = line.split(/[:\-]/);
    const candidate = normalizeText(parts.slice(1).join(" "));
    const candidateUpper = makeUpperSafe(candidate);
    if (candidateUpper && isLikelyName(candidateUpper, line)) return candidate;
  }

  // 2) Fallback removed to prevent garbage text detection.

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

  let suggestedName = matchedStudent ? (matchedStudent.name || matchedStudent.Name || name) : name;

  // STRATEGY A: NLP Fallback for new students (Zero dependency/Offline)
  if (!suggestedName) {
    try {
      const nlp = await loadNlp();
      if (nlp) {
        // Run NLP over raw text to find grammatically viable person names
        const doc = nlp(text);
        const people = doc.people().out('array');
        if (people && people.length > 0) {
          // Use the first valid grammatical person name
          suggestedName = people[0];
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
