export const STUDENT_AFFILIATIONS = [
  { value: "Student", label: "Current student" },
  { value: "Alumni", label: "Alumni or former student" },
  { value: "Parent", label: "Parent or guardian" },
];

export function isStudentAffiliation(value) {
  return STUDENT_AFFILIATIONS.some((affiliation) => affiliation.value === value);
}

export function hasLinkedStudentRecord(account) {
  return (account?.clientType ?? account?.client_type) === "Student"
    && Boolean(account?.studentNo ?? account?.student_no);
}

export function getRequestAffiliation(accountAffiliation, requestedAffiliation) {
  return accountAffiliation === "Parent" ? "Parent" : requestedAffiliation || accountAffiliation;
}

export function normalizeChecklistStudentNo(value) {
  const number = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9][A-Z0-9_./-]{1,30}$/.test(number) ? number : null;
}
