"use client";

import { useEffect, useState, useRef } from "react";
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
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [authUser?.avatar_filename]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setStudentSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/students?q=${encodeURIComponent(searchQuery)}&includeArchived=true&limit=8`);
        const json = await res.json();
        if (res.ok && json.ok) {
          setStudentSuggestions(json.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    // Only admins/superadmins have a choice of view
    if (hasAdminRights) {
      const stored = localStorage.getItem("pup_admin_view_pref");
      const defaultView = isSuperAdmin ? "systemadmin" : (isAdmin ? "admin" : "staff");
      const target = stored || (pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin") ? "systemadmin" : (pathname?.startsWith("/admin") ? "admin" : "staff"));
      const timer = setTimeout(() => {
        setPreferredView(target);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [authUser?.role, pathname, hasAdminRights, isSuperAdmin, isAdmin]);

  const initials = authUser?.fname && authUser?.lname
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  // If we're on /systemadmin, /superadmin, /admin, or /staff, that IS our current view.
  // If we're on /account, we use the preferredView state.
  const activeView = (pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin"))
    ? "systemadmin"
    : (pathname?.startsWith("/admin"))
      ? "admin"
      : (pathname?.startsWith("/staff"))
        ? "staff"
        : (preferredView || (isSuperAdmin ? "systemadmin" : (isAdmin ? "admin" : "staff")));

  const isAdminView = activeView === "admin";

  const handleViewSwitch = (viewKey) => {
    localStorage.setItem("pup_admin_view_pref", viewKey);
    setPreferredView(viewKey);
    router.push(viewKey === "systemadmin" || viewKey === "superadmin" ? "/systemadmin" : (viewKey === "admin" ? "/admin" : "/staff"));
  };

  const handleMainDashboardClick = () => {
    if (isSuperAdmin) {
      router.push(activeView === "systemadmin" || activeView === "superadmin" ? "/systemadmin" : (activeView === "admin" ? "/admin" : "/staff"));
    } else if (hasAdminRights) {
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
    <header className="bg-white/35 backdrop-blur-md dark:bg-black/35 border-b border-gray-350 dark:border-white/10 flex-none z-20 select-none transition-all duration-normal shadow-[0_1px_8px_rgba(0,0,0,0.02)]" style={{ "--brand-accent": branding.color }}>
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-[6px]">
          <div 
            className="flex items-center gap-1 cursor-pointer group/logo select-none"
            onClick={handleMainDashboardClick}
            onDoubleClick={(e) => e.preventDefault()}
          >
            <img 
              src={branding.iconSrc}
              alt="eManage Logo" 
              className="h-8 w-8 object-contain"
            />
            <div className="flex items-center">
              <span className="font-semibold text-[26px] text-black dark:text-white tracking-tight transition-colors group-hover/logo:text-gray-850 dark:group-hover/logo:text-zinc-200 leading-none">
                eManage
              </span>
            </div>
          </div>
          <span 
            className="text-[26px] font-medium select-none leading-none tracking-tight transition-colors duration-300" 
            style={{ 
              color: branding.color
              }}
            >
              {
                String(authUser?.role || "").toLowerCase() === "systemadmin" || String(authUser?.role || "").toLowerCase() === "superadmin"
                  ? " System Administrator"
                  : String(authUser?.role || "").toLowerCase() === "admin" 
                    ? " Admin" 
                    : " Staff"
              }
            </span>
        </div>

        <div className="flex items-center gap-2">
          {children}
        </div>
        <div className="flex items-center gap-4">
          {/* Global Search Component */}
          {authUser && (
            <div ref={searchContainerRef} className="relative z-50">
              <div className="relative group w-64 md:w-80">
                <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-zinc-300"></i>
                <input
                  type="text"
                  placeholder="Search views or student cabinets..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    setFocusedIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    const viewSuggestions = (() => {
                      const list = [];
                      const q = searchQuery.toLowerCase();
                      if (activeView === "systemadmin") {
                        const views = [
                          { label: "Offices & Tenants", view: "offices" },
                          { label: "Module Config Matrix", view: "modules" },
                          { label: "Global Staff Directory", view: "staff" },
                          { label: "Platform Audit Trail", view: "logs" },
                          { label: "System Health", view: "health" }
                        ];
                        views.forEach(v => {
                          if (v.label.toLowerCase().includes(q)) list.push(v);
                        });
                      } else if (activeView === "admin") {
                        const views = [
                          { label: "Records Review", view: "review" },
                          { label: "Compliance Dashboard", view: "digitization" },
                          { label: "SLA Analytics & KPI", view: "request_analytics" },
                          { label: "Staff Directory", view: "directory" },
                          { label: "Storage Room Layout Editor", view: "storage_layout" },
                          { label: "System Configuration", view: "system_data" },
                          { label: "Backup Maintenance", view: "system" },
                          { label: "Audit Logs", view: "logs" }
                        ];
                        views.forEach(v => {
                          if (v.label.toLowerCase().includes(q)) list.push(v);
                        });
                      } else if (activeView === "staff") {
                        const views = [
                          { label: "Alumni Requests", view: "requests" },
                          { label: "Scan & Upload", view: "upload" },
                          { label: "Documents Matrix", view: "documents" },
                          { label: "Notifications", view: "notifications" },
                          { label: "Records Archive", view: "search" },
                          { label: "Physical Archive Explorer", view: "storage" }
                        ];
                        views.forEach(v => {
                          if (v.label.toLowerCase().includes(q)) list.push(v);
                        });
                      }
                      return list;
                    })();
                    const allSuggestions = [...viewSuggestions, ...studentSuggestions];

                    if (!showSuggestions || allSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setFocusedIndex(prev => (prev + 1) % allSuggestions.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setFocusedIndex(prev => (prev - 1 + allSuggestions.length) % allSuggestions.length);
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const targetItem = focusedIndex >= 0 && focusedIndex < allSuggestions.length ? allSuggestions[focusedIndex] : allSuggestions[0];
                      if (targetItem) {
                        setSearchQuery("");
                        setShowSuggestions(false);
                        setFocusedIndex(-1);
                        const studentNo = targetItem.student_no || targetItem.studentNo;
                        if (targetItem.view) {
                          window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: targetItem.view } }));
                        } else if (studentNo) {
                          if (pathname?.startsWith("/staff")) {
                            window.dispatchEvent(new CustomEvent("locate-student", { detail: { student: targetItem } }));
                          } else {
                            router.push(`/staff?view=storage&locate=${studentNo}`);
                          }
                        }
                      }
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setFocusedIndex(-1);
                    }
                  }}
                  className="w-full h-9 pl-9 pr-4 text-xs font-normal bg-gray-50/50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-pup-maroon/40 rounded-lg outline-none transition-all focus:ring-4 focus:ring-pup-maroon/5 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60 dark:focus:bg-zinc-900 dark:border-white/5 dark:text-zinc-200 dark:focus:border-white/20 dark:focus:ring-white/5"
                />
              </div>

              {showSuggestions && searchQuery.trim() && (() => {
                const viewSuggestions = (() => {
                  const list = [];
                  const q = searchQuery.toLowerCase();
                  if (activeView === "systemadmin") {
                    const views = [
                      { label: "Offices & Tenants", view: "offices" },
                      { label: "Module Config Matrix", view: "modules" },
                      { label: "Global Staff Directory", view: "staff" },
                      { label: "Platform Audit Trail", view: "logs" },
                      { label: "System Health", view: "health" }
                    ];
                    views.forEach(v => {
                      if (v.label.toLowerCase().includes(q)) list.push(v);
                    });
                  } else if (activeView === "admin") {
                    const views = [
                      { label: "Records Review", view: "review" },
                      { label: "Compliance Dashboard", view: "digitization" },
                      { label: "SLA Analytics & KPI", view: "request_analytics" },
                      { label: "Staff Directory", view: "directory" },
                      { label: "Storage Room Layout Editor", view: "storage_layout" },
                      { label: "System Configuration", view: "system_data" },
                      { label: "Backup Maintenance", view: "system" },
                      { label: "Audit Logs", view: "logs" }
                    ];
                    views.forEach(v => {
                      if (v.label.toLowerCase().includes(q)) list.push(v);
                    });
                  } else if (activeView === "staff") {
                    const views = [
                      { label: "Alumni Requests", view: "requests" },
                      { label: "Scan & Upload", view: "upload" },
                      { label: "Documents Matrix", view: "documents" },
                      { label: "Notifications", view: "notifications" },
                      { label: "Records Archive", view: "search" },
                      { label: "Physical Archive Explorer", view: "storage" }
                    ];
                    views.forEach(v => {
                      if (v.label.toLowerCase().includes(q)) list.push(v);
                    });
                  }
                  return list;
                })();

                const handleSelectSuggestion = (item) => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                  setFocusedIndex(-1);
                  const studentNo = item.student_no || item.studentNo;
                  if (item.view) {
                    window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: item.view } }));
                  } else if (studentNo) {
                    if (pathname?.startsWith("/staff")) {
                      window.dispatchEvent(new CustomEvent("locate-student", { detail: { student: item } }));
                    } else {
                      router.push(`/staff?view=storage&locate=${studentNo}`);
                    }
                  }
                };

                const allSuggestions = [...viewSuggestions, ...studentSuggestions];

                return (
                  <div className="absolute right-0 mt-1.5 w-[360px] max-h-[400px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-none animate-in fade-in slide-in-from-top-1 duration-150">
                    {viewSuggestions.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Pages & Views
                        </div>
                        {viewSuggestions.map((item, idx) => {
                          const globalIdx = idx;
                          const isFocused = focusedIndex === globalIdx;
                          return (
                            <button
                              key={item.view}
                              type="button"
                              onClick={() => handleSelectSuggestion(item)}
                              className={cn(
                                "w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border-0 outline-none",
                                isFocused 
                                  ? "bg-pup-maroon/5 text-pup-maroon dark:bg-white/10 dark:text-zinc-50" 
                                  : "text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                              )}
                            >
                              <i className="ti ti-layout-grid text-sm opacity-60"></i>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {studentSuggestions.length > 0 && (
                      <div>
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                          Students & Cabinet Location
                        </div>
                        {studentSuggestions.map((student, idx) => {
                          const globalIdx = viewSuggestions.length + idx;
                          const isFocused = focusedIndex === globalIdx;
                          const studentNo = student.student_no || student.studentNo;
                          return (
                            <button
                              key={studentNo || idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(student)}
                              className={cn(
                                "w-full text-left flex flex-col px-2.5 py-2 rounded-lg transition-colors cursor-pointer border-0 outline-none",
                                isFocused 
                                  ? "bg-pup-maroon/5 dark:bg-white/10" 
                                  : "hover:bg-gray-50 dark:hover:bg-white/5"
                              )}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={cn("text-xs font-semibold text-left", isFocused ? "text-pup-maroon dark:text-zinc-50" : "text-gray-900 dark:text-zinc-100")}>
                                  {student.name}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans text-right">
                                  {studentNo}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                                <i className="ti ti-building text-[11px]"></i>
                                <span>
                                  Room {student.room} · Cab {student.cabinet} · Drawer {student.drawer}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {allSuggestions.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-400 dark:text-zinc-500 font-medium">
                        No matching views or records found.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
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
                          <i className="ph-bold ph-user text-[18px] text-gray-400 dark:text-zinc-550" />
                        </div>
                      )}
                    </>
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
 
                  {isSuperAdmin && (
                    <>
                      {activeView !== "systemadmin" && activeView !== "superadmin" && (
                        <DropdownMenuItem
                          onClick={() => handleViewSwitch("systemadmin")}
                          className="cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-zinc-100 transition-colors outline-none"
                        >
                          <i className="ti ti-shield text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: ROLE_BRANDING.black.color }}></i>
                          <span>Switch to System Admin View</span>
                        </DropdownMenuItem>
                      )}
                      {activeView !== "admin" && (
                        <DropdownMenuItem
                          onClick={() => handleViewSwitch("admin")}
                          className="cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-zinc-100 transition-colors outline-none"
                        >
                          <i className="ti ti-shield-check text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: ROLE_BRANDING.red.color }}></i>
                          <span>Switch to Admin View</span>
                        </DropdownMenuItem>
                      )}
                      {activeView !== "staff" && (
                        <DropdownMenuItem
                          onClick={() => handleViewSwitch("staff")}
                          className="cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[15px] py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-zinc-100 transition-colors outline-none"
                        >
                          <i className="ti ti-users text-[19px] shrink-0 flex items-center justify-center h-[19px] w-[19px] leading-none" style={{ color: ROLE_BRANDING.yellow.color }}></i>
                          <span>Switch to Staff View</span>
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
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
