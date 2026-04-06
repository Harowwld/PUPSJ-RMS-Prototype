"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRole = (role) => {
    const normalized = String(role || "").toLowerCase();
    return normalized === "admin" || normalized === "administrator" || normalized === "superadmin";
  };

  const initials = authUser?.fname && authUser?.lname 
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  const isAdminView = pathname?.startsWith("/admin");
  const hasAdminRights = isAdminRole(authUser?.role);

  useEffect(() => {
    // Warm common dashboard routes for faster view switching.
    router.prefetch("/staff");
    router.prefetch("/admin");
  }, [router]);

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

        <div className="ml-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="group flex items-center gap-3 rounded-brand border border-gray-200 bg-white/90 px-3 py-1.5 shadow-xs transition-all hover:border-pup-maroon/40 hover:bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon">
              <div className="h-9 w-9 shrink-0 rounded-brand bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[160px]">
                  {authUser?.fname} {authUser?.lname}
                </p>
                <p className="text-[11px] font-medium text-pup-maroon/90 leading-tight">
                  {authUser?.role || "User"}
                </p>
              </div>
              <i className="ph-bold ph-caret-down text-gray-400 text-xs transition-transform group-data-[state=open]:rotate-180 hidden sm:block"></i>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-2xl border border-gray-200 shadow-xl p-2 bg-white/95 backdrop-blur">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="rounded-xl p-3 bg-gray-50/90">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-brand bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {authUser?.fname} {authUser?.lname}
                      </p>
                      <p className="text-xs text-pup-maroon font-medium truncate">
                        {authUser?.role || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {authUser?.email || authUser?.username}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                    router.push(path);
                  }}
                >
                  <i className="ph-bold ph-squares-four"></i> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/account");
                  }}
                >
                  <i className="ph-bold ph-user-gear"></i> Account Settings
                </DropdownMenuItem>
                {hasAdminRights && (
                  <DropdownMenuItem 
                    className="cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                    onClick={() => router.push("/account/activity")}
                  >
                    <i className="ph-bold ph-clock-counter-clockwise"></i> My Activity
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {hasAdminRights && (
                <DropdownMenuGroup>
                  {isAdminView ? (
                      <DropdownMenuItem 
                        className="cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                        onClick={() => router.push("/staff")}
                      >
                        <i className="ph-bold ph-swap"></i> Switch to Staff View
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="cursor-pointer rounded-md text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                        onClick={() => router.push("/admin")}
                      >
                        <i className="ph-bold ph-swap"></i> Switch to Admin View
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="cursor-pointer rounded-md text-red-700 hover:bg-red-50 flex items-center gap-2 font-bold"
                >
                  <i className="ph-bold ph-sign-out"></i> Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
