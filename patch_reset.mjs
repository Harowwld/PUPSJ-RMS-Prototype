import fs from 'fs';
const file = 'next-app/src/app/api/auth/forgot-password/reset/route.js';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('decryptPII')) {
  code = code.replace(
    'import { hashPassword } from "../../../../../lib/passwordHash";',
    'import { hashPassword } from "../../../../../lib/passwordHash";\nimport { decryptPII } from "../../../../../lib/piiEncryption.js";'
  );

  code = code.replace(
    'if (!staff || staff.status !== "Active") throw new Error("Invalid or expired password reset token.");',
    'if (!staff || staff.status !== "Active") throw new Error("Invalid or expired password reset token.");\n      staff.fname = decryptPII(staff.fname);\n      staff.lname = decryptPII(staff.lname);'
  );

  fs.writeFileSync(file, code);
}
