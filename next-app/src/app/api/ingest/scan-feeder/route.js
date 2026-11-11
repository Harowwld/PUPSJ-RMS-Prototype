import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createAuthErrorResponse, getPrincipalOfficeId, requireStaff } from "@/lib/authHelpers";
import { getOfficeHotFolderDirs } from "@/lib/officePaths";

export const runtime = "nodejs";

const run = promisify(execFile);
const scannerLock = Symbol.for("pupsj.rms.feederScan");

function getScanner(req) {
  const executable = process.env.LOCAL_NAPS2_EXECUTABLE;
  const host = req.headers.get("host") || "";
  return process.platform === "darwin" && executable && path.isAbsolute(executable)
    && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? executable : null;
}

export async function GET(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");

  const scanner = getScanner(req);
  const available = Boolean(scanner && getPrincipalOfficeId(user)
    && await access(scanner, constants.X_OK).then(() => true, () => false));
  return NextResponse.json({ ok: true, data: { available } });
}

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error || !user) return createAuthErrorResponse(error || "Authentication required");
  const officeId = getPrincipalOfficeId(user);
  if (!officeId) return createAuthErrorResponse("Office scope is required", 403);

  const scanner = getScanner(req);
  if (!scanner) {
    return NextResponse.json({ ok: false, error: "Feeder scanning is unavailable on this workstation." }, { status: 503 });
  }
  if (globalThis[scannerLock]) {
    return NextResponse.json({ ok: false, error: "The scanner is already scanning a stack." }, { status: 409 });
  }

  globalThis[scannerLock] = true;
  let stage;
  try {
    const { inbound } = getOfficeHotFolderDirs(officeId);
    await access(inbound, constants.W_OK);
    stage = await mkdtemp(path.join(path.dirname(inbound), ".scan-"));
    const output = path.join(stage, "scan.pdf");
    await run(scanner, [
      "console", "--noprofile", "--driver", "sane", "--device", "R40 (canon_dr)",
      "--source", "feeder", "--dpi", "300", "--pagesize", "a4", "--output", output,
    ], { timeout: 5 * 60 * 1000 });

    const pdf = await PDFDocument.load(await readFile(output));
    const pages = pdf.getPageCount();
    if (!pages) {
      return NextResponse.json({ ok: false, error: "The scanner returned no pages. Load the feeder and try again." }, { status: 422 });
    }

    const scanId = randomUUID();
    const filenames = [];
    for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
      const filename = `Scan-${scanId}-${String(pageIndex + 1).padStart(3, "0")}.pdf`;
      if (pages === 1) {
        await rename(output, path.join(stage, filename));
      } else {
        const document = await PDFDocument.create();
        const [page] = await document.copyPages(pdf, [pageIndex]);
        document.addPage(page);
        await writeFile(path.join(stage, filename), await document.save());
      }
      filenames.push(filename);
    }
    for (const filename of filenames) {
      await rename(path.join(stage, filename), path.join(inbound, filename));
    }
    return NextResponse.json({ ok: true, data: { pages, filenames } });
  } catch (cause) {
    console.error("[scan-feeder]", cause.code || cause.name);
    return NextResponse.json({
      ok: false,
      error: "The scan could not finish. Check the feeder, scanner connection, and intake folder, then try again.",
    }, { status: 500 });
  } finally {
    if (stage) {
      await rm(stage, { recursive: true, force: true }).catch((cause) => {
        console.error("[scan-feeder] Could not remove temporary scan:", cause.code);
      });
    }
    globalThis[scannerLock] = false;
  }
}
