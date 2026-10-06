import fs from 'fs';

const file = 'next-app/src/lib/studentAuth.js';
let code = fs.readFileSync(file, 'utf8');

// Replace existingEmail query
code = code.replace(
  'const existingEmail = await queryOne(\n    "SELECT id, student_no, email FROM student_accounts WHERE lower(email) = $1",\n    [cleanEmail]\n  );',
  'const existingEmail = await queryOne(\n    "SELECT id, student_no, email FROM student_accounts WHERE email = $1",\n    [encryptPII(cleanEmail)]\n  );'
);

// Replace authenticateStudent query
code = code.replace(
  'WHERE (sa.student_no IS NOT NULL AND upper(sa.student_no) = $1) \n        OR lower(coalesce(sa.email, \'\')) = $2`,',
  'WHERE (sa.student_no IS NOT NULL AND upper(sa.student_no) = $1) \n        OR coalesce(sa.email, \'\') = $2`,'
);
code = code.replace(
  '[cleanNo, cleanEmail]',
  '[cleanNo, encryptPII(cleanEmail)]'
);

// Replace getSession query
code = code.replace(
  'OR lower(coalesce(sa.email, \'\')) = lower($2)`,',
  'OR coalesce(sa.email, \'\') = $2`,'
);
code = code.replace(
  '[payload.username, payload.username]',
  '[payload.username, encryptPII(String(payload.username || "").toLowerCase())]'
);

// Also need to encrypt email on INSERT
code = code.replace(
  '[cleanEmail, hash, cleanNo]',
  '[encryptPII(cleanEmail), hash, cleanNo]'
);

fs.writeFileSync(file, code);
console.log('studentAuth queries patched');
