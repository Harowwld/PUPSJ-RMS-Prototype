/**
 * Standard security headers for binary/file preview responses (PDFs, images, attachments)
 * to ensure same-origin iframe embedding in PDFPreviewModal while blocking external clickjacking.
 */
export const FILE_SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src 'self'; frame-src 'self' blob: data:; object-src 'self' blob: data:; frame-ancestors 'self';",
};
