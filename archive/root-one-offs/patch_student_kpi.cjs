const fs = require('fs');

const file = 'next-app/src/components/staff/StudentDirectoryTab.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div\s*className=\{cn\("relative group rounded-xl cursor-grab active:cursor-grabbing"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
const matches = content.match(regex);
if (!matches || matches.length !== 3) {
  console.log("Failed to find exactly 3 KPI cards. Found:", matches ? matches.length : 0);
  process.exit(1);
}

// 1. Active Students
const newActive = `<div className={cn("relative group rounded-[18px] cursor-grab active:cursor-grabbing", selectedKpi === "students" ? "z-30" : "z-10")}>
                <div onClick={() => setSelectedKpi(selectedKpi === "students" ? null : "students")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "students" ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-gray-100 dark:border-white/5")}>
                  <div className="flex justify-between items-start p-4 pb-0">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">Active Students</span>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#22c55e]">
                      <LucideIcon className="ph-bold text-[15px] ph-users" />
                    </div>
                  </div>
                  <div className="flex justify-between items-end p-4 pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{kpiStats.activeCount.toLocaleString()}</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Enrolled</span>
                    </div>
                    <LucideIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                  </div>
                </div>
                
                {/* Absolute details container */}
                <div
                  className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-[18px] border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "students"
                      ? "scale-y-100 opacity-100 translate-y-0"
                      : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">`;

// 2. Academic Programs
const newPrograms = `<div className={cn("relative group rounded-[18px] cursor-grab active:cursor-grabbing", selectedKpi === "programs" ? "z-30" : "z-10")}>
                <div onClick={() => setSelectedKpi(selectedKpi === "programs" ? null : "programs")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "programs" ? "border-blue-500/50 ring-1 ring-blue-500/20" : "border-gray-100 dark:border-white/5")}>
                  <div className="flex justify-between items-start p-4 pb-0">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">Academic Programs</span>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                      <LucideIcon className="ph-bold text-[15px] ph-books" />
                    </div>
                  </div>
                  <div className="flex justify-between items-end p-4 pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{kpiStats.programCount.toLocaleString()}</span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Degree Tracks</span>
                    </div>
                    <LucideIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                  </div>
                </div>
                
                {/* Absolute details container */}
                <div
                  className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-[18px] border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "programs"
                      ? "scale-y-100 opacity-100 translate-y-0"
                      : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">`;

// 3. Digitized Files
const newFiles = `<div className={cn("relative group rounded-[18px] cursor-grab active:cursor-grabbing", selectedKpi === "files" ? "z-30" : "z-10")}>
                <div onClick={() => setSelectedKpi(selectedKpi === "files" ? null : "files")} className={cn("relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900", selectedKpi === "files" ? "border-orange-500/50 ring-1 ring-orange-500/20" : "border-gray-100 dark:border-white/5")}>
                  <div className="flex justify-between items-start p-4 pb-0">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">Digitized Files</span>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#f97316]">
                      <LucideIcon className="ph-bold text-[15px] ph-file-text" />
                    </div>
                  </div>
                  <div className="flex justify-between items-end p-4 pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">{kpiStats.digitizedCount.toLocaleString()}</span>
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Repository</span>
                    </div>
                    <LucideIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                  </div>
                </div>
                
                {/* Absolute details container */}
                <div
                  className={cn(
                    "absolute top-full left-0 right-0 z-[100] mt-2 rounded-[18px] border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
                    selectedKpi === "files"
                      ? "scale-y-100 opacity-100 translate-y-0"
                      : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">`;

content = content.replace(matches[0], newActive);
content = content.replace(matches[1], newPrograms);
content = content.replace(matches[2], newFiles);

fs.writeFileSync(file, content);
console.log("Updated StudentDirectoryTab.js");
