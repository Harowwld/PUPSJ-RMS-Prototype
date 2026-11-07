export const OFFICE_SCOPED_BACKUP_TABLES = new Set([
  "courses", "document_requests", "document_types", "documents", "event_proposals",
  "ingest_queue", "notifications", "recognition_templates", "sections",
  "student_office_memberships",
]);

export function scopeOfficeDump(sql, rules) {
  const lines = String(sql).split("\n");
  const output = [];
  let copy = null;

  for (const line of lines) {
    const header = /^COPY (?:public\.)?([a-z_]+) \(([^)]+)\) FROM stdin;$/.exec(line);
    if (header) {
      const table = header[1];
      const rule = rules[table];
      if (!rule) throw new Error(`Office backup has no row scope for ${table}`);
      const columns = header[2].split(", ");
      const index = columns.indexOf(rule.column);
      if (!rule.predicate && index < 0) throw new Error(`Office backup cannot scope ${table} by ${rule.column}`);
      copy = { index, columns, predicate: rule.predicate, values: new Set([...(rule.values || [])].map(String)) };
      output.push(line);
      continue;
    }
    if (copy && line === "\\.") {
      copy = null;
      output.push(line);
      continue;
    }
    if (!copy) {
      output.push(line);
    } else {
      const values = line.split("\t");
      const row = Object.fromEntries(copy.columns.map((column, index) => [column, values[index] === "\\N" ? null : values[index]]));
      if (copy.predicate ? copy.predicate(row) : copy.values.has(values[copy.index])) output.push(line);
    }
  }

  return output.join("\n");
}
