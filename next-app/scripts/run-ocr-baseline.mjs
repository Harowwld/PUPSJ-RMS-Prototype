import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { detectName, formatToLNFnMi, scanFileForSuggestion } from "../src/lib/ocrClient.js";
import { matchStudentsByConfiguredOcrName, matchStudentsByOcrText, mergeStudentMatchCandidates } from "../src/lib/studentNameMatcher.js";

const consoleLog = console.log;
const consoleInfo = console.info;
console.log = () => {};
console.info = () => {};

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const fixtureRoot = path.join(appRoot, "test/fixtures/ocr-baseline");
const reportPath = path.join(fixtureRoot, "baseline-report.md");
const live = process.argv.includes("--live-ocr");
const tierLabels = { Q1: "Pristine digital", Q2: "Compressed / low resolution", Q3: "Skewed / rotated", Q4: "Noisy / scan artifacts", Q5: "Low contrast / photocopy" };

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diagonal : Math.min(diagonal + 1, row[j] + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  return row[b.length];
}
function normalizeName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}
function wordDistance(a, b) { return editDistance(a ? a.split(" ") : [], b ? b.split(" ") : []); }
function substitutions(reference, observed) {
  const dp = Array.from({ length: reference.length + 1 }, () => Array(observed.length + 1).fill(0));
  for (let i = 0; i <= reference.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= observed.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= reference.length; i += 1) for (let j = 1; j <= observed.length; j += 1) {
    dp[i][j] = reference[i - 1] === observed[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j - 1] + 1, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
  }
  const counts = new Map();
  let i = reference.length, j = observed.length;
  while (i || j) {
    if (i && j && reference[i - 1] === observed[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { i -= 1; j -= 1; }
    else if (i && j && dp[i][j] === dp[i - 1][j - 1] + 1) {
      const key = `${reference[i - 1]}→${observed[j - 1]}`; counts.set(key, (counts.get(key) || 0) + 1); i -= 1; j -= 1;
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) i -= 1;
    else j -= 1;
  }
  return counts;
}
function pct(n, d) { return d ? `${(100 * n / d).toFixed(1)}%` : "N/A (n=0)"; }
function mean(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function cell(value) { return value == null ? "N/A" : value; }

async function readFixtures() {
  const manifest = JSON.parse(await fs.readFile(path.join(fixtureRoot, "manifest.json"), "utf8"));
  const payload = JSON.parse(await fs.readFile(path.join(fixtureRoot, "observations.json"), "utf8"));
  const observations = payload.observations || payload;
  manifest.docTypes ||= payload.docTypes || [...new Set(manifest.cases.map((item) => item.docType))];
  return { manifest, observations };
}

async function replay({ manifest, observations }) {
  const results = [];
  for (const item of manifest.cases) {
    const observation = observations[item.caseId]?.[item.qualityTier];
    if (!observation) throw new Error(`Missing replay observation for ${item.caseId}/${item.qualityTier}`);
    const expected = item.expected || {};
    const rawText = String(observation.rawText ?? "");
    const startedAt = performance.now();
    const suggestion = await scanFileForSuggestion({
      file: { type: "application/pdf", name: path.basename(item.pdfPath || `${item.caseId}.pdf`) },
      docTypes: manifest.docTypes || [],
      matchStudents: false,
      ocrContext: { ...observation, rawText, engine: observation.engine || "constructed-replay" },
    });
    const extracted = suggestion.coordinateRecognition?.extractedName || formatToLNFnMi(detectName(rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)));
    const nameText = normalizeName(extracted || "");
    const truthName = normalizeName(item.name?.display || item.name || "");
    const printed = item.printedStudentNo ?? Boolean(item.studentNo);
    const numberText = printed && item.studentNo ? rawText.match(/\b\d{4}-\d{5}(?:-SJ-0)?\b/)?.[0] || "" : "";
    const truthNumber = printed ? String(item.studentNo || "") : "";
    const numberExact = printed ? numberText === truthNumber : null;
    const rosterSource = manifest.roster || manifest.cases.map((c) => ({ studentNo: c.rosterStudentNo || c.studentNo, name: c.name?.display || c.name })).filter((s) => s.studentNo);
    const roster = [...new Map(rosterSource.map((student) => [String(student.studentNo || student.student_no), student])).values()];
    const targetStudentNo = item.rosterStudentNo || item.studentNo || null;
    const matchingStartedAt = performance.now();
    const extractedForMatch = suggestion.coordinateRecognition?.extractedName || extracted;
    const candidates = extractedForMatch || rawText
      ? mergeStudentMatchCandidates(
        matchStudentsByConfiguredOcrName(extractedForMatch, roster),
        matchStudentsByOcrText(rawText, roster),
      )
      : [];
    const matchingMs = performance.now() - matchingStartedAt;
    results.push({
      ...item,
      rawText,
      observation,
      suggestion,
      truthName,
      nameText,
      nameCERErrors: truthName ? editDistance([...truthName].filter((c) => c !== " ").join(""), [...nameText].filter((c) => c !== " ").join("")) : null,
      nameCERChars: truthName ? [...truthName].filter((c) => c !== " ").length : null,
      nameWERErrors: truthName ? wordDistance(truthName, nameText) : null,
      nameWERWords: truthName ? truthName.split(" ").filter(Boolean).length : null,
      nameCER: truthName ? editDistance([...truthName].filter((c) => c !== " ").join(""), [...nameText].filter((c) => c !== " ").join("")) / [...truthName].filter((c) => c !== " ").length : null,
      nameWER: truthName ? wordDistance(truthName, nameText) / truthName.split(" ").filter(Boolean).length : null,
      numberText,
      numberExact,
      candidates,
      rosterLength: roster.length,
      targetStudentNo,
      targetFound: Boolean(targetStudentNo && candidates.some((candidate) => candidate.studentNo === targetStudentNo)),
      wrongCandidates: candidates.filter((candidate) => candidate.studentNo !== targetStudentNo).map((candidate) => candidate.studentNo),
      endToEndMs: performance.now() - startedAt,
      replayTimings: { templateMs: suggestion.timings?.templateMs, matchingMs },
      replayProvenance: observation.provenance || "unspecified; inspect fixture source",
      expected,
    });
  }
  return results;
}

async function runNative(results) {
  const baseUrl = process.env.OCR_BASE_URL || "http://localhost:3000";
  let cookie = process.env.OCR_SESSION_COOKIE || "";
  let csrfToken = process.env.OCR_CSRF_TOKEN || "";
  if (!cookie && process.env.OCR_USERNAME && process.env.OCR_PASSWORD) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: process.env.OCR_USERNAME, password: process.env.OCR_PASSWORD }),
      });
      if (!response.ok) throw new Error(`Normal staff login returned HTTP ${response.status}; credentials are not printed.`);
      const setCookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
      const cookiePairs = setCookies.map((value) => value.split(";")[0]).filter(Boolean);
      cookie = cookiePairs.join("; ");
      const csrfCookie = cookiePairs.find((value) => value.startsWith("pup_csrf="))?.slice("pup_csrf=".length);
      csrfToken ||= csrfCookie ? decodeURIComponent(csrfCookie) : "";
    } catch (error) {
      return results.map((item) => ({ caseId: item.caseId, docType: item.docType, qualityTier: item.qualityTier, printedStudentNo: item.printedStudentNo, failed: true, error: error.message }));
    }
  }
  if (!cookie) return results.map((item) => ({ caseId: item.caseId, docType: item.docType, qualityTier: item.qualityTier, printedStudentNo: item.printedStudentNo, failed: true, error: "No normal staff session available" }));
  const roster = [...new Map(results.map((item) => [String(item.targetStudentNo), { studentNo: item.targetStudentNo, name: item.name?.display || item.name }]).filter(([studentNo]) => studentNo !== "null")).values()];
  const native = [];
  for (const item of results) {
    const pdfPath = path.resolve(fixtureRoot, item.pdfPath);
    const bytes = await fs.readFile(pdfPath);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(pdfPath));
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/ingest/ocr`, {
        method: "POST",
        headers: { Cookie: cookie, Origin: baseUrl, ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}) },
        body: form,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        native.push({ caseId: item.caseId, docType: item.docType, qualityTier: item.qualityTier, printedStudentNo: item.printedStudentNo, failed: true, error: payload?.error || `HTTP ${response.status}` });
        continue;
      }
      const number = item.studentNo && (payload.text || "").match(/\b\d{4}-\d{5}(?:-SJ-0)?\b/)?.[0] || "";
      const nameStartedAt = performance.now();
      const extracted = normalizeName(formatToLNFnMi(detectName(String(payload.text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean))));
      const nameProcessingMs = performance.now() - nameStartedAt;
      const expected = normalizeName(item.name?.display || item.name || "");
      const expectedChars = expected.replace(/ /g, "");
      const matchingStartedAt = performance.now();
      const rawText = String(payload.text || "");
      const candidates = extracted || rawText
        ? mergeStudentMatchCandidates(
          matchStudentsByConfiguredOcrName(extracted, roster),
          matchStudentsByOcrText(rawText, roster),
        )
        : [];
      const matchingMs = performance.now() - matchingStartedAt;
      const targetStudentNo = item.targetStudentNo || item.studentNo || null;
      const targetFound = Boolean(targetStudentNo && candidates.some((candidate) => candidate.studentNo === targetStudentNo));
      const wrongCandidates = candidates.filter((candidate) => candidate.studentNo !== targetStudentNo).map((candidate) => candidate.studentNo);
      const associationEligible = Boolean(targetStudentNo && expected.replace(/[^A-Z]/g, "").length >= 8);
      const printedStudentNo = item.printedStudentNo ?? Boolean(item.studentNo);
      native.push({
        caseId: item.caseId, docType: item.docType, qualityTier: item.qualityTier, printedStudentNo, studentNo: item.studentNo, targetStudentNo, targetFound, wrongCandidates, rosterLength: roster.length, associationEligible, failed: false,
        expectedName: item.name?.display || item.name, extractedName: extracted, rawText,
        engine: payload.engine || "unknown", platform: process.platform,
        ocrMs: Number(payload.timings?.ocrMs) || null,
        templateMs: null, nameProcessingMs, matchingMs,
        endToEndMs: performance.now() - startedAt,
        nameCERErrors: expectedChars ? editDistance(expectedChars, extracted.replace(/ /g, "")) : null,
        nameCERChars: expectedChars ? expectedChars.length : null,
        nameWERErrors: expected ? wordDistance(expected, extracted) : null,
        nameWERWords: expected ? expected.split(" ").filter(Boolean).length : null,
        nameCER: expectedChars ? editDistance(expectedChars, extracted.replace(/ /g, "")) / expectedChars.length : null,
        nameWER: expected ? wordDistance(expected, extracted) / expected.split(" ").filter(Boolean).length : null,
        numberExact: printedStudentNo ? Boolean(item.studentNo && number === item.studentNo) : null,
      });
    } catch (error) {
      native.push({ caseId: item.caseId, docType: item.docType, qualityTier: item.qualityTier, printedStudentNo: item.printedStudentNo, failed: true, error: error.message, endToEndMs: performance.now() - startedAt });
    }
  }
  return native;
}

function summarize(rows) {
  const eligibleNumbers = rows.filter((row) => (row.printedStudentNo ?? Boolean(row.studentNo)) && row.studentNo);
  const nameRows = rows.filter((row) => row.truthName);
  const tp = rows.filter((row) => row.targetFound).length;
  const fp = rows.reduce((sum, row) => sum + row.wrongCandidates.length, 0);
  const associationRows = rows.filter((row) => row.targetStudentNo && normalizeName(row.name?.display || row.name || "").replace(/[^A-Z]/g, "").length >= 8);
  const distractorOpportunities = associationRows.reduce((sum, row) => sum + Math.max(0, row.rosterLength - 1), 0);
  const eligibleTP = associationRows.filter((row) => row.targetFound).length;
  const eligibleFP = associationRows.reduce((sum, row) => sum + row.wrongCandidates.length, 0);
  const cerErrors = rows.reduce((sum, row) => sum + (row.nameCERErrors || 0), 0);
  const cerChars = rows.reduce((sum, row) => sum + (row.nameCERChars || 0), 0);
  const werErrors = rows.reduce((sum, row) => sum + (row.nameWERErrors || 0), 0);
  const werWords = rows.reduce((sum, row) => sum + (row.nameWERWords || 0), 0);
  return {
    documents: rows.length,
    nameCERMacro: mean(nameRows.map((row) => row.nameCER).filter(Number.isFinite)),
    nameWERMacro: mean(nameRows.map((row) => row.nameWER).filter(Number.isFinite)),
    nameCERMicro: cerChars ? cerErrors / cerChars : null,
    nameWERMicro: werWords ? werErrors / werWords : null,
    nameCER: mean(nameRows.map((row) => row.nameCER).filter(Number.isFinite)),
    nameWER: mean(nameRows.map((row) => row.nameWER).filter(Number.isFinite)),
    numberEligible: eligibleNumbers.length,
    numberExact: eligibleNumbers.filter((row) => row.numberExact).length,
    associationEligible: associationRows.length,
    associationTP: eligibleTP,
    associationFN: associationRows.length - eligibleTP,
    candidateTP: eligibleTP,
    candidateFP: eligibleFP,
    candidateTN: Math.max(0, distractorOpportunities - eligibleFP),
    candidatePrecision: eligibleTP + eligibleFP ? eligibleTP / (eligibleTP + eligibleFP) : null,
    candidateRecall: associationRows.length ? eligibleTP / associationRows.length : null,
    candidateFPR: distractorOpportunities ? eligibleFP / distractorOpportunities : null,
    candidateOpportunityCount: distractorOpportunities,
    replayTotalMeanMs: mean(rows.map((row) => row.endToEndMs)),
    replayOCRMeanMs: mean(rows.map((row) => Number(row.replayTimings.ocrMs) || 0)),
    replayTemplateMeanMs: mean(rows.map((row) => Number(row.replayTimings.templateMs) || 0)),
    replayMatchingMeanMs: mean(rows.map((row) => Number(row.replayTimings.matchingMs) || 0)),
  };
}

function markdown(manifest, rows, nativeRows) {
  const overall = summarize(rows);
  const by = (key) => [...new Set(rows.map((row) => row[key]))].sort().map((value) => [value, summarize(rows.filter((row) => row[key] === value))]);
  const resultTable = (groups) => groups.map(([key, s]) => `| ${key} | ${s.documents} | ${s.nameCER == null ? "N/A" : s.nameCER.toFixed(3)} | ${s.nameWER == null ? "N/A" : s.nameWER.toFixed(3)} | ${s.numberExact}/${s.numberEligible} (${pct(s.numberExact, s.numberEligible)}) | ${s.candidateTP}/${s.associationEligible} (${pct(s.candidateTP, s.associationEligible)}) | ${s.candidateFP} | ${s.candidateFPR == null ? "N/A" : pct(s.candidateFP, s.candidateOpportunityCount)} (${s.candidateFP}/${s.candidateOpportunityCount}) |`).join("\n");
  const substitutionCounts = new Map();
  const charTruth = (r) => normalizeName(r.name?.display || r.name || "").replace(/ /g, "");
  for (const row of rows) {
    for (const [key, count] of substitutions(charTruth(row), row.nameText.replace(/ /g, ""))) substitutionCounts.set(key, (substitutionCounts.get(key) || 0) + count);
  }
  const confusions = [...substitutionCounts].sort((a,b)=>b[1]-a[1]).slice(0,12).map(([pair,count])=>`| ${pair} | ${count} |`).join("\n") || "| None observed | 0 |";
  const wrongCandidateCounts = new Map();
  for (const row of rows) for (const studentNo of row.wrongCandidates) wrongCandidateCounts.set(studentNo, (wrongCandidateCounts.get(studentNo) || 0) + 1);
  const wrongCandidates = [...wrongCandidateCounts].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([studentNo,count])=>`| ${studentNo} | ${count} |`).join("\n") || "| None | 0 |";
  const failures = rows.filter((row) => row.nameCER > 0 || row.numberExact === false || (row.studentNo && !row.targetFound));
  const nativeSuccess = nativeRows.filter((row) => !row.failed);
  const nativeMean = (field) => mean(nativeSuccess.map((row) => row[field]).filter(Number.isFinite));
  return `# OCR accuracy baseline\n\nGenerated: ${new Date().toISOString()}  \nFixture schema: ${manifest.schemaVersion ?? "unknown"}; seed: ${manifest.seed ?? "unspecified"}  \nReplay provenance: constructed observation replay unless a row states otherwise. Replay exercises scanFileForSuggestion and the production configured-name matcher with a synthetic roster.\n\n## Metric definitions\n\n- Name normalization: Unicode NFD, remove combining marks, uppercase, replace non-ASCII alphanumeric runs with spaces, trim/collapse spaces. CER uses character Levenshtein distance on normalized names with spaces removed, divided by ground-truth character count; WER uses token Levenshtein distance divided by ground-truth token count. Empty OCR output is a full deletion distance against each non-empty reference.\n- Direct student-number transcription: raw OCR text regex match, exact string equality to the printed ground truth. Denominator includes only fixtures with a printed number; missing-number document types are excluded, never credited as exact. No roster-returned number counts as transcription.\n- Roster association: direct production matcher on extracted suggestion name against the synthetic roster. Recall denominator is all cases with a student number and at least 8 normalized letters in extracted name. Precision counts a correct target association as TP and every unrelated returned student as FP. FPR is wrong candidates divided by all target-excluded roster opportunities; if no opportunities exist, N/A. Candidates are not preview warnings.\n- Timings: replay OCR, template, name processing, and roster matching are not native measurements. Replay end-to-end time is harness wall time. Native values are measured separately below; unavailable stages are explicitly N/A.\n\n## Replay aggregate (n=${rows.length})\n\n| Metric | Result |\n|---|---:|\n| Mean name CER | ${overall.nameCER?.toFixed(3) ?? "N/A"} |\n| Mean name WER | ${overall.nameWER?.toFixed(3) ?? "N/A"} |\n| Direct number exact match | ${overall.numberExact}/${overall.numberEligible} (${pct(overall.numberExact, overall.numberEligible)}) |\n| Roster precision | ${overall.candidatePrecision == null ? "N/A" : pct(overall.candidateTP, overall.candidateTP + overall.candidateFP)} |\n| Roster recall | ${overall.candidateRecall == null ? "N/A" : pct(overall.candidateTP, overall.associationEligible)} (${overall.candidateTP}/${overall.associationEligible}) |\n| Roster false-positive rate | ${overall.candidateFPR == null ? "N/A (no negatives)" : pct(overall.candidateFP, overall.candidateTP + (overall.associationEligible - overall.candidateTP))} |\n| Mean harness end-to-end | ${overall.replayTotalMeanMs?.toFixed(1) ?? "N/A"} ms (3,000 ms target; replay, not native) |\n| OCR / template / matching mean | N/A / ${overall.replayTemplateMeanMs?.toFixed(1) ?? "N/A"} / ${overall.replayMatchingMeanMs?.toFixed(1) ?? "N/A"} ms; name processing included in total only |\n\n## By document type\n\n| Type | n | CER | WER | Direct number exact | Correct roster association | Wrong candidates | FPR |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${resultTable(by("docType"))}\n\n## By quality tier\n\n| Tier | n | CER | WER | Direct number exact | Correct roster association | Wrong candidates | FPR |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${resultTable(by("qualityTier").map(([tier,s])=>[`${tier} — ${tierLabels[tier] || ""}`,s]))}\n\n## Character confusion observations\n\nConfusions compare the extracted OCR name to the ground truth. They describe constructed replay substitutions; they are not measured native-engine confusions.\n\n| Truth → OCR | Count |\n|---|---:|\n${confusions}\n\n## Candidate confusion and failure cases\n\n- Wrong roster candidate returns: ${overall.candidateFP}.\n- Rows with name error, number mismatch, or missed target: ${failures.length}/${rows.length}.\n- Empty extracted names: ${rows.filter((row) => !row.nameText).length}/${rows.length}.\n- Short-name cases rejected by the existing 8-letter floor: ${rows.filter((row) => normalizeName(row.name?.display || row.name || "").replace(/[^A-Z]/g, "").length < 8).length}.\n\n${failures.slice(0,40).map((row)=>`- ${row.caseId}/${row.qualityTier}: CER=${row.nameCER?.toFixed(3) ?? "N/A"}, number=${row.numberExact == null ? "not eligible" : row.numberExact ? "exact" : "mismatch"}, target association=${row.studentNo ? row.targetFound : "no target student"}, replay provenance=${row.replayProvenance}.`).join("\n") || "No failures under these definitions."}\n\n## Native OCR run\n\n${live ? `Attempted against ${process.env.OCR_BASE_URL || "http://localhost:3000"} using normal staff authentication. Platform: ${process.platform}; sample count: ${nativeRows.length}; successful: ${nativeSuccess.length}; failed: ${nativeRows.length-nativeSuccess.length}. Engine(s): ${[...new Set(nativeSuccess.map((r)=>r.engine))].join(", ") || "none"}. Mean native OCR: ${nativeMean("ocrMs")?.toFixed(1) ?? "N/A"} ms; mean end-to-end upload-to-response: ${nativeMean("endToEndMs")?.toFixed(1) ?? "N/A"} ms against 3,000 ms target. Template/name/matching timings: N/A because /api/ingest/ocr returns OCR only; synthetic roster matching is a separate replay measure. Failed samples remain included: ${nativeRows.filter(r=>r.failed).map(r=>`${r.caseId}/${r.qualityTier} (${r.error})`).join(", ") || "none"}.` : "Not run. Reproducible isolated command: `node scripts/run-ocr-baseline-native.mjs`. This uses a disposable test app/database, creates a synthetic staff login, starts the Apple Vision worker, and records native timings separately."}\n\n## Verification notes\n\n- Manifest contains ${manifest.cases.length} fixture rows and ${new Set(manifest.cases.map((row)=>row.canonicalId)).size} canonical documents; tiers: ${[...new Set(manifest.cases.map((row)=>row.qualityTier))].sort().join(", ")}.\n- Printed student number absent: ${manifest.cases.filter((row)=>(row.printedStudentNo ?? Boolean(row.studentNo)) === false).length} fixture rows; explicitly excluded from direct-number denominator.\n- Boundary tests use actual normalized lengths and Levenshtein edit counts; they do not contribute to document accuracy metrics.\n`;
}

