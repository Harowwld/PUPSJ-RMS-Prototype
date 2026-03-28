import { NextResponse } from "next/server";
import {
  createDocument,
  listDocuments,
} from "../../../lib/documentsRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";

export const runtime = "nodejs";

export async function GET(req) {
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

  const studentNo = String(form.get("studentNo") || "").trim();
  const studentName = String(form.get("studentName") || "").trim();
  const docType = String(form.get("docType") || "").trim();

  if (!studentNo || !docType) {
    return NextResponse.json(
      { ok: false, error: "studentNo and docType are required" },
      { status: 400 }
    );
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
  await writeAuditLog(req, `Uploaded document for student ${studentNo} (${docType})`);

  return NextResponse.json({ ok: true, data: row }, { status: 201 });
}
