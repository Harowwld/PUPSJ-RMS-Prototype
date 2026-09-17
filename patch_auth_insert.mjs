import fs from 'fs';

const file = 'next-app/src/lib/studentAuth.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '[student ? student.student_no : null, cleanEmail, hashPassword(cleanPass), cleanFirst, cleanMiddle, cleanLast, resolvedClientType]',
  '[student ? student.student_no : null, encryptPII(cleanEmail), hashPassword(cleanPass), encryptPII(cleanFirst), encryptPII(cleanMiddle), encryptPII(cleanLast), resolvedClientType]'
);

fs.writeFileSync(file, code);
