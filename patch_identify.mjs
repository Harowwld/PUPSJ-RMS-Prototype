import fs from 'fs';
const file = 'next-app/src/app/api/auth/forgot-password/identify/route.js';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'import { checkAuthForgotPasswordRateLimit, resetAuthForgotPasswordRateLimit } from "../../../../../lib/rateLimiter";',
  'import { checkAuthForgotPasswordRateLimit, resetAuthForgotPasswordRateLimit } from "../../../../../lib/rateLimiter";\nimport { getStaffByUsername } from "../../../../../lib/staffRepo.js";'
);

code = code.replace(
  'const staff = await queryOne(\n    `SELECT id, email FROM staff\n      WHERE (lower(email) = $1 OR lower(id) = $1) AND status = \'Active\'`,\n    [identifier],\n  );',
  'let staff = await getStaffByUsername(identifier);\n  if (staff && staff.status !== "Active") staff = null;'
);

fs.writeFileSync(file, code);
