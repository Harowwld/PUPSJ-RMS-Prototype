import { query, queryOne, transaction } from "./postgres.js";

const REGION_KEYS = ["firstName", "middleName", "lastName"];

export function validateRecognitionRegions(regions) {
  if (!regions || typeof regions !== "object") throw new Error("Recognition regions are required");
  for (const key of REGION_KEYS) {
    const region = regions[key];
    if (!region || !["x", "y", "width", "height"].every((field) => Number.isFinite(Number(region[field])))) {
      throw new Error(`Missing or invalid ${key} region`);
    }
    for (const field of ["x", "y", "width", "height"]) {
      const value = Number(region[field]);
      if (value < 0 || value > 1) throw new Error(`${key}.${field} must be between 0 and 1`);
    }
    if (Number(region.x) + Number(region.width) > 1 || Number(region.y) + Number(region.height) > 1) {
      throw new Error(`${key} region must remain inside the page`);
    }
  }
  return true;
}

export async function listRecognitionTemplates({ includeArchived = false, documentTypeId } = {}) {
  const params = [];
  const filters = [];
  if (!includeArchived) filters.push("rt.status = 'Active'");
  if (documentTypeId) {
    params.push(documentTypeId);
    filters.push(`rt.document_type_id = $${params.length}`);
  }
  return query(
    `SELECT rt.*, dt.name AS document_type
     FROM recognition_templates rt
     JOIN document_types dt ON dt.id = rt.document_type_id
     ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
     ORDER BY lower(dt.name), rt.name, rt.version DESC`,
    params
  );
}

export async function getRecognitionTemplateByDocumentType(documentType) {
  return queryOne(
    `SELECT rt.*, dt.name AS document_type
     FROM recognition_templates rt
     JOIN document_types dt ON dt.id = rt.document_type_id
     WHERE rt.office_id = 'registrar'
       AND rt.status = 'Active'
       AND lower(dt.name) = lower($1)
     ORDER BY rt.version DESC
     LIMIT 1`,
    [documentType]
  );
}

export async function createRecognitionTemplate({ officeId = "registrar", documentTypeId, name, version = 1, pageIndex = 0, rotation = 0, regions, actorId }) {
  validateRecognitionRegions(regions);
  const templateName = String(name || "PSA template").trim();
  const requestedVersion = Math.max(1, Number(version) || 1);
  return transaction(async ({ queryOne: queryOneInTransaction }) => {
    await queryOneInTransaction(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [`recognition-template:${officeId}:${documentTypeId}:${templateName}`]
    );
    const existing = await queryOneInTransaction(
      `SELECT MAX(version) AS max_version
       FROM recognition_templates
       WHERE office_id = $1 AND document_type_id = $2 AND name = $3`,
      [officeId, documentTypeId, templateName]
    );
    const maxVersion = Number(existing?.max_version) || 0;
    const finalVersion = maxVersion >= requestedVersion ? maxVersion + 1 : requestedVersion;
    return queryOneInTransaction(
      `INSERT INTO recognition_templates
        (office_id, document_type_id, name, version, page_index, rotation, regions, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)
       RETURNING *`,
      [officeId, documentTypeId, templateName, finalVersion, Number(pageIndex), Number(rotation), JSON.stringify(regions), actorId || null]
    );
  });
}

export async function updateRecognitionTemplate(id, { name, version, pageIndex, rotation, regions, actorId }) {
  validateRecognitionRegions(regions);
  return queryOne(
    `UPDATE recognition_templates
     SET name = $2, version = $3, page_index = $4, rotation = $5, regions = $6::jsonb,
         updated_by = $7, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, String(name || "PSA template").trim(), Number(version), Number(pageIndex), Number(rotation), JSON.stringify(regions), actorId || null]
  );
}

export async function archiveRecognitionTemplate(id, actorId) {
  return queryOne(
    `UPDATE recognition_templates SET status = 'Archived', updated_by = $2, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, actorId || null]
  );
}

export async function deleteRecognitionTemplate(id) {
  return queryOne(
    `DELETE FROM recognition_templates
     WHERE id = $1
     RETURNING *`,
    [id]
  );
}
