"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
import { isAdminRole, getRoleLabel, isSystemAdminRole, hasAdminPrivileges } from "@/lib/roleUtils";
import { getRoleBranding, ROLE_BRANDING } from "@/lib/roleBranding";
import { cn } from "@/lib/utils";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMac, setIsMac] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const commandInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform));
    }
  }, []);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [authUser?.avatar_filename]);

  // Global shortcut (Ctrl+K on Windows/Linux or Cmd+K on Mac) to toggle command palette modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => {
          if (!prev) {
            setSearchQuery("");
            setFocusedIndex(0);
          }
          return !prev;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus input when command modal opens
  useEffect(() => {
    if (commandOpen) {
      const timer = setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [commandOpen]);

  const isSuperAdmin = isSystemAdminRole(authUser?.role);
  const isAdmin = isAdminRole(authUser?.role);
  const hasAdminRights = hasAdminPrivileges(authUser?.role);
  const branding = getRoleBranding(authUser);

  useEffect(() => {
    document.documentElement.style.setProperty("--brand-accent", branding.color);
    document.documentElement.style.setProperty("--brand-foreground", branding.foreground);
    return () => {
      document.documentElement.style.removeProperty("--brand-accent");
      document.documentElement.style.removeProperty("--brand-foreground");
    };
  }, [branding.color, branding.foreground]);

  useEffect(() => {
    if (isSuperAdmin) {
      setPreferredView("systemadmin");
      return;
    }
    if (hasAdminRights) {
      const stored = localStorage.getItem("pup_admin_view_pref");
      const target = (stored === "admin" || stored === "staff") ? stored : (pathname?.startsWith("/admin") ? "admin" : "staff");
      const timer = setTimeout(() => {
        setPreferredView(target);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authUser?.role, pathname, hasAdminRights, isSuperAdmin, isAdmin]);

  const initials = authUser?.fname && authUser?.lname
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  const activeView = isSuperAdmin
    ? "systemadmin"
    : (pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin"))
      ? "systemadmin"
      : (pathname?.startsWith("/admin"))
        ? "admin"
        : (pathname?.startsWith("/staff"))
          ? "staff"
          : (preferredView || (isAdmin ? "admin" : "staff"));

  const handleViewSwitch = (viewKey) => {
    localStorage.setItem("pup_admin_view_pref", viewKey);
    setPreferredView(viewKey);
    router.push(viewKey === "systemadmin" || viewKey === "superadmin" ? "/systemadmin" : (viewKey === "admin" ? "/admin" : "/staff"));
  };

  const handleMainDashboardClick = () => {
    if (isSuperAdmin) {
      router.push("/systemadmin");
    } else if (hasAdminRights) {
      router.push(activeView === "admin" ? "/admin" : "/staff");
    } else {
      router.push("/staff");
    }
  };

  useEffect(() => {
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
    router.prefetch("/staff");
    router.prefetch("/admin");
    if (isSuperAdmin) router.prefetch("/systemadmin");
  }, [router, isSuperAdmin]);

  const handleSessionExpiredRedirect = () => {
    setShowSessionExpired(false);
    router.push("/");
  };

  const isSettingsActive = pathname === "/account";
  const isActivityActive = pathname === "/account/activity";

  // Dynamically reflect the current view role & accent color based on activeView
  const currentViewRole = (() => {
    if (isSuperAdmin || activeView === "systemadmin" || activeView === "superadmin") {
      return "System Administrator";
    }
    if (activeView === "admin") {
      return "Administrator";
    }
    if (activeView === "staff") {
      return "Staff";
    }
    return getRoleLabel(authUser?.role);
  })();

  const displayRole = isSuperAdmin ? "System Administrator" : currentViewRole;

  const currentViewColor = (() => {
    if (isSuperAdmin || activeView === "systemadmin" || activeView === "superadmin") {
      return ROLE_BRANDING.black.color;
    }
    if (activeView === "admin") {
      return ROLE_BRANDING.orange.color;
    }
    if (activeView === "staff") {
      return ROLE_BRANDING.yellow.color;
    }
    return authUser?.accent_color || ROLE_BRANDING.orange.color;
  })();

  const displayOfficeName = (() => {
    if (isSuperAdmin || activeView === "systemadmin" || activeView === "superadmin") {
      return "System";
    }
    return authUser?.office_name || (authUser?.office_id ? authUser.office_id.toUpperCase() : "Registrar");
  })();

  // ---------------------------------------------------------------------------
  // STRICTLY SCOPED COMMAND PALETTE (CURRENT VIEW'S SIDEBAR + USER ACCOUNT)
  // ---------------------------------------------------------------------------
  const { sidebarMatches, accountMatches, allSuggestions } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const enabledModules = new Set(authUser?.enabled_modules || []);
    const hasModuleFilter = Array.isArray(authUser?.enabled_modules) && authUser.enabled_modules.length > 0;

    // 1. Sidebar items specific to the active view
    let currentViewSidebarItems = [];

    if (activeView === "systemadmin") {
      currentViewSidebarItems = [
        { label: "Offices & Departments", view: "offices", icon: "ph-bold ph-buildings", keywords: "offices departments campus registry admin" },
        { label: "Module Config Matrix", view: "modules", icon: "ph-bold ph-squares-four", keywords: "matrix permissions feature flags modules config" },
        { label: "Global Staff Directory", view: "staff", icon: "ph-bold ph-users", keywords: "directory personnel users accounts staff global" },
        { label: "Platform Audit Trail", view: "logs", icon: "ph-bold ph-clock-counter-clockwise", keywords: "audit logs security platform activity" },
        { label: "System Health", view: "health", icon: "ph-bold ph-heartbeat", keywords: "status memory database health ping metrics" },
      ];
    } else if (activeView === "admin") {
      const allAdminTabs = [
        { label: "Records Review", view: "review", icon: "ph-bold ph-seal-check", module: "records_review", keywords: "approve decline pending documents review scans" },
        { label: "Compliance Dashboard", view: "digitization", icon: "ph-bold ph-chart-bar", module: "compliance_analytics", keywords: "metrics compliance digitization statistics kpi" },
        { label: "Requests Analytics", view: "request_analytics", icon: "ph-bold ph-trend-up", module: "request_analytics", keywords: "sla analytics turnaround duration requests" },
        { label: "Staff Directory", view: "directory", icon: "ph-bold ph-users", module: "staff_directory", keywords: "directory staff users personnel accounts" },
        { label: "Storage Room Layout Editor", view: "storage_layout", icon: "ph-bold ph-warehouse", module: "storage_layout", keywords: "room cabinet drawer layout 2d map archive physical" },
        { label: "System Configuration", view: "system_data", icon: "ph-bold ph-gear", module: "system_config", keywords: "courses sections doc types document types config" },
        { label: "Backup Maintenance", view: "system", icon: "ph-bold ph-database", module: "backup", keywords: "backup restore export encrypted snapshots" },
        { label: "Audit Logs", view: "logs", icon: "ph-bold ph-clock-counter-clockwise", module: "audit_logs", keywords: "audit trail history logs security" },
      ];
      currentViewSidebarItems = allAdminTabs.filter(item => !hasModuleFilter || !item.module || enabledModules.has(item.module));
    } else if (activeView === "staff") {
      const allStaffTabs = [
        { label: "Alumni Requests", view: "requests", icon: "ph-bold ph-tray-arrow-up", module: "alumni_requests", keywords: "alumni requests transcript diploma certification" },
        { label: "OSAS Monitoring", view: "osas_monitoring", icon: "ph-bold ph-student", module: "osas_monitoring", keywords: "osas student affairs proposals events monitoring" },
        { label: "Scan & Upload", view: "upload", icon: "ph-bold ph-scan", module: "scan_upload", keywords: "scan upload ocr document new ingest" },
        { label: "Documents Matrix", view: "documents", icon: "ph-bold ph-file-text", module: "documents", keywords: "documents student records files matrix" },
        { label: "Notifications", view: "notifications", icon: "ph-bold ph-bell", module: "notifications", keywords: "notifications alerts messages unread" },
        { label: "Records Archive", view: "search", icon: "ph-bold ph-archive-box", module: "records_archive", keywords: "records archive search students" },
        { label: "Storage Explorer", view: "storage", icon: "ph-bold ph-folder-open", module: "storage_explorer", keywords: "physical archive explorer room cabinet drawer storage" },
      ];
      currentViewSidebarItems = allStaffTabs.filter(item => !hasModuleFilter || !item.module || enabledModules.has(item.module));
    }

    const filteredSidebar = q
      ? currentViewSidebarItems.filter(item => `${item.label} ${item.keywords || ""}`.toLowerCase().includes(q))
      : currentViewSidebarItems;

    // 2. Account & Profile items (Always available for active session)
    const allAccountItems = [
      {
        label: "Account Settings",
        type: "account",
        url: "/account",
        icon: "ph-bold ph-gear",
        keywords: "account settings my profile password credentials preferences security totp",
      },
      {
        label: "My Activity",
        type: "account",
        url: "/account/activity",
        icon: "ph-bold ph-clock-counter-clockwise",
        keywords: "my activity history personal audit logs login sessions",
      },
      {
        label: "Sign Out",
        type: "account",
        action: "logout",
        icon: "ph-bold ph-sign-out",
        keywords: "sign out log out exit leave",
      }
    ];

    const filteredAccount = q
      ? allAccountItems.filter(item => `${item.label} ${item.keywords || ""}`.toLowerCase().includes(q))
      : allAccountItems;

    return {
      sidebarMatches: filteredSidebar,
      accountMatches: filteredAccount,
      allSuggestions: [...filteredSidebar, ...filteredAccount]
    };
  }, [searchQuery, activeView, authUser?.enabled_modules]);

  const handleSelectSuggestion = (item) => {
    setSearchQuery("");
    setCommandOpen(false);
    setFocusedIndex(0);

    if (item.view) {
      if (pathname === "/account" || pathname === "/account/activity") {
        const targetPath = activeView === "systemadmin" ? "/systemadmin" : (activeView === "admin" ? "/admin" : "/staff");
        router.push(`${targetPath}?view=${item.view}`);
      } else {
        window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: item.view } }));
      }
    } else if (item.url) {
      router.push(item.url);
    } else if (item.action === "logout") {
      if (onLogout) onLogout();
    }
  };

  const handleCommandKeyDown = (e) => {
    if (allSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % allSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + allSuggestions.length) % allSuggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetItem = allSuggestions[focusedIndex] || allSuggestions[0];
      if (targetItem) handleSelectSuggestion(targetItem);
    } else if (e.key === "Escape") {
      setCommandOpen(false);
    }
  };

  return (
    <header className="bg-white/75 backdrop-blur-xl dark:bg-zinc-950/75 border-b border-gray-200/80 dark:border-white/10 flex-none z-30 select-none transition-colors duration-200 shadow-[0_1px_6px_rgba(0,0,0,0.02)]">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 sm:px-6 h-[60px] flex items-center justify-between gap-3">
        
        {/* LEFT: Branding & Workspace Context Pill (Changes per active view) */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            className="flex items-center gap-2 cursor-pointer group/logo select-none"
            onClick={handleMainDashboardClick}
            onDoubleClick={(e) => e.preventDefault()}
          >
            <img 
              src={branding.iconSrc}
              alt="eManage Logo" 
              className="h-7 w-7 object-contain transition-transform group-hover/logo:scale-105" 
            />
            <span className="font-bold text-[19px] text-gray-900 dark:text-zinc-50 tracking-tight leading-none group-hover/logo:opacity-75 transition-opacity">
              eManage
            </span>
          </div>

          {authUser && (
            <>
              <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-zinc-800" />
              
              {/* Dynamic Scope & Current View Role Badge */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100/90 dark:bg-zinc-900 border border-gray-200/70 dark:border-white/10 text-gray-700 dark:text-zinc-300 shadow-2xs transition-all">
                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                  {displayOfficeName}
                </span>
                <span className="text-gray-300 dark:text-zinc-600">·</span>
                <span 
                  className="font-medium transition-colors duration-200"
                  style={{ color: currentViewColor }}
                >
                  {currentViewRole}
                </span>
              </div>
            </>
          )}
        </div>

        {/* CENTER: Command Palette Modal Trigger Button */}
        <div className="flex-1 flex items-center justify-center max-w-lg px-2">
          {children}
          {authUser && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFocusedIndex(0);
                setCommandOpen(true);
              }}
              className="group w-full max-w-sm h-9 pl-3 pr-2 flex items-center justify-between rounded-xl bg-gray-100/70 hover:bg-gray-100/90 dark:bg-zinc-900/60 dark:hover:bg-zinc-900/90 border border-gray-200/80 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer shadow-2xs select-none"
            >
              <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500">
                <i className="ph-bold ph-magnifying-glass text-xs transition-colors group-hover:text-pup-maroon dark:group-hover:text-red-400"></i>
                <span className="text-xs font-normal">Search views, actions...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 min-w-[46px] text-[9px] font-bold tracking-wider text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200/90 dark:border-zinc-700/90 rounded-md shadow-2xs leading-none">
                {isMac ? "⌘K" : "CTRL K"}
              </kbd>
            </button>
          )}
        </div>

        {/* RIGHT: User Profile Pill Trigger + Original Popover Design */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="focus:outline-none select-none">
              <div className={cn(
                "flex items-center gap-2 py-1 px-1.5 sm:pr-2.5 rounded-xl transition-all border border-transparent cursor-pointer",
                menuOpen 
                  ? "bg-gray-100 dark:bg-zinc-850 border-gray-200/80 dark:border-white/10 shadow-2xs" 
                  : "hover:bg-gray-100/70 dark:hover:bg-zinc-900"
              )}>
                <div className="relative h-8 w-8 rounded-lg bg-white dark:bg-zinc-850 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xs shrink-0">
                  {authUser?.avatar_filename && !imageError ? (
                    <>
                      <img 
                        src={`/api/account/avatar?id=${authUser.id}&t=${authUser.updated_at || Date.now()}`}
                        alt=""
                        className={cn("w-full h-full object-cover", imageLoaded ? "block" : "hidden")}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                      />
                      {!imageLoaded && (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-zinc-800 animate-pulse">
                          <i className="ph-bold ph-user text-[14px] text-gray-400 dark:text-zinc-550" />
                        </div>
                      )}
                    </>
                  ) : (
                    initials
                  )}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1.5 ring-white dark:ring-zinc-950 bg-emerald-500" />
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-[12px] font-semibold text-gray-800 dark:text-zinc-100 truncate max-w-[120px]">
                    {authUser?.fname ? `${authUser.fname} ${authUser?.lname || ""}`.trim() : "Account"}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                    {displayRole}
                  </span>
                </div>

                <i className="ph-bold ph-caret-down text-[10px] text-gray-400 dark:text-zinc-500 shrink-0 ml-0.5"></i>
              </div>
            </DropdownMenuTrigger>
            
            {/* Popover content matching the user's preferred previous popover design */}
            <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-2xl border border-gray-200 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 dark:border-white/10 dark:shadow-none">
               <div className="bg-gray-50 dark:bg-zinc-800/50 px-5 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col text-left">
                 <span className="font-bold text-[18px] text-gray-900 dark:text-zinc-50 leading-tight">
                   {authUser?.fname} {authUser?.lname}
                 </span>
                 <span className="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                   {authUser?.email || authUser?.username}
                 </span>
               </div>

               <DropdownMenuGroup className="p-1.5 flex flex-col gap-[2px]">
                  {(isSettingsActive || isActivityActive) && (
                     <DropdownMenuItem
                       className="cursor-pointer rounded-[8px] flex items-center gap-3 font-semibold text-[15px] py-2.5 px-3 text-pup-maroon hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors outline-none"
                       onClick={handleMainDashboardClick}
                     >
                       <i className="ti ti-layout-dashboard text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: branding.color }}></i>
                       <span>Return to Dashboard</span>
                     </DropdownMenuItem>
                   )}

                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 transition-colors outline-none",
                      isSettingsActive
                        ? "text-pup-maroon bg-gray-50 dark:bg-white/5 font-semibold"
                        : "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                    )}
                    onClick={() => router.push("/account")}
                  >
                    <i className="ti ti-settings text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: branding.color }}></i>
                    <span>Account Settings</span>
                  </DropdownMenuItem>
 
                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 transition-colors outline-none",
                      isActivityActive
                        ? "text-pup-maroon bg-gray-50 dark:bg-white/5 font-semibold"
                        : "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                    )}
                    onClick={() => router.push("/account/activity")}
                  >
                    <i className="ti ti-history text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: branding.color }}></i>
                    <span>My Activity</span>
                  </DropdownMenuItem>
 

                  {!isSuperAdmin && hasAdminRights && (
                    <DropdownMenuItem
                      onClick={() => handleViewSwitch(activeView === "admin" ? "staff" : "admin")}
                      className="cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-zinc-100 transition-colors outline-none"
                    >
                      <i className={cn(
                        "text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none",
                        activeView === "admin" ? "ti ti-users" : "ti ti-shield-check"
                      )}
                      style={{ color: activeView === "admin" ? ROLE_BRANDING.yellow.color : branding.color }}
                      ></i>
                      <span>{activeView === "admin" ? "Switch to Staff View" : "Switch to Admin View"}</span>
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

      {/* --------------------------------------------------------------------- */}
      {/* COMMAND PALETTE MODAL (SPOTLIGHT / RAYCAST / LINEAR STYLE)            */}
      {/* --------------------------------------------------------------------- */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent 
          hideClose={true}
          className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Top Search Input Section */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/80 dark:border-white/10">
            <i className="ph-bold ph-magnifying-glass text-lg text-pup-maroon dark:text-red-400 shrink-0"></i>
            <input
              ref={commandInputRef}
              type="text"
              placeholder="Type a sidebar view or action to navigate..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleCommandKeyDown}
              className="flex-1 bg-transparent border-0 outline-none text-[15px] font-normal text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFocusedIndex(0);
                  commandInputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 p-1 text-xs cursor-pointer"
              >
                <i className="ph-bold ph-x-circle text-base"></i>
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded select-none">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto p-2">
            {/* Sidebar Views Section */}
            {sidebarMatches.length > 0 && (
              <div className="mb-2">
                <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Sidebar Views</span>
                  <span className="font-medium text-[9px] text-gray-400 dark:text-zinc-500">
                    {activeView === "systemadmin" ? "System Admin" : (activeView === "admin" ? "Office Admin" : "Staff")}
                  </span>
                </div>
                {sidebarMatches.map((item, idx) => {
                  const isFocused = focusedIndex === idx;
                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        "w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border-0 outline-none",
                        isFocused 
                          ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-50 shadow-2xs" 
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100/70 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <i className={cn(item.icon, "text-[16px] opacity-80")}></i>
                        <span className="text-[13px]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFocused && (
                          <span className="text-[10px] font-semibold text-pup-maroon dark:text-zinc-400">
                            ↵ Select
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">
                          View
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Account & Profile Actions Section */}
            {accountMatches.length > 0 && (
              <div>
                <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                  Account & Actions
                </div>
                {accountMatches.map((item, idx) => {
                  const globalIdx = sidebarMatches.length + idx;
                  const isFocused = focusedIndex === globalIdx;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setFocusedIndex(globalIdx)}
                      className={cn(
                        "w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border-0 outline-none",
                        isFocused 
                          ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-50 shadow-2xs" 
                          : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100/70 dark:hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <i className={cn(item.icon, "text-[16px] opacity-80")}></i>
                        <span className="text-[13px]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isFocused && (
                          <span className="text-[10px] font-semibold text-pup-maroon dark:text-zinc-400">
                            ↵ Select
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">
                          Action
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {allSuggestions.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
                <i className="ph-duotone ph-magnifying-glass text-3xl mb-2 opacity-50"></i>
                <div className="text-sm font-medium">No matching views found</div>
                <div className="text-xs text-gray-400 mt-1">Try searching for a view name or account action</div>
              </div>
            )}
          </div>

          {/* Modal Footer with Keyboard Navigation Hints */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/90 dark:bg-zinc-850/70 border-t border-gray-200/80 dark:border-white/10 text-[11px] text-gray-500 dark:text-zinc-400 select-none">
            <div className="flex items-center gap-3.5">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">↵</kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">ESC</kbd>
                <span>close</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-gray-400 dark:text-zinc-500 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentViewColor }} />
              <span>{activeView === "systemadmin" ? "System Admin" : (activeView === "admin" ? "Office Admin" : "Staff")}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Expired Modal */}
      <Dialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 bg-white dark:bg-zinc-900 dark:border-white/10">
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
              className="w-full bg-pup-maroon hover:bg-pup-darkMaroon text-white font-bold text-xs h-10 shadow-sm cursor-pointer"
            >
              Back to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
