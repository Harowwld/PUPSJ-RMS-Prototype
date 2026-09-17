import fs from 'fs';

function fixRepo(file, table, orderBy) {
  let code = fs.readFileSync(file, 'utf8');
  
  if (table === 'students') {
    code = code.replace(
      /  if \(q\) \{\n    filters\.push\("\(student_no LIKE \? OR name LIKE \?\)"\);\n    const like = `%\$\{q\}%`;\n    params\.push\(like, like\);\n  \}/g,
      ''
    );
  }

  // Find where we do `const rows = await dbAll`
  // We want to add LIMIT/OFFSET back to SQL if there is no in-memory filtering needed!
  // Wait, if `q` is provided, we MUST fetch everything to filter in memory.
  // If `q` is NOT provided, we can paginate in SQL!
  
  const replacement = `
  const where = filters.length ? \`WHERE \${filters.join(" AND ")}\` : "";
  const lim = Math.min(Math.max(parseInt(limit) || 200, 1), 500);
  const off = Math.max(parseInt(offset) || 0, 0);

  let rows;
  if (!q) {
    rows = await dbAll(
      \`
        SELECT *
        FROM ${table}
        \${where}
        ${orderBy}
        LIMIT ? OFFSET ?
      \`,
      [...params, lim, off]
    );
  } else {
    rows = await dbAll(
      \`
        SELECT *
        FROM ${table}
        \${where}
      \`,
      [...params]
    );
  }

  let decryptedRows = (rows || []).map(${table === 'students' ? 'decryptStudentRow' : 'decryptStaffRow'});
  
  if (q) {
    const search = q.toLowerCase();
    decryptedRows = decryptedRows.filter(r => {
      if (r.student_no && r.student_no.toLowerCase().includes(search)) return true;
      if (r.id && r.id.toLowerCase().includes(search)) return true;
      if (r.name && r.name.toLowerCase().includes(search)) return true;
      if (r.fname && r.fname.toLowerCase().includes(search)) return true;
      if (r.lname && r.lname.toLowerCase().includes(search)) return true;
      if (r.email && r.email.toLowerCase().includes(search)) return true;
      return false;
    });
    
    // Sort in memory since SQL didn't sort
    decryptedRows.sort((a, b) => {
      const nameA = (a.name || a.lname || '').toLowerCase();
      const nameB = (b.name || b.lname || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

    return decryptedRows.slice(off, off + lim);
  }
  
  // If no q, SQL already paginated and sorted!
  return decryptedRows;
}
`;

  // We need to replace from `const where = ...` down to the end of the function.
  const regex = new RegExp(
    \`  const where = filters.length \\? \\\`WHERE \\\$\\{filters.join\\(" AND "\\)\\}\\\` : "";\\n(?:.|\\n)*?return decryptedRows\\.slice\\(off, off \\+ lim\\);\\n\\}\`
  );
  
  if (table === 'students') {
    code = code.replace(
      /  const where = filters\.length \? `WHERE \$\{filters\.join\(" AND "\)\}` : "";\nconst rows = await dbAll\([\s\S]*?return decryptedRows\.slice\(off, off \+ lim\);\n\}/,
      replacement.replace('SELECT *', 'SELECT ${STUDENT_SELECT}')
    );
  } else {
    code = code.replace(
      /  const where = filters\.length \? `WHERE \$\{filters\.join\(" AND "\)\}` : "";\n\n\nconst rows = await dbAll\([\s\S]*?return decryptedRows\.slice\(off, off \+ lim\);\n\}/,
      replacement
    );
  }

  fs.writeFileSync(file, code);
}

fixRepo('next-app/src/lib/staffRepo.js', 'staff', 'ORDER BY created_at DESC');
fixRepo('next-app/src/lib/studentsRepo.js', 'students', 'ORDER BY updated_at DESC');

console.log('Performance patches applied');
