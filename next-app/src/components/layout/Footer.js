"use client";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border p-3 flex-none z-10 shadow-inner dark:bg-card dark:border-border dark:shadow-none">
      <div className="w-full flex justify-between items-center text-xs font-normal text-gray-600 px-1 dark:text-zinc-300">
        <p>
          &copy; 2026 Polytechnic University of the Philippines. All rights
          reserved.
        </p>
        <div className="flex gap-4">
          <span className="text-gray-900 dark:text-zinc-300">System Version 1.0.1 (Beta)</span>
        </div>
      </div>
    </footer>
  );
}

