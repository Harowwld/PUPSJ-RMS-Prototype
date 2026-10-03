const fs = require('fs');

const file = 'next-app/src/components/systemadmin/GlobalStaffTab.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div\s*onClick=\{\(\) => setSelectedKpi\(selectedKpi === stat\.key \? null : stat\.key\)\}[\s\S]*?<\/div>\s*<\/div>/;
const match = content.match(regex);
if (match) {
  const newDiv = `<div
                    onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
                    className={cn(
                      "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
                      selectedKpi === stat.key
                        ? (stat.color === "blue" ? "border-blue-500/50 ring-1 ring-blue-500/20" : stat.color === "emerald" ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-amber-500/50 ring-1 ring-amber-500/20")
                        : "border-gray-100 dark:border-white/5"
                    )}
                  >
                    <div className="flex justify-between items-start p-4 pb-0">
                      <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                        {stat.label}
                      </span>
                      <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", stat.color === "blue" ? "bg-[#3b82f6]" : stat.color === "emerald" ? "bg-[#22c55e]" : "bg-[#f59e0b]")}>
                        <LucideIcon className={cn("ph-bold text-[15px]", stat.color === "blue" ? "ph-identification-badge" : stat.color === "emerald" ? "ph-user-focus" : "ph-shield-star")} />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end p-4 pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                          {stat.value.toLocaleString()}
                        </span>
                        <span className={cn("text-xs font-medium", stat.color === "blue" ? "text-blue-600 dark:text-blue-400" : stat.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                          {stat.sublabel}
                        </span>
                      </div>
                      <LucideIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                    </div>
                  </div>`;
  content = content.replace(match[0], newDiv);
  fs.writeFileSync(file, content);
  console.log("Updated GlobalStaffTab.js");
} else {
  console.log("Could not find regex match in GlobalStaffTab.js");
}
