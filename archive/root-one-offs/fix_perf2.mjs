import fs from 'fs';

function fixStaff() {
  const file = 'next-app/src/lib/staffRepo.js';
  let code = fs.readFileSync(file, 'utf8');

  const listStart = code.indexOf('const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";');
  const listEnd = code.indexOf('export async function getStaffById');
  
  const before = code.substring(0, listStart);
  const after = code.substring(listEnd);

  const replacement = `const where = filters.length ? \`WHERE \${filters.join(" AND ")}\` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let rows;
  if (!q) {
    rows = await dbAll(
      \`SELECT * FROM staff \${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?\`,
      [...params, lim, off]
    );
  } else {
    rows = await dbAll(\`SELECT * FROM staff \${where}\`, [...params]);
  }

  let decryptedRows = (rows || []).map(decryptStaffRow);
  
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => {
      if (r.id && r.id.toLowerCase().includes(search)) return true;
      if (r.fname && r.fname.toLowerCase().includes(search)) return true;
      if (r.lname && r.lname.toLowerCase().includes(search)) return true;
      if (r.email && r.email.toLowerCase().includes(search)) return true;
      return false;
    });
    
    decryptedRows.sort((a, b) => {
      const nameA = (a.lname || '').toLowerCase();
      const nameB = (b.lname || '').toLowerCase();
      return nameA < nameB ? -1 : (nameA > nameB ? 1 : 0);
    });

    return decryptedRows.slice(off, off + lim);
  }
  
  return decryptedRows;
}

`;

  fs.writeFileSync(file, before + replacement + after);
}

function fixStudents() {
  const file = 'next-app/src/lib/studentsRepo.js';
  let code = fs.readFileSync(file, 'utf8');

  // Remove the old q filter block from sql
  code = code.replace(
    /  if \(q\) \{\n    filters\.push\("\(student_no LIKE \? OR name LIKE \?\)"\);\n    const like = `%\$\{q\}%`;\n    params\.push\(like, like\);\n  \}/g,
    ''
  );

  const listStart = code.indexOf('const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";');
  const listEnd = code.indexOf('export async function getStudentByStudentNo');
  
  const before = code.substring(0, listStart);
  const after = code.substring(listEnd);

  const replacement = `const where = filters.length ? \`WHERE \${filters.join(" AND ")}\` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let rows;
  if (!q) {
    rows = await dbAll(
      \`SELECT \${STUDENT_SELECT} FROM students \${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?\`,
      [...params, lim, off]
    );
  } else {
    rows = await dbAll(\`SELECT \${STUDENT_SELECT} FROM students \${where}\`, [...params]);
  }

  let decryptedRows = (rows || []).map(decryptStudentRow);
  
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => {
      if (r.student_no && r.student_no.toLowerCase().includes(search)) return true;
      if (r.name && r.name.toLowerCase().includes(search)) return true;
      if (r.email && r.email.toLowerCase().includes(search)) return true;
      return false;
    });
    
    decryptedRows.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA < nameB ? -1 : (nameA > nameB ? 1 : 0);
    });

    return decryptedRows.slice(off, off + lim);
  }
  
  return decryptedRows;
}

`;

  fs.writeFileSync(file, before + replacement + after);
}

fixStaff();
fixStudents();
console.log('Fixed');
