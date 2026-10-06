const fs = require('fs');
let btn = fs.readFileSync('next-app/src/components/ui/button.jsx', 'utf8');

btn = btn.replace(
  'ghost:\n          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",',
  'ghost:\n          "text-[#0A84FF] hover:bg-[#0A84FF]/10 aria-expanded:bg-[#0A84FF]/10 dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/20 dark:aria-expanded:bg-[#0A84FF]/20",'
);

fs.writeFileSync('next-app/src/components/ui/button.jsx', btn);
console.log("Patched ghost variant");
