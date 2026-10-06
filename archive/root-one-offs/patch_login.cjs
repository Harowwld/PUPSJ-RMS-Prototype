const fs = require('fs');

const filesToPatch = [
  'next-app/src/app/login/page.js',
  'next-app/src/app/forgot-password/page.js'
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace text-[#E5484D] with text-[#0A84FF] for the text buttons/links
  content = content.replace(/className="text-\[13px\] text-\[#E5484D\] hover:underline focus:outline-none font-normal"/g, 'className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal"');
  
  content = content.replace(/className="text-\[13px\] text-\[#E5484D\] hover:underline focus:outline-none shrink-0 font-normal"/g, 'className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none shrink-0 font-normal"');

  fs.writeFileSync(file, content);
}
console.log("Patched login and forgot-password text buttons to blue.");
