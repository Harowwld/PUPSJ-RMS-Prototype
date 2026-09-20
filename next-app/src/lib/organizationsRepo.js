import { query, queryOne } from "./postgres.js";

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * List student organizations with officer count and proposal count
 */
export async function listOrganizations({ status, category, search } = {}) {
  const conditions = [];
  const params = [];

  const statusList = status && status !== "All"
    ? (Array.isArray(status) ? status : String(status).split(",").map((s) => s.trim()).filter(Boolean))
    : [];

  if (statusList.length === 1) {
    params.push(statusList[0]);
    conditions.push(`so.status = $${params.length}`);
  } else if (statusList.length > 1) {
    const placeholders = statusList.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    conditions.push(`so.status IN (${placeholders.join(", ")})`);
  } else {
    // If no explicit status filter is requested, exclude archived organizations by default
    conditions.push("so.archived_at IS NULL");
  }

  const categoryList = category && category !== "All"
    ? (Array.isArray(category) ? category : String(category).split(",").map((c) => c.trim()).filter(Boolean))
    : [];

  if (categoryList.length === 1) {
    params.push(categoryList[0]);
    conditions.push(`so.category = $${params.length}`);
  } else if (categoryList.length > 1) {
    const placeholders = categoryList.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    conditions.push(`so.category IN (${placeholders.join(", ")})`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(
      lower(so.name) LIKE $${params.length} OR
      lower(coalesce(so.acronym, '')) LIKE $${params.length} OR
      lower(coalesce(so.description, '')) LIKE $${params.length} OR
      lower(coalesce(so.adviser_name, '')) LIKE $${params.length}
    )`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      so.*,
      COUNT(DISTINCT oo.id) FILTER (WHERE oo.status = 'Active')::int AS active_officer_count,
      COUNT(DISTINCT ep.id) FILTER (WHERE ep.archived_at IS NULL AND ep.status != 'Archived')::int AS proposal_count
    FROM student_organizations so
    LEFT JOIN organization_officers oo ON oo.organization_id = so.id
    LEFT JOIN event_proposals ep ON ep.organization_id = so.id
    ${whereClause}
    GROUP BY so.id
    ORDER BY so.name ASC
  `;

  return query(sql, params);
}

/**
 * Get organization by ID with its officers and recent proposals
 */
export async function getOrganizationById(id) {
  if (!id) return null;

  const org = await queryOne(
    `SELECT so.*,
      COUNT(DISTINCT oo.id) FILTER (WHERE oo.status = 'Active')::int AS active_officer_count,
      COUNT(DISTINCT ep.id) FILTER (WHERE ep.archived_at IS NULL AND ep.status != 'Archived')::int AS proposal_count
     FROM student_organizations so
     LEFT JOIN organization_officers oo ON oo.organization_id = so.id
     LEFT JOIN event_proposals ep ON ep.organization_id = so.id
     WHERE so.id = $1
     GROUP BY so.id`,
    [id]
  );

  if (!org) return null;

  const officers = await query(
    `SELECT * FROM organization_officers
     WHERE organization_id = $1
     ORDER BY
       CASE
         WHEN lower(position) = 'president' THEN 1
         WHEN lower(position) LIKE '%vice%' THEN 2
         WHEN lower(position) LIKE '%secretary%' THEN 3
         WHEN lower(position) LIKE '%treasurer%' THEN 4
         WHEN lower(position) LIKE '%auditor%' THEN 5
         ELSE 6
       END,
       created_at ASC`,
    [id]
  );

  const proposals = await query(
    `SELECT ep.*, s.name AS student_name
     FROM event_proposals ep
     LEFT JOIN students s ON s.student_no = ep.student_no
     WHERE ep.organization_id = $1 AND ep.archived_at IS NULL
     ORDER BY ep.created_at DESC`,
    [id]
  );

  return {
    ...org,
    officers,
    proposals,
  };
}

/**
 * Create a new student organization
 */
export async function createOrganization({
  id,
  name,
  acronym,
  category = "Academic",
  status = "Active",
  adviserName,
  adviserEmail,
  description,
}) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new Error("Organization name is required.");
  }

  const generatedId = (id && String(id).trim()) || slugify(acronym || cleanName);
  const cleanId = generatedId || `org-${Date.now()}`;

  const row = await queryOne(
    `INSERT INTO student_organizations (
      id, name, acronym, category, status, adviser_name, adviser_email, description, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *`,
    [
      cleanId,
      cleanName,
      acronym ? String(acronym).trim().toUpperCase() : null,
      category || "Academic",
      status || "Active",
      adviserName ? String(adviserName).trim() : null,
      adviserEmail ? String(adviserEmail).trim().toLowerCase() : null,
      description ? String(description).trim() : null,
    ]
  );

  return row;
}

/**
 * Update organization metadata
 */
