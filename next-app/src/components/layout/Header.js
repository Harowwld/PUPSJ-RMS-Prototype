"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import UserGuideModal from "@/components/shared/UserGuideModal";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const initials = authUser?.fname && authUser?.lname 
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  const isAdminView = pathname?.startsWith("/admin");
  const hasAdminRights = authUser?.role === "Administrator" || authUser?.role === "SuperAdmin";

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
            <DropdownMenuTrigger className="h-10 w-10 border-2 border-pup-maroon rounded-full flex items-center justify-center text-pup-maroon font-bold text-sm bg-red-50 hover:bg-pup-maroon hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pup-maroon">
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-brand shadow-xl border-gray-200">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-4 bg-gray-50/50">
                  <p className="text-sm font-bold text-pup-maroon">
                    {authUser?.role || "Admin"}
                  </p>
                  <p className="text-xs text-gray-700 truncate font-medium">
                    {authUser?.username || authUser?.email || "registrar.admin"}
                  </p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    const path = authUser?.role === "Administrator" || authUser?.role === "SuperAdmin" ? "/admin" : "/staff";
                    router.push(path);
                  }}
                >
                  <i className="ph-bold ph-squares-four"></i> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/account");
                  }}
                >
                  <i className="ph-bold ph-user-gear"></i> Account Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/account");
                  }}
                >
                  <i className="ph-bold ph-lock-key"></i> Change Password
                </DropdownMenuItem>
                {isAdminView && (
                  <DropdownMenuItem 
                    className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                    onClick={() => router.push("/admin?tab=auditLogs")}
                  >
                    <i className="ph-bold ph-clock-counter-clockwise"></i> My Activity
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="cursor-pointer text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsGuideOpen(true);
                  }}
                >
                  <i className="ph-bold ph-book-open-text"></i> System User Guide
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {hasAdminRights && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {isAdminView ? (
                      <DropdownMenuItem 
                        className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                        onClick={() => router.push("/staff")}
                      >
                        <i className="ph-bold ph-swap"></i> Switch to Staff View
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="cursor-pointer text-gray-700 hover:bg-red-50 hover:text-pup-maroon flex items-center gap-2 font-medium"
                        onClick={() => router.push("/admin")}
                      >
                        <i className="ph-bold ph-swap"></i> Switch to Admin View
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={onLogout}
                  className="cursor-pointer text-red-700 hover:bg-red-50 flex items-center gap-2 font-bold"
                >
                  <i className="ph-bold ph-sign-out"></i> Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <UserGuideModal open={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </header>
  );
}
