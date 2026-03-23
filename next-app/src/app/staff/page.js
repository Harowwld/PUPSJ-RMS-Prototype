"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const sections = ["1-1", "1-2", "2-1", "2-1N", "3-1", "4-1"];
const courses = [
  { code: "BSIT", name: "BS Information Technology", icon: "ph-desktop" },
  { code: "BSCS", name: "BS Computer Science", icon: "ph-code" },
  { code: "BSCE", name: "BS Civil Engineering", icon: "ph-bridge" },
  { code: "BSARCH", name: "BS Architecture", icon: "ph-buildings" },
  { code: "BSBA", name: "BS Business Admin", icon: "ph-briefcase" },
  { code: "AB-POL", name: "AB Political Science", icon: "ph-gavel" },
];

const rooms = [1, 2];
const cabinets = ["A", "B", "C", "D"];

function formatStudentNoInput(raw) {
  return applyStudentNoMask(raw).value;
}

function applyStudentNoMask(raw) {
  const input = String(raw || "").toUpperCase();
  const cleaned = input.replace(/[^A-Z0-9]/g, "");

  let accepted = "";
  let invalid = false;

  for (const ch of cleaned) {
    const pos = accepted.length;
    if (pos < 4) {
      if (/[0-9]/.test(ch)) accepted += ch;
      else invalid = true;
      continue;
    }
    if (pos < 9) {
      if (/[0-9]/.test(ch)) accepted += ch;
      else invalid = true;
      continue;
    }
    if (pos < 11) {
      if (/[A-Z]/.test(ch)) accepted += ch;
      else invalid = true;
      continue;
    }
    if (pos < 12) {
      if (/[0-9]/.test(ch)) accepted += ch;
      else invalid = true;
      continue;
    }
    break;
  }

  const year = accepted.slice(0, 4);
  const serial = accepted.slice(4, 9);
  const campus = accepted.slice(9, 11);
  const tail = accepted.slice(11, 12);

  let out = year;
  if (year.length === 4) out += "-";
  if (serial.length) out += serial;
  if (serial.length === 5) out += "-";
  if (campus.length) out += campus;
  if (campus.length === 2) out += "-";
  if (tail.length) out += tail;

  return {
    value: out,
    invalid,
  };
}

function isValidStudentNo(studentNo) {
  return /^\d{4}-\d{5}-[A-Z]{2}-\d$/.test(String(studentNo || "").trim());
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => String(v).trim());
}

function normalizeHeaderKey(k) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function mapCsvRowToStudent(obj) {
  const studentNo = formatStudentNoInput(obj.studentno || obj.student_number || obj.studentid || "");
  const name = String(obj.name || obj.fullname || obj.studentname || "").trim();
  const courseCode = String(obj.course || obj.coursecode || obj.program || "").trim();
  const yearLevel = parseInt(obj.academicyear || obj.year || obj.yearlevel || "");
  const sectionRaw = String(obj.section || obj.sectionname || obj.sectionpart || "").trim();
  const section = sectionRaw ? (sectionRaw.toLowerCase().startsWith("section") ? sectionRaw : `Section ${sectionRaw}`) : "";
  const room = parseInt(obj.room || "1");
  const cabinet = String(obj.cabinet || "A").trim() || "A";
  const drawer = parseInt(obj.drawer || "1");
  const status = String(obj.status || "Active").trim() || "Active";
  return {
    studentNo,
    name,
    courseCode,
    yearLevel,
    section,
    room,
    cabinet,
    drawer,
    status,
  };
}

function validateStudentForCsv(s) {
  if (!s.studentNo || !s.name || !s.courseCode || !s.section) return "Missing required fields";
  if (!isValidStudentNo(s.studentNo)) return "Invalid studentNo format";
  if (!Number.isFinite(s.yearLevel) || s.yearLevel < 2000 || s.yearLevel > 2100) return "Invalid academic year";
  if (!Number.isFinite(s.room) || s.room < 1) return "Invalid room";
  if (!s.cabinet) return "Invalid cabinet";
  if (!Number.isFinite(s.drawer) || s.drawer < 1) return "Invalid drawer";
  return "";
}

function extractNameFromOcrText(text) {
  const t = String(text || "");
  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const labeled = lines.join("\n");

  function isProbablyNotAName(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return true;

    // Avoid returning field labels themselves (common OCR failure: "Given Name" -> "even Name").
    if (
      /^\(?\s*(?:sur\s*name|surname|last\s*name|family\s*name|first\s*name|given\s*name|middle\s*name|m\.?i\.?|mi)\s*\)?$/i.test(
        String(v || "").trim()
      )
    ) {
      return true;
    }
    if (/\b(?:given|last|first|middle|family)\s+name\b/i.test(s)) return true;
    if (/\b(?:even|iven)\s+name\b/i.test(s)) return true;
    if (/\bsurname\b/i.test(s)) return true;

    // Avoid accidentally returning other fields as the name.
    if (
      /\b(place\s*of\s*birth|province|town|barrio|municipality|city)\b/.test(s)
    ) {
      return true;
    }

    // Common form/document titles that OCR often sees near the top of the page.
    if (
      /\brepublic\s+of\s+the\s+philippines\b/.test(s) ||
      /\bdepartment\s+of\s+education\b/.test(s) ||
      /\bdeped\b/.test(s) ||
      /\bform\b/.test(s) ||
      /\b(form\s*137|137\s*-?\s*a)\b/.test(s) ||
      /\btranscript\b/.test(s) ||
      /\brecords\b/.test(s) ||
      /\bcertificate\b/.test(s) ||
      /\bdiploma\b/.test(s) ||
      /\bhonorable\b/.test(s) ||
      /\bgood\s+moral\b/.test(s)
    ) {
      return true;
    }

    return false;
  }

  function cleanNamePart(v) {
    return String(v || "")
      .replace(/\s+/g, " ")
      .replace(/[^A-Za-z.\-\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cutAtNextFieldLabel(raw) {
    const s = String(raw || "");
    if (!s) return "";

    // Stop once we hit other common field labels on DepEd forms.
    const stop = s.search(
      /\b(date\s*of\s*birth|place\s*of\s*birth|province|town|barrio|sex|female|male|year|month|day|civil|occupation|address|parent|guardian)\b/i
    );
    const trimmed = (stop >= 0 ? s.slice(0, stop) : s).trim();
    return trimmed;
  }

  function splitIntoNameBlocks(raw) {
    // DepEd Form 137 often places SURNAME and GIVEN NAME on the same row.
    // We attempt to split the row into two blocks separated by 2+ spaces.
    const s = cleanNamePart(cutAtNextFieldLabel(raw));
    if (!s) return [];
    const blocks = s
      .split(/\s{2,}/g)
      .map((b) => cleanNamePart(b))
      .filter(Boolean);
    return blocks;
  }

  function splitCombinedSurnameGiven(raw) {
    // OCR sometimes collapses spacing between the SURNAME and GIVEN NAME columns,
    // producing a single run like: "DELA CRUZ MARIA CLARA".
    const s = cleanNamePart(cutAtNextFieldLabel(raw));
    const tokens = s.split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return null;

    const upperTokens = tokens.map((x) => x.toUpperCase());
    const p1 = upperTokens[0];
    const p2 = upperTokens[1];
    const p3 = upperTokens[2];

    // Handle common surname particles/prefixes.
    // Examples:
    // - DELA CRUZ -> last="DELA CRUZ", given=rest
    // - DEL TORO -> last="DEL TORO", given=rest
    // - DE LA CRUZ -> last="DE LA CRUZ", given=rest
    // - VAN DYKE -> last="VAN DYKE", given=rest
    const twoWordParticles = new Set(["DELA", "DEL", "VAN", "VON", "SAN", "SANTA", "STA", "ST"]);
    const threeWordPatterns = [
      ["DE", "LA"],
      ["DE", "LOS"],
      ["DE", "LAS"],
    ];

    let lastLen = 1;
    if (twoWordParticles.has(p1) && upperTokens.length >= 2) {
      lastLen = 2;
    }

    const matchesThreeWord =
      upperTokens.length >= 3 &&
      threeWordPatterns.some(([a, b]) => p1 === a && p2 === b);
    if (matchesThreeWord) {
      lastLen = 3;
    }

    const last = cleanNamePart(tokens.slice(0, lastLen).join(" "));
    const given = cleanNamePart(tokens.slice(lastLen).join(" "));
    if (!last || !given) return null;
    if (isProbablyNotAName(last) || isProbablyNotAName(given)) return null;
    return { last, given };
  }

  function findValueNearLabel(labelMatcher) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!labelMatcher.test(line)) continue;

      // Case 1: "Label: Value" or "Label - Value" or "Label  Value"
      const sameLine = line.replace(labelMatcher, " ").trim();
      const sameCut = cutAtNextFieldLabel(sameLine);
      const sameClean = cleanNamePart(sameCut);
      if (sameClean && !isProbablyNotAName(sameClean) && !/\bname\b/i.test(sameClean)) {
        return sameClean;
      }

      // Case 2: Value is on the next line
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
        const candidateRaw = cutAtNextFieldLabel(lines[j]);
        const candidate = cleanNamePart(candidateRaw);
        if (!candidate) continue;
        if (labelMatcher.test(lines[j])) continue;
        if (/^\(.*\)$/.test(lines[j])) continue;
        if (/\bname\b/i.test(candidate) && candidate.split(/\s+/).length <= 3) continue;
        if (isProbablyNotAName(candidate)) continue;
        return candidate;
      }
    }
    return "";
  }

  // Special-case DepEd Form 137 style row: "Surname DELA CRUZ   MARIA CLARA   Date of Birth ..."
  let lastName = "";
  let firstName = "";
  let middleName = "";
  const surnameRow = lines.find((l) => /(\bsurname\b|\bsumame\b|\bsumarme\b|\bimame\b|\bsurame\b)/i.test(l));
  if (surnameRow) {
    const after = surnameRow
      .replace(/.*(\bsurname\b|\bsumame\b|\bsumarme\b|\bimame\b|\bsurame\b)\s*[:\-]*/i, "")
      .trim();

    const blocks = splitIntoNameBlocks(after);
    // Most common: block[0]=last name, block[1]=given/middle names.
    if (blocks[0] && !isProbablyNotAName(blocks[0])) lastName = blocks[0];
    if (blocks[1] && !isProbablyNotAName(blocks[1])) firstName = blocks[1];

    if (!lastName || !firstName) {
      const combined = splitCombinedSurnameGiven(after);
      if (combined) {
        lastName = combined.last;
        firstName = combined.given;
      }
    }
  }

  if (!lastName) {
    lastName =
      findValueNearLabel(/\b(?:last\s*name|surname|family\s*name|urname)\b\s*[:\-]*/i) ||
      "";
  }
  if (!firstName) {
    firstName =
      findValueNearLabel(/\b(?:first\s*name|given\s*name|iven\s*name|even\s*name)\b\s*[:\-]*/i) ||
      "";
  }
  middleName =
    findValueNearLabel(/\b(?:middle\s*name|m\.?i\.?|mi)\b\s*[:\-]*/i) || "";

  if (firstName || lastName || middleName) {
    const full = `${lastName}${lastName && firstName ? ", " : ""}${firstName}${
      middleName ? ` ${middleName}` : ""
    }`.trim();
    if (full.length >= 4 && full.length <= 80) return full;
  }

  const m1 = labeled.match(/\b(?:Name|Student Name)\s*[:\-]\s*(.+)$/im);
  if (m1 && m1[1]) {
    const candidate = cleanNamePart(m1[1]);
    if (candidate.length >= 4 && candidate.length <= 80 && !isProbablyNotAName(candidate)) {
      return candidate;
    }
  }

  // Fallback: pick the first long-ish line that looks like a name
  for (const l of lines) {
    if (l.length < 6 || l.length > 80) continue;
    // avoid lines that are mostly digits
    const digits = (l.match(/\d/g) || []).length;
    if (digits > Math.max(3, Math.floor(l.length / 3))) continue;
    // likely name line
    if (/[A-Za-z]{2,}/.test(l) && !isProbablyNotAName(l)) return l;
  }

  return "";
}

