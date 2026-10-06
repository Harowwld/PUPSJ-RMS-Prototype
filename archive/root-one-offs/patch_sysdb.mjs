import fs from 'fs';
const file = 'next-app/src/lib/systemDb.js';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('encryptPII')) {
  code = code.replace(
    'import { hashPassword } from "./passwordHash.js";',
    'import { hashPassword } from "./passwordHash.js";\nimport { encryptPII } from "./piiEncryption.js";'
  );

  code = code.replace(
    '      "PUPSUPERADMIN-001",\n      "System",\n      "Administrator",\n      "SuperAdmin",\n      "System Administration",\n      "Active",\n      "superadmin@pup.local",\n      passwordHash',
    '      "PUPSUPERADMIN-001",\n      encryptPII("System"),\n      encryptPII("Administrator"),\n      "SuperAdmin",\n      "System Administration",\n      "Active",\n      encryptPII("superadmin@pup.local"),\n      passwordHash'
  );

  fs.writeFileSync(file, code);
}
