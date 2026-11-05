"use client";

export default function Footer() {
  return (
    <footer className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border/80 dark:border-white/10 px-6 py-2.5 flex-none z-10 select-none">
      <div className="w-full flex justify-between items-center text-xs font-normal text-gray-500 dark:text-zinc-400">
        <p>
          &copy; 2026 Polytechnic University of the Philippines. All rights reserved.
        </p>
        <div className="flex gap-4">
          <span className="text-gray-700 dark:text-zinc-300 font-medium font-sans tabular-nums">System Version 1.0.1 (Beta)</span>
        </div>
      </div>
    </footer>
  );
}

