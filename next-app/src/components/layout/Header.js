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
      const target = stored || (pathname?.startsWith("/admin") ? "admin" : "staff");
      const timer = setTimeout(() => {
        setPreferredView(target);
      }, 0);
      return () => clearTimeout(timer);
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

  const isDashboardActive = pathname === "/admin" || pathname === "/staff";
  const isSettingsActive = pathname === "/account";
  const isActivityActive = pathname === "/account/activity";

  return (
    <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm select-none transition-colors duration-300 dark:border-white/5">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group/logo active:scale-95 transition-transform select-none"
          onClick={handleMainDashboardClick}
          onDoubleClick={(e) => e.preventDefault()}
        >
          <img src="/icon.png" alt="E-Manage Logo" className="h-8 w-8 object-contain" />
          <div className="">
            <h1 className="font-semibold text-xl text-black dark:text-white tracking-tight transition-colors group-hover/logo:text-gray-850 dark:group-hover/logo:text-zinc-200">
              E-Manage
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className={cn(
              "group flex items-center gap-3 rounded-md border px-3 py-1.5 shadow-xs transition-all focus:outline-none",
              menuOpen 
                ? "border-pup-maroon dark:border-red-500 bg-white ring-2 ring-red-50 dark:ring-red-950/20 shadow-sm" 
                : "border-gray-200 dark:border-white/5 bg-white/90 hover:border-gray-300 dark:hover:border-white/10 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-white/10"
            )}>
              <div className={cn(
                "h-9 w-9 shrink-0 rounded-md bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors",
                menuOpen && "bg-red-50 dark:bg-red-950/30 text-pup-maroon dark:text-primary shadow-xs ring-1 ring-red-100 dark:ring-red-900/30"
              )}>
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[160px] dark:text-zinc-50">
                  {authUser?.fname} {authUser?.lname}
                </p>
                <p className={cn(
                  "text-[11px] font-medium text-gray-500 dark:text-zinc-500 leading-tight transition-colors",
                  menuOpen && "text-pup-maroon dark:text-red-400/90"
                )}>
                  {authUser?.role || "User"}
                </p>
              </div>
            </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-80 rounded-xl border border-gray-200 shadow-2xl p-2 bg-white/98 backdrop-blur-md dark:bg-card dark:border-white/10 dark:shadow-none">
               <DropdownMenuGroup>
                  <div className="p-3 bg-transparent mb-1">
                    <div className="min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-gray-900 truncate tracking-[-0.01em] dark:text-zinc-50">
                          {authUser?.fname} {authUser?.lname}
                        </p>
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] tracking-[0.04em] shrink-0 uppercase",
                          isAdminView 
                            ? "text-pup-maroon dark:text-primary bg-red-50 dark:bg-red-500/20"
                            : "text-amber-800 dark:text-yellow-500 bg-amber-50 dark:bg-yellow-500/20"
                        )}>
                          {authUser?.role || "User"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-[2px] font-normal">
                        {authUser?.email || authUser?.username}
                      </p>
                    </div>
                  </div>
               </DropdownMenuGroup>

              <DropdownMenuGroup className="p-1 flex flex-col gap-[2px]">
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer rounded-[8px] flex items-center gap-2 font-normal text-[13px] tracking-[-0.01em] py-2 px-3 transition-colors",
                    isDashboardActive 
                      ? "text-pup-maroon dark:text-primary hover:bg-transparent" 
                      : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  )}
                  onClick={handleMainDashboardClick}
                >
                  <i className={cn(
                    "ph-bold ph-house-line text-[16px] transition-colors",
                    isDashboardActive ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                  )}></i>
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer rounded-[8px] flex items-center gap-2 font-normal text-[13px] tracking-[-0.01em] py-2 px-3 transition-colors",
                    isSettingsActive 
                      ? "text-pup-maroon dark:text-primary hover:bg-transparent" 
                      : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  )}
                  onClick={() => router.push("/account")}
                >
                  <i className={cn(
                    "ph-bold ph-user-circle-gear text-[16px] transition-colors",
                    isSettingsActive ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                  )}></i>
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer rounded-[8px] flex items-center gap-2 font-normal text-[13px] tracking-[-0.01em] py-2 px-3 transition-colors",
                    isActivityActive 
                      ? "text-pup-maroon dark:text-primary hover:bg-transparent" 
                      : "text-gray-650 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  )}
                  onClick={() => router.push("/account/activity")}
                >
                  <i className={cn(
                    "ph-bold ph-clock-counter-clockwise text-[16px] transition-colors",
                    isActivityActive ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                  )}></i>
                  <span>Activity</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              {hasAdminRights && (
                 <>
                   <div className="px-2 py-3">
                    <p className="text-[10px] font-medium text-gray-400 tracking-[0.04em] uppercase px-2 mb-2 dark:text-zinc-500">
                      Switch Role
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("admin")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 rounded-[8px] transition-all cursor-pointer outline-none",
                          isAdminView 
                            ? "border-[1.5px] border-pup-maroon bg-red-50 text-pup-maroon dark:border-primary dark:bg-red-500/20 dark:text-primary" 
                            : "border-0 text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-white/5"
                        )}
                      >
                        <i className={cn(
                          "ph-bold ph-shield-check text-[16px] transition-colors",
                          isAdminView ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                        )}></i>
                        <span className="text-[11px] font-medium">Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("staff")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 rounded-[8px] transition-all cursor-pointer outline-none",
                          !isAdminView 
                            ? "border-[1.5px] border-pup-maroon bg-red-50 text-pup-maroon dark:border-primary dark:bg-red-500/20 dark:text-primary" 
                            : "border-0 text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-white/5"
                        )}
                      >
                        <i className={cn(
                          "ph-bold ph-users-three text-[16px] transition-colors",
                          !isAdminView ? "text-pup-maroon dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                        )}></i>
                        <span className="text-[11px] font-medium">Staff</span>
                      </DropdownMenuItem>
                    </div>
                  </div>
                </>
              )}

              <DropdownMenuSeparator className="opacity-50" />
              <DropdownMenuGroup className="p-1 mt-1">
                <DropdownMenuItem
                  onClick={onLogout}
                  className="w-full h-[36px] flex items-center justify-center btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] cursor-pointer text-white hover:text-white"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Dialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <DialogContent className="max-w-md rounded-brand border-pup-border bg-white sm:rounded-2xl dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2 dark:text-zinc-50">
              <i className="ph-fill ph-warning-circle text-amber-500"></i>
              Session Expired
            </DialogTitle>
            <DialogDescription className="font-medium text-gray-500 pt-2 dark:text-zinc-400">
              You have been logged out from another tab. Please log in again to continue using the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              onClick={handleSessionExpiredRedirect}
              className="w-full btn-brand-red border-b-4 text-xs h-11 shadow-md"
            >
              Back to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

