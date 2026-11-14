/**
 * Standard security headers for binary/file preview responses (PDFs, images, attachments)
 * to ensure same-origin iframe embedding in PDFPreviewModal while blocking external clickjacking.
 */
export const FILE_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src 'self'; frame-src 'self' blob: data:; object-src 'self' blob: data:; frame-ancestors 'self';",
};

export function inlineFileDisposition(filename = "document.pdf") {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(filename.toWellFormed())
    .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
