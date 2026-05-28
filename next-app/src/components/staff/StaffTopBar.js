"use client";

import { usePathname } from "next/navigation";

export default function StaffTopBar({ items, activeKey, onSelect }) {
  const pathname = usePathname();

  // Filter out headers to keep the horizontal bar clean
  const navItems = items.filter((item) => item.type !== "header");

  const handleLinkClick = (e, key) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      onSelect(key);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 select-none flex justify-center w-max">
      <nav className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/80 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-[#1f1f1f]">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <a
              key={item.key}
              href={`${pathname}?view=${item.key}`}
              onClick={(e) => handleLinkClick(e, item.key)}
              className={`group relative flex items-center gap-2 rounded-full px-6 py-3 text-sm font-extrabold whitespace-nowrap transition-all duration-300 outline-none hover:scale-[1.03] active:scale-[0.98] cursor-pointer ${
                isActive
                  ? "bg-pup-maroon text-white shadow-md shadow-red-950/20 dark:bg-[#352021] dark:text-[#9d9da7] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f5f5f5]"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100"
              }`}
            >
              <i className={`${item.iconClass} text-base transition-transform duration-300 group-hover:scale-110 ${
                isActive 
                  ? "text-white dark:text-[#9d9da7] dark:group-hover:text-[#f5f5f5]" 
                  : "text-gray-400 group-hover:text-gray-900 dark:text-zinc-500 dark:group-hover:text-zinc-100"
              }`}></i>
              <span>{item.label}</span>
              
              {item.badge > 0 ? (
                <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black leading-none transition-all duration-300 ${
                  isActive 
                    ? "bg-white text-pup-maroon dark:bg-[#473031] dark:text-[#f5f5f5]"
                    : "bg-emerald-600 text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-1 dark:ring-emerald-500/20"
                }`}>
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
