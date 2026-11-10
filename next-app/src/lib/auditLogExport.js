import fs from "node:fs/promises";
import path from "node:path";
import { generateAuditLogsPdf } from "./pdfGenerator.js";
import { DEFAULT_BRANDING, resolveBranding } from "./institutionalBranding.js";
import { getReportFont } from "./reportFontOptions.js";
import { systemConfigRepo } from "./systemConfigRepo.js";

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function createAuditLogCsvResponse({ filename, headers, loadPage, mapRow, onComplete }) {
  const encoder = new TextEncoder();
  const pageSize = 500;
  let offset = 0;
  let total = 0;
  let headerWritten = false;
  let completed = false;

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        if (!headerWritten) {
          headerWritten = true;
          controller.enqueue(encoder.encode(`${headers.map(csvCell).join(",")}\r\n`));
          return;
        }

        const rows = await loadPage({ limit: pageSize, offset });
        if (rows.length) {
          offset += rows.length;
          total += rows.length;
          controller.enqueue(encoder.encode(`${rows.map((row) => mapRow(row).map(csvCell).join(",")).join("\r\n")}\r\n`));
        }
        if (rows.length < pageSize) {
          if (!completed) {
            completed = true;
            await onComplete?.(total);
          }
          controller.close();
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function generateServerAuditLogsPdf(logs, options = {}) {
  let branding = DEFAULT_BRANDING;
  const setting = await systemConfigRepo.getSetting("institution_branding_config");
  if (setting) {
    try {
      branding = resolveBranding(JSON.parse(setting));
    } catch {
      branding = DEFAULT_BRANDING;
    }
  }

  const font = getReportFont(branding.reportFont);
  const assetDir = path.join(process.cwd(), "public", "assets");
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(assetDir, "fonts", "reports", `${font.file}-Regular.ttf`)),
    fs.readFile(path.join(assetDir, "fonts", "reports", `${font.file}-Bold.ttf`)),
  ]);
  const logoData = branding.logoBase64?.startsWith("data:image/png")
    ? branding.logoBase64
    : `data:image/png;base64,${(await fs.readFile(path.join(assetDir, "branding", "black-icon.png"))).toString("base64")}`;
  const secondaryLogoData = branding.secondaryLogoBase64?.startsWith("data:image/png")
    ? branding.secondaryLogoBase64
    : null;

  return generateAuditLogsPdf(logs, {
    ...options,
    branding,
    fontData: { normal: regular.toString("base64"), bold: bold.toString("base64") },
    logoData,
    secondaryLogoData,
  });
}
