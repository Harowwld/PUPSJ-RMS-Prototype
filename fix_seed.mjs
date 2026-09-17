import fs from 'fs';
const file = 'next-app/scripts/seed-test-accounts.mjs';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '    `, [sNo, sName, cCode, yLevel, sSection]);',
  '    `, [sNo, encryptPII(sName), cCode, yLevel, sSection]);'
);

code = code.replace(
  '    `, [sNo, sEmail, studentHash]);',
  '    `, [sNo, encryptPII(sEmail.toLowerCase()), studentHash]);'
);

fs.writeFileSync(file, code);
