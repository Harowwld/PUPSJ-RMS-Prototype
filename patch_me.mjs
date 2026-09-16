import fs from 'fs';
const file = 'next-app/src/app/api/auth/me/route.js';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('decryptPII')) {
  code = code.replace(
    'import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";',
    'import { getSessionCookieName, verifySessionToken } from "../../../../lib/jwt";\nimport { decryptPII } from "../../../../lib/piiEncryption.js";'
  );
  code = code.replace(
    'let user = process.env.DATABASE_URL\n        ? await queryOne("SELECT * FROM staff WHERE id = $1", [userId])\n        : await getStaffById(userId);',
    'let user = await getStaffById(userId);'
  );
  code = code.replace(
    'import { getStaffById, hasAllSecurityAnswers } from "../../../../lib/staffRepo";',
    'import { getStaffById, getStaffByUsername, hasAllSecurityAnswers } from "../../../../lib/staffRepo";'
  );
  fs.writeFileSync(file, code);
}
console.log('patched me');
