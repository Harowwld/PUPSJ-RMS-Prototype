import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import {
  getOrganizationById,
  isStudentOfficerForOrg,
  listOrganizationBylawsVersions,
  getOrganizationBylawsVersionById,
  getOrganizationBylawsVersionByStorageFilename,
  createOrganizationBylawsSubmission,
} from "@/lib/organizationsRepo";
import { writeGlobalAuditLog } from "@/lib/auditLogRequest";

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
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const { id } = await ctx.params;
  const studentEmail = (access.user.email || "").toLowerCase();

  const org = await getOrganizationById(id);
  if (!org) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const officer = await isStudentOfficerForOrg(studentEmail, org.id);
  if (!officer) {
    return NextResponse.json(
      { ok: false, error: "Access denied. You are not registered as an active officer of this organization." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const isFileReq = url.searchParams.get("file") === "1";
  const versionId = url.searchParams.get("versionId");

  if (isFileReq) {
    let targetFilename = org.bylaws_storage_filename;
    let targetOriginalName = org.bylaws_original_filename || `${org.name}-CBL.pdf`;
    let targetMimeType = org.bylaws_mime_type || "application/pdf";

    if (versionId) {
      const ver = await getOrganizationBylawsVersionById(versionId);
      if (!ver || ver.organization_id !== org.id) {
        return NextResponse.json({ ok: false, error: "Bylaws version not found for this organization." }, { status: 404 });
      }
      targetFilename = ver.storage_filename;
      targetOriginalName = ver.original_filename || targetOriginalName;
      targetMimeType = ver.mime_type || targetMimeType;
    }

    if (!targetFilename) {
      return NextResponse.json({ ok: false, error: "No document file found." }, { status: 404 });
    }

    const filePath = resolveBylawsFilePath(targetFilename);
    if (!filePath || !fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return NextResponse.json({ ok: false, error: "Document file not found on disk." }, { status: 404 });
    }

    const bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": targetMimeType,
        "Content-Disposition": `inline; filename="${targetOriginalName}"`,
      },
    });
  }

  const versions = await listOrganizationBylawsVersions(org.id);

  return NextResponse.json({
    ok: true,
    data: {
      organization: {
        id: org.id,
        name: org.name,
        acronym: org.acronym,
        hasBylaws: Boolean(org.bylaws_storage_filename),
        originalFilename: org.bylaws_original_filename,
        updatedAt: org.bylaws_updated_at,
      },
      versions,
    },
  });
}

export async function POST(req, ctx) {
  const access = await requireStudent(req);
  if (access.error || !access.user) {
    return createAuthErrorResponse(
      access.error || "Student authentication required",
      access.error?.startsWith("Access denied") ? 403 : 401
    );
  }

  const { id } = await ctx.params;
  const studentEmail = (access.user.email || "").toLowerCase();

  const org = await getOrganizationById(id);
  if (!org) {
    return NextResponse.json({ ok: false, error: "Organization not found." }, { status: 404 });
  }

  const officer = await isStudentOfficerForOrg(studentEmail, org.id);
  if (!officer) {
    return NextResponse.json(
      { ok: false, error: "Access denied. Only authorized student officers may submit Constitution & By-Laws documents." },
      { status: 403 }
    );
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Invalid form payload." }, { status: 400 });
  }

  const file = form.get("file");
  const versionTag = form.get("versionTag");
  const amendmentSummary = form.get("amendmentSummary");

  if (!file || typeof file === "string" || file.type !== "application/pdf") {
    return NextResponse.json({ ok: false, error: "A valid PDF file is required for Constitution & By-Laws submission." }, { status: 400 });
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "PDF file size must not exceed 25 MB." }, { status: 400 });
  }

  const cleanVersionTag = String(versionTag || "").trim() || `Amendment ${new Date().getFullYear()}`;
  const cleanSummary = String(amendmentSummary || "").trim();

  const storageFilename = `${crypto.randomUUID()}-cbl.pdf`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(bylawsStorageDir(), storageFilename);

  let submission;
  try {
    fs.writeFileSync(filePath, fileBytes, { flag: "wx" });
    submission = await createOrganizationBylawsSubmission({
      organizationId: org.id,
      versionTag: cleanVersionTag,
      storageFilename,
      originalFilename: file.name || "Constitution-and-Bylaws.pdf",
      amendmentSummary: cleanSummary,
      submittedByEmail: studentEmail,
      sizeBytes: file.size,
      mimeType: file.type,
    });

  } catch (err) {
    let persisted = false;
    try { persisted = Boolean(await getOrganizationBylawsVersionByStorageFilename(storageFilename)); } catch { persisted = true; }
    if (!persisted) { try { fs.unlinkSync(filePath); } catch {} }
    return NextResponse.json({ ok: false, error: err.message || "Failed to record submission." }, { status: 500 });
  }

  await writeGlobalAuditLog(req, "Submitted Constitution & By-Laws for OSAS review", {
    officeId: "osas",
    details: `Student officer ${access.user.username || studentEmail} (${officer.position}) submitted CBL amendment "${cleanVersionTag}" for ${org.name}.`,
    entity_type: "student_organization",
    entity_id: org.id,
  });
  return NextResponse.json({ ok: true, data: submission });
}
