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
    <header className="bg-white border-b border-gray-300 flex-none z-20 shadow-sm select-none transition-colors duration-300 dark:border-white/5">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group/logo active:scale-95 transition-transform select-none"
          onClick={handleMainDashboardClick}
          onDoubleClick={(e) => e.preventDefault()}
        >
          <i className="ph-bold ph-bank text-3xl text-pup-maroon dark:text-primary transition-colors group-hover/logo:text-pup-darkMaroon dark:group-hover/logo:text-red-400"></i>
          <div className="leading-tight">
            <h1 className="font-bold text-xl text-pup-maroon dark:text-primary tracking-tight transition-colors group-hover/logo:text-pup-darkMaroon dark:group-hover/logo:text-red-400">
              PUP E-MANAGE
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest font-bold group-hover/logo:text-gray-600 transition-colors dark:text-zinc-500 dark:group-hover/logo:text-zinc-400">
              Student Record Keeping
            </p>
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
              <i className={cn(
                "ph-bold ph-caret-down text-gray-400 dark:text-zinc-500 text-xs transition-all duration-300 hidden sm:block",
                menuOpen && "rotate-180 text-pup-maroon dark:text-primary"
              )}></i>
            </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-80 rounded-xl border border-gray-200 shadow-2xl p-2 bg-white/98 backdrop-blur-md dark:bg-card dark:border-white/10 dark:shadow-none">
               <DropdownMenuGroup>
                 <div className="p-4 bg-gray-50/70 border-b border-gray-100 mb-2 dark:bg-white/5 dark:border-white/10 -mx-2 -mt-2 rounded-t-xl">
                   <div className="flex items-center gap-3">
                     <div className="h-12 w-12 shrink-0 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-base font-bold text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card">
                       {initials}
                     </div>
                     <div className="min-w-0">
                       <p className="text-sm font-black text-gray-900 truncate tracking-tight dark:text-zinc-50">
                         {authUser?.fname} {authUser?.lname}
                       </p>
                       <div className="flex items-center gap-1.5">
                         <span className={cn(
                           "text-[10px] font-bold px-1.5 py-0.5 rounded border  tracking-wider",
                           isAdminView 
                             ? "text-pup-maroon dark:text-primary bg-red-50 border-red-100 dark:bg-red-500/20 dark:border-red-500/30"
                             : "text-amber-700 dark:text-yellow-500 bg-amber-50 border-amber-200 dark:bg-yellow-500/20 dark:border-yellow-500/30"
                         )}>
                           {authUser?.role || "User"}
                         </span>
                       </div>
                       <p className="text-xs text-gray-500 truncate mt-0.5 font-medium dark:text-zinc-500">
                         {authUser?.email || authUser?.username}
                       </p>
                     </div>
                   </div>
                 </div>
               </DropdownMenuGroup>

              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  onClick={handleMainDashboardClick}
                >
                  <i className="ph-bold ph-house-line text-lg text-gray-400 dark:text-zinc-500"></i>
                  <span className="text-sm">Main Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  onClick={() => router.push("/account")}
                >
                  <i className="ph-bold ph-user-circle-gear text-lg text-gray-400 dark:text-zinc-500"></i>
                  <span className="text-sm">Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-3 font-bold py-2.5 px-3 transition-colors dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                  onClick={() => router.push("/account/activity")}
                >
                  <i className="ph-bold ph-clock-counter-clockwise text-lg text-gray-400 dark:text-zinc-500"></i>
                  <span className="text-sm">My Activity</span>
                  </DropdownMenuItem>              </DropdownMenuGroup>

              {hasAdminRights && (
                 <>
                   <div className="px-2 py-3">
                    <p className="text-[10px] font-black text-gray-400 tracking-[0.15em] px-2 mb-3 dark:text-zinc-500">
                      Switch Role
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1.5 rounded-lg border border-gray-200 dark:bg-white/5 dark:border-white/5">
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("admin")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 rounded-md transition-all cursor-pointer outline-none",
                          isAdminView 
                            ? "bg-red-50 text-red-900 shadow-md border border-red-200 ring-1 ring-red-100/20 dark:bg-red-500/20 dark:text-primary dark:border-red-500/30" 
                            : "text-gray-400 hover:bg-white hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
                        )}
                      >
                        <i className={cn(
                          "ph-bold ph-shield-check text-xl transition-colors",
                          isAdminView ? "text-red-600 dark:text-primary" : "text-gray-400 dark:text-zinc-500"
                        )}></i>
                        <span className="text-[10px] font-black tracking-wider">Admin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewSwitch("staff")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 py-3 rounded-md transition-all cursor-pointer outline-none",
                          !isAdminView 
                            ? "bg-yellow-50 text-yellow-900 shadow-md border border-yellow-200 ring-1 ring-yellow-100/20 dark:bg-yellow-500/20 dark:text-yellow-500 dark:border-yellow-500/30" 
                            : "text-gray-400 hover:bg-white hover:text-gray-600 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
                        )}
                      >
                        <i className={cn(
                          "ph-bold ph-users-three text-xl transition-colors",
                          !isAdminView ? "text-yellow-600 dark:text-yellow-500" : "text-gray-400 dark:text-zinc-500"
                        )}></i>
                        <span className="text-[10px] font-black tracking-wider">Staff</span>
                      </DropdownMenuItem>
                    </div>
                  </div>
                </>
              )}

              <DropdownMenuSeparator className="opacity-50" />
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  onClick={onLogout}
                  className="btn-brand-red rounded-lg !text-white hover:!text-white focus:!text-white focus:**:!text-white flex items-center justify-center gap-2 py-2.5 px-3 m-1 shadow-md"
                >
                  <i className="ph-bold ph-power text-lg !text-white"></i>
                  <span className="text-sm tracking-widest !text-white">Log out</span>
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

