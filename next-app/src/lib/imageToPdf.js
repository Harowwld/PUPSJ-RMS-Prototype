/**
 * imageToPdf.js — Convert an image File (JPG/PNG/etc.) to a single-page PDF File.
 *
 * Uses jsPDF on the client side.  The image is embedded at its native aspect
 * ratio on an A4-ish page (or auto-sized to fit).
 *
 * Usage:
 *   const pdfFile = await imageToPdf(imageFile);
 *   // pdfFile is a standard File object with type "application/pdf"
 */

/**
 * Returns true if the given File should be converted (i.e. it's an image, not a PDF).
 */
export function needsConversion(file) {
  if (!file) return false;
  const mime = String(file.type || "").toLowerCase();
  if (mime === "application/pdf") return false;
  if (mime.startsWith("image/")) return true;
  // Fallback: check extension
  const name = String(file.name || "").toLowerCase();
  return /\.(jpe?g|png|gif|bmp|webp|tiff?)$/i.test(name);
}

/**
 * Convert an image File to a PDF File.
 *
 * @param {File} imageFile — source image
 * @returns {Promise<File>} — a new File with type "application/pdf"
 */
export async function imageToPdf(imageFile) {
  if (!imageFile) throw new Error("No file provided");

  const { jsPDF } = await import("jspdf");

  // Load image as data URL
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(imageFile);
  });

  // Get natural dimensions via an Image element
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to decode image"));
    i.src = dataUrl;
  });

  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;

  // Determine page orientation from image aspect ratio
  const landscape = imgW > imgH;
  const orientation = landscape ? "landscape" : "portrait";

  // Create a PDF with A4 dimensions
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });

  // Page dimensions in mm
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Add a small margin (10mm each side)
  const margin = 10;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  // Scale image to fit within the available area, preserving aspect ratio
  const scale = Math.min(maxW / imgW, maxH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;

  // Center the image on the page
  const offsetX = margin + (maxW - drawW) / 2;
  const offsetY = margin + (maxH - drawH) / 2;

  // Detect format from MIME type
  const mime = String(imageFile.type || "").toLowerCase();
  let format = "JPEG";
  if (mime.includes("png")) format = "PNG";
  else if (mime.includes("webp")) format = "WEBP";

  doc.addImage(dataUrl, format, offsetX, offsetY, drawW, drawH);

  // Convert to blob then File
  const pdfBlob = doc.output("blob");

  // Derive the output filename (swap extension to .pdf)
  const baseName =
    String(imageFile.name || "image")
      .replace(/\.[^.]+$/, "") || "image";

  return new File([pdfBlob], `${baseName}.pdf`, {
    type: "application/pdf",
  });
}
