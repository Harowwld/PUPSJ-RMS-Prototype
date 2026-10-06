import fs from 'fs';
const file = 'next-app/src/app/api/auth/me/route.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '    const staff = userId\n      ? (process.env.DATABASE_URL\n        ? await queryOne("SELECT * FROM staff WHERE id = $1", [userId])\n        : await getStaffById(userId))\n      : null;',
  '    const staff = userId ? await getStaffById(userId) : null;'
);

fs.writeFileSync(file, code);
