import fs from 'fs';
const file = 'next-app/src/lib/staffRepo.js';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
  const rows = await dbAll(
    \`
      SELECT *
      FROM staff
      \${where}
    \`,
    [...params]
  );
  
  let decryptedRows = (rows || []).map(decryptStaffRow);
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
  
  decryptedRows.sort((a, b) => {
    const lnameA = (a.lname || '').toLowerCase();
    const lnameB = (b.lname || '').toLowerCase();
    if (lnameA < lnameB) return -1;
    if (lnameA > lnameB) return 1;
    return 0;
  });

  return decryptedRows.slice(off, off + lim);
}
`;

code = code.replace(
  /  const rows = await dbAll\([\s\S]*?ORDER BY lname ASC, fname ASC\n    `,\n    \[\.\.\.params\]\n  \);\n}/,
  replacement.trim()
);

fs.writeFileSync(file, code);
