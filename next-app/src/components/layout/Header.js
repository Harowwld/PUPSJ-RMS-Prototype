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
import AccountSetupModal from "@/components/shared/AccountSetupModal";
import { isAdminRole, getRoleLabel } from "@/lib/roleUtils";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
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
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
              <i className={`ph-bold ph-caret-down text-gray-400 text-xs transition-transform duration-300 hidden sm:block ${menuOpen ? "rotate-180" : ""}`}></i>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-gray-200 shadow-2xl p-2 bg-white/98 backdrop-blur-md">
              <DropdownMenuGroup>
                <div className="rounded-xl p-3 bg-gray-50/80 border border-gray-100 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-base font-bold text-pup-maroon shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate tracking-tight">
                        {authUser?.fname} {authUser?.lname}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-pup-maroon bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wider">
                          {authUser?.role || "User"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        {authUser?.email || authUser?.username}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuGroup>
              
              <DropdownMenuSeparator className="opacity-50" />
              
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors"
                  onClick={() => router.push(isAdminRole(authUser?.role) ? "/admin" : "/staff")}
                >
                  <i className="ph-bold ph-house-line text-lg text-gray-400"></i> 
                  <span className="text-sm">Main Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors"
                  onClick={() => router.push("/account")}
                >
                  <i className="ph-bold ph-user-circle-gear text-lg text-gray-400"></i> 
                  <span className="text-sm">Account Settings</span>
                </DropdownMenuItem>
                {hasAdminRights && (
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors"
                    onClick={() => router.push("/account/activity")}
                  >
                    <i className="ph-bold ph-clock-counter-clockwise text-lg text-gray-400"></i> 
                    <span className="text-sm">Audit My Activity</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              {hasAdminRights && (
                <>
                  <DropdownMenuSeparator className="opacity-50" />
                  <div className="px-2 py-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 mb-3">
                      Interface View Mode
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50">
                      <DropdownMenuItem
                        onClick={() => router.push("/admin")}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all cursor-pointer outline-none ${
                          isAdminView 
                            ? "bg-white text-pup-maroon shadow-md border border-red-100 ring-1 ring-red-100/20" 
                            : "text-gray-400 hover:bg-white/50 hover:text-gray-600"
                        }`}
                      >
                        <i className={`ph-bold ph-shield-check text-xl ${isAdminView ? "text-pup-maroon" : ""}`}></i>
                        <span className="text-[10px] font-black uppercase tracking-wider">Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/staff")}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all cursor-pointer outline-none ${
                          !isAdminView 
                            ? "bg-white text-pup-maroon shadow-md border border-red-100 ring-1 ring-red-100/20" 
                            : "text-gray-400 hover:bg-white/50 hover:text-gray-600"
                        }`}
                      >
                        <i className={`ph-bold ph-users-three text-xl ${!isAdminView ? "text-pup-maroon" : ""}`}></i>
                        <span className="text-[10px] font-black uppercase tracking-wider">Staff</span>
                      </DropdownMenuItem>
                    </div>
                  </div>
                </>
              )}

              <DropdownMenuSeparator className="opacity-50" />
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-3 font-black py-2.5 px-3 transition-all"
                >
                  <i className="ph-bold ph-power text-lg"></i>
                  <span className="text-sm">Sign Out System</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
