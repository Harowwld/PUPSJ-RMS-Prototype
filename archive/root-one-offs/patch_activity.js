const fs = require('fs');
let code = fs.readFileSync('next-app/src/app/account/activity/page.js', 'utf8');

code = code.replace(
  /className=\{cn\("mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-\[#8E8E93\] hover:text-\[#111111\] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-fast", isExpanded \? "rotate-180" : "rotate-0"\)\}\s*>\s*<HugeIcon\s+className="ti ti-chevron-down text-\[14px\]"><\/HugeIcon>\s*<\/button>/g,
  \`className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-colors duration-fast"
          >
            {isExpanded ? (
              <HugeIcon className="ph-bold ph-minus text-[14px]" />
            ) : (
              <HugeIcon className="ph-bold ph-plus text-[14px]" />
            )}
          </button>\`
);

fs.writeFileSync('next-app/src/app/account/activity/page.js', code);
console.log("Replaced chevron with plus/minus");
