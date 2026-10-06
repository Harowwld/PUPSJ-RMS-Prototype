import fs from 'fs';
const file = 'next-app/src/app/api/auth/login/route.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '  const touched = process.env.DATABASE_URL\n    ? await queryOne("UPDATE staff SET last_active = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [staff.id])\n    : await touchStaffLastActiveById(staff.id);',
  '  let touched = process.env.DATABASE_URL\n    ? await queryOne("UPDATE staff SET last_active = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *", [staff.id])\n    : await touchStaffLastActiveById(staff.id);\n  if (touched) touched = Object.assign({}, touched, { email: staff.email, fname: staff.fname, lname: staff.lname });'
);

fs.writeFileSync(file, code);
