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
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [authUser?.avatar_filename]);

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
    <header className="bg-white/35 backdrop-blur-md dark:bg-black/35 border-b border-gray-350 dark:border-white/10 flex-none z-20 select-none transition-all duration-300 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          <div 
            className="flex items-center gap-1 cursor-pointer group/logo select-none"
            onClick={handleMainDashboardClick}
            onDoubleClick={(e) => e.preventDefault()}
          >
            <img src={(pathname?.startsWith("/account") ? hasAdminRights : isAdminView) ? "/admin-logo.png" : "/staff-logo.png"} alt="eManage Logo" className="h-8 w-8 object-contain" />
            <div className="flex items-center">
              <span className="font-semibold text-[26px] text-black dark:text-white tracking-tight transition-colors group-hover/logo:text-gray-850 dark:group-hover/logo:text-zinc-200 leading-none">
                eManage
              </span>
            </div>
          </div>
          <span 
            className="text-[26px] font-medium select-none leading-none tracking-tight transition-colors duration-300" 
            style={{ color: (authUser?.role || "Staff").toLowerCase() === "admin" ? "#e30000" : "#edbb00" }}
          >
            {authUser?.role || "Staff"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="focus:outline-none select-none">
              <div className={cn(
                "h-[52px] w-[52px] flex items-center justify-center rounded-[10px] transition-all",
                menuOpen 
                  ? "bg-gray-200/70 dark:bg-white/10" 
                  : "hover:bg-gray-100 dark:hover:bg-white/5"
              )}>
                <div className="h-[46px] w-[46px] rounded-full bg-white dark:bg-zinc-850 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 overflow-hidden">
                  {authUser?.avatar_filename && !imageError ? (
                    <img 
                      src={`/api/account/avatar?id=${authUser.id}&t=${authUser.updated_at || Date.now()}`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    initials
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-72 rounded-2xl border border-gray-200 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 dark:border-white/10 dark:shadow-none">
               <div className="bg-gray-50 dark:bg-zinc-800/50 px-5 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col text-left">
                 <span className="font-bold text-[18px] text-gray-900 dark:text-zinc-50 leading-tight">
                   {authUser?.fname} {authUser?.lname}
                 </span>
                 <span className="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                   {authUser?.email || authUser?.username}
                 </span>
               </div>

               <DropdownMenuGroup className="p-1.5 flex flex-col gap-[2px]">
                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 transition-colors outline-none",
                      isSettingsActive
                        ? "text-[#007AFF] bg-gray-50 dark:bg-white/5 font-semibold"
                        : "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                    )}
                    onClick={() => router.push("/account")}
                  >
                    <i className="ti ti-settings text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: "#0071eb" }}></i>
                    <span>Account Settings</span>
                  </DropdownMenuItem>
 
                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 transition-colors outline-none",
                      isActivityActive
                        ? "text-[#007AFF] bg-gray-50 dark:bg-white/5 font-semibold"
                        : "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                    )}
                    onClick={() => router.push("/account/activity")}
                  >
                    <i className="ti ti-history text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: "#03a10e" }}></i>
                    <span>My Activity</span>
                  </DropdownMenuItem>
 
                  {hasAdminRights && (
                    <DropdownMenuItem
                      onClick={() => handleViewSwitch(isAdminView ? "staff" : "admin")}
                      className="cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-zinc-100 transition-colors outline-none"
                    >
                      <i className={cn(
                        "text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none",
                        isAdminView ? "ti ti-users" : "ti ti-shield-check"
                      )}
                      style={{ color: isAdminView ? "#edbb00" : "#e30000" }}
                      ></i>
                      <span>{isAdminView ? "Switch to Staff View" : "Switch to Admin View"}</span>
                    </DropdownMenuItem>
                  )}
               </DropdownMenuGroup>

               <div className="border-t border-gray-100 dark:border-white/5 my-1 mx-1.5"></div>

               <DropdownMenuGroup className="p-1.5">
                 <DropdownMenuItem
                   onClick={onLogout}
                   className="cursor-pointer rounded-[8px] flex items-center gap-3 font-medium text-[15px] py-2.5 px-3 text-[#FF3B30] dark:text-[#FF453A] hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors outline-none"
                 >
                   <i className="ti ti-circle-x text-[19px] text-[#FF3B30] dark:text-[#FF453A] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none"></i>
                   <span>Sign Out</span>
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