export async function updateOrganization(id, data) {
  if (!id) throw new Error("Organization ID is required.");

  const fields = [];
  const params = [id];

  const allowed = [
    ["name", (v) => String(v || "").trim()],
    ["acronym", (v) => (v ? String(v).trim().toUpperCase() : null)],
    ["category", (v) => String(v || "").trim()],
    ["status", (v) => String(v || "").trim()],
    ["adviser_name", (v) => (v ? String(v).trim() : null)],
    ["adviser_email", (v) => (v ? String(v).trim().toLowerCase() : null)],
    ["description", (v) => (v ? String(v).trim() : null)],
  ];

  for (const [col, transform] of allowed) {
    const camel = col.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
    if (data[col] !== undefined || data[camel] !== undefined) {
      const rawVal = data[col] !== undefined ? data[col] : data[camel];
      params.push(transform(rawVal));
      fields.push(`${col} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return getOrganizationById(id);
  }

  fields.push("updated_at = NOW()");

  const sql = `UPDATE student_organizations SET ${fields.join(", ")} WHERE id = $1 RETURNING *`;
  return queryOne(sql, params);
}

/**
 * Archive an organization
 */
export async function archiveOrganization(id) {
  if (!id) return null;
  return queryOne(
    `UPDATE student_organizations
     SET status = 'Archived', archived_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
}

/**
 * Update Constitution & By-Laws (CBL) metadata
 */
export async function updateOrganizationBylaws(id, {
  storageFilename,
  originalFilename,
  sizeBytes,
  mimeType = "application/pdf",
}) {
  if (!id) throw new Error("Organization ID is required.");

  return queryOne(
    `UPDATE student_organizations
     SET
       bylaws_storage_filename = $2,
       bylaws_original_filename = $3,
       bylaws_size_bytes = $4,
       bylaws_mime_type = $5,
       bylaws_updated_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, storageFilename, originalFilename, sizeBytes, mimeType]
  );
}

/**
 * Get officers for an organization
 */
export async function getOfficersByOrganizationId(orgId) {
  if (!orgId) return [];
  return query(
    `SELECT * FROM organization_officers
     WHERE organization_id = $1
     ORDER BY
       CASE
         WHEN lower(position) = 'president' THEN 1
         WHEN lower(position) LIKE '%vice%' THEN 2
         WHEN lower(position) LIKE '%secretary%' THEN 3
         WHEN lower(position) LIKE '%treasurer%' THEN 4
         WHEN lower(position) LIKE '%auditor%' THEN 5
         ELSE 6
       END,
       created_at ASC`,
    [orgId]
  );
}

/**
 * Add or update an officer on the organization whitelist
 */
export async function addOfficer(orgId, {
  email,
  position,
  studentName,
  studentNo,
}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanPosition = String(position || "Officer").trim();

  if (!orgId) throw new Error("Organization ID is required.");
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("A valid officer email address is required.");
  }
  if (!cleanPosition) {
    throw new Error("Officer position is required.");
  }

  const row = await queryOne(
    `INSERT INTO organization_officers (
      organization_id, email, position, student_name, student_no, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, 'Active', NOW(), NOW())
    ON CONFLICT (organization_id, email) DO UPDATE SET
      position = EXCLUDED.position,
      student_name = COALESCE(EXCLUDED.student_name, organization_officers.student_name),
      student_no = COALESCE(EXCLUDED.student_no, organization_officers.student_no),
      status = 'Active',
      updated_at = NOW()
    RETURNING *`,
    [
      orgId,
      cleanEmail,
      cleanPosition,
      studentName ? String(studentName).trim() : null,
      studentNo ? String(studentNo).trim().toUpperCase() : null,
    ]
  );

  return row;
}

/**
 * Remove an officer from the organization whitelist
 */
export async function removeOfficer(orgId, officerId) {
  if (!orgId || !officerId) return false;

  const res = await query(
    `DELETE FROM organization_officers
     WHERE organization_id = $1 AND id = $2
     RETURNING id`,
    [orgId, officerId]
  );

  return res.length > 0;
}

/**
 * Get all active organizations where a student's email is an active whitelisted officer
 */
export async function getOrganizationsForStudentEmail(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return [];

  return query(
    `SELECT
      so.id AS organization_id,
      so.name AS organization_name,
      so.acronym,
      so.category,
      so.adviser_name,
      so.description,
      so.bylaws_storage_filename,
      so.bylaws_original_filename,
      oo.id AS officer_id,
      oo.position AS officer_position,
      oo.student_name,
      oo.student_no,
      oo.created_at AS whitelisted_at
     FROM organization_officers oo
     JOIN student_organizations so ON so.id = oo.organization_id
     WHERE lower(oo.email) = $1
       AND oo.status = 'Active'
       AND so.status = 'Active'
       AND so.archived_at IS NULL
     ORDER BY so.name ASC`,
    [cleanEmail]
  );
}

/**
 * Check if a student's email is a verified active officer of a specific organization
 */
export async function isStudentOfficerForOrg(email, orgId) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !orgId) return null;

  return queryOne(
    `SELECT oo.*, so.name AS organization_name, so.acronym AS organization_acronym
     FROM organization_officers oo
     JOIN student_organizations so ON so.id = oo.organization_id
     WHERE lower(oo.email) = $1
       AND oo.organization_id = $2
       AND oo.status = 'Active'
       AND so.status = 'Active'
       AND so.archived_at IS NULL`,
    [cleanEmail, orgId]
  );
}
