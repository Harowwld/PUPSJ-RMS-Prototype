import { query } from "./postgres.js";
import { decryptStudentRow } from "./studentAuth.js";
import { prepareOcrStudentRows } from "./studentNameMatcher.js";

const CACHE_TTL_MS = 30_000;
const MAX_CACHED_OFFICES = 8;
const rosterCache = new Map();

export function invalidateOcrStudentRoster(officeId) {
  const office = String(officeId || "").trim().toLowerCase();
  if (office) rosterCache.delete(office);
  else rosterCache.clear();
}

export async function getOcrStudentRoster(officeId) {
  const office = String(officeId || "").trim().toLowerCase();
  if (!office) throw new Error("Office scope is required");

  const now = Date.now();
  const cached = rosterCache.get(office);
  if (cached?.rows && cached.expiresAt > now) return cached.rows;
  if (cached?.promise) return cached.promise;

  const promise = query(
    `SELECT s.student_no, s.name, s.course_code, s.year_level, s.section, s.status,
            s.storage_room AS room, s.storage_cabinet AS cabinet, s.storage_drawer AS drawer
       FROM students s
      WHERE s.status = 'Active'
        AND EXISTS (SELECT 1 FROM student_office_memberships som
                     WHERE som.student_no = s.student_no
                       AND som.office_id = $1
                       AND som.status = 'Active')`,
    [office],
  ).then((rows) => {
    const prepared = prepareOcrStudentRows(rows
      .map(decryptStudentRow)
      .filter((student) => !String(student.name || "").startsWith("Student (")));
    if (rosterCache.get(office)?.promise !== promise) return prepared;
    rosterCache.delete(office);
    rosterCache.set(office, { rows: prepared, expiresAt: Date.now() + CACHE_TTL_MS });
    while (rosterCache.size > MAX_CACHED_OFFICES) rosterCache.delete(rosterCache.keys().next().value);
    return prepared;
  }).catch((error) => {
    if (rosterCache.get(office)?.promise === promise) rosterCache.delete(office);
    throw error;
  });

  rosterCache.set(office, { promise, expiresAt: now + CACHE_TTL_MS });
  return promise;
}