function extractStudentNoFromOcrText(text) {
  const t = String(text || "").toUpperCase();
  const m = t.match(/\b\d{4}[-\s]?\d{5}[-\s]?[A-Z]{2}[-\s]?\d\b/);
  if (!m) return "";
  const raw = m[0].replace(/\s+/g, "");
  return formatStudentNoInput(raw);
}

function inferDocTypeFromText(text, docTypes) {
  const t = String(text || "").toLowerCase();
  const types = Array.isArray(docTypes) ? docTypes : [];
  if (!t || !types.length) return "";

  let best = "";
  let bestScore = 0;
  for (const dt of types) {
    const needle = String(dt || "").trim().toLowerCase();
    if (!needle) continue;
    let score = 0;
    if (t.includes(needle)) score += 10;
    for (const part of needle.split(/[^a-z0-9]+/g).filter(Boolean)) {
      if (part.length < 3) continue;
      if (t.includes(part)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = dt;
    }
  }

  return bestScore >= 4 ? best : "";
}

async function extractFirstPageTextFromPdfFile(file) {
  const buf = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const items = Array.isArray(content?.items) ? content.items : [];
  const out = items
    .map((it) => String(it?.str || "").trim())
    .filter(Boolean)
    .join("\n");
  return out;
}

async function ocrFirstPageFromPdfFile(file) {
  const buf = await file.arrayBuffer();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const loadingTask = pdfjs.getDocument({ data: buf });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  function preprocessForOcr(srcCanvas) {
    const out = document.createElement("canvas");
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const octx = out.getContext("2d", { willReadFrequently: true });
    try {
      octx.drawImage(srcCanvas, 0, 0);
      const img = octx.getImageData(0, 0, out.width, out.height);
      const d = img.data;

      // Simple grayscale + threshold to boost contrast on scanned forms.
      // (Keeps the implementation lightweight and fully offline.)
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const v = lum > 190 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      octx.putImageData(img, 0, 0);
    } catch {
      // ignore preprocessing failures
    }
    return out;
  }

  // Crop a region where DepEd Form 137 typically places the student name.
  // This improves OCR accuracy versus scanning the entire page header/footer.
  const nameCropCanvas = document.createElement("canvas");
  const nameCropCtx = nameCropCanvas.getContext("2d");
  const cropX = Math.floor(canvas.width * 0.04);
  const cropY = Math.floor(canvas.height * 0.16);
  const cropW = Math.floor(canvas.width * 0.92);
  const cropH = Math.floor(canvas.height * 0.26);
  nameCropCanvas.width = cropW;
  nameCropCanvas.height = cropH;
  try {
    nameCropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  } catch {
    // ignore crop failures; fallback to full-page OCR
  }

  const preppedCropCanvas = preprocessForOcr(nameCropCanvas);

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", undefined, {
      // Serve everything locally from /public/tesseract (offline)
      workerPath: "/tesseract/worker.min.js",
      corePath: "/tesseract/tesseract-core.wasm.js",
      langPath: "/tesseract",
      gzip: false,
      logger: () => {},
    });

    try {
      await worker.setParameters({
        // Treat as a uniform block of text; more stable for forms.
        tessedit_pageseg_mode: "6",
        // Encourage better spacing retention.
        preserve_interword_spaces: "1",
        // Hint higher DPI for scanned docs.
        user_defined_dpi: "300",
      });
    } catch {
      // ignore parameter errors
    }

    const {
      data: { text },
    } = await worker.recognize(canvas);

    let nameText = "";
    try {
      const r2 = await worker.recognize(preppedCropCanvas);
      nameText = String(r2?.data?.text || "");
    } catch {
      // ignore crop OCR errors
    }

    try {
      console.groupCollapsed("[OCR] Raw Text Output");
      console.log("[OCR] Full-page text:\n", String(text || ""));
      console.log("[OCR] Cropped text:\n", String(nameText || ""));
      console.groupEnd();
    } catch {
      // ignore console failures
    }
    await worker.terminate();

    return `${String(text || "")}\n${nameText}`.trim();
  } catch (e) {
    const msg = String(e?.message || "");
    if (
      msg.includes("/tesseract/") ||
      msg.toLowerCase().includes("worker") ||
      msg.toLowerCase().includes("wasm")
    ) {
      throw new Error(
        "Offline OCR assets are missing. Add /public/tesseract (worker + wasm + eng.traineddata) to enable OCR for scanned PDFs. Embedded-text PDFs will still work."
      );
    }
    throw e;
  }
}

function normalizeStudentRow(r) {
  const course = courses.find((c) => c.code === r.course_code);
  const rawSection = String(r.section || "").trim();
  let normalizedSection = rawSection;
  if (rawSection && !/^Section\s+/i.test(rawSection)) {
    if (rawSection.includes("-")) {
      const lastPart = rawSection.split("-").pop();
      normalizedSection = `Section ${String(lastPart || "").trim()}`;
    } else if (/^\d+[A-Za-z]*$/.test(rawSection)) {
      normalizedSection = `Section ${rawSection}`;
    }
  }

  return {
    studentNo: r.student_no,
    name: r.name,
    courseCode: r.course_code,
    courseName: course?.name || r.course_code,
    year: r.year_level,
    section: normalizedSection,
    room: r.room,
    cabinet: r.cabinet,
    drawer: r.drawer,
    status: r.status,
  };
}

