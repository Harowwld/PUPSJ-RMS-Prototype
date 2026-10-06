const fs = require('fs');
let code = fs.readFileSync('next-app/src/app/globals.css', 'utf8');

// Replace the btn-brand-red block
const oldBtnRegex = /\/\* Brand Buttons - Solid Maroon Style \*\/\n\.btn-brand-red \{[\s\S]*?\.dark \.btn-brand-red:active \{[\s\S]*?\}/;

const newBtnBlock = `/* Brand Buttons - Elegostra Dark Pill Style */
.btn-brand-red {
  background-color: #232e3b !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  color: white !important;
  border-radius: 9999px !important;
  font-weight: 600 !important;
  text-shadow: none !important;
  @apply normal-case transition-all disabled:opacity-50 flex items-center justify-center gap-2;
}

.dark .btn-brand-red {
  background-color: #232e3b !important;
  color: white !important;
  box-shadow: none !important;
}

.btn-brand-red:hover {
  background-color: #1a222c !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transform: none !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
}

.dark .btn-brand-red:hover {
  background-color: #1a222c !important;
  box-shadow: none !important;
}

.btn-brand-red:active {
  background-color: #12181f !important;
  background-image: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  transform: scale(0.98) !important;
}`;

if (code.match(oldBtnRegex)) {
  code = code.replace(oldBtnRegex, newBtnBlock);
  fs.writeFileSync('next-app/src/app/globals.css', code);
  console.log('CSS patched!');
} else {
  console.log('Regex did not match!');
}
