import { PersonNameSchema, formatRegistrarStudentName } from "./validationSchemas.js";

export function studentRecordNameParts(record = {}) {
  if (record.firstName || record.first_name || record.lastName || record.last_name) {
    return {
      firstName: record.firstName || record.first_name || "",
      middleName: record.middleName ?? record.middle_name ?? "",
      lastName: record.lastName || record.last_name || "",
    };
  }
  // Legacy records have no reliable full middle name to recover.
  const [lastName, ...given] = String(record.name || "").split(",");
  if (!given.length) return { firstName: "", middleName: "", lastName: "" };
  const first = given.join(",").trim();
  const initial = first.match(/\s+([A-ZÀ-ÖØ-öø-ÿ]\.)$/i);
  return {
    firstName: initial ? first.slice(0, initial.index) : first,
    middleName: initial ? initial[1] : "",
    lastName: lastName.trim(),
  };
}

const NAME_FIELDS = [["firstName", "First name"], ["middleName", "Middle name"], ["lastName", "Last name"]];

function normalizeNameField(parts, key, label) {
  const value = String(parts[key] ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  if (key === "middleName" && !value) return value;
  const validation = PersonNameSchema(label).safeParse(key === "middleName" && value.length === 1 ? `${value}.` : value);
  if (!validation.success) throw new Error(validation.error.issues[0]?.message || `Invalid ${label.toLowerCase()}`);
  if (value.includes(",")) throw new Error(`${label} must not contain commas. Enter each name in its own field.`);
  return value;
}

export function getStudentRecordNameErrors(parts) {
  const errors = {};
  for (const [key, label] of NAME_FIELDS) {
    try {
      normalizeNameField(parts, key, label);
    } catch {
      errors[key] = true;
    }
  }
  return errors;
}

export function normalizeStudentRecordName(parts) {
  const normalized = {};
  for (const [key, label] of NAME_FIELDS) {
    normalized[key] = normalizeNameField(parts, key, label);
  }
  return { ...normalized, name: formatRegistrarStudentName(normalized) };
}
