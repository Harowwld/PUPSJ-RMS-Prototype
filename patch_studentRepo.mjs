import fs from 'fs';

const filePath = 'next-app/src/lib/studentsRepo.js';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('encryptPII')) {
  code = code.replace(
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";',
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";\nimport { encryptPII, decryptPII } from "./piiEncryption.js";\nimport { decryptStudentRow } from "./studentAuth.js";'
  );
  
  // createStudent
  code = code.replace(
    'const { studentNo, name, courseCode, yearLevel, section } = payload;',
    'const { studentNo, name, courseCode, yearLevel, section } = payload;\n  const encName = encryptPII(name);'
  );
  code = code.replace(
    '[studentNo, name, courseCode, yearLevel, section]',
    '[studentNo, encName, courseCode, yearLevel, section]'
  );

  // updateStudent
  code = code.replace(
    '  if (patch.name !== undefined) {',
    '  if (patch.name !== undefined) {\n    updates.push("name = ?");\n    params.push(encryptPII(patch.name));\n  } else if (false) {'
  );

  // listStudents
  code = code.replace(
    'return await dbAll(',
    'const rows = await dbAll('
  );
  code = code.replace(
    'return rows;',
    'return rows.map(decryptStudentRow);'
  );

  // getStudentById
  code = code.replace(
    'const row = await dbGet(`SELECT * FROM students WHERE student_no = ?${scope.clause}`, [studentNo, ...scope.params]);',
    'const row = await dbGet(`SELECT * FROM students WHERE student_no = ?${scope.clause}`, [studentNo, ...scope.params]);\n  return decryptStudentRow(row) || null;'
  );
  code = code.replace(
    'return row || null;',
    '' // Already added above
  );
  
  fs.writeFileSync(filePath, code);
}
console.log('studentRepo patched');
