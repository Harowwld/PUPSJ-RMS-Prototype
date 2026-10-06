import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const { query, transaction, pool } = await import("../src/lib/postgres.js");
const {
  exportStorageLayoutForDiagnostics,
  getStorageLayout,
  setStorageLayoutWithReassignments,
} = await import("../src/lib/storageLayoutRepo.js");

test("storage layout reassignments swap source locations once and persist atomically", async () => {
  const officeId = "registrar";
  const originalRaw = await exportStorageLayoutForDiagnostics({ officeId });
  const originalLayout = await getStorageLayout({ officeId });
  const locations = originalLayout.rooms.flatMap((room) =>
    room.cabinets.flatMap((cabinet) =>
      cabinet.drawerIds.map((drawer) => ({
        room: Number(room.id),
        cabinet: String(cabinet.id),
        drawer: String(drawer),
      })),
    ),
  );
  assert.ok(locations.length >= 3, "Registrar layout needs three locations for swap verification");

  const [from, to] = locations;
  const suffix = Math.random().toString(36).slice(2, 9).toUpperCase();
  const studentA = `ZZCRUDMAPA${suffix}`;
  const studentB = `ZZCRUDMAPB${suffix}`;
  let originalStudentLocations = [];

  try {
    originalStudentLocations = await query(
      `SELECT DISTINCT s.student_no, s.storage_room, s.storage_cabinet, s.storage_drawer
         FROM students s
        WHERE s.status = 'Active'
          AND ((s.storage_room = $1 AND s.storage_cabinet = $2 AND s.storage_drawer = $3)
            OR (s.storage_room = $4 AND s.storage_cabinet = $5 AND s.storage_drawer = $6))
          AND EXISTS (SELECT 1 FROM student_office_memberships m
                       WHERE m.student_no = s.student_no
                         AND m.office_id = $7
                         AND m.status = 'Active')`,
      [from.room, from.cabinet, from.drawer, to.room, to.cabinet, to.drawer, officeId],
    );
    const [section] = await query(
      "SELECT course_code, name FROM sections WHERE office_id = $1 AND status = 'Active' ORDER BY id LIMIT 1",
      [officeId],
    );
    assert.ok(section, "Registrar needs an active section for temporary test records");

    const countAt = async (location) => {
      const [row] = await query(
        `SELECT count(*)::int AS count
           FROM students s
          WHERE s.status = 'Active'
            AND s.storage_room = $1
            AND s.storage_cabinet = $2
            AND s.storage_drawer = $3
            AND EXISTS (SELECT 1 FROM student_office_memberships m
                         WHERE m.student_no = s.student_no
                           AND m.office_id = $4
                           AND m.status = 'Active')`,
        [location.room, location.cabinet, location.drawer, officeId],
      );
      return Number(row.count);
    };
    const expectedMoved = (await countAt(from)) + (await countAt(to)) + 2;

    await transaction(async ({ query: run }) => {
      for (const [studentNo, location] of [[studentA, from], [studentB, to]]) {
        await run(
          `INSERT INTO students
             (student_no, name, course_code, year_level, section, storage_room, storage_cabinet, storage_drawer, status)
           VALUES ($1, 'CRUD MAP TEST', $2, 2026, $3, $4, $5, $6, 'Active')`,
          [studentNo, section.course_code, section.name, location.room, location.cabinet, location.drawer],
        );
        await run(
          "INSERT INTO student_office_memberships (student_no, office_id, status) VALUES ($1, $2, 'Active')",
          [studentNo, officeId],
        );
      }
    });

    const result = await setStorageLayoutWithReassignments(
      originalLayout,
      [{ from, to }, { from: to, to: from }],
      { officeId },
    );
    const rows = await query(
      "SELECT student_no, storage_room, storage_cabinet, storage_drawer FROM students WHERE student_no = ANY($1::text[])",
      [[studentA, studentB]],
    );
    const position = (row) => `${row.storage_room}|${row.storage_cabinet}|${row.storage_drawer}`;
    const key = (location) => `${location.room}|${location.cabinet}|${location.drawer}`;

    assert.equal(rows.length, 2);
    assert.equal(position(rows.find((row) => row.student_no === studentA)), key(to));
    assert.equal(position(rows.find((row) => row.student_no === studentB)), key(from));
    assert.equal(result.moved, expectedMoved);
    assert.deepEqual(await getStorageLayout({ officeId }), originalLayout);

    await assert.rejects(
      setStorageLayoutWithReassignments(originalLayout, [
        { from, to },
        { from, to: locations[2] },
      ], { officeId }),
      /multiple targets/,
    );
    assert.deepEqual(await getStorageLayout({ officeId }), originalLayout);
  } finally {
    await transaction(async ({ query: run }) => {
      await run("DELETE FROM student_office_memberships WHERE student_no = ANY($1::text[])", [[studentA, studentB]]);
      await run("DELETE FROM students WHERE student_no = ANY($1::text[])", [[studentA, studentB]]);
      for (const student of originalStudentLocations) {
        await run(
          `UPDATE students
              SET storage_room = $1, storage_cabinet = $2, storage_drawer = $3
            WHERE student_no = $4`,
          [student.storage_room, student.storage_cabinet, student.storage_drawer, student.student_no],
        );
      }
      if (originalRaw === null) {
        await run("DELETE FROM settings WHERE key = $1", ["storage_layout:registrar"]);
      } else {
        await run(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          ["storage_layout:registrar", originalRaw],
        );
      }
    });
    await pool.end();
  }
});
