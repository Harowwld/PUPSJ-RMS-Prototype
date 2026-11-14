import { studentRecordNameParts } from "./studentRecordName.js"
import { uniqueOcrStudentMatch } from "./studentNameMatcher.js"

const STUDENT_FIELDS = [
  "studentNo",
  "name",
  "firstName",
  "middleName",
  "lastName",
  "course",
  "year",
  "sectionPart",
  "room",
  "cabinet",
  "drawer",
]
const IDENTITY_FIELDS = STUDENT_FIELDS.slice(0, 8)

export function createScanUploadForm(values) {
  return { values, owned: [], manual: [], existing: false, confirmed: false }
}

function rosterFields(student) {
  const studentNo = String(student.studentNo || student.student_no || "")
  const entryYear = studentNo.match(/^(\d{4})-/)?.[1]
  return {
    studentNo,
    ...studentRecordNameParts(student),
    name: String(student.name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase(),
    course: student.courseCode || student.course_code || "",
    year: String(entryYear || student.yearLevel || student.year_level || ""),
    sectionPart: String(student.section || ""),
    room: String(student.room ?? ""),
    cabinet: String(student.cabinet ?? ""),
    drawer: String(student.drawer ?? ""),
  }
}

export function scanUploadFormReducer(state, action) {
  if (action.type === "edit") {
    const values =
      typeof action.update === "function"
        ? action.update(state.values)
        : action.update
    if (!Object.values(values).some((value) => String(value ?? "").trim()))
      return createScanUploadForm(values)
    const changed = [
      ...new Set([
        ...(action.manualFields || []),
        ...Object.keys(values).filter(
          (key) => values[key] !== state.values[key]
        ),
      ]),
    ]
    return {
      ...state,
      values,
      owned: state.owned.filter((key) => !changed.includes(key)),
      manual: [...new Set([...state.manual, ...changed])],
    }
  }
  if (action.type === "select-existing") {
    const existing =
      typeof action.value === "function"
        ? action.value(state.existing)
        : action.value
    return {
      ...state,
      existing,
      confirmed: existing,
      owned: state.owned.filter((key) => !STUDENT_FIELDS.includes(key)),
      manual: [
        ...new Set([
          ...state.manual,
          ...STUDENT_FIELDS.filter((key) => state.values[key]),
        ]),
      ],
    }
  }
  if (action.type !== "ocr") return state

  const {
    suggestion,
    lockedIdentity = false,
    lockedDocType = "",
    isOsas = false,
  } = action
  const values = { ...state.values }
  const owned = new Set(state.owned)
  const preserveIdentity = isOsas || lockedIdentity || state.confirmed
  if (!preserveIdentity) {
    for (const key of STUDENT_FIELDS) {
      if (owned.has(key)) {
        values[key] = ""
        owned.delete(key)
      }
    }
  }
  const match = uniqueOcrStudentMatch(suggestion.studentMatches || [])
  const student = match?.student
  const manualIdentity = IDENTITY_FIELDS.some(
    (key) => state.manual.includes(key) && values[key]
  )
  const fillStudent = Boolean(student && !preserveIdentity && !manualIdentity)
  if (fillStudent) {
    for (const [key, value] of Object.entries(rosterFields(student))) {
      if (state.manual.includes(key)) continue
      values[key] = value
      owned.add(key)
    }
  }
  // Document type belongs to the current scan, independently of student matching.
  if (lockedDocType) values.docType = lockedDocType
  else if (!state.manual.includes("docType")) {
    values.docType = suggestion.docType || ""
    owned.add("docType")
  }
  return {
    ...state,
    values,
    owned: [...owned],
    existing: preserveIdentity ? state.existing : fillStudent,
  }
}
