const fs = require('fs');
const file = 'next-app/src/components/shared/Sidebar.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Toggle icon container w-[36px] h-[36px] -> w-[40px] h-[40px]
content = content.replace(/className="flex w-\[36px\] h-\[36px\]/g, 'className="flex w-[40px] h-[40px]');

// 2. Toggle icon text-[21px] -> text-[24px]
content = content.replace(/text-\[21px\]/g, 'text-[24px]');

// 3. Header text-[11px] -> text-[12px]
content = content.replace(/text-\[11px\]/g, 'text-[12px]');

// 4. Buttons h-[38px] -> h-[42px]
content = content.replace(/h-\[38px\]/g, 'h-[42px]');

// 5. Icon containers w-[36px] h-[36px] -> w-[40px] h-[40px]
content = content.replace(/w-\[36px\] h-\[36px\]/g, 'w-[40px] h-[40px]');

// 6. Icons text-[19px] -> text-[22px]
content = content.replace(/text-\[19px\]/g, 'text-[22px]');

// 7. Text text-[13.5px] -> text-[14.5px]
content = content.replace(/text-\[13.5px\]/g, 'text-[14.5px]');

fs.writeFileSync(file, content);
console.log("Patched Sidebar sizes");
