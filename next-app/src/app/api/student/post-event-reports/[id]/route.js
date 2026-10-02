import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireStudent, createAuthErrorResponse } from "@/lib/authHelpers";
import { getPostEventReportById } from "@/lib/osasPostEventRepo";
import { isStudentOfficerForOrg } from "@/lib/organizationsRepo";

export const runtime = "nodejs";

function resolveFilePath(storageFilename) {
  if (!storageFilename) return null;
  const localDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local");
  const candidates = [
    path.resolve(localDir, "storage", "osas", "uploads", storageFilename),
    path.resolve(localDir, "osas", "uploads", storageFilename),
    path.resolve(process.cwd(), ".local", "storage", "osas", "uploads", storageFilename),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
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
  const report = await getPostEventReportById(id);
  if (!report) return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });

  const studentEmail = (access.user.email || "").toLowerCase();
  const isOfficer = await isStudentOfficerForOrg(studentEmail, report.organization_id);
  if (!isOfficer && report.submitted_by_email !== studentEmail) {
    return NextResponse.json({ ok: false, error: "Access denied" }, { status: 403 });
  }

  const fileParam = new URL(req.url).searchParams.get("file");
  if (fileParam) {
    const filename = fileParam === "liquidation" ? report.liquidation_storage_filename : report.narrative_storage_filename;
    const origName = fileParam === "liquidation" ? report.liquidation_original_filename : report.narrative_original_filename;
    const filePath = resolveFilePath(filename);

    if (!filePath || !fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return NextResponse.json({ ok: false, error: "File not found on storage" }, { status: 404 });
    }

    const bytes = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${origName || "report.pdf"}"`,
      },
    });
  }

  return NextResponse.json({ ok: true, data: report });
}
