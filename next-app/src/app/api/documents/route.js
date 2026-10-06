import { NextResponse } from "next/server";
import {
  createDocument,
  listDocuments,
} from "../../../lib/documentsRepo";
import { createStudent, deleteStudent, getStudentByStudentNo } from "../../../lib/studentsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireStaff, createAuthErrorResponse, getPrincipalOfficeId } from "../../../lib/authHelpers";
import { isUniqueViolation } from "../../../lib/dbErrors";
import { isSystemAdminRole } from "../../../lib/roleUtils";
import { canAccessResource } from "../../../lib/resourceAuthorization";
import { dbGet } from "../../../lib/postgresCompat";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const studentNo = searchParams.get("studentNo") || "";
  const organizationId = searchParams.get("organizationId") || "";
  const docType = searchParams.get("docType") || "";
  const approvalStatus = searchParams.get("approvalStatus") || "";
  const excludeDeclinedRaw = searchParams.get("excludeDeclined");
  const excludeDeclined =
    excludeDeclinedRaw === "1" ||
    String(excludeDeclinedRaw || "").toLowerCase() === "true";
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const officeId = getPrincipalOfficeId(user);
  if (!isSystemAdminRole(user.role) && !officeId) {
    return createAuthErrorResponse("Office scope is required", 403);
  }

  const rows = await listDocuments({
    officeId: officeId || undefined,
    q: q || undefined,
    studentNo: studentNo || undefined,
    organizationId: organizationId || undefined,
    docType: docType || undefined,
    approvalStatus: approvalStatus || undefined,
    excludeDeclined: approvalStatus ? false : excludeDeclined,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, data: rows.filter((row) => canAccessResource(user, "document", row)) });
}

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const form = await req.formData();
  const file = form.get("file");

  if (!file) {
    return NextResponse.json(
      { ok: false, error: "Missing file" },
      { status: 400 }
    );
  }

  if (typeof file === "string") {
    return NextResponse.json(
      { ok: false, error: "Invalid file" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { ok: false, error: "Only PDF files are allowed" },
      { status: 400 }
    );
  }

  const studentNoRaw = String(form.get("studentNo") || "").trim();
  const studentNo = studentNoRaw.toUpperCase();
  let studentName = String(form.get("studentName") || "").trim();
  const docType = String(form.get("docType") || "").trim();
  const isNewStudent =
    String(form.get("isNewStudent") || "").toLowerCase() === "true";

  // === OSAS Polymorphic Ingestion (Student Organizations) ===
  if (officeId === "osas") {
    const rawOrgId = String(form.get("organizationId") || "").trim();
    const rawOrgName = String(form.get("organizationName") || studentName || "").trim();
    const rawAcronym = String(form.get("acronym") || "").trim();
    const rawCategory = String(form.get("category") || "Academic").trim();
    const rawAdviser = String(form.get("adviserName") || "").trim();
    const rawAdviserEmail = String(form.get("adviserEmail") || "").trim();
    const isNewOrg = String(form.get("isNewOrganization") || form.get("isNewStudent") || "").toLowerCase() === "true";

    const targetOrgKey = rawOrgId || studentNoRaw || rawAcronym;
    if (!targetOrgKey && !rawOrgName) {
      return NextResponse.json(
        { ok: false, error: "Organization identifier or name is required" },
        { status: 400 }
      );
    }
    if (!docType) {
      return NextResponse.json(
        { ok: false, error: "Document type is required" },
        { status: 400 }
      );
    }

    const { getOrganizationById, createOrganization, updateOrganization } = await import("../../../lib/organizationsRepo");
    let existingOrg = targetOrgKey ? await getOrganizationById(targetOrgKey) : null;

    const roomVal = form.get("room") ? parseInt(String(form.get("room")), 10) : undefined;
    const cabinetVal = form.get("cabinet") ? String(form.get("cabinet")).trim() : undefined;
    const drawerVal = form.get("drawer") ? String(form.get("drawer")).trim() : undefined;

    if (isNewOrg && !existingOrg) {
      if (!rawOrgName) {
        return NextResponse.json(
          { ok: false, error: "Organization name is required to register a new organization." },
          { status: 400 }
        );
      }
      const newOrgId = rawOrgId || (rawAcronym || rawOrgName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      existingOrg = await createOrganization({
        id: newOrgId,
        name: rawOrgName,
        acronym: rawAcronym || (rawOrgId ? rawOrgId.toUpperCase() : null),
        category: rawCategory,
        adviserName: rawAdviser,
        adviserEmail: rawAdviserEmail,
        storageRoom: roomVal || 1,
        storageCabinet: cabinetVal || (rawCategory === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS"),
        storageDrawer: drawerVal || "1",
      });
    } else if (existingOrg && (roomVal || cabinetVal || drawerVal)) {
      await updateOrganization(existingOrg.id, {
        storage_room: roomVal ?? existingOrg.storage_room,
        storage_cabinet: cabinetVal ?? existingOrg.storage_cabinet,
        storage_drawer: drawerVal ?? existingOrg.storage_drawer,
      });
    }

    if (!existingOrg) {
      return NextResponse.json(
        { ok: false, error: "Selected student organization was not found." },
        { status: 404 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const row = await createDocument({
      officeId,
      studentNo: null,
      studentName: existingOrg.name,
      organizationId: existingOrg.id,
      docType,
      originalFilename: file.name || "document.pdf",
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size || buf.length,
      buffer: buf,
      uploadedBy: user.id,
    });

    if (!row || !canAccessResource(user, "document", row)) {
      return NextResponse.json({ ok: false, error: "Document could not be created" }, { status: 500 });
    }

    await writeAuditLog(
      req,
      isNewOrg
        ? `Registered organization ${existingOrg.name} and uploaded ${docType}`
        : `Uploaded document for organization ${existingOrg.name} (${docType})`,
      { officeId, entity_type: "document", entity_id: row.id }
    );

    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  }

  // === Standard Registrar / Student Ingestion ===
  if (!studentNo || !docType) {
    return NextResponse.json(
      { ok: false, error: "studentNo and docType are required" },
      { status: 400 }
    );
  }

  // Validate the document type before creating a new student. This upload
  // flow creates the student first because documents reference that record;
  // reject invalid types before any student or membership rows are written.
  const availableDocType = await dbGet(
    `SELECT id FROM document_types
      WHERE office_id = ? AND lower(name) = lower(?) AND status = 'Active'`,
    [officeId, docType],
  );
  if (!availableDocType) {
    return NextResponse.json(
      { ok: false, error: "Document type is not available in this office." },
      { status: 400 },
    );
  }

  // Server-side safeguard: if studentName is missing, try to look it up from the database.
  if (!studentName && !isNewStudent) {
    const student = await getStudentByStudentNo(studentNo, { officeId });
    if (student) {
      studentName = student.name || "";
    }
  }

  let createdStudentForUpload = false;
  if (isNewStudent) {
    if (!studentName) {
      return NextResponse.json(
        { ok: false, error: "studentName is required when creating a new student" },
        { status: 400 }
      );
    }

    const courseCode = String(form.get("courseCode") || "").trim().toUpperCase();
    const yearLevel = parseInt(String(form.get("yearLevel") || ""), 10);
    const section = String(form.get("section") || "").trim();
    const room = parseInt(String(form.get("room") || ""), 10);
    const cabinet = String(form.get("cabinet") || "").trim();
    const drawer = parseInt(String(form.get("drawer") || ""), 10);

    const studentNoPattern = /^[A-Z0-9][A-Z0-9\-_/.]{1,30}$/i;
    if (!studentNoPattern.test(studentNo)) {
      return NextResponse.json(
        { ok: false, error: "Invalid studentNo format" },
        { status: 400 }
      );
    }

    if (!courseCode || !section) {
      return NextResponse.json(
        { ok: false, error: "courseCode and section are required for a new student" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(yearLevel) || yearLevel < 2000 || yearLevel > 2100) {
      return NextResponse.json(
        { ok: false, error: "Invalid yearLevel" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(room) || room < 1) {
      return NextResponse.json({ ok: false, error: "Invalid room" }, { status: 400 });
    }

    if (!cabinet) {
      return NextResponse.json({ ok: false, error: "Invalid cabinet" }, { status: 400 });
    }

    if (!Number.isFinite(drawer) || drawer < 1) {
      return NextResponse.json({ ok: false, error: "Invalid drawer" }, { status: 400 });
    }

    try {
      await createStudent({
        studentNo,
        name: studentName,
        courseCode,
        yearLevel,
        section,
        room,
        cabinet,
        drawer,
        status: "Active",
        officeId,
      });
      createdStudentForUpload = true;
    } catch (e) {
      const msg = String(e?.message || "");
      if (isUniqueViolation(e)) {
        return NextResponse.json(
          { ok: false, error: "Student already exists" },
          { status: 409 }
        );
      }
      if (
        msg.includes("Invalid courseCode") ||
        msg.includes("Invalid section") ||
        msg.includes("is linked to")
      ) {
        return NextResponse.json({ ok: false, error: "Invalid course or section relationship" }, { status: 400 });
      }
      return NextResponse.json(
        { ok: false, error: "Failed to create student" },
        { status: 500 }
      );
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let row;
  try {
    row = await createDocument({
      officeId,
      studentNo,
      studentName,
      docType,
      originalFilename: file.name || "document.pdf",
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size || buf.length,
      buffer: buf,
      uploadedBy: user.id,
    });
  } catch (e) {
    if (createdStudentForUpload) {
      try {
        await deleteStudent(studentNo, { officeId });
      } catch (cleanupError) {
        console.error("[Document upload] Failed to roll back newly created student:", cleanupError);
      }
    }
    throw e;
  }
  if (!row || !canAccessResource(user, "document", row)) {
    return NextResponse.json({ ok: false, error: "Document could not be created" }, { status: 500 });
  }
  await writeAuditLog(
    req,
    isNewStudent
      ? `Created student ${studentNo} and uploaded ${docType}`
      : `Uploaded document for student ${studentNo} (${docType})`,
    { officeId }
  );

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}
