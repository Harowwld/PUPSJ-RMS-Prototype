import { describe, expect, it } from "vitest"
import {
  matchOcrStudents,
  uniqueOcrStudentMatch,
} from "@/lib/studentNameMatcher"
const initial = { studentNo: "S1", name: "DELA PENA, HAROLD PRINCE E." }
const text = "Harold Prince Entienza dela Pena"
describe("roster middle name compatibility", () => {
  it("matches the full given name and surname with a compatible middle initial", () => {
    expect(
      uniqueOcrStudentMatch(matchOcrStudents(text, text, [initial]))?.studentNo
    ).toBe("S1")
  })
  it("matches a roster name inside health-form OCR even if extraction guessed Sex Male", () => {
    expect(
      uniqueOcrStudentMatch(
        matchOcrStudents(
          "Sex Male",
          `HEALTH INFORMATION FORM FOR STUDENTS\nNAME: ${text}\nSEX MALE`,
          [initial]
        )
      )?.studentNo
    ).toBe("S1")
  })
  it("prefers an exact full middle name over an initial-compatible candidate", () => {
    const full = {
      studentNo: "S2",
      name: "DELA PENA, HAROLD PRINCE ENTIENZA",
      firstName: "HAROLD PRINCE",
      middleName: "ENTIENZA",
      lastName: "DELA PENA",
    }
    expect(
      uniqueOcrStudentMatch(matchOcrStudents(text, text, [initial, full]))
        ?.studentNo
    ).toBe("S2")
  })
  it("prefers a full middle name in page OCR over an initial-only template candidate", () => {
    const full = {
      studentNo: "S2",
      name: "DELA PENA, HAROLD PRINCE E.",
      firstName: "HAROLD PRINCE",
      middleName: "ENTIENZA",
      lastName: "DELA PENA",
    }
    expect(
      uniqueOcrStudentMatch(
        matchOcrStudents(initial.name, text, [initial, full])
      )?.studentNo
    ).toBe("S2")
  })
  it("keeps equally valid initials ambiguous", () => {
    expect(
      uniqueOcrStudentMatch(
        matchOcrStudents(text, text, [initial, { ...initial, studentNo: "S2" }])
      )
    ).toBeNull()
  })
  it("does not abbreviate given names, surname or conflicting full middle names", () => {
    for (const wrong of [
      "Harold Peter Entienza dela Pena",
      "Harold Prince Entienza dela Cruz",
      "Harold Prince Aragon dela Pena",
    ]) {
      expect(matchOcrStudents(wrong, wrong, [initial])).toEqual([])
    }
    const differentMiddle = {
      ...initial,
      name: "DELA PENA, HAROLD PRINCE ESTRELLA",
      firstName: "HAROLD PRINCE",
      middleName: "ESTRELLA",
      lastName: "DELA PENA",
    }
    expect(matchOcrStudents(text, text, [differentMiddle])).toEqual([])
  })
})
