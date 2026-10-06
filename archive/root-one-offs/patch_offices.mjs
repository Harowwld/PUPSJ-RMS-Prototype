import fs from 'fs';
const file = 'next-app/src/lib/officesRepo.js';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('encryptPII')) {
  code = code.replace(
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";',
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";\nimport { encryptPII, decryptPII } from "./piiEncryption.js";'
  );
  
  // replace query
  code = code.replace(
    'await queryOne("SELECT * FROM staff WHERE id=$1 OR lower(email)=lower($2)",[id,email])',
    'await queryOne("SELECT * FROM staff WHERE id=$1 OR email=$2",[id,encryptPII(email.toLowerCase())])'
  );

  code = code.replace(
    '[id,officeId,shortName||officeId,email,hashPassword(DEFAULT_STAFF_PASSWORD)]',
    '[id,officeId,encryptPII(shortName||officeId),encryptPII("Admin"),encryptPII(email),hashPassword(DEFAULT_STAFF_PASSWORD)]'
  );

  fs.writeFileSync(file, code);
}
