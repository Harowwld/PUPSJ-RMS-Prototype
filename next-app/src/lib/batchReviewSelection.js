export function getRangeIds(rows, anchorId, targetId) {
  const anchorIndex = rows.findIndex((row) => Number(row.id) === Number(anchorId));
  const targetIndex = rows.findIndex((row) => Number(row.id) === Number(targetId));
  if (anchorIndex < 0 || targetIndex < 0) return [targetId];
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return rows.slice(start, end + 1).map((row) => row.id);
}

export function toggleSelectedId(selectedIds, targetId) {
  return selectedIds.some((id) => Number(id) === Number(targetId))
    ? selectedIds.filter((id) => Number(id) !== Number(targetId))
    : [...selectedIds, targetId];
}

export function getRowClickSelection(rows, current, targetId, { shiftKey = false, modifierKey = false } = {}) {
  const anchorId = current.anchorId ?? current.activeId ?? targetId;
  if (shiftKey) return { anchorId, selectedIds: getRangeIds(rows, anchorId, targetId) };
  if (modifierKey) return { anchorId, selectedIds: toggleSelectedId(current.selectedIds, targetId) };
  return { anchorId: targetId, selectedIds: [targetId] };
}

export function getAdjacentRowId(rows, currentId, direction) {
  const currentIndex = rows.findIndex((row) => Number(row.id) === Number(currentId));
  if (currentIndex < 0) return null;
  const nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + (direction === "down" ? 1 : -1)));
  return nextIndex === currentIndex ? null : rows[nextIndex].id;
}

export function getBulkActionSkipReason(kind, row) {
  const reviewStatus = String(row.review_status || "").toLowerCase();
  const itemStatus = String(row.status || "").toLowerCase();
  if (kind === "confirm") {
    if (itemStatus !== "pending") return "Not awaiting confirmation";
    if (!row.staff_selected_student_no || !row.proposed_doc_type) return "Student or document type is missing";
  }
  if (kind === "retry" && !["failed", "rejected"].includes(itemStatus) && !["failed", "rejected"].includes(reviewStatus)) {
    return "Only failed or rejected files can be retried";
  }
  if (kind === "dismiss" && !["pending", "failed", "rejected"].includes(itemStatus)) {
    return "File is no longer eligible for dismissal";
  }
  return "";
}
