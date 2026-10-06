import fs from 'fs';
const file = 'next-app/src/app/api/auth/me/route.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'OR (lower(sa.email) = lower($2) AND $2 IS NOT NULL)',
  'OR (sa.email = $2 AND $2 IS NOT NULL)'
);

code = code.replace(
  'principal.email || null',
  'principal.email ? encryptPII(principal.email.toLowerCase()) : null'
);

code = code.replace(
  'if (!student) return addSecurityHeaders(NextResponse.json({ ok: false, error: "Student account not found" }, { status: 401 }));',
  `if (!student) return addSecurityHeaders(NextResponse.json({ ok: false, error: "Student account not found" }, { status: 401 }));
      if (student.email) student.email = decryptPII(student.email);
      if (student.first_name) student.first_name = decryptPII(student.first_name);
      if (student.middle_name) student.middle_name = decryptPII(student.middle_name);
      if (student.last_name) student.last_name = decryptPII(student.last_name);
      if (student.name) student.name = decryptPII(student.name);`
);

fs.writeFileSync(file, code);