function accuracyAppendix(replayRows, nativeRows) {
  const summarize = (rows, nativeMode = false) => {
    const ok = rows.filter((row) => !row.failed);
    const associations = ok.filter((row) => nativeMode
      ? row.associationEligible
      : row.targetStudentNo && normalizeName(row.name?.display || row.name || "").replace(/[^A-Z]/g, "").length >= 8);
    const tp = associations.filter((row) => row.targetFound).length;
    const fp = associations.reduce((sum, row) => sum + (row.wrongCandidates?.length || 0), 0);
    const opp = associations.reduce((sum, row) => sum + Math.max(0, (row.rosterLength || 0) - 1), 0);
    const numbers = ok.filter((row) => row.printedStudentNo && row.studentNo);
    const cerErr = ok.reduce((sum, row) => sum + (row.nameCERErrors || 0), 0);
    const cerN = ok.reduce((sum, row) => sum + (row.nameCERChars || 0), 0);
    const werErr = ok.reduce((sum, row) => sum + (row.nameWERErrors || 0), 0);
    const werN = ok.reduce((sum, row) => sum + (row.nameWERWords || 0), 0);
    return {
      attempted: rows.length, success: ok.length, failed: rows.length - ok.length,
      cerMacro: mean(ok.map((row) => row.nameCER).filter(Number.isFinite)),
      werMacro: mean(ok.map((row) => row.nameWER).filter(Number.isFinite)),
      cerMicro: cerN ? cerErr / cerN : null, werMicro: werN ? werErr / werN : null,
      numberExact: numbers.filter((row) => row.numberExact).length, numberN: numbers.length,
      tp, fn: associations.length - tp, fp, tn: Math.max(0, opp - fp), opp,
      precision: tp + fp ? tp / (tp + fp) : null,
      recall: associations.length ? tp / associations.length : null,
      fpr: opp ? fp / opp : null,
      ocrMs: mean(ok.map((row) => row.ocrMs).filter(Number.isFinite)),
      templateMs: mean(ok.map((row) => row.templateMs).filter(Number.isFinite)),
      nameMs: mean(ok.map((row) => row.nameProcessingMs).filter(Number.isFinite)),
      matchingMs: mean(ok.map((row) => row.matchingMs).filter(Number.isFinite)),
      totalMs: mean(ok.map((row) => row.endToEndMs).filter(Number.isFinite)),
    };
  };
  const grouped = (rows, field, keys, nativeMode = false) => keys.map((key) => {
    const sum = summarize(rows.filter((row) => row[field] === key), nativeMode);
    return `| ${key} | ${sum.attempted} | ${sum.success}/${sum.attempted} | ${sum.cerMacro?.toFixed(3) ?? "N/A"} | ${sum.werMacro?.toFixed(3) ?? "N/A"} | ${sum.numberExact}/${sum.numberN} | ${sum.tp}/${sum.fn} | ${sum.fp}/${sum.tn} | ${sum.fpr == null ? "N/A" : pct(sum.fp, sum.opp)} (${sum.fp}/${sum.opp}) |`;
  }).join("\n");
  const replay = summarize(replayRows);
  const native = summarize(nativeRows, true);
  const types = [...new Set(replayRows.map((row) => row.docType))].sort();
  const tiers = [...new Set(replayRows.map((row) => row.qualityTier))].sort();
  const rows = nativeRows.map((row) => `| ${row.caseId} | ${row.docType || "N/A"} | ${row.qualityTier} | ${row.failed ? "failed" : "ok"} | ${row.nameCER?.toFixed(3) ?? "N/A"} | ${row.nameWER?.toFixed(3) ?? "N/A"} | ${row.printedStudentNo ? (row.failed ? "failed" : row.numberExact ? "exact" : "miss") : "not printed"} | ${row.targetFound == null ? "N/A" : row.targetFound ? "TP" : row.associationEligible ? "FN" : "ineligible"} |`).join("\n");
  const failures = nativeRows.filter((row) => row.failed).map((row) => `| ${row.caseId} | ${row.docType || "N/A"} | ${row.qualityTier} | ${row.error || "failed"} |`).join("\n") || "| None | — | — | — |";
  const confusions = (samples, truthFor, ocrFor) => {
    const counts = new Map();
    for (const row of samples) {
      if (row.failed) continue;
      const truth = normalizeName(truthFor(row) || "").replace(/ /g, "");
      const actual = normalizeName(ocrFor(row) || "").replace(/ /g, "");
      for (const [pair, count] of substitutions(truth, actual)) counts.set(pair, (counts.get(pair) || 0) + count);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([pair, count]) => `| ${pair} | ${count} |`).join("\n") || "| None observed | 0 |";
  };
  const replayConfusions = confusions(replayRows, (row) => row.name?.display || row.name, (row) => row.nameText);
  const nativeConfusions = confusions(nativeRows, (row) => row.expectedName, (row) => row.extractedName);
  const q3 = replayRows.filter((row) => row.qualityTier === "Q3");
  const q3Printed = q3.filter((row) => row.printedStudentNo);
  const q3Misses = q3Printed.filter((row) => row.targetStudentNo && !row.targetFound).length;
  return `\n\n## Verified metric aggregation and native detail\n\nCER/WER aggregate values are macro means of per-document rates; micro rates sum edit counts over total reference characters/words. Direct-number denominators count only documents with a printed number. Native OCR failures are retained in attempted sample counts and the case table; accuracy metrics use successful samples only.\n\n### Replay aggregate\n\n| Measure | Result |\n|---|---:|\n| CER macro / micro | ${replay.cerMacro?.toFixed(3) ?? "N/A"} / ${replay.cerMicro?.toFixed(3) ?? "N/A"} |\n| WER macro / micro | ${replay.werMacro?.toFixed(3) ?? "N/A"} / ${replay.werMicro?.toFixed(3) ?? "N/A"} |\n| Direct student number exact | ${replay.numberExact}/${replay.numberN} (${pct(replay.numberExact, replay.numberN)}) |\n| Association TP / FN | ${replay.tp} / ${replay.fn} of ${replay.tp + replay.fn} |\n| Candidate FP / TN | ${replay.fp} / ${replay.tn} of ${replay.opp} distractor opportunities |\n| Precision / recall / FPR | ${replay.precision == null ? "N/A" : pct(replay.tp, replay.tp + replay.fp)} / ${replay.recall == null ? "N/A" : pct(replay.tp, replay.tp + replay.fn)} / ${replay.fpr == null ? "N/A" : pct(replay.fp, replay.opp)} |\n\n| Document type | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${grouped(replayRows, "docType", types)}\n\n| Quality tier | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${grouped(replayRows, "qualityTier", tiers)}\n\n### Native execution\n\nPlatform: ${process.platform}; engine: ${[...new Set(nativeRows.filter((row) => !row.failed).map((row) => row.engine))].join(", ") || "none"}; attempted ${native.attempted}, successful ${native.success}, failed ${native.failed}. Name CER/WER use the actual OCR text through production detectName/formatToLNFnMi before roster substitution. Synthetic-roster matching runs the production matcher against fixture ground truth. The OCR route does not return coordinate templates, so native template extraction timing is unavailable. End-to-end includes the authenticated OCR request, name extraction, and matcher. Target is 3,000 ms.\n\n| Measure | Result |\n|---|---:|\n| CER macro / micro | ${native.cerMacro?.toFixed(3) ?? "N/A"} / ${native.cerMicro?.toFixed(3) ?? "N/A"} |\n| WER macro / micro | ${native.werMacro?.toFixed(3) ?? "N/A"} / ${native.werMicro?.toFixed(3) ?? "N/A"} |\n| Direct number exact | ${native.numberExact}/${native.numberN} (${pct(native.numberExact, native.numberN)}) |\n| Association TP / FN | ${native.tp} / ${native.fn} |\n| Candidate FP / TN | ${native.fp} / ${native.tn} of ${native.opp} distractor opportunities |\n| Precision / recall / FPR | ${native.precision == null ? "N/A" : pct(native.tp, native.tp + native.fp)} / ${native.recall == null ? "N/A" : pct(native.tp, native.tp + native.fn)} / ${native.fpr == null ? "N/A" : pct(native.fp, native.opp)} |\n| OCR / template / name processing / matching mean | ${native.ocrMs?.toFixed(1) ?? "N/A"} / N/A / ${native.nameMs?.toFixed(3) ?? "N/A"} / ${native.matchingMs?.toFixed(3) ?? "N/A"} ms |\n| End-to-end mean | ${native.totalMs?.toFixed(1) ?? "N/A"} ms; ${native.totalMs != null && native.totalMs <= 3000 ? "meets" : "exceeds or unavailable against"} 3,000 ms target |\n\n| Document type | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${grouped(nativeRows, "docType", types, true)}\n\n| Quality tier | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n${grouped(nativeRows, "qualityTier", tiers, true)}\n\n| Case | Type | Tier | Status | CER | WER | Number transcription | Roster candidate |\n|---|---|---|---|---:|---:|---|---|\n${rows || "| Not run | — | — | — | — | — | — | — |"}\n\n| Failed sample | Type | Tier | Error |\n|---|---|---|---|\n${failures}\n\nNative measurements apply only to ${process.platform}. Windows Media and Linux/Tesseract are untested.\n`;
}

