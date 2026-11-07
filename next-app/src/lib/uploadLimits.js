/**
 * uploadLimits.js
 *
 * Centralized file upload size limits and helper utilities for the PUPSJ Records Keeping System.
 * Enforces boundaries across:
 *   1. Client-side input / drag-and-drop / clipboard paste (Zero-network rejection before OCR or canvas rasterization)
 *   2. Server-side API routes (HTTP 413 Payload Too Large)
 *   3. Repository layer (data safety and audit log integrity)
 *   4. PostgreSQL database schema check constraints
 */

// Documents & Scanned Records (PDF Digital Twins)
export const DOCUMENT_MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const DOCUMENT_MAX_SIZE_LABEL = "15 MB";

// Individual Scanned Page Images (before client-side PDF conversion/merge)
export const DOCUMENT_PAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const DOCUMENT_PAGE_MAX_SIZE_LABEL = "10 MB";

// User Profile Avatar Images (JPEG, PNG, WebP, AVIF, SVG)
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const AVATAR_MAX_SIZE_LABEL = "5 MB";

// Document Request Attachments & Payment Proofs
export const ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ATTACHMENT_MAX_SIZE_LABEL = "10 MB";

// Bulk Data Imports (CSV / JSON spreadsheets)
export const CSV_IMPORT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CSV_IMPORT_MAX_SIZE_LABEL = "5 MB";

// Hardware Scanner Hot Folder Ingest
export const HOT_FOLDER_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const HOT_FOLDER_MAX_SIZE_LABEL = "25 MB";

// Hard PostgreSQL Schema Ceiling (Safety limit preventing rogue multi-GB database corruption)
export const DB_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024; // 26,214,400 bytes (25 MB)

/**
 * Format bytes into human-readable notation (e.g. "15 MB", "4.2 MB", "850 KB").
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const idx = Math.min(i, units.length - 1);
  const formatted = (bytes / Math.pow(1024, idx)).toFixed(idx > 0 ? 1 : 0);
  return `${formatted.replace(/\.0$/, "")} ${units[idx]}`;
}

/**
 * Validate document file size against context-specific limits.
 *
 * @param {File|Blob|number} fileOrSize
 * @param {{ isImagePage?: boolean }} [options]
 * @returns {{ valid: boolean, error?: string, size: number, maxBytes: number, maxLabel: string }}
 */
export function validateDocumentFileSize(fileOrSize, options = {}) {
  const size = typeof fileOrSize === "number" ? fileOrSize : fileOrSize?.size;
  const isImagePage = Boolean(options.isImagePage);
  const maxBytes = isImagePage ? DOCUMENT_PAGE_MAX_SIZE_BYTES : DOCUMENT_MAX_SIZE_BYTES;
  const maxLabel = isImagePage ? DOCUMENT_PAGE_MAX_SIZE_LABEL : DOCUMENT_MAX_SIZE_LABEL;

  if (typeof size === "number" && size > maxBytes) {
    return {
      valid: false,
      error: `File size (${formatBytes(size)}) exceeds the ${maxLabel} limit.`,
      size,
      maxBytes,
      maxLabel,
    };
  }
  return { valid: true, size: size ?? 0, maxBytes, maxLabel };
}
