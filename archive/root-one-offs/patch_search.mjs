import fs from 'fs';

const staffFile = 'next-app/src/lib/staffRepo.js';
let staffCode = fs.readFileSync(staffFile, 'utf8');

// Remove SQL 'q' filter from staffRepo
staffCode = staffCode.replace(
  '  if (q) {\n    filters.push("(id LIKE ? OR fname LIKE ? OR lname LIKE ? OR email LIKE ?)");\n    const like = `%${q}%`;\n    params.push(like, like, like, like);\n  }',
  ''
);

// We need to remove SQL limit/offset
staffCode = staffCode.replace(
  '  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);\n  const off = Math.max(parseInt(offset) || 0, 0);',
  ''
);
staffCode = staffCode.replace(
  '      LIMIT ? OFFSET ?\n    `,\n    [...params, lim, off]',
  '    `,\n    [...params]'
);

// Add JS filtering and pagination
staffCode = staffCode.replace(
  'return rows.map(decryptStaffRow);\n}',
  `
  let decryptedRows = rows.map(decryptStaffRow);
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => 
      (r.id && r.id.toLowerCase().includes(search)) ||
      (r.fname && r.fname.toLowerCase().includes(search)) ||
      (r.lname && r.lname.toLowerCase().includes(search)) ||
      (r.email && r.email.toLowerCase().includes(search))
    );
  }
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);
  return decryptedRows.slice(off, off + lim);
}
`
);
fs.writeFileSync(staffFile, staffCode);
console.log('staffRepo search patched');
