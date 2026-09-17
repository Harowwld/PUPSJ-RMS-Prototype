import fs from 'fs';

const authPath = 'next-app/src/lib/studentAuth.js';
let authCode = fs.readFileSync(authPath, 'utf8');
if (!authCode.includes('encryptPII')) {
  authCode = authCode.replace(
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";',
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";\nimport { encryptPII, decryptPII } from "./piiEncryption.js";'
  );
  authCode += `
export function decryptStudentRow(row) {
  if (!row) return row;
  if (row.name) row.name = decryptPII(row.name);
  if (row.email) row.email = decryptPII(row.email);
  return row;
}
`;
  authCode = authCode.replace(
    'const student = await dbGet("SELECT s.*, sa.email, sa.password_hash FROM students s LEFT JOIN student_accounts sa ON s.student_no = sa.student_no WHERE s.student_no = ?", [studentNo]);',
    'let student = await dbGet("SELECT s.*, sa.email, sa.password_hash FROM students s LEFT JOIN student_accounts sa ON s.student_no = sa.student_no WHERE s.student_no = ?", [studentNo]);\n  student = decryptStudentRow(student);'
  );
  authCode = authCode.replace(
    'const student = await dbGet("SELECT s.*, sa.email FROM students s LEFT JOIN student_accounts sa ON s.student_no = sa.student_no WHERE s.student_no = ?", [studentNo]);',
    'let student = await dbGet("SELECT s.*, sa.email FROM students s LEFT JOIN student_accounts sa ON s.student_no = sa.student_no WHERE s.student_no = ?", [studentNo]);\n  student = decryptStudentRow(student);'
  );
  fs.writeFileSync(authPath, authCode);
}
console.log('studentAuth patched');

