import { query } from "./postgres.js";
import { decryptPII } from "./piiEncryption.js";

function normalizeActor(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveStaffActorId(actor, role, staffRows) {
  const normalizedActor = normalizeActor(actor);
  if (!normalizedActor) return null;

  const exactIdMatch = staffRows.find(
    (staff) => normalizeActor(staff.id) === normalizedActor
  );
  if (exactIdMatch) return exactIdMatch.id;

  let matches = staffRows.filter((staff) => {
    const fullName = `${staff.fname || ""} ${staff.lname || ""}`;
    return normalizeActor(fullName) === normalizedActor;
  });

  if (matches.length > 1 && role) {
    const roleMatches = matches.filter(
      (staff) => normalizeActor(staff.role) === normalizeActor(role)
    );
    if (roleMatches.length) matches = roleMatches;
  }

  return matches.length === 1 ? matches[0].id : null;
}

export function resolveAuditActorIds(rows, staffRows = []) {
  return rows.map((row) => {
    const role = normalizeActor(row.role);
    const actorId =
      role === "student"
        ? String(row.actor || "").trim() || null
        : role === "system"
          ? null
          : resolveStaffActorId(row.actor, row.role, staffRows);
    return { ...row, actor_id: actorId };
  });
}

export async function addAuditActorIds(rows) {
  const needsStaffLookup = rows.some(
    (row) => normalizeActor(row.role) !== "student" && normalizeActor(row.role) !== "system"
  );
  const staffRows = needsStaffLookup
    ? await query("SELECT id, fname, lname, role FROM staff")
    : [];
  const readableStaffRows = staffRows.map((staff) => ({
    ...staff,
    fname: decryptPII(staff.fname),
    lname: decryptPII(staff.lname),
  }));

  return resolveAuditActorIds(rows, readableStaffRows);
}
