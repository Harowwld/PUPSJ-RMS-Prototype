import { query, transaction } from "./postgres.js";
import { normalizeChecklistStudentNo } from "./studentAffiliation.js";

export { normalizeChecklistStudentNo };

export const checklistTypesQuery = `
  SELECT id, name, compliance_category FROM document_types
  WHERE office_id = 'registrar' AND status = 'Active' AND is_compliance = TRUE AND is_requestable = FALSE
  ORDER BY lower(name)
`;

// Categorization helper for standard requirements
function getRequirementCategory(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("birth") || n.includes("caepup") || n.includes("waiver") || n.includes("undertaking") || n.includes("sar form") || /\bid\b/.test(n)) {
    return "Admission & Identity";
  }
  if (n.includes("137") || n.includes("report card") || n.includes("grade 10") || n.includes("grade 11") || n.includes("grade 12") || n.includes("diploma")) {
    return "Academic Records";
  }
  if (n.includes("good moral") || n.includes("health") || n.includes("clearance") || n.includes("medical")) {
    return "Certificates & Clearances";
  }
  return "General Requirements";
}

function getRequirementDescription(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("birth")) {
    return "Official birth certificate issued by the Philippine Statistics Authority (PSA) on Security Paper (SECPA).";
  }
  if (n.includes("caepup")) {
    return "Official College Admission Evaluation confirmation / CAEPUP application slip.";
  }
  if (n.includes("diploma")) {
    return "Senior High School Diploma or official Certificate of Graduation indicating completion of secondary education.";
  }
  if (/\bid\b/.test(n)) {
    return "Photocopy of the identification document required for your enrollment batch.";
  }
  if (n.includes("137")) {
    return "Senior High School Student Permanent Record (SF10-SHS).";
  }
  if (n.includes("grade 12 report card") || n.includes("grade 12")) {
    return "Senior High School Final Report Card (Form 138 / SF9) showing Grade 12 results for both semesters.";
  }
  if (n.includes("grade 10") || n.includes("grade 11")) {
    return "Certified true copy of Junior / Senior High School academic progress report.";
  }
  if (n.includes("good moral")) {
    return "Original certificate of good moral character issued by your previous school principal or guidance counselor.";
  }
  if (n.includes("health") || n.includes("medical")) {
    return "Health information requested as part of enrollment.";
  }
  if (n.includes("waiver") || n.includes("undertaking")) {
    return "Duly signed university admission waiver and student agreement.";
  }
  if (n.includes("sar form")) {
    return "Student Admission Record (SAR) copy officially issued during campus enrollment.";
  }
  return "Official document required for institutional archives and academic verification.";
}

const SAN_JUAN_CONTACT = { label: "Open PUP San Juan Contacts", href: "https://www.pup.edu.ph/sanjuan/contactinfo" };
const SCHOOL_RECORDS = { label: "View DepEd Records Guide", href: "https://www.deped.gov.ph/wp-content/uploads/DepEd-Citizens-Charter-2025.pdf" };
const CAEPUP_GUIDE = { label: "View CAEPUP Instructions", href: "https://www.pup.edu.ph/iapply/procedure/caepup" };
const PSA_GUIDE = { label: "View PSA Request Options", href: "https://psa.gov.ph/birth-certificate" };

