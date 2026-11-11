import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/postgres";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { canAccessResource } from "@/lib/resourceAuthorization";
import { hasLinkedStudentRecord } from "@/lib/studentAffiliation";
import { decryptPII } from "@/lib/piiEncryption";

export const runtime = "nodejs";

// Categorization helper for standard requirements
function getRequirementCategory(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("birth") || n.includes("caepup") || n.includes("waiver") || n.includes("undertaking") || n.includes("sar form") || n.includes("id")) {
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
  if (n.includes("id")) {
    return "Clear photocopy of valid student ID or government-issued identification card.";
  }
  if (n.includes("137")) {
    return "Senior High School Student Permanent Record (SF10-SHS) with Copy for PUP San Juan remarks.";
  }
  if (n.includes("grade 12 report card") || n.includes("grade 12")) {
    return "Senior High School Final Report Card (Form 138 / SF9) showing complete Grade 12 general average (1st and 2nd Semester).";
  }
  if (n.includes("grade 10") || n.includes("grade 11")) {
    return "Certified true copy of Junior / Senior High School academic progress report.";
  }
  if (n.includes("good moral")) {
    return "Original certificate of good moral character issued by your previous school principal or guidance counselor.";
  }
  if (n.includes("health") || n.includes("medical")) {
    return "Medical clearance certificate and health profile stamped by the University Medical Clinic.";
  }
  if (n.includes("waiver") || n.includes("undertaking")) {
    return "Duly signed university admission waiver and student agreement.";
  }
  if (n.includes("sar form")) {
    return "Student Admission Record (SAR) copy officially issued during campus enrollment.";
  }
  return "Official document required for institutional archives and academic verification.";
}

function getRequirementInstructions(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("birth")) {
    return "Submit the original PSA-issued document on security paper at the Registrar counter (Room 102). Photocopies cannot be accepted for official archives.";
  }
  if (n.includes("137")) {
    return "Must be original SF10-SHS sealed with the official dry seal and principal's signature from your previous high school.";
  }
  if (n.includes("diploma")) {
    return "Submit a certified true copy or legible photocopy of your Senior High School Diploma or Certificate of Graduation.";
  }
  if (n.includes("id")) {
    return "Provide a clear front-and-back photocopy with legible text and photograph.";
  }
  if (n.includes("good moral")) {
    return "Must have been issued within the last 6 months bearing the school dry seal and signature.";
  }
  return "Must be submitted in person at the Office of the Campus Registrar, Room 102, inside a properly labeled long brown envelope.";
}

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
  if (n.includes("id")) return "photocopy_of_id";
  if (n.includes("health") || n.includes("medical")) return "health_sheet";
  if (n.includes("waiver") || n.includes("undertaking")) return "waiver";
  if (n.includes("sar form")) return "sar_form";
  if (n.includes("caepup")) return "caepup";
  return n.replace(/[^a-z0-9]/g, "_");
}

