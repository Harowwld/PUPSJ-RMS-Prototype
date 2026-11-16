import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireOfficeModule } from "@/lib/moduleAccess";
import {
  getOrganizationById,
  listOrganizationBylawsVersions,
  getOrganizationBylawsVersionById,
  getOrganizationBylawsVersionByStorageFilename,
  reviewOrganizationBylawsVersion,
  archiveOrganizationBylawsDirectly,
} from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";
import { FILE_SECURITY_HEADERS, inlineFileDisposition } from "@/lib/fileSecurityHeaders";

export const runtime = "nodejs";

function bylawsStorageDir() {
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const dir = path.join(localDir, "storage", "osas", "bylaws");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveBylawsFilePath(storageFilename) {
  if (!storageFilename) return null;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const candidates = [
    path.resolve(localDir, "storage", "osas", "bylaws", storageFilename),
    path.resolve(localDir, "osas", "bylaws", storageFilename),
    path.resolve(localDir, "storage", "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "storage", "osas", "bylaws", storageFilename),
    path.resolve(process.cwd(), "..", ".local", "storage", "osas", "bylaws", storageFilename),
  ];
  return candidates.find((p) => fs.existsSync(/*turbopackIgnore: true*/ p)) || null;
}

export async function GET(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const url = new URL(req.url);
  const isFileReq = url.searchParams.get("file") === "1";
  const versionId = url.searchParams.get("versionId");

  if (isFileReq) {
    let targetFilename = org.bylaws_storage_filename;
    let targetOriginalName = org.bylaws_original_filename || `${org.name}-CBL.pdf`;
    let targetMimeType = org.bylaws_mime_type || "application/pdf";

    if (versionId) {
      const ver = await getOrganizationBylawsVersionById(versionId);
      if (!ver || ver.organization_id !== org.id) return NextResponse.json({ ok: false, error: "Bylaws version not found for this organization." }, { status: 404 });
      targetFilename = ver.storage_filename;
      targetOriginalName = ver.original_filename || targetOriginalName;
      targetMimeType = ver.mime_type || targetMimeType;
    }

    const filePath = resolveBylawsFilePath(targetFilename);
    if (!filePath) {
      return NextResponse.json(
        { ok: false, error: "The original bylaws PDF could not be found." },
        { status: 404, headers: { "X-File-Missing": "true" } }
      );
    }
    const bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": targetMimeType,
        "Content-Disposition": inlineFileDisposition(targetOriginalName),
        ...FILE_SECURITY_HEADERS,
      },
    });
  }

  const versions = await listOrganizationBylawsVersions(org.id);

  return NextResponse.json({
    ok: true,
    data: {
      hasBylaws: Boolean(org.bylaws_storage_filename),
      originalFilename: org.bylaws_original_filename,
      sizeBytes: org.bylaws_size_bytes,
      updatedAt: org.bylaws_updated_at,
      versions,
    },
  });
}

export async function POST(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const versionTag = form?.get("versionTag") || "Staff Archived";
  const amendmentSummary = form?.get("amendmentSummary") || "Archived directly by OSAS Staff";
  const effectiveDate = form?.get("effectiveDate") || null;

  if (!file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "A valid PDF file is required for the Constitution and By-Laws." }, { status: 400 });
  }

  const storageFilename = `${crypto.randomUUID()}-cbl.pdf`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const staffId = access.user?.id || access.user?.sub || null;
  const filePath = path.join(bylawsStorageDir(), storageFilename);
  let result;
  try {
    fs.writeFileSync(filePath, fileBytes, { flag: "wx" });
    result = await archiveOrganizationBylawsDirectly(org.id, {
      storageFilename,
      originalFilename: file.name || "Constitution-and-Bylaws.pdf",
      sizeBytes: fileBytes.length,
      mimeType: file.type,
      staffId,
      versionTag: String(versionTag).trim(),
      amendmentSummary: String(amendmentSummary).trim(),
      effectiveDate,
    });
  } catch (err) {
    let persisted = false;
    try { persisted = Boolean(await getOrganizationBylawsVersionByStorageFilename(storageFilename)); } catch { persisted = true; }
    if (!persisted) { try { fs.unlinkSync(filePath); } catch {} }
    return NextResponse.json({ ok: false, error: err.message || "Failed to archive Constitution & By-Laws." }, { status: 500 });
  }

  await writeGlobalAuditLog(req, "Uploaded organization Constitution & By-Laws", {
    officeId: "osas",
    details: `Uploaded CBL PDF for ${org.name} (${file.name}, ${file.size} bytes).`,
    entity_type: "student_organization",
    entity_id: id,
  });

  return NextResponse.json({ ok: true, data: result.organization, version: result.version });
}

export async function PATCH(req, ctx) {
  const access = await requireOfficeModule("student_organizations", { officeId: "osas" }, req);
  if (access === null) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  if (!access) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const org = await getOrganizationById(id);
  if (!org) return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const unsupportedField = Object.keys(body).find((field) => !["versionId", "status", "reviewNote", "effectiveDate"].includes(field));
  if (unsupportedField) {
    return NextResponse.json({ ok: false, error: `Unsupported field: ${unsupportedField}` }, { status: 400 });
  }
  const { versionId, status, reviewNote, effectiveDate } = body;

  if (!versionId) {
    return NextResponse.json({ ok: false, error: "versionId is required." }, { status: 400 });
  }

  const version = await getOrganizationBylawsVersionById(versionId);
  if (!version || version.organization_id !== org.id) {
    return NextResponse.json({ ok: false, error: "Bylaws version not found for this organization." }, { status: 404 });
  }

  const allowedStatuses = ["Approved", "Needs Revision", "Declined"];
  if (typeof status !== "string" || !allowedStatuses.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `Invalid status "${status}". Allowed: ${allowedStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  if (reviewNote !== undefined && typeof reviewNote !== "string") {
    return NextResponse.json({ ok: false, error: "Review note must be text." }, { status: 400 });
  }
  if (effectiveDate !== undefined && effectiveDate !== null) {
    const parsedEffectiveDate = new Date(`${effectiveDate}T00:00:00.000Z`);
    if (typeof effectiveDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
      || Number.isNaN(parsedEffectiveDate.getTime())
      || parsedEffectiveDate.toISOString().slice(0, 10) !== effectiveDate) {
      return NextResponse.json({ ok: false, error: "Effective date must be a valid YYYY-MM-DD date." }, { status: 400 });
    }
  }

  if ((status === "Needs Revision" || status === "Declined") && (!reviewNote || String(reviewNote).trim().length < 5)) {
    return NextResponse.json(
      { ok: false, error: "A detailed review note (at least 5 characters) is required when requesting revisions or declining." },
      { status: 400 }
    );
  }

  try {
    const staffId = access.user?.id || access.user?.sub || null;
    const updated = await reviewOrganizationBylawsVersion(versionId, {
      status,
      reviewNote,
      staffId,
      effectiveDate,
    });

    await writeGlobalAuditLog(req, `Reviewed organization CBL: ${status}`, {
      officeId: "osas",
      details: `${status} CBL submission (version ID ${versionId}) for ${org.name}.${reviewNote ? ` Note: ${reviewNote}` : ""}`,
      entity_type: "student_organization",
      entity_id: id,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Failed to review CBL version." }, { status: 400 });
  }
}
