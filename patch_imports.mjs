import fs from 'fs';

function addImport(file, importStmt) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes(importStmt)) {
    code = importStmt + '\n' + code;
    fs.writeFileSync(file, code);
  }
}

addImport('next-app/src/lib/studentAuth.js', 'import { encryptPII, decryptPII } from "./piiEncryption.js";');
addImport('next-app/src/lib/studentsRepo.js', 'import { encryptPII, decryptPII } from "./piiEncryption.js";\nimport { decryptStudentRow } from "./studentAuth.js";');
addImport('next-app/src/lib/officesRepo.js', 'import { encryptPII, decryptPII } from "./piiEncryption.js";');

console.log('patched imports');
