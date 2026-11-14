import { describe, expect, it } from "vitest"
import {
  createScanUploadForm,
  scanUploadFormReducer as reduce,
} from "@/lib/scanUploadAutofill"
const empty = {
  studentNo: "",
  name: "",
  firstName: "",
  middleName: "",
  lastName: "",
  course: "",
  year: "",
  sectionPart: "",
  room: "",
  cabinet: "",
  drawer: "",
  docType: "",
}
const student = {
  studentNo: "2026-99001-SJ-0",
  name: "DELA PENA, HAROLD PRINCE E.",
  firstName: "HAROLD PRINCE",
  middleName: "E.",
  lastName: "DELA PENA",
  courseCode: "BSIT",
  section: "4-1",
  room: 1,
  cabinet: "2026",
  drawer: 2,
}
const scan = (state, matches, docType = "", extra = {}) =>
  reduce(state, {
    type: "ocr",
    suggestion: {
      name: "SEX, MALE",
      firstName: "MALE",
      lastName: "SEX",
      studentMatches: matches,
      docType,
    },
    ...extra,
  })
const match = { studentNo: student.studentNo, student }
describe("Scan & Upload OCR field ownership", () => {
  it("only fills roster identity on a unique match and updates the type on a second matching scan", () => {
    let state = scan(
      createScanUploadForm({ ...empty }),
      [match],
      "Health and Information Sheet"
    )
    expect(state.values).toMatchObject({
      studentNo: student.studentNo,
      firstName: "HAROLD PRINCE",
      lastName: "DELA PENA",
      docType: "Health and Information Sheet",
    })
    expect(state.existing).toBe(true)
    state = scan(state, [match], "Confirmation Slip")
    expect(state.values.docType).toBe("Confirmation Slip")
    state = scan(state, [match])
    expect(state.values.docType).toBe("")
    expect(state.values.studentNo).toBe(student.studentNo)
  })
  it.each([[], [match, { ...match, studentNo: "S2" }]])(
    "keeps unmatched or ambiguous guesses out of the form (%j)",
    (matches) => {
      const state = scan(
        createScanUploadForm({ ...empty }),
        matches,
        "Health and Information Sheet"
      )
      expect(state.values).toEqual({
        ...empty,
        docType: "Health and Information Sheet",
      })
      expect(state.existing).toBe(false)
    }
  )
  it("clears prior OCR details on no match while preserving edited storage and manual document type", () => {
    let state = scan(createScanUploadForm({ ...empty }), [match], "Old Type")
    state = reduce(state, {
      type: "edit",
      update: (p) => ({ ...p, room: "5", docType: "Manual Type" }),
    })
    state = scan(state, [], "New Type")
    expect(state.values).toEqual({
      ...empty,
      room: "5",
      docType: "Manual Type",
    })
    expect(state.existing).toBe(false)
  })
  it("preserves manual identity even when a scan finds a different roster match", () => {
    let state = reduce(createScanUploadForm({ ...empty }), {
      type: "edit",
      update: (p) => ({
        ...p,
        firstName: "MANUAL",
        lastName: "PERSON",
        name: "PERSON, MANUAL",
        course: "MANUAL PROGRAM",
      }),
    })
    state = scan(state, [match], "Detected Type")
    expect(state.values).toMatchObject({
      studentNo: "",
      name: "PERSON, MANUAL",
      course: "MANUAL PROGRAM",
      docType: "Detected Type",
    })
    expect(state.existing).toBe(false)
  })
  it("preserves every manually entered student and storage field on no-match", () => {
    const manual = {
      ...empty,
      studentNo: "2026-99990-SJ-0",
      firstName: "MANUAL",
      middleName: "M.",
      lastName: "PERSON",
      name: "PERSON, MANUAL M.",
      course: "BSIT",
      year: "2026",
      sectionPart: "4-1",
      room: "2",
      cabinet: "2026",
      drawer: "3",
    }
    let state = reduce(createScanUploadForm({ ...empty }), {
      type: "edit",
      update: manual,
    })
    state = scan(state, [], "Detected")
    expect(state.values).toEqual({ ...manual, docType: "Detected" })
    expect(state.existing).toBe(false)
  })
  it("preserves an explicitly selected student but keeps updating OCR-owned type", () => {
    let state = scan(createScanUploadForm({ ...empty }), [match], "Old Type")
    state = reduce(state, { type: "select-existing", value: true })
    state = scan(state, [], "New Type")
    expect(state.values.studentNo).toBe(student.studentNo)
    expect(state.values.docType).toBe("New Type")
    expect(state.existing).toBe(true)
    state = scan(state, [])
    expect(state.values.docType).toBe("")
  })
  it("preserves record-locked identity and type regardless of OCR", () => {
    const state = scan(
      {
        ...createScanUploadForm({ ...empty, ...student, docType: "Locked" }),
        existing: true,
      },
      [],
      "New Type",
      { lockedIdentity: true, lockedDocType: "Locked" }
    )
    expect(state.values.docType).toBe("Locked")
    expect(state.values.studentNo).toBe(student.studentNo)
  })
  it("promotes an explicit manual type selection even when it equals the OCR value", () => {
    let state = scan(createScanUploadForm({ ...empty }), [match], "Health")
    state = reduce(state, {
      type: "edit",
      manualFields: ["docType"],
      update: (p) => ({ ...p, docType: "Health" }),
    })
    state = scan(state, [match], "Other Type")
    expect(state.values.docType).toBe("Health")
  })
  it("is pure under repeated React updater evaluation", () => {
    const state = scan(createScanUploadForm({ ...empty }), [match], "Old")
    const snapshot = structuredClone(state)
    expect(scan(state, [], "New")).toEqual(scan(state, [], "New"))
    expect(state).toEqual(snapshot)
  })
})
