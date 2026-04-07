"use client";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-300 p-3 flex-none z-10 shadow-inner">
      <div className="w-full flex justify-between items-center text-xs font-medium text-gray-600 px-1">
        <p>
          &copy; 2026 Polytechnic University of the Philippines. All rights
          reserved.
        </p>
        <div className="flex gap-4">
          <span className="text-gray-500">System Version 1.0.1 (Beta)</span>
        </div>
      </div>
    </footer>
  );
}
