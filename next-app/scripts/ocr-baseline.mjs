import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const fixturesPath = path.join(__dirname, "ocr-baseline.fixtures.json");
const ocrClientPath = path.join(projectRoot, "src", "lib", "ocrClient.js");

const docTypes = [
  "Birth Certificate",
  "Diploma",
  "Transcript of Records",
  "Good Moral Certificate",
  "Enrollment Certification",
];

function makeFile(rawText, name = "ocr-baseline.txt") {
  return new File([rawText], name, { type: "image/png" });
}

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

async function loadOcrClient() {
  let source = await fs.readFile(ocrClientPath, "utf8");
  source = source
    .replace(/^export\s+async\s+function\s+/gm, "async function ")
    .replace(/^export\s+function\s+/gm, "function ");

  const exportNames = [
    "warmupOcrWorker",
    "normalizeExtractedName",
    "formatToLNFnMi",
    "splitNameComponents",
    "detectStudentNo",
    "findStudentsByOcrName",
    "findStudentsInText",
    "scanPdfForSuggestion",
    "scanFileForSuggestion",
  ];

  source += `\nmodule.exports = { ${exportNames.join(", ")} };`;

  const sandbox = {
    module: { exports: {} },
    exports: {},
    console,
    File,
    FormData,
    Response,
    fetch: globalThis.fetch,
    document: undefined,
    window: undefined,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: ocrClientPath });
  return { exports: sandbox.module.exports, sandbox };
}

async function main() {
  const fixtures = JSON.parse(await fs.readFile(fixturesPath, "utf8"));
  const { exports: ocrClient, sandbox } = await loadOcrClient();
  const { scanFileForSuggestion } = ocrClient;
  const originalFetch = sandbox.fetch;
  let passed = 0;
  let failed = 0;

  try {
    for (const fixture of fixtures) {
      const students = fixture.students ?? [];
      const rawText = fixture.rawText ?? "";

      sandbox.fetch = async () =>
        new Response(
          JSON.stringify({
            ok: true,
            text: rawText,
            engine: "baseline-harness",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        );

      const result = await scanFileForSuggestion({
        file: makeFile(rawText, `${fixture.id}.txt`),
        students,
        docTypes,
      });

      const expectations = fixture.expected ?? {};
      const checks = [
        {
          label: "name",
          expected: expectations.name,
          actual: result.name,
          ok: !expectations.name || normalize(result.name) === normalize(expectations.name),
        },
        {
          label: "docType",
          expected: expectations.docType,
          actual: result.docType,
          ok: !expectations.docType || normalize(result.docType) === normalize(expectations.docType),
        },
        {
          label: "matchedStudentNo",
          expected: expectations.matchedStudentNo,
          actual: result.matchedStudent?.studentNo || result.matchedStudent?.student_no || "",
          ok:
            !expectations.matchedStudentNo ||
            normalize(result.matchedStudent?.studentNo || result.matchedStudent?.student_no) ===
              normalize(expectations.matchedStudentNo),
        },
      ].filter((check) => check.expected);

      const fixturePassed = checks.every((check) => check.ok);
      if (fixturePassed) {
        passed++;
        console.log(`PASS ${fixture.id} - ${fixture.description}`);
      } else {
        failed++;
        console.log(`FAIL ${fixture.id} - ${fixture.description}`);
        for (const check of checks.filter((check) => !check.ok)) {
          console.log(`  ${check.label}: expected "${check.expected}" but got "${check.actual}"`);
        }
      }
    }
  } finally {
    sandbox.fetch = originalFetch;
  }

  console.log("");
  console.log(`OCR baseline summary: ${passed} passed, ${failed} failed, ${fixtures.length} total`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("OCR baseline harness failed:", err);
  process.exitCode = 1;
});
