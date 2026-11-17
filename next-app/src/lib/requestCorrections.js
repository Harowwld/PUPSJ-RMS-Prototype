export const correctionRequirements = {
  valid_id: "Valid ID",
  spa: "Authorization Letter or Special Power of Attorney",
  receipt: "Proof of Payment",
  clearance: "Clearance",
  evidence: "Supporting Document",
  other: "Other Requirement",
};

export const maxCorrectionItems = 5;

export function prepareRequestCorrections(request, nextStatus, items) {
  if (items === undefined) {
    if (request.office_id === "registrar" && request.portal_submitter_account_id
        && nextStatus === "Deficient" && request.status !== nextStatus) {
      return { error: "Select at least one requirement for the requester to correct." };
    }
    return {};
  }
  if (request.office_id !== "registrar" || !request.portal_submitter_account_id || nextStatus !== "Deficient") {
    return { error: "Correction items require an online Registrar request in Action Required." };
  }
  if (request.status === "Deficient" && request.correction_items?.some((item) => !item.attachmentId)) {
    return { error: "This request is already waiting for corrections." };
  }
  if (!Array.isArray(items) || !items.length || items.length > maxCorrectionItems) {
    return { error: `Select between 1 and ${maxCorrectionItems} correction items.` };
  }
  const corrections = [];
  for (const item of items) {
    const type = item?.type;
    if (typeof type !== "string" || !Object.hasOwn(correctionRequirements, type)) {
      return { error: "Select a valid requirement for each correction item." };
    }
    if (item.note !== undefined && typeof item.note !== "string") {
      return { error: "Correction instructions must be text." };
    }
    const note = item.note?.trim() || "";
    if (note.length > 500 || (type === "other" && !note)) {
      return { error: "Add instructions for Other Requirement and keep each note within 500 characters." };
    }
    corrections.push({ id: crypto.randomUUID(), type, note });
  }
  return {
    corrections,
    message: `Corrections requested: ${corrections.map(({ type, note }) =>
      correctionRequirements[type] + (note ? ` (${note})` : "")
    ).join("; ")}.`,
  };
}

export function canSubmitRequestCorrection(request, accountId) {
  return request?.status === "Deficient" && Boolean(accountId)
    && String(request.portal_submitter_account_id) === String(accountId);
}

export function pendingRequestCorrection(request, accountId, correctionId) {
  if (!canSubmitRequestCorrection(request, accountId)) return undefined;
  return request.correction_items?.find((item) => item.id === correctionId && !item.attachmentId);
}

export function recordRequestCorrection(items, correctionId, attachmentId) {
  const corrections = items.map((item) => item.id === correctionId ? { ...item, attachmentId } : item);
  const completed = corrections.every((item) => Boolean(item.attachmentId));
  return { corrections, completed, status: completed ? "Pending" : "Deficient" };
}
