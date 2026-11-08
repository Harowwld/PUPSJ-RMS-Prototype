import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.join(appRoot, "test/fixtures/ocr-baseline");
const manifest = JSON.parse(await fs.readFile(path.join(root, "manifest.json"), "utf8"));
const docTypes = [...new Set(manifest.cases.map((item) => item.docType))];
const observations = {};

function seeded(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
function degrade(text, tier, seed) {
  const errorBudget = { Q1: 0, Q2: 1, Q3: 1, Q4: 2, Q5: 2 }[tier] ?? 0;
  const random = seeded(seed);
  const chars = [...String(text || "")];
  const substitutions = [["O", "0"], ["I", "1"], ["E", "F"], ["A", "4"], ["S", "5"]];
  for (let n = 0; n < errorBudget; n += 1) {
    const indices = chars.map((char, index) => /[A-Z]/i.test(char) ? index : -1).filter((index) => index >= 0);
    if (!indices.length) break;
    const index = indices[Math.floor(random() * indices.length)];
    const original = chars[index].toUpperCase();
    const replacement = substitutions.find(([from]) => from === original)?.[1] || (original === "Z" ? "2" : "Z");
    chars[index] = replacement;
  }
  return { text: chars.join(""), requestedSubstitutions: errorBudget, seed: Number(seed) };
}
function typePhrase(type) {
  const value = String(type || "");
  if (/transcript|\btor\b/i.test(value)) return "TRANSCRIPT OF RECORDS";
  if (/birth|psa/i.test(value)) return "PHILIPPINE STATISTICS AUTHORITY CERTIFICATE OF LIVE BIRTH";
  if (/137|sf10/i.test(value)) return "DEPED FORM 137 PERMANENT RECORD";
  if (/student.*id|identification/i.test(value)) return "STUDENT IDENTIFICATION CARD";
  if (/enroll|registr|cor/i.test(value)) return "CERTIFICATE OF REGISTRATION ENROLLMENT";
  return value.toUpperCase();
}

for (const item of manifest.cases) {
  const tier = item.qualityTier;
  const name = item.name || {};
  const parts = [name.firstName ?? item.firstName ?? "", name.middleName ?? item.middleName ?? "", name.lastName ?? item.lastName ?? ""].map((value) => String(value || "").trim());
  const displayedName = name.display || item.displayName || [parts[2], [parts[0], parts[1]].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const damaged = degrade(displayedName, tier, item.seed);
  const [surnameText, givenText = ""] = damaged.text.split(",", 2);
  const givenTokens = givenText.trim().split(/\s+/).filter(Boolean);
  const damagedParts = [givenTokens.shift() || degrade(parts[0], tier, item.seed).text, givenTokens.join(" ") || "", surnameText.trim() || degrade(parts[2], tier, item.seed).text];
  const printedStudentNo = item.printedStudentNo ?? Boolean(item.studentNo);
  const rawText = [typePhrase(item.docType), printedStudentNo && item.studentNo ? `STUDENT NO. ${item.studentNo}` : "", `NAME: ${damaged.text}`].filter(Boolean).join("\n");
  const observationsForPage = [
    { text: damagedParts[0], x: 0.12, y: 0.30, width: 0.22, height: 0.03 },
    { text: damagedParts[1], x: 0.39, y: 0.30, width: 0.10, height: 0.03 },
    { text: damagedParts[2], x: 0.55, y: 0.30, width: 0.28, height: 0.03 },
  ].filter((observation) => observation.text);
  observations[item.caseId] ||= {};
  observations[item.caseId][tier] = {
    rawText,
    engine: "constructed-replay",
    provenance: "constructed from manifest labels and seeded tier noise; not captured from a native OCR engine",
    construction: { seed: Number(item.seed), tier, requestedNameSubstitutions: damaged.requestedSubstitutions, actualNameText: damaged.text },
    pages: [{ pageIndex: 0, width: 1000, height: 1400, observations: observationsForPage }],
    templates: [{ page_index: 0, regions: {
      firstName: { x: 0.10, y: 0.27, width: 0.27, height: 0.09 },
      middleName: { x: 0.37, y: 0.27, width: 0.16, height: 0.09 },
      lastName: { x: 0.53, y: 0.27, width: 0.33, height: 0.09 },
    } }],
  };
}

await fs.writeFile(path.join(root, "observations.json"), `${JSON.stringify({ provenance: "constructed-replay", docTypes, observations }, null, 2)}\n`);
console.log(`Generated constructed OCR replay observations for ${manifest.cases.length} manifest rows with seed ${manifest.seed ?? "unspecified"}.`);
