function normalized(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function titleKey(value) {
  const title = String(value || "").replace(/\s*\(\s*for\b.*$/i, "");
  return normalized(title).replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/^(?:demo |official )+/, "").replace(/\s/g, "");
}

const PROFILES = [
  { labels: ["Confirmation Slip", "SAR Form (circled)"], titles: ["Confirmation Slip"] },
  { labels: ["Health and Information Sheet", "Student Health Information Form"], titles: ["Health Information Form for Students", "Student Health Information Form", "Health and Information Sheet"] },
  { labels: ["Route and Approval Slip"], titles: ["Route and Approval Slip", "Routing and Approval Slip"] },
  { labels: ["Certification and Undertaking"], titles: ["Certification/Undertaking", "Certification and Undertaking"] },
  { labels: ["Undertaking and Waiver of Right"], titles: ["Undertaking and Waiver of Right", "Undertaking and Waiver of Rights"] },
  { labels: ["CAEPUP 2023 Application Form", "CAEPUP Application Form"], titles: ["CAEPUP Application Form"] },
  { labels: ["SF10 JHS Permanent Record", "Form 137 / SF10", "Form 137"], titles: ["Learner Permanent Record for Junior High School (SF10-JHS)", "Learner's Permanent Record for Junior High School", "SF10 JHS Permanent Record", "SF10-JHS", "Junior High School Permanent Record"] },
  { labels: ["Form 137 SHS Permanent Record", "Form 137 / SF10", "Form 137"], titles: ["Senior High School Student Permanent Record", "Senior High School Permanent Record", "Form 137-SHS", "Form 137 SHS Permanent Record", "SF10-SHS"] },
  { labels: ["Form 137 / SF10", "Form 137", "SF10 JHS Permanent Record"], titles: ["Form 137", "Form 137-A", "SF10"], evidence: (text) => /\b(?:form 137|sf ?10)\b/.test(text) && /\b(?:permanent|scholastic)\b/.test(text) },
  { labels: ["SF9 Progress Report Card"], titles: ["SF9 Progress Report Card", "SF 9 Learner's Progress Report Card", "Learner's Progress Report Card"] },
  ...[10, 11, 12].map((grade) => ({
    labels: grade === 12 ? ["Grade 12 Report Card (1st and 2nd Semester)", "Grade 12 Report Card"] : [`CTC Grade ${grade} Report Card`, `Grade ${grade} Report Card`],
    titles: [`Grade ${grade} Report Card`, `CTC Grade ${grade} Report Card`],
    evidence: (text) => /\breport card\b/.test(text) && new RegExp(`\\bgrade ${grade}\\b`).test(text),
  })),
  { labels: ["SHS Diploma or Certificate of Graduation", "Senior High School Diploma"], titles: ["Senior High School Diploma", "SHS Diploma", "Diploma", "Katibayan", "Certificate of Graduation"],
    required: (text) => /\b(?:senior high school|shs)\b/.test(text) && !/\b(?:degree conferred|awarded the degree|bachelor of)\b/.test(text), boost: 100 },
  { labels: ["Diploma"], titles: ["Diploma"], evidence: (text) => /\b(?:has conferred|conferred upon|awarded the degree|is hereby conferred)\b/.test(text) && /\bdegree\b/.test(text) },
  { labels: ["Certificate of Good Moral Character", "Graduation and Good Moral Certification"], titles: ["Certificate of Good Moral Character", "Good Moral Certificate", "Good Moral Certification", "Graduation and Good Moral Certification"],
    evidence: (text, titles) => /\bgood moral character\b/.test(text) && titles.has(titleKey("Certification")) },
  { labels: ["PSA Birth Certificate (circled)", "Certificate of Live Birth", "PSA Birth Certificate", "Birth Certificate"], titles: ["Certificate of Live Birth", "PSA Birth Certificate", "Birth Certificate"],
    evidence: (text) => /\bcertificate of live birth\b/.test(text) && /\b(?:registry|civil registrar|statistics authority)\b/.test(text) },
  { labels: ["Photocopy of ID", "Student ID Front and Back", "Student ID"], titles: ["Student ID", "Student Identification Card", "School Identification Card", "Photocopy of ID", "Student ID Front and Back"] },
  { labels: ["SAR Form (circled)", "SAR Form"], titles: ["SAR Form", "Student Admission Record"] },
  { labels: ["Certificate of Enrollment"], titles: ["Certificate of Enrollment", "Certificate of Enrolment", "Certification of Enrollment"] },
  { labels: ["Certificate of Registration"], titles: ["Certificate of Registration", "Registration Certificate"] },
  { labels: ["Certificate of Graduation"], titles: ["Certificate of Graduation", "Graduation Certificate"] },
  { labels: ["Certificate of Transfer Credentials (Honorable Dismissal)", "Certificate of Transfer Credentials", "Honorable Dismissal"], titles: ["Certificate of Transfer Credentials", "Honorable Dismissal", "Certificate of Transfer Credentials (Honorable Dismissal)"] },
  { labels: ["Certification of Grades (Cross-Enrollee)", "Certification of Grades"], titles: ["Certification of Grades", "Certification of Grades (Cross-Enrollee)"] },
  { labels: ["Certified True Copy of Records"], titles: ["Certified True Copy of Records"] },
  { labels: ["Transcript of Records", "TOR"], titles: ["Transcript of Records", "Official Transcript of Records"],
    evidence: (text) => /\btranscript of records\b/.test(text) && /\b(?:grading system|units earned|course code|official transcript)\b/.test(text) },
];

export function detectDocType(rawText, docTypes, { requireEvidence = true } = {}) {
  const labels = Array.isArray(docTypes) ? docTypes.filter((label) => typeof label === "string" && label.trim()) : [];
  if (!labels.length) return "";
  const text = normalized(rawText);
  if (!text) return requireEvidence ? "" : labels[0];
  const lines = String(rawText).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const titles = new Map();
  for (let index = 0; index < lines.length; index++) {
    for (let length = 1; length <= 3 && index + length <= lines.length; length++) {
      const key = titleKey(lines.slice(index, index + length).join(" "));
      if (!titles.has(key)) titles.set(key, index);
    }
  }
  const candidates = new Map();
  function offer(label, score, position = Infinity) {
    const existing = candidates.get(label);
    if (!existing || score > existing.score || (score === existing.score && position < existing.position)) {
      candidates.set(label, { label, score, position });
    }
  }
  for (const label of labels) {
    const position = titles.get(titleKey(label));
    if (position !== undefined) offer(label, 2000, position);
  }
  for (const profile of PROFILES) {
    if (profile.required && !profile.required(text)) continue;
    const label = profile.labels.map((alias) => labels.find((item) => titleKey(item) === titleKey(alias))).find(Boolean);
    if (!label) continue;
    const positions = profile.titles.map((title) => titles.get(titleKey(title))).filter((position) => position !== undefined);
    if (positions.length) offer(label, 2500 + (profile.boost || 0), Math.min(...positions));
    else if (profile.evidence?.(text, titles)) offer(label, 700 + (profile.boost || 0));
  }
  const ranked = [...candidates.values()].sort((left, right) => right.score - left.score || left.position - right.position);
  if (!ranked.length) return requireEvidence ? "" : labels[0];
  if (ranked[1]?.score === ranked[0].score && ranked[1].position === ranked[0].position) return "";
  return ranked[0].label;
}