export async function GET(req) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  if (!hasLinkedStudentRecord(access.user)) {
    return createAuthErrorResponse("The document checklist is available to current students with a linked record.", 403);
  }

  const { studentNo } = access.user;
  const student = await queryOne(
    `SELECT s.student_no, s.name, s.course_code, s.year_level, s.section, s.status,
            s.storage_room, s.storage_cabinet, s.storage_drawer, c.name AS course_name
       FROM students s
       LEFT JOIN courses c ON c.code = s.course_code AND c.office_id = 'registrar'
      WHERE s.student_no = $1`,
    [studentNo]
  );
  if (!student) return createAuthErrorResponse("Linked student record not found.", 404);
  if (student.name) student.name = decryptPII(student.name);
  const effectiveStudentNo = student.student_no;

  // 2. Fetch Active Compliance Document Types for Registrar
  const docTypes = await query(
    `SELECT id, name, name_norm, office_id, compliance_category
       FROM document_types
      WHERE office_id = 'registrar' AND status = 'Active' AND is_compliance = TRUE AND is_requestable = FALSE
      ORDER BY LOWER(name) ASC`
  );

  // Group / deduplicate aliases (e.g. Birth Certificate & PSA Birth Certificate)
  const dedupedTypesMap = new Map();
  for (const dt of docTypes) {
    const groupKey = getNormalizedGroupKey(dt.name);
    if (!dedupedTypesMap.has(groupKey)) {
      dedupedTypesMap.set(groupKey, dt);
    } else {
      const existing = dedupedTypesMap.get(groupKey);
      if (dt.name.length > existing.name.length) {
        dedupedTypesMap.set(groupKey, dt);
      }
    }
  }
  const canonicalTypes = Array.from(dedupedTypesMap.values());

  // 3. Fetch Submitted Documents for this Student
  const rawDocuments = effectiveStudentNo
    ? (await query(
        `SELECT id, office_id, student_no, student_name, doc_type, original_filename,
                storage_filename, mime_type, size_bytes, approval_status,
                reviewed_by, reviewed_at, review_note, created_at
           FROM documents
          WHERE office_id = 'registrar' AND student_no = $1
          ORDER BY created_at DESC`,
        [effectiveStudentNo]
      )).filter((item) => canAccessResource(access.user, "document", item))
    : [];

  const documents = rawDocuments.map((doc) => ({
    ...doc,
    student_name: doc.student_name ? decryptPII(doc.student_name) : doc.student_name,
  }));

  // Group documents by normalized requirement key
  const docsByGroupKey = new Map();
  for (const doc of documents) {
    const gKey = getNormalizedGroupKey(doc.doc_type);
    if (!docsByGroupKey.has(gKey)) {
      docsByGroupKey.set(gKey, []);
    }
    docsByGroupKey.get(gKey).push(doc);
  }

  // 4. Correlate Requirements with Submitted Documents
  let submittedCount = 0;
  let missingCount = 0;

  const requirements = canonicalTypes.map((dt) => {
    const gKey = getNormalizedGroupKey(dt.name);
    const submittedForType = docsByGroupKey.get(gKey) || [];

    // Find any valid submitted document (excluding declined)
    const validDoc =
      submittedForType.find((d) => d.approval_status === "Approved") ||
      submittedForType.find((d) => d.approval_status !== "Declined") ||
      null;

    const isSubmitted = Boolean(validDoc);
    const status = isSubmitted ? "Submitted" : "Not Submitted";

    if (isSubmitted) {
      submittedCount++;
    } else {
      missingCount++;
    }

    return {
      id: dt.id,
      name: dt.name,
      docType: dt.name,
      documentType: dt.name,
      groupKey: gKey,
      category: dt.compliance_category || getRequirementCategory(dt.name),
      description: getRequirementDescription(dt.name),
      instructions: getRequirementInstructions(dt.name),
      status, // Strictly "Submitted" or "Not Submitted"
      document: validDoc
        ? {
            id: validDoc.id,
            originalFilename: validDoc.original_filename,
            sizeBytes: validDoc.size_bytes,
            mimeType: validDoc.mime_type,
            approvalStatus: validDoc.approval_status,
            reviewedAt: validDoc.reviewed_at,
            reviewedBy: validDoc.reviewed_by,
            reviewNote: validDoc.review_note,
            createdAt: validDoc.created_at,
            fileUrl: `/api/documents/${validDoc.id}`,
          }
        : null,
      submissionCount: submittedForType.length,
      history: submittedForType.map((d) => ({
        id: d.id,
        originalFilename: d.original_filename,
        approvalStatus: d.approval_status,
        reviewNote: d.review_note,
        createdAt: d.created_at,
      })),
    };
  });

  const totalRequired = canonicalTypes.length;
  const complianceRate = totalRequired > 0 ? Math.round((submittedCount / totalRequired) * 100) : 100;
  const overallStatus = submittedCount === totalRequired ? "Fully Compliant" : "Incomplete";

  return NextResponse.json({
    ok: true,
    data: {
      student: {
        studentNo: effectiveStudentNo || "Unassigned",
        name: student?.name || access.user.name || "Student",
        courseCode: student?.course_code || "BSIT",
        courseName: student?.course_name || "Bachelor of Science in Information Technology",
        yearLevel: student?.year_level || 2024,
        section: student?.section || "1-1",
        status: student?.status || "Active",
        storageLocation: student?.storage_room
          ? {
              room: student.storage_room,
              cabinet: student.storage_cabinet,
              drawer: student.storage_drawer,
            }
          : null,
      },
      summary: {
        totalRequired,
        submittedCount,
        missingCount,
        approvedCount: submittedCount,
        pendingCount: 0,
        declinedCount: 0,
        complianceRate,
        submittedRate: complianceRate,
        overallStatus,
        isCompliant: submittedCount === totalRequired,
      },
      requirements,
      officeDetails: {
        officeId: "registrar",
        name: "Office of the Campus Registrar",
        location: "Ground Floor, Administration Building, Room 102",
        campus: "Polytechnic University of the Philippines - San Juan Campus",
        windowHours: "Monday to Friday, 8:00 AM – 5:00 PM (PST)",
        submissionPolicy: "Face-to-Face submission only. Original documents must be submitted in person for physical archiving and digitization.",
        slaStandard: "3 to 5 working days document evaluation",
      },
    },
  });
}
