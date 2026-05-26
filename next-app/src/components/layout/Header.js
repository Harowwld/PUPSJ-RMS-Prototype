"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import AccountSetupModal from "@/components/shared/AccountSetupModal";
import { isAdminRole, getRoleLabel } from "@/lib/roleUtils";
import { cn } from "@/lib/utils";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    // Only admins have a choice of view
    if (isAdminRole(authUser?.role)) {
      const stored = localStorage.getItem("pup_admin_view_pref");
      if (stored) {
        setPreferredView(stored);
      } else {
        // Default to admin if we're on an admin page, or staff otherwise
        const initial = pathname?.startsWith("/admin") ? "admin" : "staff";

        setPreferredView(initial);
      }
    }
  }, [authUser?.role, pathname]);

  const initials = authUser?.fname && authUser?.lname
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  // If we're on /admin or /staff, that IS our current view.
  // If we're on /account, we use the preferredView state.
  const activeView = (pathname?.startsWith("/admin"))
    ? "admin"
    : (pathname?.startsWith("/staff"))
      ? "staff"
      : (preferredView || (isAdminRole(authUser?.role) ? "admin" : "staff"));

  const isAdminView = activeView === "admin";
  const hasAdminRights = isAdminRole(authUser?.role);

  const handleViewSwitch = (viewKey) => {
    if (hasAdminRights) {
      localStorage.setItem("pup_admin_view_pref", viewKey);
      setPreferredView(viewKey);
    }
    router.push(viewKey === "admin" ? "/admin" : "/staff");
  };

  const handleMainDashboardClick = () => {
    if (hasAdminRights) {
      router.push(activeView === "admin" ? "/admin" : "/staff");
    } else {
      router.push("/staff");
    }
  };

  useEffect(() => {
    // Sync logout across tabs
    const handleStorageChange = (e) => {
      if (e.key === "pup-logout") {
        setShowSessionExpired(true);
      }
      if (e.key === "pup-session-recovered") {
        setShowSessionExpired(false);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    // Warm common dashboard routes for faster view switching.
    router.prefetch("/staff");
    router.prefetch("/admin");
  }, [router]);

  const handleSessionExpiredRedirect = () => {
    setShowSessionExpired(false);
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm select-none">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group/logo active:scale-95 transition-transform select-none"
          onClick={handleMainDashboardClick}
          onDoubleClick={(e) => e.preventDefault()}
        >
          <i className="ph-bold ph-bank text-3xl text-pup-maroon transition-colors group-hover/logo:text-pup-darkMaroon"></i>
          <div className="leading-tight">
            <h1 className="font-bold text-xl text-pup-maroon tracking-tight transition-colors group-hover/logo:text-pup-darkMaroon">
              PUP E-MANAGE
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold group-hover/logo:text-gray-600 transition-colors">
              Student Record Keeping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>

        <div className="ml-4">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className={cn(
              "group flex items-center gap-3 rounded-brand border px-3 py-1.5 shadow-xs transition-all focus:outline-none",
              menuOpen 
                ? "border-pup-maroon bg-white ring-2 ring-red-50 shadow-sm" 
                : "border-gray-200 bg-white/90 hover:border-gray-300/40 hover:bg-red-50/30"
            )}>
              <div className={cn(
                "h-9 w-9 shrink-0 rounded-brand bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700 transition-colors",
                menuOpen && "bg-red-50 text-pup-maroon shadow-xs ring-1 ring-red-100"
              )}>
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[160px]">
                  {authUser?.fname} {authUser?.lname}
                </p>
                <p className={cn(
                  "text-[11px] font-medium text-gray-500 leading-tight transition-colors",
                  menuOpen && "text-pup-maroon/90"
                )}>
                  {authUser?.role || "User"}
                </p>
              </div>
              <i className={cn(
                "ph-bold ph-caret-down text-gray-400 text-xs transition-all duration-300 hidden sm:block",
                menuOpen && "rotate-180 text-pup-maroon"
              )}></i>
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
                  onClick={handleMainDashboardClick}
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
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors"
                  onClick={() => router.push("/account/activity")}
                >
                  <i className="ph-bold ph-clock-counter-clockwise text-lg text-gray-400"></i>
                  <span className="text-sm">Audit My Activity</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {hasAdminRights && (
                <>
                  <DropdownMenuSeparator className="opacity-50" />
                  <div className="px-2 py-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-2 mb-3">
                      Switch Role
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50">
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("admin")}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all cursor-pointer outline-none ${
                          isAdminView
                            ? "bg-red-50 text-red-900 shadow-md border border-red-200 ring-1 ring-red-100/20"
                            : "text-gray-400 hover:bg-white/50 hover:text-gray-600"
                        }`}
                      >
                        <i className={`ph-bold ph-shield-check text-xl ${isAdminView ? "text-red-600" : ""}`}></i>
                        <span className="text-[10px] font-black uppercase tracking-wider">Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("staff")}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg transition-all cursor-pointer outline-none ${
                          !isAdminView
                            ? "bg-yellow-50 text-yellow-900 shadow-md border border-yellow-200 ring-1 ring-yellow-100/20"
                            : "text-gray-400 hover:bg-white/50 hover:text-gray-600"
                        }`}
                      >
                        <i className={`ph-bold ph-users-three text-xl ${!isAdminView ? "text-yellow-600" : ""}`}></i>
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
                  className="cursor-pointer rounded-xl bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon !text-white hover:from-red-700 hover:to-red-900 hover:!text-white focus:from-red-700 focus:to-red-900 focus:!text-white focus:**:!text-white flex items-center justify-center gap-2 font-black py-2.5 px-3 transition-all active:scale-95 m-1 shadow-md"
                >
                  <i className="ph-bold ph-power text-lg !text-white"></i>
                  <span className="text-sm uppercase tracking-widest !text-white">Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Dialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <DialogContent className="max-w-md rounded-brand border-pup-border sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
              <i className="ph-fill ph-warning-circle text-amber-500"></i>
              Session Expired
            </DialogTitle>
            <DialogDescription className="font-medium text-gray-500 pt-2">
              You have been logged out from another tab. Please log in again to continue using the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              onClick={handleSessionExpiredRedirect}
              className="w-full bg-linear-to-b from-red-800 to-pup-maroon border-b-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 text-white font-black uppercase tracking-widest text-xs h-11 rounded-xl shadow-md transition-all active:scale-95"
            >
              Back to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
