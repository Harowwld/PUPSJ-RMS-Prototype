import { isSystemAdminRole, isStudentRole } from "./roleUtils.js";

const RESOURCE_ALIASES = new Map([
  ["document_request", "request"],
  ["document-request", "request"],
  ["event_proposal", "proposal"],
  ["event-proposal", "proposal"],
  ["recognition_template", "recognitionTemplate"],
  ["recognition-template", "recognitionTemplate"],
  ["storage_layout", "storageLayout"],
  ["storage-layout", "storageLayout"],
]);

function normalizedResourceType(resourceType) {
  const value = String(resourceType || "").trim();
  return RESOURCE_ALIASES.get(value) || value;
}

function normalizedId(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function principalIsActive(principal) {
  return Boolean(principal) && String(principal.status || "").toLowerCase() === "active";
}

function principalOfficeId(principal) {
  return normalizedId(principal?.officeId ?? principal?.office_id).toLowerCase();
}

function resourceOfficeId(resource) {
  return normalizedId(resource?.officeId ?? resource?.office_id).toLowerCase();
}

function sameId(left, right) {
  return Boolean(normalizedId(left)) && normalizedId(left) === normalizedId(right);
}

function officeResourceAccess(principal, resource) {
  if (!principalIsActive(principal) || !resource) return false;
  if (isSystemAdminRole(principal.role)) return Boolean(resourceOfficeId(resource));
  const officeId = principalOfficeId(principal);
  return Boolean(officeId && resourceOfficeId(resource) && officeId === resourceOfficeId(resource));
}

function studentOwnerAccess(principal, resource) {
  if (!principalIsActive(principal) || !isStudentRole(principal.role) || !resource) return false;
  const resourceStudentNo = resource.studentNo ?? resource.student_no;
  const resourceAccountId = resource.accountId ?? resource.account_id ?? resource.studentAccountId ?? resource.student_account_id;
  const hasStudentNo = Boolean(normalizedId(resourceStudentNo));
  const hasAccountId = Boolean(normalizedId(resourceAccountId));
  if (!hasStudentNo && !hasAccountId) return false;

  const ownsStudentNo = !hasStudentNo || sameId(resourceStudentNo, principal.studentNo ?? principal.student_no);
  const ownsAccount = !hasAccountId || sameId(resourceAccountId, principal.accountId ?? principal.account_id ?? principal.id);
  return ownsStudentNo && ownsAccount;
}

function avatarAccess(principal, resource) {
  if (!principalIsActive(principal) || !resource) return false;
  const ownerType = String(resource.ownerType ?? resource.owner_type ?? "").toLowerCase();
  const ownerId = resource.ownerId ?? resource.owner_id;
  if (ownerType === "student" || isStudentRole(principal.role)) {
    return isStudentRole(principal.role) && (
      sameId(ownerId, principal.accountId ?? principal.account_id) ||
      sameId(ownerId, principal.studentNo ?? principal.student_no) ||
      sameId(ownerId, principal.id)
    );
  }
  return !isStudentRole(principal.role) && sameId(ownerId, principal.id);
}

function backupAccess(principal, resource) {
  if (!principalIsActive(principal) || !resource) return false;
  if (isSystemAdminRole(principal.role)) return true;
  return String(resource.scope || "office").toLowerCase() === "office" && officeResourceAccess(principal, resource);
}

/**
 * Central object-level authorization policy. List queries must still apply
 * their office/owner predicates in SQL; this helper protects individual rows
 * before a detail response, mutation, file operation, or audit event.
 */
export function canAccessResource(principal, resourceType, resource) {
  const type = normalizedResourceType(resourceType);
  if (!principalIsActive(principal) || !resource) return false;

  if (type === "avatar") return avatarAccess(principal, resource);
  if (type === "backup") return backupAccess(principal, resource);

  if (type === "student") {
    return isStudentRole(principal.role)
      ? studentOwnerAccess(principal, resource)
      : officeResourceAccess(principal, resource);
  }

  if (["document", "request", "proposal"].includes(type)) {
    return isStudentRole(principal.role)
      ? studentOwnerAccess(principal, resource)
      : officeResourceAccess(principal, resource);
  }

  if (["ingest", "recognitionTemplate", "notification", "storageLayout", "staff"].includes(type)) {
    if (type === "staff" && isSystemAdminRole(principal.role)) return true;
    return !isStudentRole(principal.role) && officeResourceAccess(principal, resource);
  }

  return false;
}

export function resourceAccessContext(principal, resourceType, resource) {
  return {
    resourceType: normalizedResourceType(resourceType),
    resourceId: normalizedId(resource?.id),
    principalId: normalizedId(principal?.id ?? principal?.accountId),
    allowed: canAccessResource(principal, resourceType, resource),
  };
}
