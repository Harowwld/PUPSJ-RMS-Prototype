const fs = require('fs');
const file = 'next-app/src/components/shared/Sidebar.js';
let content = fs.readFileSync(file, 'utf8');

// Patch sidebar icon
content = content.replace(
  /<HugeIcon\s+className=\{cn\("rms-style-color ([^"]+)", ([^\)]+)\)\}\s+data-color=\{activeColor\}\s+style=\{\{ color: activeColor \}\}/g,
  '<HugeIcon className={cn("text-[#232e3b] dark:text-[#232e3b] $1", $2)}'
);

// Patch slider track
content = content.replace(
  /className="rms-style-width rms-style-background-color absolute left-0 h-\[2.5px\] rounded-full"/g,
  'className="rms-style-width bg-[#232e3b] dark:bg-[#232e3b] absolute left-0 h-[2.5px] rounded-full"'
);
content = content.replace(
  /data-width=\{\`\$\{\(zoomNode \/ 6\) \* 100\}%\`\}\s+data-background-color=\{activeColor\}/g,
  'data-width={`${(zoomNode / 6) * 100}%`}'
);

// Patch slider thumb
content = content.replace(
  /className="rms-style-left rms-style-border-color absolute -translate-x-1\/2 w-\[12px\] h-\[12px\] rounded-full bg-white dark:bg-zinc-900 shadow-xs border-2"/g,
  'className="rms-style-left border-[#232e3b] dark:border-[#232e3b] absolute -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-white dark:bg-zinc-900 shadow-xs border-2"'
);
content = content.replace(
  /data-left=\{\`\$\{\(zoomNode \/ 6\) \* 100\}%\`\}\s+data-border-color=\{activeColor\}/g,
  'data-left={`${(zoomNode / 6) * 100}%`}'
);

fs.writeFileSync(file, content);
console.log("Patched Sidebar colors");
