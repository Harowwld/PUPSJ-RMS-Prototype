import fs from 'fs';
const file = 'next-app/src/lib/studentAuth.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '  );\n  if (!row || String(row.status).toLowerCase() !== "active") return null;',
  '  );\n  const row = decryptStudentRow(rowQuery);\n  if (!row || String(row.status).toLowerCase() !== "active") return null;'
);

fs.writeFileSync(file, code);
