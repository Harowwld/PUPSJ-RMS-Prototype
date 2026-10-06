const fs = require('fs');
let btn = fs.readFileSync('next-app/src/components/ui/button.jsx', 'utf8');

btn = btn.replace(
  'link: "text-primary underline-offset-4 hover:underline",',
  'link: "text-[#0A84FF] underline-offset-4 hover:underline",'
);

fs.writeFileSync('next-app/src/components/ui/button.jsx', btn);
console.log("Patched link variant");
