import fs from 'fs';

const file = 'next-app/src/lib/studentsRepo.js';
let code = fs.readFileSync(file, 'utf8');

// Remove SQL 'q' filter from studentsRepo
code = code.replace(
  '  if (q) {\n    filters.push("(s.student_no LIKE ? OR s.name LIKE ?)");\n    const like = `%${q}%`;\n    params.push(like, like);\n  }',
  ''
);

// We need to remove SQL limit/offset
code = code.replace(
  '  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);\n  const off = Math.max(parseInt(offset) || 0, 0);',
  ''
);
code = code.replace(
  '      LIMIT ? OFFSET ?\n    `,\n    [...params, lim, off]',
  '    `,\n    [...params]'
);

// Add JS filtering and pagination
code = code.replace(
  'return rows.map(decryptStudentRow);\n}',
  `
  let decryptedRows = rows.map(decryptStudentRow);
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
  return decryptedRows.slice(off, off + lim);
}
`
);
fs.writeFileSync(file, code);
console.log('studentsRepo search patched');