export default function StaffPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const docsFileInputRef = useRef(null);
  const newStudentNoInputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const toastTimerRef = useRef(null);

  async function logStaffAction(action) {
    try {
      const actor = String(authUser?.username || authUser?.id || "Staff");
      const role = String(authUser?.role || "Staff");

      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor, role, action, ip: "localhost" }),
      });
    } catch {
      // ignore logging errors
    }
  }

  const [view, setView] = useState("search");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [authUser, setAuthUser] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  const [toast, setToast] = useState({ open: false, msg: "", isError: false });

  function showToast(msg, isError = false, autoHide = true) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, msg, isError });
    if (autoHide) {
      toastTimerRef.current = setTimeout(() => {
        setToast((t) => ({ ...t, open: false }));
      }, 3000);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
          return;
        }
        setAuthUser(json.data);
        if (json?.data?.mustChangePassword) {
          setPwOpen(true);
        }
      } catch {
        router.push("/");
      }
    })();
  }, []);

  function clearPwForm() {
    setPwCurrent("");
    setPwNext("");
    setPwConfirm("");
    setPwError("");
  }

  function submitChangePassword(e) {
    e.preventDefault();
    if (pwLoading) return;
    if (!authUser?.id) {
      setPwError("Missing user session");
      return;
    }
    if (!pwCurrent || !pwNext || !pwConfirm) {
      setPwError("Please fill all fields");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError("New password does not match");
      return;
    }
    if (pwNext.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    setPwError("");
    setPwLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: pwCurrent,
            newPassword: pwNext,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to change password");
        }

        setAuthUser((u) => (u ? { ...u, mustChangePassword: false } : u));

        await logStaffAction("Changed account password");

        clearPwForm();
        setPwOpen(false);
        showToast("Password updated successfully!");
      } catch (err) {
        setPwError(err?.message || "Failed to change password");
      } finally {
        setPwLoading(false);
      }
    })();
  }

  const [docsRows, setDocsRows] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [docsForm, setDocsForm] = useState({
    studentNo: "",
    studentName: "",
    docType: "",
  });
  const [docsFile, setDocsFile] = useState(null);

  const [docTypes, setDocTypes] = useState([]);

  const [students, setStudents] = useState([]);

  const [currentLevel, setCurrentLevel] = useState("courses");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  const [currentLocatorLevel, setCurrentLocatorLevel] = useState("rooms");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedCabinet, setSelectedCabinet] = useState(null);
  const [targetLocation, setTargetLocation] = useState(null);

  const [activeStudentNo, setActiveStudentNo] = useState(null);
  const activeStudent = useMemo(() => {
    if (!activeStudentNo) return null;
    return students.find((s) => s.studentNo === activeStudentNo) || null;
  }, [activeStudentNo, students]);

  const [activeStudentDocs, setActiveStudentDocs] = useState([]);

  const [quickQuery, setQuickQuery] = useState("");
  const [quickResults, setQuickResults] = useState([]);
  const [isQuickSearching, setIsQuickSearching] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState({
    docType: "",
    studentName: "",
    studentNo: "",
    docId: null,
    refId: "00000",
  });

  const [uploadError, setUploadError] = useState("");

  const [uploadedFile, setUploadedFile] = useState(null);
  const [dropActive, setDropActive] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");

  const [ocrPromptOpen, setOcrPromptOpen] = useState(false);
  const [ocrSuggestion, setOcrSuggestion] = useState(null);

  const [uploadMode, setUploadMode] = useState("existing");

  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState([]);

  const [csvSelected, setCsvSelected] = useState({});
  const [csvBulkRoom, setCsvBulkRoom] = useState("");
  const [csvBulkCabinet, setCsvBulkCabinet] = useState("");
  const [csvBulkDrawer, setCsvBulkDrawer] = useState("");
  const [csvDropActive, setCsvDropActive] = useState(false);
  const csvInputRef = useRef(null);

  const [docTypeModalOpen, setDocTypeModalOpen] = useState(false);
  const [docTypeModalPrefix, setDocTypeModalPrefix] = useState("exist");
  const [docTypeModalValue, setDocTypeModalValue] = useState("");
  const [docTypeModalLoading, setDocTypeModalLoading] = useState(false);
  const [docTypeModalError, setDocTypeModalError] = useState("");

  const [exist, setExist] = useState({
    course: "",
    year: "",
    section: "",
    studentId: "",
    docType: "",
    addingDocType: false,
    newDocType: "",
  });

  const [newRecStudentNoTouched, setNewRecStudentNoTouched] = useState(false);
  const [newRecStudentNoHint, setNewRecStudentNoHint] = useState("");

  const [newRec, setNewRec] = useState({
    studentNo: "",
    name: "",
    course: "",
    year: "",
    sectionPart: "",
    room: "",
    cabinet: "",
    drawer: "",
    docType: "",
    addingDocType: false,
    newDocType: "",
  });

  useEffect(() => {
    function onDocClick(e) {
      const menu = document.getElementById("userMenuDropdown");
      const btn = document.getElementById("userMenuBtn");
      if (!menu || !btn) return;
      if (!userMenuOpen) return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = quickQuery.trim().toLowerCase();
    setIsQuickSearching(true);
    searchTimerRef.current = setTimeout(() => {
      (async () => {
        if (q.length < 2) {
          setQuickResults([]);
          setIsQuickSearching(false);
          return;
        }

        try {
          const qs = new URLSearchParams();
          qs.set("q", q);
          qs.set("limit", "25");
          const res = await fetch(`/api/students?${qs.toString()}`);
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Search failed");
          const rows = Array.isArray(json.data) ? json.data : [];
          setQuickResults(rows.map(normalizeStudentRow));
        } catch {
          setQuickResults([]);
        } finally {
          setIsQuickSearching(false);
        }
      })();
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [quickQuery]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/students?limit=500");
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error();
        const rows = Array.isArray(json.data) ? json.data : [];
        setStudents(rows.map(normalizeStudentRow));
      } catch {
        setStudents([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/doc-types");
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load doc types");
        setDocTypes(Array.isArray(json.data) ? json.data : []);
      } catch {
        setDocTypes([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeStudentNo) {
      setActiveStudentDocs([]);
      return;
    }

    (async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("studentNo", activeStudentNo);
        qs.set("limit", "200");
        const res = await fetch(`/api/documents?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error();
        setActiveStudentDocs(Array.isArray(json.data) ? json.data : []);
      } catch {
        setActiveStudentDocs([]);
      }
    })();
  }, [activeStudentNo]);

  async function refreshDocuments(nextCriteria) {
    setDocsLoading(true);
    setDocsError("");
    try {
      const criteria = nextCriteria || docsForm;
      const studentNoQ = String(criteria.studentNo || "").trim().toLowerCase();
      const studentNameQ = String(criteria.studentName || "").trim().toLowerCase();
      const docTypeQ = String(criteria.docType || "").trim();

      const hasSearch = !!(studentNoQ || studentNameQ || docTypeQ);
      if (!hasSearch) {
        setDocsRows([]);
        return;
      }

      const matches = students
        .filter((s) => {
          if (studentNoQ && !String(s.studentNo || "").toLowerCase().includes(studentNoQ)) {
            return false;
          }
          if (studentNameQ && !String(s.name || "").toLowerCase().includes(studentNameQ)) {
            return false;
          }
          return true;
        })
        .slice(0, 10);

      const docsByStudent = await Promise.all(
        matches.map(async (s) => {
          const qs = new URLSearchParams();
          qs.set("studentNo", s.studentNo);
          qs.set("limit", "200");
          const res = await fetch(`/api/documents?${qs.toString()}`);
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load documents");
          const rows = Array.isArray(json.data) ? json.data : [];
          return { student: s, docs: rows };
        })
      );

      const checklistRows = docsByStudent.flatMap(({ student, docs }) => {
        const byType = new Map();
        for (const d of docs) {
          const t = d.doc_type;
          if (!t) continue;
          const existing = byType.get(t);
          if (!existing) {
            byType.set(t, d);
            continue;
          }
          const a = String(existing.created_at || "");
          const b = String(d.created_at || "");
          if (b > a) byType.set(t, d);
        }

        const types = docTypeQ ? [docTypeQ] : docTypes;
        return types.map((t) => {
          const doc = byType.get(t) || null;
          return {
            key: `${student.studentNo}:${t}`,
            student_no: student.studentNo,
            student_name: student.name,
            doc_type: t,
            status: doc ? "uploaded" : "missing",
            doc,
          };
        });
      });

      setDocsRows(checklistRows);
    } catch (e) {
      setDocsError(e?.message || "Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    if (view !== "documents") return;
  }, [view]);

  async function uploadDocument(e) {
    e.preventDefault();
    setDocsError("");

    if (!docsFile) {
      setDocsError("Please choose a PDF file.");
      return;
    }
    if (docsFile.type !== "application/pdf") {
      setDocsError("Only PDF files are allowed.");
      return;
    }
    if (!docsForm.studentNo.trim() || !docsForm.docType.trim()) {
      setDocsError("Student No and Document Type are required.");
      return;
    }

    const form = new FormData();
    form.set("file", docsFile);
    form.set("studentNo", docsForm.studentNo.trim());
    form.set("studentName", docsForm.studentName.trim());
    form.set("docType", docsForm.docType.trim());

    setDocsLoading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Upload failed");
      }
      setDocsFile(null);
      if (docsFileInputRef.current) docsFileInputRef.current.value = "";
      setDocsForm((p) => ({ ...p, docType: "" }));
      await logStaffAction(
        `Uploaded document (${docsForm.docType.trim()}) for ${docsForm.studentNo.trim()}`
      );
      await refreshDocuments();
    } catch (e) {
      setDocsError(e?.message || "Upload failed");
    } finally {
      setDocsLoading(false);
    }
  }

  async function updateDoc(id, { studentNo, studentName, docType }) {
    setDocsLoading(true);
    setDocsError("");
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNo, studentName, docType }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Update failed");
      }
      await logStaffAction(`Updated document metadata (#${id})`);
      await refreshDocuments();
    } catch (e) {
      setDocsError(e?.message || "Update failed");
    } finally {
      setDocsLoading(false);
    }
  }

  const breadcrumbs = useMemo(() => {
    const parts = [{ label: "All Courses", level: "courses" }];
    if (selectedCourse) parts.push({ label: selectedCourse.code, level: "years" });
    if (selectedYear) parts.push({ label: String(selectedYear), level: "sections" });
    if (selectedSection) parts.push({ label: String(selectedSection), level: "students" });
    return parts;
  }, [selectedCourse, selectedSection, selectedYear]);

  const explorerItems = useMemo(() => {
    if (currentLevel === "courses") {
      return courses.map((c) => {
        const count = students.filter((s) => s.courseCode === c.code).length;
        return {
          key: c.code,
          title: c.code,
          subtitle: `${count} Students`,
          icon: c.icon,
          disabled: count === 0,
          onClick: () => {
            if (count === 0) return;
            setSelectedCourse(c);
            setSelectedYear(null);
            setSelectedSection(null);
            setCurrentLevel("years");
          },
        };
      });
    }

    if (currentLevel === "years") {
      const yearsInCourse = [
        ...new Set(
          students
            .filter((s) => s.courseCode === selectedCourse?.code)
            .map((s) => s.year)
            .filter(Boolean)
        ),
      ].sort((a, b) => b - a);

      return yearsInCourse
        .filter((y) => students.some((s) => s.courseCode === selectedCourse?.code && s.year === y))
        .map((y) => {
          const count = students.filter(
            (s) => s.courseCode === selectedCourse?.code && s.year === y
          ).length;
          return {
            key: `year-${y}`,
            title: String(y),
            subtitle: `${count} Students`,
            icon: "ph-calendar",
            disabled: false,
            onClick: () => {
              setSelectedYear(y);
              setSelectedSection(null);
              setCurrentLevel("sections");
            },
          };
        });
    }

    if (currentLevel === "sections") {
      const avail = [
        ...new Set(
          students
            .filter(
              (s) =>
                s.courseCode === selectedCourse?.code && s.year === selectedYear
            )
            .map((s) => s.section)
        ),
      ].sort();

      return avail.map((sec) => {
        const count = students.filter(
          (s) =>
            s.courseCode === selectedCourse?.code &&
            s.year === selectedYear &&
            s.section === sec
        ).length;

        return {
          key: `sec-${sec}`,
          title: String(sec),
          subtitle: `${count} Students`,
          icon: "ph-users-three",
          disabled: count === 0,
          onClick: () => {
            if (count === 0) return;
            setSelectedSection(sec);
            setCurrentLevel("students");
          },
        };
      });
    }

    if (currentLevel === "students") {
      const studentRows = students
        .filter(
          (s) =>
            s.courseCode === selectedCourse?.code &&
            s.year === selectedYear &&
            s.section === selectedSection
        )
        .sort((a, b) => a.name.localeCompare(b.name));

      return studentRows.map((s) => ({
        key: s.studentNo,
        student: s,
      }));
    }

    return [];
  }, [
    currentLevel,
    selectedCourse,
    selectedYear,
    selectedSection,
    students,
  ]);

  const locatorModel = useMemo(() => {
    const target = targetLocation;

    if (currentLocatorLevel === "rooms") {
      return {
        title: "Select Storage Room",
        kind: "rooms",
        rooms: rooms.map((room) => {
          const occupiedCount = students.filter((s) => s.room === room).length;
          const isTarget = target && target.room === room;
          return { room, occupiedCount, isTarget };
        }),
      };
    }

    if (currentLocatorLevel === "cabinets") {
      return {
        title: `Rooms / Room ${selectedRoom} Cabinets`,
        kind: "cabinets",
        cabinets: cabinets.map((cab) => {
          const occupiedCount = students.filter(
            (s) => s.room === selectedRoom && s.cabinet === cab
          ).length;
          const isTarget =
            target && target.room === selectedRoom && target.cabinet === cab;
          return { cab, occupiedCount, isTarget };
        }),
      };
    }

    return {
      title: `Cabinets / Room ${selectedRoom} / Cabinet ${selectedCabinet} Drawers`,
      kind: "drawers",
      drawers: [1, 2, 3, 4].map((i) => {
        const studentsInDrawer = students.filter(
          (s) =>
            s.room === selectedRoom &&
            s.cabinet === selectedCabinet &&
            s.drawer === i
        );
        const count = studentsInDrawer.length;
        const isTarget =
          target &&
          target.room === selectedRoom &&
          target.cabinet === selectedCabinet &&
          target.drawer === i;
        return { drawer: i, count, isTarget };
      }),
    };
  }, [
    currentLocatorLevel,
    selectedCabinet,
    selectedRoom,
    students,
    targetLocation,
  ]);

  const existingAvailSections = useMemo(() => {
    const courseVal = exist.course;
    const yearVal = parseInt(exist.year);
    if (!courseVal || !yearVal) return [];
    return [
      ...new Set(
        students
          .filter((s) => s.courseCode === courseVal && s.year === yearVal)
          .map((s) => s.section)
      ),
    ].sort();
  }, [exist.course, exist.year, students]);

  const existingAvailYears = useMemo(() => {
    const courseVal = exist.course;
    if (!courseVal) return [];
    return [
      ...new Set(
        students
          .filter((s) => s.courseCode === courseVal)
          .map((s) => s.year)
          .filter(Boolean)
      ),
    ].sort((a, b) => b - a);
  }, [exist.course, students]);

  const newAvailYears = useMemo(() => {
    const courseVal = newRec.course;
    const src = courseVal ? students.filter((s) => s.courseCode === courseVal) : students;
    return [...new Set(src.map((s) => s.year).filter(Boolean))].sort((a, b) => b - a);
  }, [newRec.course, students]);

  const existingStudents = useMemo(() => {
    const courseVal = exist.course;
    const yearVal = parseInt(exist.year);
    const sectionVal = exist.section;
    if (!courseVal || !yearVal || !sectionVal) return [];
    return students
      .filter(
        (s) =>
          s.courseCode === courseVal &&
          s.year === yearVal &&
          s.section === sectionVal
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exist.course, exist.section, exist.year, students]);

  function locateStudent(student) {
    setActiveStudentNo(student.studentNo);
    setTargetLocation({ room: student.room, cabinet: student.cabinet, drawer: student.drawer });
    setCurrentLocatorLevel("rooms");
    setSelectedRoom(null);
    setSelectedCabinet(null);
  }

  function resetExplorer() {
    setCurrentLevel("courses");
    setSelectedCourse(null);
    setSelectedYear(null);
    setSelectedSection(null);
    setTargetLocation(null);
    setActiveStudentNo(null);
    setCurrentLocatorLevel("rooms");
    setSelectedRoom(null);
    setSelectedCabinet(null);
  }

  function previewDocument(docType, studentName, studentNo, docId) {
    const n = Number(docId);
    setPreview({
      docType,
      studentName,
      studentNo,
      docId: Number.isInteger(n) && n > 0 ? n : null,
      refId: String(Math.floor(Math.random() * 1000000)).padStart(5, "0"),
    });
    setPreviewOpen(true);
  }

  function closeModal() {
    setPreviewOpen(false);
  }

  function handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
      setUploadedFile(file);
      setUploadError("");

      setOcrError("");
      setOcrSuggestion(null);
      setOcrPromptOpen(false);
      setOcrLoading(true);
      (async () => {
        try {
          let text = "";
          try {
            text = await extractFirstPageTextFromPdfFile(file);
          } catch {
            text = "";
          }

          if (!String(text || "").trim()) {
            text = await ocrFirstPageFromPdfFile(file);
          }

          const inferredName = extractNameFromOcrText(text);
          const inferredStudentNo = extractStudentNoFromOcrText(text);
          const inferredDocType = inferDocTypeFromText(text, docTypes);

          const studentNoOk = isValidStudentNo(inferredStudentNo) ? inferredStudentNo : "";
          const match = studentNoOk
            ? students.find((s) => s.studentNo === studentNoOk) || null
            : null;

          const suggestion = {
            studentNo: studentNoOk,
            name: inferredName,
            docType: inferredDocType,
            matchedStudent: match,
          };

          setOcrSuggestion(suggestion);
          if (suggestion.studentNo || suggestion.name || suggestion.docType) {
            setOcrPromptOpen(true);
          }
        } catch (e) {
          setOcrError(e?.message || "OCR failed");
        } finally {
          setOcrLoading(false);
        }
      })();
    } else if (file) {
      setUploadError("Only PDF files are allowed.");
    }
  }

  function clearFile(e) {
    if (e) e.stopPropagation();
    setUploadedFile(null);
    setUploadError("");
    setOcrError("");
    setOcrLoading(false);
    setOcrPromptOpen(false);
    setOcrSuggestion(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function applyOcrToExistingStudent() {
    const sug = ocrSuggestion;
    const s = sug?.matchedStudent;
    if (!s) return;

    setUploadMode("existing");
    setExist((p) => ({
      ...p,
      course: s.courseCode || "",
      year: s.year ? String(s.year) : "",
      section: s.section || "",
      studentId: s.studentNo || "",
      docType: sug?.docType ? String(sug.docType) : p.docType,
    }));
    setOcrPromptOpen(false);
  }

  function applyOcrToNewStudent() {
    const sug = ocrSuggestion;
    setUploadMode("new");
    setNewRec((p) => ({
      ...p,
      studentNo: p.studentNo || String(sug?.studentNo || ""),
      name: p.name || String(sug?.name || ""),
      docType: p.docType || String(sug?.docType || ""),
    }));
    setOcrPromptOpen(false);
  }

  async function handleCsvFileSelect(file) {
    setCsvError("");
    setCsvResults([]);
    setCsvRows([]);
    setCsvFile(null);
    setCsvSelected({});

    if (!file) return;
    const isCsv =
      file.type === "text/csv" ||
      file.name.toLowerCase().endsWith(".csv") ||
      file.type === "application/vnd.ms-excel";
    if (!isCsv) {
      setCsvError("Please select a CSV file.");
      return;
    }

    setCsvFile(file);
    try {
      const text = await file.text();
      const lines = String(text)
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setCsvError("CSV must include a header row and at least 1 data row.");
        return;
      }

      const header = parseCsvLine(lines[0]).map(normalizeHeaderKey);
      const out = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const obj = {};
        for (let j = 0; j < header.length; j++) {
          obj[header[j]] = cols[j] ?? "";
        }
        const student = mapCsvRowToStudent(obj);
        const error = validateStudentForCsv(student);
        out.push({ index: i, student, error });
      }

      setCsvRows(out);
      setCsvSelected({});
    } catch (e) {
      setCsvError(e?.message || "Failed to read CSV");
    }
  }

  function setCsvRowField(rowIndex, field, value) {
    setCsvRows((prev) => {
      const next = prev.map((r) => {
        if (r.index !== rowIndex) return r;
        const student = { ...r.student, [field]: value };
        const error = validateStudentForCsv(student);
        return { ...r, student, error };
      });
      return next;
    });
  }

  function toggleCsvRowSelected(rowIndex) {
    setCsvSelected((prev) => ({ ...prev, [rowIndex]: !prev?.[rowIndex] }));
  }

  function toggleCsvSelectAll(nextChecked) {
    if (!nextChecked) {
      setCsvSelected({});
      return;
    }
    setCsvSelected(() => {
      const out = {};
      for (const r of csvRows) out[r.index] = true;
      return out;
    });
  }

  function applyCsvBulkLocation() {
    setCsvError("");
    const roomVal = csvBulkRoom ? parseInt(csvBulkRoom) : null;
    const drawerVal = csvBulkDrawer ? parseInt(csvBulkDrawer) : null;
    const cabVal = csvBulkCabinet ? String(csvBulkCabinet).trim() : "";

    setCsvRows((prev) => {
      return prev.map((r) => {
        if (!csvSelected?.[r.index]) return r;
        const student = { ...r.student };
        if (roomVal !== null) student.room = roomVal;
        if (cabVal) student.cabinet = cabVal;
        if (drawerVal !== null) student.drawer = drawerVal;
        const error = validateStudentForCsv(student);
        return { ...r, student, error };
      });
    });
  }

  async function importCsvStudents() {
    setCsvError("");
    setCsvResults([]);

    if (!csvFile) {
      setCsvError("Please select a CSV file.");
      return;
    }

    if (!csvRows.length) {
      setCsvError("No rows to import.");
      return;
    }

    const invalidCount = csvRows.filter((r) => r.error).length;
    if (invalidCount > 0) {
      setCsvError("Fix CSV errors before importing.");
      return;
    }

    setCsvLoading(true);
    try {
      const res = await fetch("/api/students/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvRows.map((r) => r.student) }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Batch import failed");
      }

      const results = Array.isArray(json.data) ? json.data : [];
      setCsvResults(results);

      const created = results
        .filter((r) => r?.ok && r?.data)
        .map((r) => normalizeStudentRow(r.data));

      if (created.length) {
        setStudents((prev) => {
          const map = new Map(prev.map((s) => [s.studentNo, s]));
          for (const s of created) map.set(s.studentNo, s);
          return Array.from(map.values());
        });
      }
    } catch (e) {
      setCsvError(e?.message || "Batch import failed");
    } finally {
      setCsvLoading(false);
    }
  }

  function openDocTypeModal(prefix) {
    setUploadError("");
    setDocTypeModalError("");
    setDocTypeModalPrefix(prefix);
    setDocTypeModalValue("");
    setDocTypeModalOpen(true);
  }

  function closeDocTypeModal() {
    setDocTypeModalOpen(false);
    setDocTypeModalLoading(false);
    setDocTypeModalError("");
    setDocTypeModalValue("");
    if (docTypeModalPrefix === "exist") {
      setExist((p) => ({ ...p, docType: p.docType === "add_new" ? "" : p.docType }));
    } else {
      setNewRec((p) => ({ ...p, docType: p.docType === "add_new" ? "" : p.docType }));
    }
  }

  async function saveDocTypeModal() {
    const val = docTypeModalValue.trim();
    if (!val) {
      setDocTypeModalError("Please enter a document type.");
      return;
    }

    setDocTypeModalLoading(true);
    setDocTypeModalError("");
    try {
      const res = await fetch("/api/doc-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: val }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to add type");
      const created = String(json.data);
      setDocTypes((prev) => Array.from(new Set([...(prev || []), created])));
      if (docTypeModalPrefix === "exist") {
        setExist((p) => ({ ...p, docType: created }));
      } else {
        setNewRec((p) => ({ ...p, docType: created }));
      }
      setDocTypeModalOpen(false);
      setDocTypeModalValue("");
    } catch (e) {
      setDocTypeModalError(e?.message || "Failed to add type");
    } finally {
      setDocTypeModalLoading(false);
    }
  }

  async function ensureDocTypeSaved(raw) {
    const val = String(raw || "").trim();
    if (!val) return "";

    const res = await fetch("/api/doc-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: val }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to add type");
    }
    const created = String(json.data || val);
    setDocTypes((prev) => Array.from(new Set([...(prev || []), created])));
    return created;
  }

  function ensureDocType(prefix) {
    if (prefix === "exist") {
      if (exist.docType === "add_new") {
        setExist((p) => ({ ...p, addingDocType: true, newDocType: "" }));
      }
    } else {
      if (newRec.docType === "add_new") {
        setNewRec((p) => ({ ...p, addingDocType: true, newDocType: "" }));
      }
    }
  }

  function saveNewDocType(prefix) {
    if (prefix === "exist") {
      const val = exist.newDocType.trim();
      if (!val) return;
      (async () => {
        try {
          const res = await fetch("/api/doc-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: val }),
          });
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to add type");
          const created = String(json.data);
          setDocTypes((prev) => Array.from(new Set([...prev, created])));
          setExist((p) => ({
            ...p,
            addingDocType: false,
            docType: created,
            newDocType: "",
          }));
        } catch (e) {
          setUploadError(e?.message || "Failed to add type");
        }
      })();
    } else {
      const val = newRec.newDocType.trim();
      if (!val) return;
      (async () => {
        try {
          const res = await fetch("/api/doc-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: val }),
          });
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to add type");
          const created = String(json.data);
          setDocTypes((prev) => Array.from(new Set([...prev, created])));
          setNewRec((p) => ({
            ...p,
            addingDocType: false,
            docType: created,
            newDocType: "",
          }));
        } catch (e) {
          setUploadError(e?.message || "Failed to add type");
        }
      })();
    }
  }

  function cancelNewDocType(prefix) {
    if (prefix === "exist") {
      setExist((p) => ({ ...p, addingDocType: false, docType: "", newDocType: "" }));
    } else {
      setNewRec((p) => ({ ...p, addingDocType: false, docType: "", newDocType: "" }));
    }
  }

  function processSubmission() {
    if (!uploadedFile) {
      setUploadError("Please drop or select a PDF file first.");
      return;
    }

    if (uploadMode === "existing") {
      const studentNo = exist.studentId;
      const dt = exist.docType;

      if (!studentNo) {
        setUploadError("Please select a student.");
        return;
      }
      if (!dt || dt === "add_new") {
        setUploadError("Please select a document type.");
        return;
      }

      setUploadError("");

      (async () => {
        try {
          const dtSaved = await ensureDocTypeSaved(dt);
          if (!dtSaved) throw new Error("Please enter a document type.");

          const form = new FormData();
          form.set("file", uploadedFile);
          form.set("studentNo", studentNo);
          form.set("studentName", existingStudents.find((s) => s.studentNo === studentNo)?.name || "");
          form.set("docType", dtSaved);

          const res = await fetch("/api/documents", { method: "POST", body: form });
          const json = await res.json();
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Upload failed");

          showToast(`File tagged as "${dtSaved}" for ${studentNo}!`);

          await logStaffAction(`Uploaded document (${dtSaved}) for ${studentNo}`);

          if (activeStudentNo === studentNo) {
            const qs = new URLSearchParams();
            qs.set("studentNo", studentNo);
            qs.set("limit", "200");
            const res2 = await fetch(`/api/documents?${qs.toString()}`);
            const json2 = await res2.json();
            if (res2.ok && json2?.ok) {
              setActiveStudentDocs(Array.isArray(json2.data) ? json2.data : []);
            }
          }

          clearFile();
          setExist((p) => ({ ...p, docType: "" }));
        } catch (e) {
          showToast(e?.message || "Upload failed", true);
        }
      })();
      return;
    }

    const id = newRec.studentNo;
    const name = newRec.name;
    const courseCode = newRec.course;
    const year = parseInt(newRec.year);
    const sectionPart = parseInt(newRec.sectionPart);
    const room = parseInt(newRec.room);
    const cab = newRec.cabinet;
    const draw = parseInt(newRec.drawer);
    const dt = newRec.docType;

    if (!id || !name || !courseCode || !Number.isFinite(sectionPart)) {
      setUploadError("Fill all required fields.");
      return;
    }

    if (!isValidStudentNo(id)) {
      setUploadError(
        "Invalid Student No. Use numbers in the first 2 parts and last part, and letters in the 3rd part."
      );
      return;
    }

    const computedYear = Number.isFinite(year) ? year : new Date().getFullYear();
    const section = `Section ${sectionPart}`;
    if (!dt || dt === "add_new") {
      setUploadError("Please enter a document type.");
      return;
    }

    setUploadError("");

    const newStudent = {
      studentNo: id,
      name,
      courseCode,
      yearLevel: computedYear,
      section,
      room: room || 1,
      cabinet: cab || "A",
      drawer: draw || 1,
      status: "Active",
    };

    (async () => {
      try {
        const dtSaved = await ensureDocTypeSaved(dt);
        if (!dtSaved) throw new Error("Please enter a document type.");

        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newStudent),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create student");

        const created = normalizeStudentRow(json.data);
        setStudents((prev) => {
          const next = [...prev, created];
          next.sort((a, b) => a.name.localeCompare(b.name));
          return next;
        });

        const form = new FormData();
        form.set("file", uploadedFile);
        form.set("studentNo", created.studentNo);
        form.set("studentName", created.name);
        form.set("docType", dtSaved);
        const res2 = await fetch("/api/documents", { method: "POST", body: form });
        const json2 = await res2.json();
        if (!res2.ok || !json2?.ok) throw new Error(json2?.error || "Failed to upload document");

        showToast(`New Record & ${dtSaved} added for ${name}!`);

        await logStaffAction(
          `Created student record (${created.studentNo}) and uploaded document (${dtSaved})`
        );

        clearFile();
        setNewRec({
          studentNo: "",
          name: "",
          course: "",
          year: "",
          sectionPart: "",
          room: "",
          cabinet: "",
          drawer: "",
          docType: "",
          addingDocType: false,
          newDocType: "",
        });
      } catch (e) {
        showToast(e?.message || "Submission failed", true);
      }
    })();
  }

  function switchView(next) {
    setView(next);
  }

  function logout() {
    (async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // ignore
      }
      router.push("/");
    })();
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-100">
      <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <i className="ph-bold ph-bank text-3xl text-pup-maroon"></i>
            <div className="leading-tight">
              <h1 className="font-bold text-xl text-pup-maroon tracking-tight">
                PUP E-Manage
              </h1>
              <p className="text-xs text-gray-600 uppercase tracking-widest font-semibold">
                Student Record Keeping System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => switchView("search")}
              id="nav-search"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "search"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-magnifying-glass"></i> Records & Archive
            </button>
            <button
              onClick={() => switchView("upload")}
              id="nav-upload"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "upload"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-upload-simple"></i> Scan & Upload
            </button>
            <button
              onClick={() => switchView("documents")}
              id="nav-documents"
              className={`px-4 py-2 rounded-brand text-sm font-bold transition-colors flex items-center gap-2 ${
                view === "documents"
                  ? "btn-nav-active"
                  : "text-gray-600 hover:text-pup-maroon"
              }`}
            >
              <i className="ph-bold ph-files"></i> Documents
            </button>

            <div className="relative ml-4">
              <button
                id="userMenuBtn"
                onClick={() => setUserMenuOpen((o) => !o)}
                className="h-10 w-10 border-2 border-pup-maroon rounded-full flex items-center justify-center text-pup-maroon font-bold text-sm bg-red-50 hover:bg-pup-maroon hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon"
              >
                AD
              </button>

              <div
                id="userMenuDropdown"
                className={`${
                  userMenuOpen ? "" : "hidden"
                } absolute right-0 mt-2 w-64 bg-white rounded-brand shadow-xl border border-gray-200 z-50 animate-scale-in origin-top-right`}
              >
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-brand">
                  <p className="text-sm font-bold text-pup-maroon">Administrator</p>
                  <p className="text-xs text-gray-700 truncate font-medium">
                    registrar.admin
                  </p>
                </div>
                <div className="p-1">
                  <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                    <i className="ph-bold ph-user-gear"></i> Account Settings
                  </button>
                  <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                    <i className="ph-bold ph-question"></i> Help & Support
                  </button>
                </div>
                <div className="p-1 border-t border-gray-200">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-3 text-sm text-red-700 hover:bg-red-50 font-bold rounded-brand flex items-center gap-2 transition-colors"
                  >
                    <i className="ph-bold ph-sign-out"></i> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {pwOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-brand border border-gray-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50/60">
              <h3 className="font-bold text-pup-maroon">Change Password</h3>
              <p className="text-xs text-gray-500 mt-1">
                First login detected. Please change your password to continue.
              </p>
            </div>
            <form onSubmit={submitChangePassword} className="p-5 space-y-4">
              {pwError ? (
                <div className="text-sm text-red-600 font-semibold">{pwError}</div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  Current Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  New Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={pwNext}
                  onChange={(e) => setPwNext(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-5 py-2.5 bg-pup-maroon text-white rounded-brand text-sm font-bold hover:bg-red-900 transition-colors shadow-sm disabled:opacity-60"
                >
                  {pwLoading ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1600px] mx-auto w-full p-4 gap-4">
        <div
          id="view-search"
          className={`${
            view === "search" ? "flex" : "hidden"
          } flex-col lg:flex-row w-full gap-4 lg:h-full min-h-0`}
        >
          <section className="w-full lg:w-1/4 bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm flex-shrink-0 lg:h-full min-h-0">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xs font-bold text-pup-maroon uppercase tracking-wide mb-3">
                Quick Find
              </h2>
              <div className="relative group">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-3 text-gray-500 group-focus-within:text-pup-maroon"></i>
                <input
                  type="text"
                  placeholder="Search ID or Name..."
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-brand text-sm font-medium focus:outline-none focus:border-pup-maroon transition-all placeholder-gray-500 text-gray-900"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {quickQuery.trim().length < 2 ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center opacity-80">
                  <i className="ph-bold ph-magnifying-glass text-3xl mb-2"></i>
                  <span className="text-sm font-medium">Search for direct access</span>
                </div>
              ) : isQuickSearching ? (
                <div className="p-4 text-center text-sm font-medium text-gray-500">
                  Searching...
                </div>
              ) : quickResults.length === 0 ? (
                <div className="p-4 text-center text-sm font-medium text-gray-500">
                  No records found.
                </div>
              ) : (
                quickResults.map((s) => (
                  <div
                    key={s.studentNo}
                    className="p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors flex justify-between items-center group"
                    onClick={() => locateStudent(s)}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-800 group-hover:text-pup-maroon">
                        {s.name}
                      </div>
                      <div className="text-xs text-gray-500 font-mono font-medium">
                        {s.studentNo}
                      </div>
                    </div>
                    <i className="ph-bold ph-caret-right text-gray-400 group-hover:text-pup-maroon text-sm"></i>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="w-full lg:w-3/4 flex flex-col gap-4 lg:h-full overflow-y-auto min-h-0">
            <div className="h-[60%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2 text-sm bg-white sticky top-0 z-10">
                <button
                  onClick={resetExplorer}
                  className="text-gray-500 hover:text-pup-maroon transition-colors"
                  title="Home"
                >
                  <i className="ph-bold ph-house text-lg"></i>
                </button>
                <span className="text-gray-400 font-bold">/</span>
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                  {breadcrumbs.map((b, idx) => (
                    <span key={b.level} className="flex items-center gap-2">
                      {idx === 0 ? null : (
                        <i className="ph-bold ph-caret-right text-sm text-gray-400"></i>
                      )}
                      <span
                        className={`cursor-pointer hover:text-pup-maroon ${
                          currentLevel === b.level ? "text-pup-maroon font-bold" : ""
                        }`}
                        onClick={() => {
                          if (b.level === "courses") {
                            resetExplorer();
                            return;
                          }
                          if (b.level === "years" && selectedCourse) {
                            setCurrentLevel("years");
                            setSelectedYear(null);
                            setSelectedSection(null);
                            return;
                          }
                          if (b.level === "sections" && selectedYear) {
                            setCurrentLevel("sections");
                            setSelectedSection(null);
                          }
                        }}
                      >
                        {b.label}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {students.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                    <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                      <i className="ph-duotone ph-users-three text-3xl text-pup-maroon"></i>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      No student records yet
                    </div>
                    <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                      Register your first student record in the Upload tab. After that,
                      you can browse, search, and locate folders here.
                    </div>
                    <button
                      type="button"
                      onClick={() => switchView("upload")}
                      className="mt-6 bg-pup-maroon text-white px-5 py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors flex items-center gap-2"
                    >
                      <i className="ph-bold ph-upload-simple"></i> Go to Register / Upload
                    </button>
                  </div>
                ) : currentLevel !== "students" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                    {explorerItems.map((it) => (
                      <div
                        key={it.key}
                        className={`folder-card bg-white p-5 rounded-brand flex flex-col items-center justify-center text-center gap-2 h-36 ${
                          it.disabled
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        onClick={it.onClick}
                      >
                        <i className={`ph-light ${it.icon} text-4xl text-gray-500 mb-1`}></i>
                        <h3 className="font-bold text-base text-pup-maroon leading-tight">
                          {it.title}
                        </h3>
                        <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                          {it.subtitle}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : explorerItems.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10 font-medium">
                    No students in this section.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {explorerItems.map((row) => (
                      <div
                        key={row.key}
                        className="group flex items-center justify-between p-4 bg-white border border-gray-300 rounded-brand hover:border-pup-maroon cursor-pointer transition-all shadow-sm"
                        onClick={() => locateStudent(row.student)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:text-pup-maroon transition-colors">
                            <i className="ph-bold ph-user text-xl"></i>
                          </div>
                          <div>
                            <h4 className="font-bold text-base text-gray-900">
                              {row.student.name}
                            </h4>
                            <p className="text-sm text-gray-600 font-mono font-medium">
                              {row.student.studentNo}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs uppercase font-bold tracking-wide text-gray-400 group-hover:text-pup-maroon">
                            View Location
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-[40%] min-h-[250px] bg-white rounded-brand border border-gray-300 flex flex-col shadow-sm relative min-h-0">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-brand">
                <h3 className="font-bold text-pup-maroon text-sm flex items-center gap-2">
                  <i className="ph-fill ph-drawers text-lg"></i> Storage Layout
                </h3>
                <div className="flex gap-4 text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border border-gray-400 rounded-[2px] bg-white"></div>
                    Empty
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded-[2px]"></div>
                    Occupied
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-pup-maroon bg-red-50 rounded-[2px]"></div>
                    Target
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden min-h-0">
                <div className="w-2/3 bg-gray-100 p-4 h-full min-h-0 overflow-y-auto">
                  <div className="w-full h-full">
                    {locatorModel.kind === "rooms" ? (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          {locatorModel.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 pb-6">
                          {locatorModel.rooms.map((r) => (
                            <div
                              key={r.room}
                              className={`locator-tile p-6 rounded-brand flex flex-col items-center justify-center ${
                                r.isTarget ? "room-located" : ""
                              }`}
                              onClick={() => {
                                setSelectedRoom(r.room);
                                setSelectedCabinet(null);
                                setCurrentLocatorLevel("cabinets");
                              }}
                            >
                              <i className="ph-duotone ph-warehouse text-4xl mb-2 text-pup-maroon"></i>
                              <h5 className="font-bold text-xl text-gray-900 leading-tight">
                                ROOM {r.room}
                              </h5>
                              <span className="text-xs text-gray-500 font-semibold mt-1">
                                {r.occupiedCount} Records Stored
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : locatorModel.kind === "cabinets" ? (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          <span
                            className="cursor-pointer hover:text-pup-maroon"
                            onClick={() => {
                              setCurrentLocatorLevel("rooms");
                              setSelectedRoom(null);
                              setSelectedCabinet(null);
                            }}
                          >
                            ← Rooms
                          </span>{" "}
                          / Room {selectedRoom} Cabinets
                        </h4>
                        <div className="grid grid-cols-4 gap-3">
                          {locatorModel.cabinets.map((c) => (
                            <div
                              key={c.cab}
                              className={`locator-tile p-3 rounded-brand flex flex-col h-full ${
                                c.isTarget ? "cabinet-located" : ""
                              }`}
                              onClick={() => {
                                setSelectedCabinet(c.cab);
                                setCurrentLocatorLevel("drawers");
                              }}
                            >
                              <div className="text-center mb-2">
                                <i className="ph-duotone ph-archive-box text-3xl text-gray-600"></i>
                                <h5 className="font-bold text-base text-gray-900 leading-tight mt-1">
                                  CAB-{c.cab}
                                </h5>
                              </div>
                              <div className="flex-1 bg-gray-50/50 p-2 rounded text-xs font-semibold text-gray-500 flex items-center justify-center">
                                {c.occupiedCount} Folders
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-gray-700 text-lg mb-4">
                          <span
                            className="cursor-pointer hover:text-pup-maroon"
                            onClick={() => setCurrentLocatorLevel("cabinets")}
                          >
                            ← Cabinets
                          </span>{" "}
                          / Room {selectedRoom} / Cabinet {selectedCabinet} Drawers
                        </h4>
                        <div className="flex justify-center w-full p-2">
                          <div className="border border-gray-300 p-2 rounded-brand bg-white relative flex flex-col h-full w-[30%] min-h-0">
                            <div className="absolute -top-2 left-2 bg-white px-2 text-xs font-bold text-gray-600 border border-gray-300 rounded-sm">
                              CAB-{selectedCabinet}
                            </div>
                            <div className="flex-1 flex flex-col gap-3 mt-3 min-h-0">
                              {locatorModel.drawers.map((d) => {
                                const countText =
                                  d.count === 1 ? "1 Folder" : `${d.count} Folders`;
                                const drawerClass =
                                  d.count > 0
                                    ? "drawer-occupied"
                                    : "bg-white border-gray-200 text-gray-300";
                                return (
                                  <div
                                    key={d.drawer}
                                    className={`drawer-box flex-1 rounded-brand flex items-center justify-center transition-all border locator-tile ${drawerClass} ${
                                      d.isTarget ? "drawer-located" : ""
                                    }`}
                                  >
                                    {d.count > 0 ? (
                                      <span
                                        className={`text-xs font-bold ${
                                          d.isTarget
                                            ? "text-pup-maroon"
                                            : "text-gray-900"
                                        }`}
                                      >
                                        {countText}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-gray-400">
                                        0 Folders
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-1/3 border-l border-gray-200 bg-white flex flex-col overflow-hidden min-h-0">
                  <div className="p-4 h-full flex flex-col overflow-hidden min-h-0">
                    {!activeStudent ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                        <i className="ph-duotone ph-mouse-left-click text-5xl mb-3"></i>
                        <span className="text-sm font-medium">
                          Select a student to view
                          <br />
                          location & documents
                        </span>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col min-h-0">
                        <div className="mb-4 flex-shrink-0">
                          <div className="text-xs uppercase font-bold text-gray-500 mb-1 tracking-wide">
                            Physical Location
                          </div>
                          <div className="text-2xl font-black text-pup-maroon">
                            ROOM-{activeStudent.room} • CAB-{activeStudent.cabinet} • D-{activeStudent.drawer}
                          </div>
                          <div className="text-base font-bold text-gray-900 truncate mt-1">
                            {activeStudent.name}
                          </div>
                          <div className="text-sm text-gray-600 font-mono font-medium">
                            {activeStudent.studentNo}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                          <div className="text-xs uppercase font-bold text-gray-500 mb-2 border-b border-gray-200 pb-2 flex-shrink-0 tracking-wide">
                            Documents on File
                          </div>
                          <ul className="flex-1 overflow-y-auto space-y-2 text-sm text-gray-700 pr-2">
                            {activeStudentDocs.length === 0 ? (
                              <li className="text-gray-500 font-medium text-sm">
                                No documents found.
                              </li>
                            ) : (
                              activeStudentDocs.map((doc) => (
                                <li key={doc.id}>
                                  <button
                                    onClick={() =>
                                      previewDocument(
                                        doc.doc_type,
                                        activeStudent.name,
                                        activeStudent.studentNo,
                                        doc.id
                                      )
                                    }
                                    className="group flex items-center gap-3 w-full text-left p-2 rounded-brand hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-300"
                                  >
                                    <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-pup-maroon group-hover:bg-pup-maroon group-hover:text-white transition-colors">
                                      <i className="ph-fill ph-file-pdf text-lg"></i>
                                    </div>
                                    <span className="text-gray-700 group-hover:text-pup-maroon font-bold group-hover:underline underline-offset-2">
                                      {doc.doc_type}
                                    </span>
                                    <i className="ph-bold ph-arrow-square-out text-gray-400 ml-auto group-hover:text-pup-maroon opacity-0 group-hover:opacity-100 transition-all"></i>
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div
          id="view-upload"
          className={`${
            view === "upload" ? "flex" : "hidden"
          } flex-col lg:flex-row w-full h-full gap-4`}
        >
          <section className="w-full lg:w-1/2 bg-white rounded-brand border border-gray-300 flex flex-col h-full p-8 items-center justify-center shadow-sm relative">
            {uploadMode === "csv" ? (
              <div className="w-full h-full border border-gray-200 rounded-brand bg-white overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    CSV Preview
                  </div>
                  <div className="mt-1 text-sm font-bold text-gray-900 break-all">
                    {csvFile ? csvFile.name : "No CSV selected"}
                  </div>
                  <div className="mt-2 text-xs font-medium text-gray-600">
                    {csvRows.length ? (
                      <>
                        {csvRows.length} rows
                        {" · "}
                        {csvRows.filter((r) => r.error).length} invalid
                        {csvRows.filter((r) => r.error).length === 0 ? " · All valid" : ""}
                      </>
                    ) : (
                      "Select a CSV file to preview it here."
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto">
                  {csvRows.length ? (
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
                        <tr className="text-left text-[11px] uppercase tracking-wider text-gray-600">
                          <th className="p-1.5 font-bold w-8">
                            <input
                              type="checkbox"
                              checked={
                                csvRows.length > 0 &&
                                Object.values(csvSelected).filter(Boolean).length === csvRows.length
                              }
                              onChange={(e) => toggleCsvSelectAll(e.target.checked)}
                            />
                          </th>
                          <th className="p-1.5 font-bold">#</th>
                          <th className="p-1.5 font-bold">Student No</th>
                          <th className="p-1.5 font-bold">Name</th>
                          <th className="p-1.5 font-bold">Course</th>
                          <th className="p-1.5 font-bold">Year</th>
                          <th className="p-1.5 font-bold">Section</th>
                          <th className="p-1.5 font-bold">Room</th>
                          <th className="p-1.5 font-bold">Cab</th>
                          <th className="p-1.5 font-bold">Drawer</th>
                          <th className="p-1.5 font-bold">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvRows.slice(0, 100).map((r) => (
                          <tr key={r.index} className={csvSelected?.[r.index] ? "bg-gray-50" : ""}>
                            <td className="p-1.5">
                              <input
                                type="checkbox"
                                checked={!!csvSelected?.[r.index]}
                                onChange={() => toggleCsvRowSelected(r.index)}
                              />
                            </td>
                            <td className="p-1.5 text-gray-500 font-mono">{r.index}</td>
                            <td className="p-1.5 font-mono">{r.student.studentNo}</td>
                            <td className="p-1.5">{r.student.name}</td>
                            <td className="p-1.5">{r.student.courseCode}</td>
                            <td className="p-1.5">{r.student.yearLevel}</td>
                            <td className="p-1.5">{r.student.section}</td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-9 text-[11px] leading-none px-1 py-0 w-14"
                                value={String(r.student.room || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "room", parseInt(e.target.value))
                                }
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((room) => (
                                  <option key={room} value={room}>
                                    {room}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-9 text-[11px] leading-none px-1 py-0 w-12"
                                value={String(r.student.cabinet || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "cabinet", e.target.value)
                                }
                              >
                                {cabinets.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              <select
                                className="form-select h-9 text-[11px] leading-none px-1 py-0 w-14"
                                value={String(r.student.drawer || "")}
                                onChange={(e) =>
                                  setCsvRowField(r.index, "drawer", parseInt(e.target.value))
                                }
                              >
                                {[1, 2, 3, 4].map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5">
                              {r.error ? (
                                <span className="text-red-700 font-bold text-xs">{r.error}</span>
                              ) : (
                                <span className="text-green-700 font-bold text-xs">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-8">
                      <div className="text-gray-500">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                          <i className="ph-thin ph-file-csv text-4xl text-pup-maroon"></i>
                        </div>
                        <div className="font-bold text-gray-800 text-lg">Upload a CSV to preview</div>
                        <div className="mt-2 text-sm font-medium text-gray-600">
                          The parsed rows will appear here once selected.
                        </div>
                      </div>
                    </div>
                  )}
                  {csvRows.length > 100 ? (
                    <div className="p-3 border-t border-gray-200 text-xs font-medium text-gray-600">
                      Showing first 100 rows.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-full border-2 border-dashed border-gray-400 rounded-brand bg-gray-50 p-8 flex flex-col items-center justify-center cursor-pointer hover:border-pup-maroon hover:bg-red-50/50 transition-all group relative ${
                  dropActive ? "bg-red-50" : ""
                }`}
                onClick={(e) => {
                  if (uploadedFile) return;
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDropActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropActive(false);
                  handleFileSelect(e.dataTransfer.files[0]);
                }}
              >
                <div className="text-center pointer-events-none">
                  <div className="w-20 h-20 mx-auto rounded-full bg-white border border-gray-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <i className="ph-thin ph-file-pdf text-4xl text-pup-maroon"></i>
                  </div>
                  <h3 className="font-bold text-xl text-gray-800">Drop PDF File Here</h3>
                  <p className="text-sm text-gray-500 mt-2 font-medium">
                    or click to browse local files
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {uploadedFile ? (
                  <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6 rounded-brand">
                    <i className="ph-fill ph-file-pdf text-6xl text-pup-maroon mb-4"></i>
                    <h4 className="font-bold text-gray-900 text-lg text-center break-all mb-1 max-w-sm">
                      {uploadedFile.name}
                    </h4>
                    <span className="text-sm text-gray-500 mb-6 font-medium">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </span>

                    {uploadMode === "new" && ocrLoading ? (
                      <div className="mb-4 text-sm font-bold text-gray-700">
                        Scanning PDF (OCR)...
                      </div>
                    ) : null}

                    {uploadMode === "new" && ocrError ? (
                      <div className="mb-4 text-sm font-bold text-red-700 text-center max-w-md">
                        {ocrError}
                      </div>
                    ) : null}

                    <button
                      onClick={clearFile}
                      className="px-6 py-2.5 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                    >
                      Remove File
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {ocrLoading && uploadMode !== "csv" ? (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-brand">
                <div className="w-12 h-12 rounded-full border-4 border-gray-300 border-t-pup-maroon animate-spin"></div>
                <div className="mt-3 text-sm font-bold text-gray-800">Scanning file…</div>
                <div className="mt-1 text-xs font-medium text-gray-600">Working offline (LAN)</div>
              </div>
            ) : null}
          </section>
          <section className="w-full lg:w-1/2 bg-white rounded-brand border border-gray-300 flex flex-col h-full shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-pup-maroon mb-1">Tag Document</h2>
              <p className="text-sm text-gray-600">
                Associate this file with a student record.
              </p>

              <div className="flex gap-6 mt-6 border-b border-gray-200">
                <button
                  className={`tab-btn ${uploadMode === "existing" ? "active" : ""}`}
                  onClick={() => {
                    setUploadMode("existing");
                    setUploadError("");
                  }}
                >
                  Existing Student
                </button>
                <button
                  className={`tab-btn ${uploadMode === "new" ? "active" : ""}`}
                  onClick={() => {
                    setUploadMode("new");
                    setUploadError("");
                  }}
                >
                  New Student
                </button>
                <button
                  className={`tab-btn ${uploadMode === "csv" ? "active" : ""}`}
                  onClick={() => {
                    setUploadMode("csv");
                    setUploadError("");
                    setCsvError("");
                    setCsvResults([]);
                  }}
                >
                  Batch (CSV)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <datalist id="docTypeOptions">
                {docTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>

              <datalist id="existingYearOptions">
                {existingAvailYears.map((y) => (
                  <option key={y} value={String(y)} />
                ))}
              </datalist>

              <datalist id="newYearOptions">
                {newAvailYears.map((y) => (
                  <option key={y} value={String(y)} />
                ))}
              </datalist>

              {uploadMode === "existing" ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Course / Program
                    </label>
                    <select
                      className="form-select"
                      value={exist.course}
                      onChange={(e) => {
                        setUploadError("");
                        setExist((p) => ({
                          ...p,
                          course: e.target.value,
                          section: "",
                          studentId: "",
                        }));
                      }}
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Academic Year
                      </label>
                      <input
                        className="form-select no-glow"
                        list="existingYearOptions"
                        value={exist.year}
                        inputMode="numeric"
                        placeholder="e.g. 2025"
                        onChange={(e) => {
                          setUploadError("");
                          setExist((p) => ({
                            ...p,
                            year: e.target.value,
                            section: "",
                            studentId: "",
                          }));
                        }}
                      />
                      <datalist id="existingYearOptions">
                        {existingAvailYears.map((y) => (
                          <option key={y} value={String(y)} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Section
                      </label>
                      <select
                        className="form-select"
                        value={exist.section}
                        onChange={(e) => {
                          setUploadError("");
                          setExist((p) => ({
                            ...p,
                            section: e.target.value,
                            studentId: "",
                          }));
                        }}
                      >
                        <option value="">Select Section...</option>
                        {existingAvailSections.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Student Name
                    </label>
                    <select
                      className="form-select"
                      disabled={!exist.course || !exist.year || !exist.section}
                      value={exist.studentId}
                      onChange={(e) => {
                        setUploadError("");
                        setExist((p) => ({ ...p, studentId: e.target.value }));
                      }}
                    >
                      <option value="">
                        {exist.course && exist.year && exist.section
                          ? "Select Student..."
                          : "Filter options first..."}
                      </option>
                      {existingStudents.map((s) => (
                        <option key={s.studentNo} value={s.studentNo}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Document Type
                    </label>

                    <input
                      className="form-select no-glow"
                      list="docTypeOptions"
                      value={exist.docType}
                      placeholder="Type document type..."
                      onChange={(e) => {
                        setUploadError("");
                        setExist((p) => ({ ...p, docType: e.target.value }));
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={processSubmission}
                    className="w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-upload-simple"></i> Submit Upload
                  </button>

                  {uploadError ? (
                    <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                      {uploadError}
                    </div>
                  ) : null}
                </div>
              ) : uploadMode === "new" ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Student Number
                      </label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="202X-XXXXX-MN-0"
                        ref={newStudentNoInputRef}
                        value={newRec.studentNo}
                        onKeyDown={(e) => {
                          if (e.key !== "Backspace") return;
                          const el = e.currentTarget;
                          const start = el.selectionStart;
                          const end = el.selectionEnd;
                          if (start == null || end == null) return;
                          if (start !== end) return;
                          if (start <= 0) return;
                          const v = String(el.value || "");
                          if (v[start - 1] !== "-") return;
                          if (start < 2) return;

                          e.preventDefault();

                          const raw = v.slice(0, start - 2) + v.slice(start - 1);
                          const masked = applyStudentNoMask(raw);
                          setNewRec((p) => ({
                            ...p,
                            studentNo: masked.value,
                          }));

                          const nextPos = Math.max(0, start - 2);
                          requestAnimationFrame(() => {
                            const node = newStudentNoInputRef.current;
                            if (!node) return;
                            try {
                              node.setSelectionRange(nextPos, nextPos);
                            } catch {
                              // ignore
                            }
                          });
                        }}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRecStudentNoTouched(true);
                          const masked = applyStudentNoMask(e.target.value);
                          setNewRec((p) => ({
                            ...p,
                            studentNo: masked.value,
                          }));

                          if (masked.invalid) {
                            setNewRecStudentNoHint(
                              "Wrong input type: use numbers first, then letters (AA), then a number."
                            );
                          } else {
                            setNewRecStudentNoHint("");
                          }
                        }}
                        onBlur={() => setNewRecStudentNoTouched(true)}
                      />
                      {newRecStudentNoHint ? (
                        <div className="mt-2 text-xs font-bold text-red-700">
                          {newRecStudentNoHint}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Last Name, First Name"
                        value={newRec.name}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({ ...p, name: e.target.value }));
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Course / Program
                    </label>
                    <select
                      className="form-select"
                      value={newRec.course}
                      onChange={(e) => {
                        setUploadError("");
                        setNewRec((p) => ({ ...p, course: e.target.value }));
                      }}
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Academic Year
                      </label>
                      <input
                        className="form-select no-glow"
                        list="newYearOptions"
                        value={newRec.year}
                        inputMode="numeric"
                        placeholder="e.g. 2025"
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({
                            ...p,
                            year: e.target.value,
                            sectionPart: "",
                          }));
                        }}
                      />
                      <datalist id="newYearOptions">
                        {newAvailYears.map((y) => (
                          <option key={y} value={String(y)} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Section
                      </label>
                      <select
                        className="form-select"
                        value={newRec.sectionPart}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({ ...p, sectionPart: e.target.value }));
                        }}
                        disabled={!newRec.year}
                      >
                        <option value="">
                          {newRec.year ? "Select Section..." : "Select year first..."}
                        </option>
                        <option value="1">Section 1</option>
                        <option value="2">Section 2</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Room
                      </label>
                      <select
                        className="form-select"
                        value={newRec.room}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({ ...p, room: e.target.value }));
                        }}
                      >
                        <option value="">Room...</option>
                        {rooms.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Cabinet
                      </label>
                      <select
                        className="form-select"
                        value={newRec.cabinet}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({ ...p, cabinet: e.target.value }));
                        }}
                      >
                        <option value="">Cab...</option>
                        {cabinets.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Drawer
                      </label>
                      <select
                        className="form-select"
                        value={newRec.drawer}
                        onChange={(e) => {
                          setUploadError("");
                          setNewRec((p) => ({ ...p, drawer: e.target.value }));
                        }}
                      >
                        <option value="">D...</option>
                        {[1, 2, 3, 4].map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Document Type
                    </label>
                    <input
                      className="form-select no-glow"
                      list="docTypeOptions"
                      value={newRec.docType}
                      placeholder="Type document type..."
                      onChange={(e) => {
                        setUploadError("");
                        setNewRec((p) => ({ ...p, docType: e.target.value }));
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={processSubmission}
                    className="w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-upload-simple"></i> Submit Upload
                  </button>

                  {uploadError ? (
                    <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                      {uploadError}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      CSV File
                    </label>
                    <div className="flex gap-3">
                      <input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="block w-full text-sm text-gray-600 file:mr-3 file:h-11 file:px-4 file:rounded-brand file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-bold hover:file:border-pup-maroon"
                        onChange={(e) => handleCsvFileSelect(e.target.files?.[0] || null)}
                      />
                      <div
                        className={`flex-shrink-0 w-32 h-11 rounded-brand border-2 border-dashed border-gray-400 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-pup-maroon hover:bg-red-50/50 transition-all ${csvDropActive ? 'bg-red-50 border-pup-maroon' : ''}`}
                        onClick={() => csvInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setCsvDropActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          setCsvDropActive(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCsvDropActive(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                            handleCsvFileSelect(file);
                          } else {
                            setCsvError('Please drop a CSV file');
                          }
                        }}
                      >
                        <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                          <i className="ph-bold ph-upload-simple"></i> Drop CSV
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs font-medium text-gray-600">
                      Required columns:
                      <span className="font-mono"> studentNo, name, courseCode, academicYear, section, room, cabinet, drawer</span>
                    </div>
                  </div>

                  {csvError ? (
                    <div className="p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                      {csvError}
                    </div>
                  ) : null}

                  <div className="border border-gray-200 rounded-brand overflow-hidden bg-white">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Bulk Edit Selected
                      </div>
                      <div className="mt-1 text-sm font-bold text-gray-900">
                        {Object.values(csvSelected).filter(Boolean).length} selected
                      </div>
                    </div>

                    <div className="p-3 border-b border-gray-200 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                            Bulk Room
                          </label>
                          <select
                            className="form-select"
                            value={csvBulkRoom}
                            onChange={(e) => setCsvBulkRoom(e.target.value)}
                          >
                            <option value="">No change</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                              <option key={r} value={String(r)}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                            Bulk Cabinet
                          </label>
                          <select
                            className="form-select"
                            value={csvBulkCabinet}
                            onChange={(e) => setCsvBulkCabinet(e.target.value)}
                          >
                            <option value="">No change</option>
                            {cabinets.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                            Bulk Drawer
                          </label>
                          <select
                            className="form-select"
                            value={csvBulkDrawer}
                            onChange={(e) => setCsvBulkDrawer(e.target.value)}
                          >
                            <option value="">No change</option>
                            {[1, 2, 3, 4].map((d) => (
                              <option key={d} value={String(d)}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col lg:flex-row gap-2">
                        <button
                          type="button"
                          onClick={applyCsvBulkLocation}
                          className="px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900"
                          disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                        >
                          Apply to Selected
                        </button>
                        <button
                          type="button"
                          onClick={() => setCsvSelected({})}
                          className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                          disabled={Object.values(csvSelected).filter(Boolean).length === 0}
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={importCsvStudents}
                    disabled={csvLoading}
                    className={`w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2 ${
                      csvLoading ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                  >
                    {csvLoading ? "Importing..." : "Import Students"}
                  </button>

                  {csvResults.length ? (
                    <div className="p-4 rounded-brand border border-gray-200 bg-white">
                      <div className="text-sm font-bold text-gray-800">
                        Import Summary
                      </div>
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        {csvResults.filter((r) => r.ok).length} created
                        {" · "}
                        {csvResults.filter((r) => !r.ok).length} failed
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>

        <div
          id="view-documents"
          className={`${
            view === "documents" ? "flex" : "hidden"
          } flex-col w-full h-full gap-4`}
        >
          <section className="bg-white rounded-brand border border-gray-300 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-pup-maroon">Documents</h2>
                <p className="text-sm text-gray-600">
                  Stored locally in <code>.local/</code> (SQLite + uploaded PDFs).
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50">
              <form onSubmit={uploadDocument} className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Student No
                  </label>
                  <input
                    className="form-input font-mono h-11"
                    value={docsForm.studentNo}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDocsForm((p) => {
                        const next = { ...p, studentNo: v };
                        refreshDocuments(next);
                        return next;
                      });
                    }}
                    placeholder="202X-XXXXX-MN-0"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Student Name
                  </label>
                  <input
                    className="form-input h-11"
                    value={docsForm.studentName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDocsForm((p) => {
                        const next = { ...p, studentName: v };
                        refreshDocuments(next);
                        return next;
                      });
                    }}
                    placeholder="Optional"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Document Type
                  </label>
                  <select
                    className="form-select h-11"
                    value={docsForm.docType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDocsForm((p) => {
                        const next = { ...p, docType: v };
                        refreshDocuments(next);
                        return next;
                      });
                    }}
                    required
                  >
                    <option value="">Select Type...</option>
                    {docTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    PDF File
                  </label>
                  <input
                    ref={docsFileInputRef}
                    type="file"
                    accept=".pdf"
                    className="block w-full h-11 text-sm text-gray-600 file:mr-3 file:h-11 file:px-4 file:rounded-brand file:border file:border-gray-300 file:bg-white file:text-gray-700 file:font-bold hover:file:border-pup-maroon"
                    onChange={(e) => setDocsFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>

                <div className="lg:col-span-1 flex gap-2">
                  <button
                    type="submit"
                    disabled={docsLoading}
                    className={`flex-1 bg-pup-maroon text-white h-11 rounded-brand font-bold text-sm hover:bg-red-900 transition-colors ${
                      docsLoading ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocsFile(null);
                      if (docsFileInputRef.current) docsFileInputRef.current.value = "";
                    }}
                    className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                  >
                    Clear
                  </button>
                </div>
              </form>

              {docsError ? (
                <div className="mt-4 p-3 rounded-brand bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
                  {docsError}
                </div>
              ) : null}
            </div>

            <div className="p-6">
              <div className="max-h-[60vh] overflow-y-auto overflow-x-auto border border-gray-200 rounded-brand">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                      <th className="p-3 font-bold">Student No</th>
                      <th className="p-3 font-bold">Name</th>
                      <th className="p-3 font-bold">Type</th>
                      <th className="p-3 font-bold">Status</th>
                      <th className="p-3 font-bold">File</th>
                      <th className="p-3 font-bold">Created</th>
                      <th className="p-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {docsLoading ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500 font-medium">
                          Loading...
                        </td>
                      </tr>
                    ) : !(
                        docsForm.studentNo.trim() ||
                        docsForm.studentName.trim() ||
                        docsForm.docType.trim()
                      ) ? null : docsRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500 font-medium">
                          No matching students found.
                        </td>
                      </tr>
                    ) : (
                      docsRows.map((r) => (
                        <tr
                          key={r.key}
                          className={`hover:bg-gray-50 ${
                            r.status === "uploaded" ? "bg-green-50/40" : "bg-red-50/40"
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-gray-900">
                            {r.student_no}
                          </td>
                          <td className="p-3 text-gray-800 font-medium">
                            {r.student_name || "—"}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-pup-maroon border border-red-100 text-xs font-bold">
                              {r.doc_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {r.status === "uploaded" ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-800 border border-green-200 text-xs font-bold">
                                Uploaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-700">
                            {r.doc ? (
                              <>
                                {r.doc.original_filename}
                                <div className="text-xs text-gray-500 font-mono">
                                  {(r.doc.size_bytes / 1024).toFixed(1)} KB
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 font-medium">Not uploaded</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-600 font-medium">
                            {r.doc ? String(r.doc.created_at || "").replace("T", " ") : "—"}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              {r.doc ? (
                                <>
                                  <a
                                    className="px-3 h-11 inline-flex items-center rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                                    href={`/api/documents/${r.doc.id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Open
                                  </a>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!r.doc?.id) return;
                                      const nextStudentNo = prompt(
                                        "Update Student No:",
                                        String(r.student_no || "")
                                      );
                                      if (nextStudentNo === null) return;

                                      const nextStudentName = prompt(
                                        "Update Student Name (optional):",
                                        String(r.student_name || "")
                                      );
                                      if (nextStudentName === null) return;

                                      const nextDocType = prompt(
                                        "Update Document Type:",
                                        String(r.doc_type || "")
                                      );
                                      if (nextDocType === null) return;

                                      await updateDoc(r.doc.id, {
                                        studentNo: String(nextStudentNo).trim(),
                                        studentName: String(nextStudentName).trim(),
                                        docType: String(nextDocType).trim(),
                                      });
                                    }}
                                    className="px-3 h-11 rounded-brand bg-pup-maroon text-white font-bold text-xs hover:bg-red-900"
                                  >
                                    Update
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-gray-500 font-medium">
                  {docsForm.studentNo.trim() || docsForm.studentName.trim() || docsForm.docType.trim()
                    ? `Showing ${docsRows.length} documents`
                    : ""}
                </div>
                <button
                  type="button"
                  onClick={() => refreshDocuments(docsForm)}
                  className="px-4 h-11 rounded-brand bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                >
                  Refresh
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div
        id="previewModal"
        className={`${previewOpen ? "flex" : "hidden"} fixed inset-0 z-50 bg-black/60 items-center justify-center`}
        onClick={(e) => {
          if (e.target.id === "previewModal") closeModal();
        }}
      >
        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-brand shadow-2xl overflow-hidden flex flex-col animate-scale-in">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-2 rounded-brand border border-red-100">
                <i className="ph-fill ph-file-pdf text-2xl text-pup-maroon"></i>
              </div>
              <div>
                <h3 className="font-bold text-pup-maroon text-lg leading-tight">
                  {preview.docType}
                </h3>
                <p className="text-sm text-gray-700 font-medium">
                  {preview.studentName}
                </p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="text-gray-500 hover:text-pup-maroon transition-colors p-2 rounded-brand"
            >
              <i className="ph-bold ph-x text-xl"></i>
            </button>
          </div>

          <div className="flex-1 bg-gray-100 p-0 flex flex-col overflow-hidden relative">
            <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                REF: <span className="font-mono">{preview.refId}</span>
              </div>
              {preview.docId ? (
                <a
                  className="px-3 py-2 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-xs hover:border-pup-maroon"
                  href={`/api/documents/${preview.docId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in New Tab
                </a>
              ) : null}
            </div>

            {preview.docId ? (
              <iframe
                title="PDF Preview"
                src={`/api/documents/${preview.docId}`}
                className="w-full flex-1 bg-gray-200"
              />
            ) : (
              <div className="flex-1 p-6 flex items-center justify-center">
                <div className="max-w-lg text-center text-sm text-gray-600 font-medium">
                  No PDF is linked to this preview.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        id="ocrPromptModal"
        className={`${ocrPromptOpen ? "flex" : "hidden"} fixed inset-0 z-50 bg-black/60 items-center justify-center p-4`}
        onClick={(e) => {
          if (e.target.id === "ocrPromptModal") setOcrPromptOpen(false);
        }}
      >
        <div className="w-full max-w-lg bg-white rounded-brand border border-gray-300 shadow-lg p-6">
          <div className="text-lg font-bold text-pup-maroon">Detected from PDF</div>
          <div className="mt-2 text-sm text-gray-700 font-medium">
            Review the detected info and choose where to apply it.
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <div className="text-gray-600 font-bold">Student No</div>
              <div className="text-gray-900 font-mono font-bold text-right break-all">
                {ocrSuggestion?.studentNo || "(not detected)"}
              </div>
            </div>
            <div className="flex justify-between gap-4">
              <div className="text-gray-600 font-bold">Name</div>
              <div className="text-gray-900 font-bold text-right break-words">
                {ocrSuggestion?.name || "(not detected)"}
              </div>
            </div>
            <div className="flex justify-between gap-4">
              <div className="text-gray-600 font-bold">Document Type</div>
              <div className="text-gray-900 font-bold text-right break-words">
                {ocrSuggestion?.docType || "(not detected)"}
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200">
              {ocrSuggestion?.matchedStudent ? (
                <div className="text-xs font-bold text-green-700">
                  Student found in database: {ocrSuggestion.matchedStudent.name}
                </div>
              ) : (
                <div className="text-xs font-bold text-gray-600">
                  No exact student match found (by Student No).
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={applyOcrToExistingStudent}
              disabled={!ocrSuggestion?.matchedStudent}
              className={`w-full h-11 rounded-brand font-bold text-sm border ${
                ocrSuggestion?.matchedStudent
                  ? "bg-pup-maroon text-white hover:bg-red-900"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
            >
              Apply to Existing Student
            </button>
            <button
              type="button"
              onClick={applyOcrToNewStudent}
              className="w-full h-11 rounded-brand font-bold text-sm bg-white border border-gray-300 text-gray-700 hover:border-pup-maroon"
            >
              Use as New Student Prefill
            </button>
            <button
              type="button"
              onClick={() => setOcrPromptOpen(false)}
              className="w-full h-11 rounded-brand font-bold text-sm bg-white text-gray-600 hover:text-gray-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <div
        id="docTypeModal"
        className={`${docTypeModalOpen ? "flex" : "hidden"} fixed inset-0 z-50 bg-black/60 items-center justify-center p-4`}
        onClick={(e) => {
          if (e.target.id === "docTypeModal") closeDocTypeModal();
        }}
      >
        <div className="w-full max-w-md bg-white rounded-brand border border-gray-200 shadow-2xl overflow-hidden animate-scale-in">
          <div className="p-5 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
            <h3 className="font-bold text-pup-maroon">Add Document Type</h3>
            <button
              type="button"
              onClick={closeDocTypeModal}
              className="text-gray-500 hover:text-pup-maroon transition-colors p-2 rounded-brand"
            >
              <i className="ph-bold ph-x text-lg"></i>
            </button>
          </div>

          <div className="p-5">
            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
              Document Type
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter new document type..."
              value={docTypeModalValue}
              onChange={(e) => {
                setDocTypeModalError("");
                setDocTypeModalValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveDocTypeModal();
                }
              }}
              autoFocus
            />

            {docTypeModalError ? (
              <div className="mt-3 p-3 rounded-brand border border-red-200 bg-red-50 text-red-800 text-sm font-bold">
                {docTypeModalError}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDocTypeModal}
                className="px-4 h-11 rounded-brand bg-white border border-gray-300 text-gray-700 font-bold text-sm hover:border-pup-maroon"
                disabled={docTypeModalLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDocTypeModal}
                className={`px-4 h-11 rounded-brand bg-pup-maroon text-white font-bold text-sm hover:bg-red-900 ${
                  docTypeModalLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                disabled={docTypeModalLoading}
              >
                {docTypeModalLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed top-5 left-1/2 -translate-x-1/2 transform transition-all duration-300 z-50 px-4 py-3 rounded-brand shadow-lg flex items-center gap-3 ${
          toast.open ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        } ${toast.isError ? "bg-red-800" : "bg-gray-800"} text-white`}
      >
        <i
          className={`ph-fill ${
            toast.isError ? "ph-warning-circle" : "ph-check-circle"
          } ${toast.isError ? "text-red-200" : "text-green-400"} text-xl`}
        ></i>
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>
    </div>
  );
}
