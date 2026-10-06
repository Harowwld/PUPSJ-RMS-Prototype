const fs = require('fs');
let code = fs.readFileSync('next-app/src/components/staff/NotificationsTab.js', 'utf8');

// 1. Update main Card container
code = code.replace(
  'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1',
  'rounded-[32px] border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-white/5 dark:bg-zinc-900/40 isolate font-jakarta mb-4 min-h-0 flex-1'
);

// 2. Update PageHeader buttons (Read / Unread)
// They are defined as `className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"`
code = code.replace(
  /h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white\/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40/g,
  'h-9 px-5 text-xs font-semibold rounded-full border border-gray-200/60 dark:border-white/10 bg-white dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-zinc-700 shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-40'
);

// 3. Update Toolbar background and tabs
code = code.replace(
  /className="border-t border-gray-100 dark:border-white\/10 p-5 flex flex-wrap items-center justify-between gap-3 bg-gray-50\/40 dark:bg-zinc-900\/30"/g,
  'className="p-4 px-6 flex flex-wrap items-center justify-between gap-3 bg-transparent"'
);

// 4. Update Tabs to Pill style
// "relative h-9 flex items-center text-[13px] font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent whitespace-nowrap",
// activeTab === "inbox" ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-gray-900 dark:after:bg-zinc-50" : "text-[#8E8E93] font-normal hover:text-gray-700 dark:hover:text-zinc-200"
code = code.replace(
  /after:absolute after:bottom-0 after:left-0 after:h-\[2px\] after:w-full after:bg-gray-900 dark:after:bg-zinc-50/g,
  'bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full px-4 shadow-sm'
);
code = code.replace(
  /"text-\[#8E8E93\] font-normal hover:text-gray-700 dark:hover:text-zinc-200"/g,
  '"text-[#8E8E93] font-medium hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full px-4 dark:hover:text-zinc-200"'
);

// 5. Search input
code = code.replace(
  'h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80',
  'h-9 w-full rounded-full border-0 bg-gray-100 dark:bg-zinc-800/50 pl-9 pr-16 text-xs font-medium text-gray-900 dark:text-zinc-100 placeholder:text-gray-500 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-gray-900 dark:focus-visible:bg-zinc-900 dark:focus-visible:ring-white transition-all'
);
// Also bump up the search icon color to blend in
code = code.replace(
  'text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400',
  'text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-gray-900 dark:group-focus-within:text-white'
);

// 6. Fix select pills in the same toolbar (they are Shadcn Selects). The wrapper or triggers might need rounded-full.
// Let's add rounded-full! to Select inside the file if they have class names.
// Wait, the select dropdowns don't have explicit classNames passed to Select trigger in the standard Shadcn UI unless it's customized.
// Let's check how Select is used.
fs.writeFileSync('next-app/src/components/staff/NotificationsTab.js', code);
console.log('Patched NotificationsTab!');
