import path from "node:path";

export const HOT_FOLDER_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
]);

export const HOT_FOLDER_ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
]);

export const HOT_FOLDER_MAX_FILE_BYTES = 25 * 1024 * 1024;

export function isAllowedIngestExtension(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  return HOT_FOLDER_ALLOWED_EXTENSIONS.has(ext);
}

export function inferMimeFromExtension(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".tif" || ext === ".tiff") return "image/tiff";
  return "application/octet-stream";
}

export function detectMimeFromMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return "";
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
      (buffer[0] === 0x4d &&
        buffer[1] === 0x4d &&
        buffer[2] === 0x00 &&
        buffer[3] === 0x2a))
  ) {
    return "image/tiff";
  }
  return "";
}

export function validateIngestFileType({ filename, detectedMime, declaredMime }) {
  if (!isAllowedIngestExtension(filename)) return { ok: false, error: "Unsupported file extension" };
  const trustedMime = detectedMime || inferMimeFromExtension(filename);
  if (!HOT_FOLDER_ALLOWED_MIME_TYPES.has(trustedMime)) {
    return { ok: false, error: "Unsupported file type" };
  }
  if (declaredMime && HOT_FOLDER_ALLOWED_MIME_TYPES.has(declaredMime) && declaredMime !== trustedMime) {
    return { ok: false, error: "MIME type does not match file content" };
  }
  return { ok: true, mimeType: trustedMime };
}