const REQUIREMENT_GUIDANCE = {
  caepup: {
    instructions: "Download the application PDF from the PUP iApply account you used for CAEPUP. For an archived 2023 form or a different admission batch, contact PUP San Juan Admissions for help retrieving the correct record.",
    source: CAEPUP_GUIDE,
  },
  sar_form: {
    instructions: "Look for the SAR form in your enrollment packet or admission email. If you need a replacement or your checklist says “circled,” ask PUP San Juan Admissions which form to use and what to mark.",
    source: SAN_JUAN_CONTACT,
  },
  health_sheet: {
    instructions: "Use the Health Information Sheet in your PUP San Juan enrollment packet. If you did not receive one, ask PUP San Juan Admissions for the form and where to have it completed.",
    source: SAN_JUAN_CONTACT,
  },
  waiver: {
    instructions: "Ask PUP San Juan Admissions for the undertaking and waiver used for your enrollment batch. Follow the signing instructions on the campus-issued form.",
    source: SAN_JUAN_CONTACT,
  },
  grade_10_card: {
    instructions: "Request a certified true copy of your Grade 10 report card (SF9) from the school that issued it. For legacy CAEPUP records, check that it shows your full name, Learner Reference Number (LRN), and the required grades.",
    source: CAEPUP_GUIDE,
  },
  grade_11_card: {
    instructions: "Request a certified true copy of your Grade 11 report card (SF9) from your senior high school’s records office. Check that both semesters, your full name, and your Learner Reference Number (LRN) appear.",
    source: CAEPUP_GUIDE,
  },
  grade_12_card: {
    instructions: "Ask your senior high school’s registrar or records office for your Grade 12 report card (SF9) covering both semesters. Confirm with PUP San Juan whether it needs the original or a certified copy.",
    source: SCHOOL_RECORDS,
  },
  shs_diploma: {
    instructions: "Contact your senior high school’s records office for your diploma or a Certificate of Graduation. Before requesting a certified copy, confirm which format PUP San Juan accepts for your batch.",
    source: SCHOOL_RECORDS,
  },
  good_moral: {
    instructions: "Request a Certificate of Good Moral Character from the guidance or records office of the school you last attended. Tell them it is for PUP San Juan enrollment and confirm any issuance-date requirement with PUP.",
    source: SCHOOL_RECORDS,
  },
  birth_certificate: {
    instructions: "Order a PSA birth certificate through PSA Serbilis or request one at a PSA Civil Registry System outlet. If your checklist asks for a circled copy, confirm which details to mark with PUP San Juan.",
    source: PSA_GUIDE,
  },
  photocopy_of_id: {
    instructions: "Prepare a legible photocopy of the ID specified in your PUP San Juan enrollment instructions. Ask Admissions which IDs it accepts and whether both sides are needed.",
    source: SAN_JUAN_CONTACT,
  },
  form_137: {
    instructions: "Ask PUP San Juan Registrar how it requests your permanent record (SF10 or Form 137) from your previous school. Then contact that school’s records office with the campus instructions.",
    source: SAN_JUAN_CONTACT,
  },
};

// Normalize key for deduplicating closely related document type names (e.g. Birth Certificate vs PSA Birth Certificate)
function getNormalizedGroupKey(name) {
  const n = String(name || "").toLowerCase().trim();
  if (n.includes("birth")) return "birth_certificate";
  if (n.includes("good moral")) return "good_moral";
  if (n.includes("137")) return "form_137";
  if (n.includes("grade 12")) return "grade_12_card";
  if (n.includes("grade 11")) return "grade_11_card";
  if (n.includes("grade 10")) return "grade_10_card";
  if (n.includes("diploma")) return "shs_diploma";
  if (/\bid\b/.test(n)) return "photocopy_of_id";
  if (n.includes("health") || n.includes("medical")) return "health_sheet";
  if (n.includes("waiver") || n.includes("undertaking")) return "waiver";
  if (n.includes("sar form")) return "sar_form";
  if (n.includes("caepup")) return "caepup";
  return n.replace(/[^a-z0-9]/g, "_");
}

function getRequirementDetails(dt) {
  const groupKey = getNormalizedGroupKey(dt.name);
  const guidance = Object.hasOwn(REQUIREMENT_GUIDANCE, groupKey)
    ? REQUIREMENT_GUIDANCE[groupKey]
    : {
        instructions: "Ask PUP San Juan Registrar who issues this document and what copy format the campus accepts.",
        source: SAN_JUAN_CONTACT,
      };

  return {
    id: dt.id,
    name: dt.name,
    docType: dt.name,
    documentType: dt.name,
    groupKey,
    category: dt.compliance_category || getRequirementCategory(dt.name),
    description: getRequirementDescription(dt.name),
    ...guidance,
  };
}