function failureModeSection(replayRows, nativeRows) {
  const confusionTable = (samples, truthFor, actualFor) => {
    const counts = new Map();
    for (const row of samples) {
      if (row.failed) continue;
      const truth = normalizeName(truthFor(row) || "").replace(/ /g, "");
      const actual = normalizeName(actualFor(row) || "").replace(/ /g, "");
      for (const [pair, count] of substitutions(truth, actual)) counts.set(pair, (counts.get(pair) || 0) + count);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([pair, count]) => `| ${pair} | ${count} |`).join("\n") || "| None observed | 0 |";
  };
  const q3 = nativeRows.filter((row) => row.qualityTier === "Q3" && row.printedStudentNo && !row.failed);
  const q3NumberExact = q3.filter((row) => row.numberExact).length;
  const q3AssociationMisses = q3.filter((row) => row.associationEligible && !row.targetFound).length;
  const replayFailures = replayRows.filter((row) => row.nameCER > 0 || row.numberExact === false || (row.targetStudentNo && !row.targetFound));
  const nativeFailures = nativeRows.filter((row) => row.failed);
  return `## Substitutions and failure modes\n\n` +
    `Replay substitutions are constructed fixture observations; native substitutions are counted from native OCR output before roster substitution.\n\n` +
    `| Replay truth → OCR | Count |\n|---|---:|\n${confusionTable(replayRows, (row) => row.name?.display || row.name, (row) => row.nameText)}\n\n` +
    `| Native truth → OCR | Count |\n|---|---:|\n${confusionTable(nativeRows, (row) => row.expectedName, (row) => row.extractedName)}\n\n` +
    `- Replay rows with name error, number mismatch, or missed target: ${replayFailures.length}/${replayRows.length}; sample identities and measurements are retained in baseline-results.json.\n` +
    `- Native request failures: ${nativeFailures.length}/${nativeRows.length}; failed cases remain in the native case table and JSON.\n` +
    `- On this constructed Q3 tier, whole-page 90° rotation caused ${q3AssociationMisses} name/roster misses among ${q3.length} numbered documents, while printed-number transcription remained ${q3NumberExact}/${q3.length}. This is specific to the fixture transformation, not ordinary feeder skew.\n`;
}

