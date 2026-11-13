export function getOsasRecordReference(item, stream = "proposals") {
  return stream === "post_events"
    ? `RPT-${item.id}`
    : item.tracking_number || `EVT-${item.id}`;
}
