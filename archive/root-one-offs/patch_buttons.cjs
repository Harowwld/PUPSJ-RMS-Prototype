const fs = require('fs');

// Patch button.jsx
let btn = fs.readFileSync('next-app/src/components/ui/button.jsx', 'utf8');
btn = btn.replace(
  'default: "bg-pup-maroon text-white hover:bg-pup-darkMaroon",',
  'default: "bg-[#232e3b] text-white hover:bg-[#1a222c] rounded-full",'
);
btn = btn.replace(
  'outline:\n          "border-pup-maroon/40 bg-transparent text-pup-maroon hover:bg-pup-maroon/10 hover:text-pup-maroon aria-expanded:bg-pup-maroon/10 aria-expanded:text-pup-maroon dark:border-pup-maroon/50 dark:bg-transparent dark:hover:bg-pup-maroon/20",',
  'outline:\n          "border-[#232e3b]/40 bg-transparent text-[#232e3b] hover:bg-[#232e3b]/10 hover:text-[#232e3b] aria-expanded:bg-[#232e3b]/10 aria-expanded:text-[#232e3b] dark:border-white/50 dark:bg-transparent dark:hover:bg-white/20 dark:text-white dark:hover:text-white rounded-full",'
);
fs.writeFileSync('next-app/src/components/ui/button.jsx', btn);

// Patch globals.css
let css = fs.readFileSync('next-app/src/app/globals.css', 'utf8');
if (!css.includes('.btn-brand-red')) {
  css += `\n
.btn-brand-red, .bg-pup-maroon, .btn-brand-orange {
  background-color: #232e3b !important;
  color: white !important;
  border-radius: 9999px !important;
}
.btn-brand-red:hover, .bg-pup-maroon:hover, .btn-brand-orange:hover {
  background-color: #1a222c !important;
}
`;
  fs.writeFileSync('next-app/src/app/globals.css', css);
}

// Patch RegistrarODRSTab.js hardcoded button
let reg = fs.readFileSync('next-app/src/components/staff/RegistrarODRSTab.js', 'utf8');
reg = reg.replace(/bg-pup-maroon/g, 'bg-[#232e3b] rounded-full');
fs.writeFileSync('next-app/src/components/staff/RegistrarODRSTab.js', reg);

console.log("Buttons patched successfully.");
