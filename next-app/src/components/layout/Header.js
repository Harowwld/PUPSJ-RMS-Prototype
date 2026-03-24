"use client";

import { useState, useEffect } from "react";

export default function Header({ authUser, onLogout, children }) {
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    function onDocClick(e) {
      const menu = document.getElementById("userMenuDropdown");
      const btn = document.getElementById("userMenuBtn");
      if (!menu || !btn) return;
      if (!profileOpen) return;
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [profileOpen]);

  const initials = authUser?.fname && authUser?.lname 
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  return (
    <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <i className="ph-bold ph-bank text-3xl text-pup-maroon"></i>
          <div className="leading-tight">
            <h1 className="font-bold text-xl text-pup-maroon tracking-tight">
              PUP E-MANAGE
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              Student Record Keeping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>

        <div className="relative ml-4">
          <button
            id="userMenuBtn"
            onClick={() => setProfileOpen((o) => !o)}
            className="h-10 w-10 border-2 border-pup-maroon rounded-full flex items-center justify-center text-pup-maroon font-bold text-sm bg-red-50 hover:bg-pup-maroon hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon"
          >
            {initials}
          </button>

          <div
            id="userMenuDropdown"
            className={`${profileOpen ? "" : "hidden"} absolute right-0 mt-2 w-64 bg-white rounded-brand shadow-xl border border-gray-200 z-[110] animate-scale-in origin-top-right overflow-hidden`}
          >
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-bold text-pup-maroon">
                {authUser?.role || "Admin"}
              </p>
              <p className="text-xs text-gray-700 truncate font-medium">
                {authUser?.username || authUser?.email || "registrar.admin"}
              </p>
            </div>
            <div className="p-1">
              <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                <i className="ph-bold ph-user-gear"></i> Account Settings
              </button>
              <button className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-pup-maroon rounded-brand flex items-center gap-2 transition-colors font-medium">
                <i className="ph-bold ph-question"></i> Help & Support
              </button>
            </div>
            <div className="p-1 border-t border-gray-200">
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-3 text-sm font-bold text-red-700 hover:bg-red-50 rounded-brand flex items-center gap-2 transition-colors"
              >
                <i className="ph-bold ph-sign-out"></i> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
