"use client";

import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="bg-white dark:bg-zinc-950 border-t border-gray-200/80 dark:border-zinc-800 py-10 text-xs text-gray-500 dark:text-zinc-400 mt-auto font-inter select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Brand attribution with eManage logo only */}
        <div className="flex items-center gap-2.5">
          <img 
            src="/assets/branding/black-icon.png" 
            alt="eManage Logo" 
            className="w-5 h-5 object-contain dark:hidden"
          />
          <img 
            src="/assets/branding/white-icon.png" 
            alt="eManage Logo" 
            className="w-5 h-5 object-contain hidden dark:block"
          />
          <span className="font-bold text-gray-900 dark:text-zinc-100">eManage ODRS</span>
          <span className="text-gray-300 dark:text-zinc-700">·</span>
          <span>PUP San Juan Records Management Platform</span>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center gap-6 text-gray-500 dark:text-zinc-400 text-xs">
          <a href="#catalog" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Services
          </a>
          <a href="#workflow" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Process
          </a>
          <a href="#office" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Office Hours
          </a>
          <Link href="/login" className="hover:text-[#800000] dark:hover:text-red-400 font-semibold transition-colors">
            Personnel Sign In ➔
          </Link>
          <span className="text-gray-300 dark:text-zinc-700 hidden sm:inline">|</span>
          <span>© 2026 PUP San Juan Campus</span>
        </div>

      </div>
    </footer>
  );
}

