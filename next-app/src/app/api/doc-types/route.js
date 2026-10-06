import { NextResponse } from "next/server";
import {
  createDocType,
  listDocTypes,
  listAllDocTypes,
  updateDocType,
  archiveDocType,
  restoreDocType
} from "../../../lib/docTypesRepo";
import { writeAuditLog } from "../../../lib/auditLogRequest";
import { requireAdmin, requireStaff, requireAuth, createAuthErrorResponse } from "../../../lib/authHelpers";
import { isSystemAdminRole, normalizeRole } from "../../../lib/roleUtils";

export const runtime = "nodejs";

function resolveOfficeId(user, req, requestedOfficeId) {
  const requested = String(requestedOfficeId || new URL(req.url).searchParams.get("officeId") || "").trim().toLowerCase();
  if (isSystemAdminRole(user.role) || user.role === "Student") return requested || "registrar";
  const ownOffice = String(user.officeId || user.office_id || "").trim().toLowerCase();
  if (requested && requested !== ownOffice) return null;
  return ownOffice || null;
}

function parseOptionalBoolean(value) {
  if (value === undefined) return { valid: true, value: undefined };
  if (typeof value === "boolean") return { valid: true, value };
  if (value === 0 || value === 1) return { valid: true, value: value === 1 };
  if (value === "true") return { valid: true, value: true };
  if (value === "false") return { valid: true, value: false };
  if (value === "1") return { valid: true, value: true };
  if (value === "0") return { valid: true, value: false };
  return { valid: false, value: undefined };
}

async function getTargetName(id, officeId) {
  try {
    const rows = await listAllDocTypes({ includeArchived: true, officeId });
    if (!Array.isArray(rows)) return id;
    const target = rows.find(r => r && String(r.id) === String(id));
    return target?.name || id;
  } catch {
    return id;
  }
}

async function hasTarget(id, officeId) {
  const rows = await listAllDocTypes({ includeArchived: true, officeId });
  return Array.isArray(rows) && rows.some((row) => String(row?.id) === String(id));
}