export async function getStudentChecklist(account) {
  const types = await query(checklistTypesQuery);
  const canonical = new Map();
  for (const type of types) {
    const key = getNormalizedGroupKey(type.name);
    if (!canonical.has(key) || canonical.get(key).name.length < type.name.length) canonical.set(key, type);
  }
  const requirements = [...canonical.values()].map(getRequirementDetails);
  try {
    return await getPersonalChecklist(account, requirements);
  } catch (error) {
    if (error?.code !== "42P01") throw error;
    return { requirements, verification: null, verificationUnavailable: true };
  }
}

async function getPersonalChecklist(account, requirements) {
  if (account.clientType !== "Student") return { requirements, verification: null };
  const [verification] = await query(
    `SELECT reference, status, verified_student_no FROM student_checklist_verifications WHERE account_id = $1`,
    [account.accountId],
  );
  const trustedStudentNo = account.studentNo || verification?.verified_student_no;
  let studentNo = trustedStudentNo;
  const candidate = normalizeChecklistStudentNo(account.checklistStudentNo);
  if (!studentNo && candidate) {
    const matches = await query(
      `SELECT contact.student_no FROM registrar_odrs_contacts contact
       JOIN student_accounts sa ON sa.id = $1
       JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
       WHERE upper(contact.student_no) = $2 AND contact.email = sip.email
         AND sip.portal_email_verified_at IS NOT NULL AND sip.portal_setup_complete
         AND sip.client_type = 'Student' LIMIT 2`,
      [account.accountId, candidate],
    );
    if (matches.length === 1) studentNo = matches[0].student_no;
  }
  if (!studentNo) {
    return { requirements, needsEnrollmentMatch: Boolean(candidate), verification: null };
  }

  const submitted = await transaction(async (tx) => {
    if (!trustedStudentNo) {
      const match = await tx.queryOne(
        `SELECT 1 FROM registrar_odrs_contacts contact
         JOIN student_accounts sa ON sa.id = $1
         JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id
         WHERE contact.student_no = $2 AND contact.email = sip.email
           AND sip.portal_email_verified_at IS NOT NULL AND sip.portal_setup_complete
           AND sip.client_type = 'Student' FOR SHARE OF contact, sip`,
        [account.accountId, studentNo],
      );
      if (!match) return null;
    }
    const membership = await tx.queryOne(
      "SELECT 1 FROM student_office_memberships WHERE office_id = 'registrar' AND student_no = $1 AND status = 'Active'",
      [studentNo],
    );
    if (!membership) return null;
    await tx.query(
      "SELECT set_config('app.checklist_status_read', 'on', true), set_config('app.checklist_student_no', $1, true)",
      [studentNo],
    );
    const { rows } = await tx.query(
      `SELECT DISTINCT doc_type AS name FROM documents
        WHERE office_id = 'registrar' AND student_no = $1 AND approval_status <> 'Declined'`,
      [studentNo],
    );
    return new Set(rows.map(({ name }) => getNormalizedGroupKey(name)));
  });

  if (!submitted) return { requirements, verification: null, unavailable: true };
  const statuses = requirements.map(({ id, name, docType, category, description, instructions, source, groupKey }) => ({
    id, name, docType, category, description, instructions, source,
    status: submitted.has(groupKey) ? "Submitted" : "Missing",
  }));
  const totalRequired = statuses.length;
  const submittedCount = statuses.filter(({ status }) => status === "Submitted").length;
  return {
    student: { studentNo },
    summary: {
      submittedCount,
      totalRequired,
      missingCount: totalRequired - submittedCount,
      complianceRate: totalRequired ? Math.round(submittedCount * 100 / totalRequired) : 100,
    },
    requirements: statuses,
  };
}
