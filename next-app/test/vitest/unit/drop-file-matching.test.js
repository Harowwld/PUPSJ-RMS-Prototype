import { afterEach, describe, expect, it, vi } from "vitest";
import { rotateOcrPages, scanFileForSuggestion } from "../../../src/lib/ocrClient.js";
import { matchOcrStudents, uniqueOcrStudentMatch } from "../../../src/lib/studentNameMatcher.js";

const student = { studentNo: "2026-90001-SJ-0", name: "DELA CRUZ, JUAN S.", courseCode: "BSIT", section: "1A", room: 1, cabinet: "A", drawer: 1 };
const pages = [{ pageIndex: 0, width: 1000, height: 1400, observations: [
  { text: "JUAN", x: 0.2, y: 0.3, width: 0.1, height: 0.02 },
  { text: "S.", x: 0.42, y: 0.3, width: 0.03, height: 0.02 },
  { text: "DELA CRUZ", x: 0.64, y: 0.3, width: 0.15, height: 0.02 },
] }];
const templates = [{ page_index: 0, regions: {
  firstName: { x: 0.18, y: 0.28, width: 0.18, height: 0.08 },
  middleName: { x: 0.40, y: 0.28, width: 0.10, height: 0.08 },
  lastName: { x: 0.62, y: 0.28, width: 0.20, height: 0.08 },
} }];
const file = { type: "application/pdf", name: "synthetic-record.pdf" };
const context = { rawText: "Birth Certificate\nJUAN S. DELA CRUZ", engine: "test", pages, templates };
afterEach(() => vi.unstubAllGlobals());

function matchResponse(candidates) {
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, data: candidates }) }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("dropped document student matching", () => {
  it("returns a unique server roster match for automatic form assignment", async () => {
    matchResponse([{ studentNo: student.studentNo, name: student.name, mismatchPercent: 0, student }]);
    const result = await scanFileForSuggestion({ file, docTypes: [], ocrContext: context });
    expect(result.matchedStudent).toEqual(student);
  });

  it("tries the same right-angle coordinate orientations as continuous scanning", async () => {
    const fetch = matchResponse([]);
    const result = await scanFileForSuggestion({ file, docTypes: [], ocrContext: { ...context, pages: rotateOcrPages(pages, 270) } });
    const request = fetch.mock.calls.find(([url]) => url === "/api/recognition/student-match");
    expect(JSON.parse(request[1].body).extractedName).toBe("DELA CRUZ, JUAN S.");
    expect(result.detectedRotation).toBe(90);
  });

  it("leaves multiple plausible students unassigned", async () => {
    matchResponse([
      { studentNo: student.studentNo, name: student.name, student },
      { studentNo: "2026-90002-SJ-0", name: student.name, student: { ...student, studentNo: "2026-90002-SJ-0" } },
    ]);
    const result = await scanFileForSuggestion({ file, docTypes: [], ocrContext: context });
    expect(result.matchedStudent).toBeNull();
    expect(result.studentMatches).toHaveLength(2);
  });

  it("shares the continuous-scanning rule: exact matches outrank approximate matches, duplicate names need review", () => {
    const typo = { ...student, studentNo: "2026-90002-SJ-0", name: "DELA CRUZ, JOAN S." };
    const matches = matchOcrStudents(student.name, `BIRTH CERTIFICATE\n${student.name}`, [student, typo]);
    expect(uniqueOcrStudentMatch(matches)?.studentNo).toBe(student.studentNo);
    const duplicate = { ...student, studentNo: "2026-90003-SJ-0" };
    expect(uniqueOcrStudentMatch(matchOcrStudents(student.name, student.name, [student, duplicate]))).toBeNull();
  });

  it("keeps an explicit manual rotation when automatic orientation is disabled", async () => {
    matchResponse([]);
    const result = await scanFileForSuggestion({ file, docTypes: [], rotation: 180, autoRotate: false, ocrContext: context });
    expect(result.detectedRotation).toBe(180);
  });

  it("uses full-page server candidates even without a configured name template", async () => {
    const fetch = matchResponse([{ studentNo: student.studentNo, name: student.name, student }]);
    const result = await scanFileForSuggestion({ file, docTypes: [], ocrContext: { ...context, templates: [] } });
    expect(result.matchedStudent).toEqual(student);
    expect(JSON.parse(fetch.mock.calls[0][1].body).ocrText).toBe(context.rawText);
  });

  it("matches an extracted full middle name to the roster display name and returns all record fields", async () => {
    const enrolled = {
      studentNo: "2023-00385-SJ-0", name: "DELA PEÑA, HAROLD PRINCE E.",
      courseCode: "BSIT", yearLevel: 2023, section: "1-1", room: 1, cabinet: "2023", drawer: "1",
    };
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const { extractedName, ocrText } = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, data: matchOcrStudents(extractedName, ocrText, [enrolled]) }) };
    }));
    const result = await scanFileForSuggestion({
      file, docTypes: [], ocrContext: {
        ...context, templates: [], pages: [],
        rawText: "CAEPUP APPLICATION FORM\nPERSONAL INFORMATION\nComplete Name: Harold Prince Entienza dela Pena\nSex: Male\nACADEMIC PROGRAM PREFERENCES\nBSIT - Bachelor of Science in Information Technology",
      },
    });
    expect(result.matchedStudent).toEqual(enrolled);
  });
});
