const fs = require('fs');

const loginPath = 'next-app/src/app/login/page.js';
let loginCode = fs.readFileSync(loginPath, 'utf8');

loginCode = loginCode.replace(
  'className="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-600 accent-blue-600"',
  'className="w-4 h-4 m-0 shrink-0 align-middle translate-y-[0.5px] rounded-full border-gray-300 text-blue-600 focus:ring-blue-600 accent-blue-600"'
);

fs.writeFileSync(loginPath, loginCode);
console.log("Patched login checkbox");