export async function GET(req) {
  const access = await requireAuth(req, ["Staff", "Admin", "SystemAdmin", "SuperAdmin", "Student"]);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Authentication required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
    const wantsAdminView = searchParams.get("admin") === "true" || includeArchived;
    if (wantsAdminView && !isSystemAdminRole(access.user.role) && normalizeRole(access.user.role) !== "Admin") {
      return createAuthErrorResponse("Admin access required", 403);
    }

    const rawScope = String(searchParams.get("scope") || "").toLowerCase().trim();
    const scope = (rawScope === "requestable" || rawScope === "compliance") ? rawScope : undefined;

    if (searchParams.get("admin") === "true") {
      const rows = await listAllDocTypes({ includeArchived, officeId, scope });
      return NextResponse.json({ ok: true, data: rows || [] });
    }

    const rows = await listDocTypes({ includeArchived, officeId, scope });
    return NextResponse.json({ ok: true, data: rows || [] });
  } catch (err) {
    console.error("GET /api/doc-types error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  const { searchParams } = new URL(req.url);
  const isAdmin = searchParams.get("admin") === "true";

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
  if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);
  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Missing name" },
      { status: 400 }
    );
  }

  const isRequestableResult = parseOptionalBoolean(body.isRequestable !== undefined ? body.isRequestable : body.is_requestable);
  const isComplianceResult = parseOptionalBoolean(body.isCompliance !== undefined ? body.isCompliance : body.is_compliance);
  if (!isRequestableResult.valid || !isComplianceResult.valid) {
    return NextResponse.json({ ok: false, error: "Requestable and compliance values must be booleans." }, { status: 400 });
  }
  const isRequestable = isRequestableResult.value ?? false;
  const isCompliance = isComplianceResult.value ?? false;
  const complianceCategory = String(body.complianceCategory || body.compliance_category || "General Requirements").trim();

  try {
    // Attempt creation with high reliability
    const created = await createDocType(name, officeId, { isRequestable, isCompliance, complianceCategory });
    
    // Defensive check before logging
    const safeId = created && typeof created === 'object' ? created.id : null;

    await writeAuditLog(req, `Create Document Type`, {
        details: isAdmin 
          ? `created new administrative document type identifier '${name}'`
          : `registered new document category '${name}' in system taxonomy`,
        entity_type: "DocumentType",
        entity_id: safeId || "NEW"
    });
    
    return NextResponse.json({ ok: true, data: created }, { status: 201 });

  } catch (e) {
    const msg = String(e?.message || "Unknown Error");
    if (msg.toLowerCase().includes("already exists")) {
      return NextResponse.json({ ok: false, error: "Document type already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to create document type" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) throw new Error("Invalid document type ID");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const { name } = body;
    const officeId = resolveOfficeId(access.user, req, body.officeId || body.office_id);
    if (!officeId) return createAuthErrorResponse("You cannot access that office", 403);

    if (typeof name !== "string" || !name.trim()) throw new Error("Document name is required");

    const isRequestableInput = body.isRequestable !== undefined ? body.isRequestable : body.is_requestable;
    const isComplianceInput = body.isCompliance !== undefined ? body.isCompliance : body.is_compliance;
    const isRequestableResult = parseOptionalBoolean(isRequestableInput);
    const isComplianceResult = parseOptionalBoolean(isComplianceInput);
    if (!isRequestableResult.valid || !isComplianceResult.valid) {
      return NextResponse.json({ ok: false, error: "Requestable and compliance values must be booleans." }, { status: 400 });
    }
    const isRequestable = isRequestableResult.value;
    const isCompliance = isComplianceResult.value;
    const complianceCategory = body.complianceCategory !== undefined ? String(body.complianceCategory).trim() : (body.compliance_category !== undefined ? String(body.compliance_category).trim() : undefined);

    const updated = await updateDocType(id, name, undefined, officeId, { isRequestable, isCompliance, complianceCategory });
    await writeAuditLog(req, `Update Document Type`, {
        details: `updated configuration for document type identifier '${updated?.name || name}'`,
        entity_type: "DocumentType",
        entity_id: id
    });
    return NextResponse.json({ ok: true, data: updated });
  } catch (err) {
    if (String(err?.message || "").toLowerCase().includes("not found")) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
      { status: 400 }
    );
  }
}

export async function PATCH(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) throw new Error("Invalid document type ID");
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
    if (!id) throw new Error("Missing document type ID");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const { status } = body;
    if (Object.keys(body).length !== 1 || !["Active", "Archived"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Status must be Active or Archived" }, { status: 400 });
    }
    if (!(await hasTarget(id, officeId))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const name = await getTargetName(id, officeId);

    if (status === "Active") {
      await restoreDocType(id, officeId);
      await writeAuditLog(req, `Restore Document Type`, {
          details: `restored document type '${name}' from system archive`,
          entity_type: "DocumentType",
          entity_id: id
      });
    } else if (status === "Archived") {
      await archiveDocType(id, officeId);
      await writeAuditLog(req, `Archive Document Type`, {
          details: `archived document type '${name}' and disabled its requirement logic`,
          severity: "WARNING",
          entity_type: "DocumentType",
          entity_id: id
      });
    } else {
       throw new Error("Invalid status update");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req) {
  const access = await requireAdmin(req);
  if (access.error || !access.user) return createAuthErrorResponse(access.error || "Admin access required", access.error?.startsWith("Access denied") ? 403 : 401);
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) throw new Error("Invalid document type ID");
    const officeId = resolveOfficeId(access.user, req);
    if (!officeId) return createAuthErrorResponse("Office scope is required", 403);
    if (!id) throw new Error("Missing document type ID");

    if (!(await hasTarget(id, officeId))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const name = await getTargetName(id, officeId);
    await archiveDocType(id, officeId);
    await writeAuditLog(req, `Archive Document Type`, {
        details: `archived document type '${name}' and disabled its requirement logic`,
        severity: "WARNING",
        entity_type: "DocumentType",
        entity_id: id
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Request could not be completed" },
      { status: 400 }
    );
  }
}