const { manifest, observations } = await readFixtures();
const rows = await replay({ manifest, observations });
const nativeRows = live ? await runNative(rows) : [];
const reportHeader = `# OCR accuracy baseline\n\nGenerated ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "long" })} (Asia/Manila). Fixture schema ${manifest.schemaVersion}, seed ${manifest.seed}. Replay observations are constructed deterministically from synthetic fixture labels, not captured engine output.\n\n## Metric definitions\n\nNames are normalized with Unicode NFD, combining marks removed, uppercase, punctuation converted to spaces, and whitespace collapsed. CER removes spaces and divides character Levenshtein edits by reference letters; WER divides token Levenshtein edits by reference words. Empty extracted names count as full deletion. Macro CER/WER are means of per-document normalized rates; micro values are total edits divided by total reference letters/words.\n\nDirect student-number exact match uses a raw-text regex and exact equality. Only the 80 printed-number documents enter the denominator; the 20 PSA documents without printed numbers are excluded. Roster returns never count as OCR transcription. Association is eligible for a synthetic target whose ground-truth normalized name has at least eight letters. TP/FN indicate target candidate found/missed. FP/TN indicate unrelated candidates returned/not returned over roster-length-minus-one distractors per eligible document; FPR denominator is those distractor opportunities.\n\nTier caveats: Q2 reduces vector text size, not JPEG/raster compression; Q3 rotates the page 90°, not ±5°/±10° feeder skew; Q4 adds synthetic speckle/streak artifacts; Q5 fades vector ink, not a physical photocopy.\n`;
await fs.writeFile(reportPath, reportHeader + accuracyAppendix(rows, nativeRows) + failureModeSection(rows, nativeRows));
const resultsPath = path.join(fixtureRoot, "baseline-results.json");
await fs.writeFile(resultsPath, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), replayProvenance: "constructed", replay: rows.map((row) => ({ caseId: row.caseId, canonicalId: row.canonicalId, docType: row.docType, qualityTier: row.qualityTier, seed: row.seed, studentNo: row.studentNo, printedStudentNo: row.printedStudentNo, rosterStudentNo: row.rosterStudentNo, expectedName: row.name?.display || row.name, extractedName: row.nameText, rawText: row.rawText, numberText: row.numberText, nameCERErrors: row.nameCERErrors, nameCERChars: row.nameCERChars, nameWERErrors: row.nameWERErrors, nameWERWords: row.nameWERWords, nameCER: row.nameCER, nameWER: row.nameWER, numberExact: row.numberExact, targetFound: row.targetFound, wrongCandidates: row.wrongCandidates, replayProvenance: row.replayProvenance, endToEndMs: row.endToEndMs, templateMs: row.replayTimings.templateMs, matchingMs: row.replayTimings.matchingMs })), native: nativeRows }, null, 2)}\n`);
console.log = consoleLog;
console.info = consoleInfo;
console.log(`Wrote ${path.relative(appRoot, reportPath)} and ${path.relative(appRoot, resultsPath)} (${rows.length} replay rows${live ? `, ${nativeRows.length} native rows` : ""}).`);
