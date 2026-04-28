import { NextResponse } from "next/server";
import {
  createDocument,
  listDocuments,
} from "../../../lib/documentsRepo";
import { createStudent } from "../../../lib/studentsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireStaff, createAuthErrorResponse } from "../../../lib/authHelpers";

export const runtime = "nodejs";

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const studentNo = searchParams.get("studentNo") || "";
  const docType = searchParams.get("docType") || "";
  const approvalStatus = searchParams.get("approvalStatus") || "";
  const excludeDeclinedRaw = searchParams.get("excludeDeclined");
  const excludeDeclined =
    excludeDeclinedRaw === "1" ||
    String(excludeDeclinedRaw || "").toLowerCase() === "true";
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";

  const rows = await listDocuments({
    q: q || undefined,
    studentNo: studentNo || undefined,
    docType: docType || undefined,
    approvalStatus: approvalStatus || undefined,
    excludeDeclined: approvalStatus ? false : excludeDeclined,
    limit,
    offset,
  });

  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) {
    return createAuthErrorResponse(error || "Authentication required", 401);
  }

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
  const studentName = String(form.get("studentName") || "").trim();
  const docType = String(form.get("docType") || "").trim();
  const isNewStudent =
    String(form.get("isNewStudent") || "").toLowerCase() === "true";

  if (!studentNo || !docType) {
    return NextResponse.json(
      { ok: false, error: "studentNo and docType are required" },
      { status: 400 }
    );
  }

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

    const studentNoPattern = /^\d{4}-\d{5}-[A-Z]{2}-\d$/;
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
      });
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("UNIQUE") || msg.includes("PRIMARY")) {
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
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }
      return NextResponse.json(
        { ok: false, error: msg || "Failed to create student" },
        { status: 500 }
      );
    }
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const row = await createDocument({
    studentNo,
    studentName,
    docType,
    originalFilename: file.name || "document.pdf",
    mimeType: file.type || "application/pdf",
    sizeBytes: file.size || buf.length,
    buffer: buf,
  });
  await writeAuditLog(
    req,
    isNewStudent
      ? `Created student ${studentNo} and uploaded ${docType}`
      : `Uploaded document for student ${studentNo} (${docType})`
  );

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}
