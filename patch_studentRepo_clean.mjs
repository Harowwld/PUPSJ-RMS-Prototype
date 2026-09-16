import fs from 'fs';

const filePath = 'next-app/src/lib/studentsRepo.js';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
  'import { dbAll, dbGet, dbRun } from "./postgresCompat.js";',
  'import { dbAll, dbGet, dbRun } from "./postgresCompat.js";\nimport { encryptPII, decryptPII } from "./piiEncryption.js";\nimport { decryptStudentRow } from "./studentAuth.js";'
);

// createStudent
code = code.replace(
  'const { studentNo, name, courseCode, yearLevel, section, room, cabinet, drawer, status, officeId } = payload;',
  'const { studentNo, name, courseCode, yearLevel, section, room, cabinet, drawer, status, officeId } = payload;\n  const encName = encryptPII(name);'
);

code = code.replace(
  'const normalizedName = normalizeStudentName(name);',
  'const normalizedName = encryptPII(normalizeStudentName(name));'
);

// upsertStudent uses createStudent so it will automatically encrypt.
// updateStudent uses 'name'. I need to see if updateStudent exists in studentsRepo.js.

const listStudentsReplacement = `
  const rows = await dbAll(
    \`
      SELECT \${STUDENT_SELECT}
      FROM students
      \${where}
    \`,
    [...params]
  );
  
  let decryptedRows = (rows || []).map(decryptStudentRow);
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => 
      (r.student_no && r.student_no.toLowerCase().includes(search)) ||
      (r.name && r.name.toLowerCase().includes(search)) ||
      (r.email && r.email.toLowerCase().includes(search))
    );
  }
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);
  
  decryptedRows.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  return decryptedRows.slice(off, off + lim);
}
`;

code = code.replace(
  /  if \(q\) \{\n    filters\.push\("\(s\.student_no LIKE \? OR s\.name LIKE \?\)"\);\n    const like = `%\$\{q\}%`;\n    params\.push\(like, like\);\n  \}/,
  ''
);

code = code.replace(
  /  const lim = Math\.min\(Math\.max\(parseInt\(limit\) \|\| 200, 1\), 500\);\n  const off = Math\.max\(parseInt\(offset\) \|\| 0, 0\);\n\n  return await dbAll\(\n    `\n      SELECT \$\{STUDENT_SELECT\}\n      FROM students\n      \$\{where\}\n      ORDER BY name ASC\n      LIMIT \? OFFSET \?\n    `,\n    \[\.\.\.params, lim, off\]\n  \);\n}/,
  listStudentsReplacement.trim()
);

code = code.replace(
  /export async function getStudentByStudentNo\(studentNo, \{ officeId \} = \{\}\) \{\n  const scope = buildOfficeScope\(officeId\);\n  const row = await dbGet\(`SELECT \$\{STUDENT_SELECT\} FROM students WHERE student_no = \?\$\{scope\.sql ? ` AND \$\{scope\.sql\}` : ""\}`, \[studentNo, \.\.\.scope\.params\]\);\n  return row \|\| null;\n\}/,
  `export async function getStudentByStudentNo(studentNo, { officeId } = {}) {
  const scope = buildOfficeScope(officeId);
  const row = await dbGet(\`SELECT \${STUDENT_SELECT} FROM students WHERE student_no = ?\${scope.sql ? \` AND \${scope.sql}\` : ""}\`, [studentNo, ...scope.params]);
  return decryptStudentRow(row) || null;
}`
);

fs.writeFileSync(filePath, code);
