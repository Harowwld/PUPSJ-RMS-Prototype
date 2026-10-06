import fs from 'fs';

const filePath = 'next-app/src/lib/staffRepo.js';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('encryptPII')) {
  code = code.replace(
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";',
    'import { dbGet, dbRun, dbAll } from "./postgresCompat.js";\nimport { encryptPII, decryptPII } from "./piiEncryption.js";'
  );
}

// createStaff
code = code.replace(
  'const { id, officeId, fname, lname, email, role, section, status } = payload;',
  'const { id, officeId, fname, lname, email, role, section, status } = payload;\n  const encFname = encryptPII(fname);\n  const encLname = encryptPII(lname);\n  const encEmail = encryptPII(email);'
);
code = code.replace(
  '[id, officeId || null, fname, lname, role, section, status, email]',
  '[id, officeId || null, encFname, encLname, role, section, status, encEmail]'
);

// updateStaff
code = code.replace(
  '  if (patch.fname !== undefined) {',
  '  if (patch.fname !== undefined) {\n    updates.push("fname = ?");\n    params.push(encryptPII(patch.fname));\n  } else if (false) {'
);
code = code.replace(
  '  if (patch.lname !== undefined) {',
  '  if (patch.lname !== undefined) {\n    updates.push("lname = ?");\n    params.push(encryptPII(patch.lname));\n  } else if (false) {'
);
code = code.replace(
  '  if (patch.email !== undefined) {',
  '  if (patch.email !== undefined) {\n    updates.push("email = ?");\n    params.push(encryptPII(patch.email));\n  } else if (false) {'
);

// getStaffByUsername
code = code.replace(
  'const row = await dbGet("SELECT * FROM staff WHERE lower(email) = lower(?) OR lower(id) = lower(?)", [u, u]);',
  'const row = await dbGet("SELECT * FROM staff WHERE email = ? OR lower(id) = lower(?)", [encryptPII(u.toLowerCase()), u]);'
);

// We need a helper to decrypt staff rows
const decryptHelper = `
function decryptStaffRow(row) {
  if (!row) return row;
  if (row.fname) row.fname = decryptPII(row.fname);
  if (row.lname) row.lname = decryptPII(row.lname);
  if (row.email) row.email = decryptPII(row.email);
  return row;
}
`;

code = code.replace('export async function setStaffPasswordById', decryptHelper + '\nexport async function setStaffPasswordById');

code = code.replace('return row || null;', 'return decryptStaffRow(row) || null;'); // Replaces in getStaffById and getStaffByUsername

code = code.replace(
  'return rows;',
  'return rows.map(decryptStaffRow);'
);

code = code.replace(
  'return await dbAll(',
  'const rows = await dbAll('
);

// listStaff map
code = code.replace(
  'return rows;\n}',
  'return rows.map(decryptStaffRow);\n}'
);

fs.writeFileSync(filePath, code);
console.log('staffRepo patched');
