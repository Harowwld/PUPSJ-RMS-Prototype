import fs from 'fs';
const file = 'next-app/src/lib/studentAuth.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'if (row.email) row.email = decryptPII(row.email);',
  'if (row.email) row.email = decryptPII(row.email);\n  if (row.first_name) row.first_name = decryptPII(row.first_name);\n  if (row.middle_name) row.middle_name = decryptPII(row.middle_name);\n  if (row.last_name) row.last_name = decryptPII(row.last_name);'
);

code = code.replace(
  'const row = await queryOne(',
  'const rowQuery = await queryOne('
);
code = code.replace(
  '[cleanNo, encryptPII(cleanEmail)]\n  );\n  if (!row) return null;',
  '[cleanNo, encryptPII(cleanEmail)]\n  );\n  const row = decryptStudentRow(rowQuery);\n  if (!row) return null;'
);

fs.writeFileSync(file, code);
