"use client";


import { EmptyState } from "@/components/ui/empty";
import { Search01Icon, UnfoldMoreIcon, DashboardSquare01Icon, LayoutLeftIcon, ListViewIcon, Logout01Icon, Settings01Icon, Time01Icon, UserIcon, VolumeHighIcon, VolumeMute01Icon, Home01Icon } from "hugeicons-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { getRoleBranding } from "@/lib/roleBranding";
import {
  isAdminRole,
  getOfficePrefix,
  getOfficeRoleLabel,
  isSystemAdminRole,
  hasAdminPrivileges,
  getDefaultHomeView,
} from "@/lib/roleUtils";
import {
  getHighContrastPreference,
  toggleHighContrastPreference,
  HIGH_CONTRAST_EVENT,
} from "@/lib/accessibility";
import {
  setSoundEnabledPreference,
} from "@/lib/soundPreferences";
import { useSoundPreferences } from "@/hooks/useSoundPreferences";
import { playSoundCue } from "@/lib/soundPatch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import AccountSetupModal from "@/components/shared/AccountSetupModal";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import AppIcon from "@/components/ui/app-icon";
import CommandPalette from "@/components/shared/CommandPalette";
// Icon map for navigation items
const ICON_MAP = {
  // Admin views
  review: { icon: " TaskDone01Icon" },
  digitization: { icon: " Analytics01Icon" },
  request_analytics: { icon: " ArrowUpRight01Icon" },
  directory: { icon: " UserSearch01Icon" },
  create: { icon: " UserAdd01Icon" },
  storage_layout: { icon: " WarehouseIcon" },
  system_data: { icon: " Settings01Icon" },
  system: { icon: " DatabaseIcon" },
  logs: { icon: " Time01Icon" },
  offices: { icon: " Building03Icon" },
  modules: { icon: " LayoutGridIcon" },
  standards: { icon: " HourglassIcon" },
  staff: { icon: " UserSearch01Icon" },
  security: { icon: " Shield01Icon" },
  health: { icon: " Activity01Icon" },
  backups: { icon: " DatabaseIcon" },
  landing: { icon: " DashboardSquare01Icon" },

  // Staff views
  requests: { icon: " ArrowUpRight01Icon" },
  odrs: { icon: " File02Icon" },
  compliance: { icon: " CheckListIcon" },
  osas: { icon: " SchoolIcon" },
  osas_monitoring: { icon: " SchoolIcon" },
  upload: { icon: " FingerPrintScanIcon" },
  batch_review: { icon: " Task01Icon" },
  documents: { icon: " File02Icon" },
  notifications: { icon: " Notification01Icon" },
  search: { icon: " Archive01Icon" },
  storage: { icon: " FolderOpenIcon" },
  students: { icon: " UserSearch01Icon" },
  organizations: { icon: " Building01Icon" },
  overview: { icon: " LayoutGridIcon" },
};

import {
  SIDEBAR_MORPH_TRANSITION,
  LABEL_ENTER_TRANSITION,
  LABEL_EXIT_TRANSITION,
  SPRING_LAYOUT,
  SPRING_PRESS,
  useAppReducedMotion,
} from "@/lib/motion";

export default function Sidebar({
  open = true,
  items = [],
  activeKey,
  onSelect,
  onLogout,
  zoomNode,
  setZoomNode,
  handleZoomMouseDown,
  accentColor,
  officeName,
  authUser,
  bottomContent,
  children,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarRef = useRef(null);
  const shouldReduceMotion = useAppReducedMotion(authUser?.id);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoveredKey, setHoveredKey] = useState(null);

  const [isMac] = useState(() =>
    typeof window !== "undefined"
      ? /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform)
      : false
  );

  const [currentAvatarFilename, setCurrentAvatarFilename] = useState(
    authUser?.avatar_filename || null
  );
  const [avatarTimestamp, setAvatarTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentAvatarFilename(authUser?.avatar_filename || null);
      setAvatarTimestamp(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, [authUser?.avatar_filename, authUser?.updated_at]);

  useEffect(() => {
    const handleAvatarChanged = (e) => {
      if (e?.detail && "avatar_filename" in e.detail) {
        setCurrentAvatarFilename(e.detail.avatar_filename);
      }
      setAvatarTimestamp(Date.now());
      setImageError(false);
      setImageLoaded(false);
    };
    window.addEventListener("avatar-changed", handleAvatarChanged);
    return () => window.removeEventListener("avatar-changed", handleAvatarChanged);
  }, []);

  const [displayNameFormat, setDisplayNameFormat] = useState(
    authUser?.preferences?.display_name_format || "full_name"
  );

  useEffect(() => {
    if (authUser?.preferences?.display_name_format) {
      setDisplayNameFormat(authUser.preferences.display_name_format);
    }
  }, [authUser?.preferences?.display_name_format]);

  useEffect(() => {
    const handleNameFormatChanged = (e) => {
      const nextFmt = e?.detail?.format || e?.detail?.preferences?.display_name_format;
      if (nextFmt) {
        setDisplayNameFormat(nextFmt);
      }
    };
    window.addEventListener("display-name-format-changed", handleNameFormatChanged);
    window.addEventListener("user-preferences-changed", handleNameFormatChanged);
    return () => {
      window.removeEventListener("display-name-format-changed", handleNameFormatChanged);
      window.removeEventListener("user-preferences-changed", handleNameFormatChanged);
    };
  }, []);

  // Global shortcuts: (Cmd+B / Ctrl+B for sidebar toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // External trigger for command palette
  useEffect(() => {
    const handleOpenCommand = () => {
      setCommandOpen(true);
    };
    window.addEventListener("open-command-palette", handleOpenCommand);
    return () => window.removeEventListener("open-command-palette", handleOpenCommand);
  }, []);

  // Session & contrast listeners
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHighContrast(getHighContrastPreference(authUser?.id));
    }, 0);

    const handleStorageChange = (e) => {
      if (e.key === "pup-logout") {
        setShowSessionExpired(true);
      }
      if (e.key === "pup-session-recovered") {
        setShowSessionExpired(false);
      }
      if (!e.key || e.key === "pup_high_contrast" || e.key.startsWith("pup_high_contrast_")) {
        setIsHighContrast(getHighContrastPreference(authUser?.id));
      }
    };

    const handleCustomChange = (e) => {
      if (typeof e.detail?.enabled === "boolean") {
        setIsHighContrast(e.detail.enabled);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(HIGH_CONTRAST_EVENT, handleCustomChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(HIGH_CONTRAST_EVENT, handleCustomChange);
    };
  }, [authUser?.id]);

  const isSuperAdmin = isSystemAdminRole(authUser?.role);
  const isStudent = String(authUser?.role || "").toLowerCase() === "student";
  const isAdmin = isAdminRole(authUser?.role);
  const hasAdminRights = hasAdminPrivileges(authUser?.role);
  const isStaff =
    pathname?.startsWith("/staff") ||
    items.some((item) =>
      ["requests", "upload", "documents", "notifications", "search"].includes(item.key)
    );

  const { enabled: soundEnabled } = useSoundPreferences(authUser?.id || null);

  const handleToggleSoundFromMenu = useCallback(
    async (e) => {
      e?.preventDefault?.();
      const next = !soundEnabled;
      setSoundEnabledPreference(next, authUser?.id || null);
      if (next) {
        playSoundCue({ sound: "swoosh" }, { force: true, userId: authUser?.id || null });
      }
      try {
        const res = await fetch("/api/auth/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: { sound_enabled: next } }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to save preference");
      } catch {
        setSoundEnabledPreference(!next, authUser?.id || null);
      }
    },
    [soundEnabled, authUser?.id]
  );

  // Play gentle chime on incoming live notification increases (skipping initial backlog and coalescing bursts)
  const prevNotificationBadgeRef = useRef(null);
  const lastNotificationSoundAtRef = useRef(0);
  const notificationBadgeCount = useMemo(() => {
    const notifItem = Array.isArray(items)
      ? items.find((it) => it && it.key === "notifications")
      : null;
    const raw = notifItem?.badge;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  }, [items]);

  useEffect(() => {
    if (!authUser?.id) {
      prevNotificationBadgeRef.current = null;
      return;
    }
    if (prevNotificationBadgeRef.current === null) {
      prevNotificationBadgeRef.current = notificationBadgeCount;
      return;
    }
    const prev = prevNotificationBadgeRef.current;
    prevNotificationBadgeRef.current = notificationBadgeCount;
    if (notificationBadgeCount > prev) {
      const now = Date.now();
      if (now - lastNotificationSoundAtRef.current >= 4000) {
        lastNotificationSoundAtRef.current = now;
        playSoundCue({ sound: "notification" }, { userId: authUser.id });
      }
    }
  }, [notificationBadgeCount, authUser?.id]);

  const roleBranding = getRoleBranding(
    authUser || {
      role: isSuperAdmin ? "SuperAdmin" : isStaff ? "Staff" : "Admin",
      officeName,
      accent_color: accentColor,
    }
  );

  const defaultColor = isSuperAdmin
    ? "#0F172A"
    : roleBranding.color || (isStaff ? "#ffcb00" : "#ff9b11");
  const activeColor = accentColor || roleBranding.color || defaultColor;
  const activeForeground =
    (accentColor && accentColor !== roleBranding.color ? "#FFFFFF" : roleBranding.foreground) ||
    "#FFFFFF";
  const staffIconColor = isSuperAdmin ? `var(--systemadmin-nav-icon, ${activeColor})` : activeColor;

  useEffect(() => {
    if (roleBranding?.color) {
      document.documentElement.style.setProperty("--brand-accent", roleBranding.color);
      document.documentElement.style.setProperty(
        "--brand-foreground",
        roleBranding.foreground || "#ffffff"
      );
    }
  }, [roleBranding?.color, roleBranding?.foreground]);

  const cleanFirst =
    authUser?.fname && !authUser.fname.startsWith("enc:v1:") ? authUser.fname.trim() : "";
  const cleanLast =
    authUser?.lname && !authUser.lname.startsWith("enc:v1:") ? authUser.lname.trim() : "";
  const cleanName =
    authUser?.name && !authUser.name.startsWith("enc:v1:") ? authUser.name.trim() : "";
  const cleanEmail =
    authUser?.email && !authUser.email.startsWith("enc:v1:") ? authUser.email.trim() : "";
  const cleanUsername =
    authUser?.username && !authUser.username.startsWith("enc:v1:") ? authUser.username.trim() : "";

  const displayName = (() => {
    const fmt = displayNameFormat || authUser?.preferences?.display_name_format;
    if (cleanFirst && cleanLast) {
      if (fmt === "first_only") return cleanFirst;
      if (fmt === "last_only") return cleanLast;
      if (fmt === "last_first") return `${cleanLast}, ${cleanFirst}`;
      return `${cleanFirst} ${cleanLast}`;
    }
    const fromParts = [cleanFirst, cleanLast].filter(Boolean).join(" ").trim();
    if (fromParts) return fromParts;
    if (cleanName) return cleanName;
    if (cleanEmail) return cleanEmail;
    if (cleanUsername) return cleanUsername;
    if (authUser?.student_no) return authUser.student_no;
    return isStudent ? "Student" : "Account";
  })();

  const initials = (() => {
    if (cleanFirst && cleanLast) {
      return (cleanFirst[0] + cleanLast[0]).toUpperCase();
    }
    if (cleanFirst) {
      return cleanFirst.slice(0, 2).toUpperCase();
    }
    if (cleanName) {
      const parts = cleanName.split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return cleanName.slice(0, 2).toUpperCase();
    }
    if (cleanEmail) {
      return cleanEmail.slice(0, 2).toUpperCase();
    }
    return isStudent ? "ST" : "AD";
  })();

  const activeView = isSuperAdmin
    ? "systemadmin"
    : pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin")
      ? "systemadmin"
      : pathname?.startsWith("/admin")
        ? "admin"
        : pathname?.startsWith("/staff")
          ? "staff"
          : isStudent
            ? "student"
            : preferredView || (isAdmin ? "admin" : "staff");

  const currentViewRole = (() => {
    if (isStudent) return "Student";
    if (isSuperAdmin || activeView === "systemadmin" || activeView === "superadmin") {
      return "System Administrator";
    }
    if (activeView === "admin") {
      return authUser?.office_short_name || authUser?.office_id
        ? `${getOfficePrefix(authUser)} Admin`
        : "Administrator";
    }
    if (activeView === "staff") {
      return authUser?.office_short_name || authUser?.office_id
        ? `${getOfficePrefix(authUser)} Staff`
        : "Staff";
    }
    return getOfficeRoleLabel(authUser?.role, authUser);
  })();

  const displayRole = isSuperAdmin ? "System Administrator" : currentViewRole;

  const defaultHome = useMemo(() => {
    return getDefaultHomeView(authUser, activeView);
  }, [authUser, activeView]);

  const handleMainDashboardClick = () => {
    const onDashboard = ["/student", "/staff", "/admin", "/systemadmin"].some(
      (p) => pathname?.startsWith(p)
    );
    const onSamePortal = pathname?.startsWith(defaultHome.basePath);

    setCurrentTab(defaultHome.view);

    if (onDashboard && onSamePortal) {
      window.dispatchEvent(
        new CustomEvent("switch-view", {
          detail: { view: defaultHome.view },
        })
      );
      router.push(defaultHome.path, { scroll: false });
    } else {
      router.push(defaultHome.path);
    }
  };

  const handleViewSwitch = (viewKey) => {
    localStorage.setItem("pup_admin_view_pref", viewKey);
    setPreferredView(viewKey);
    router.push(
      viewKey === "systemadmin" || viewKey === "superadmin"
        ? "/systemadmin"
        : viewKey === "admin"
          ? "/admin"
          : "/staff"
    );
  };

  const handleLogoutAction = useCallback(() => {
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#800000");
      document.documentElement.style.setProperty("--brand-foreground", "#ffffff");
      document.documentElement.removeAttribute("data-brand-accent");
      document.documentElement.removeAttribute("data-brand-foreground");
    }
    if (onLogout) {
      onLogout();
      return;
    }
    fetch("/api/auth/logout", { method: "POST" }).catch(() => { });
    if (typeof window !== "undefined") {
      localStorage.setItem("pup-logout", Date.now().toString());
      window.location.href = "/login";
    }
  }, [onLogout]);

  const handleSessionExpiredRedirect = useCallback(() => {
    setShowSessionExpired(false);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }, []);

  const isSettingsActive =
    (searchParams?.get("view") === "settings" &&
      ["/student", "/staff", "/admin", "/systemadmin"].some((p) => pathname?.startsWith(p))) ||
    pathname === "/account";
  const isActivityActive =
    (searchParams?.get("view") === "activity" &&
      ["/student", "/staff", "/admin", "/systemadmin"].some((p) => pathname?.startsWith(p))) ||
    (pathname === "/account" && searchParams?.get("tab") === "activity");

  const openMyActivity = () => {
    const onDashboard = ["/student", "/staff", "/admin", "/systemadmin"].some(
      (p) => pathname?.startsWith(p)
    );
    if (onDashboard) {
      window.dispatchEvent(
        new CustomEvent("switch-view", {
          detail: { view: "activity" },
        })
      );
      return;
    }
    const dashboardBase = isStudent
      ? "/student"
      : activeView === "systemadmin"
        ? "/systemadmin"
        : activeView === "admin"
          ? "/admin"
          : "/staff";
    router.push(`${dashboardBase}?view=activity`, { scroll: false });
  };

  const openAccountSettings = () => {
    const onDashboard = ["/student", "/staff", "/admin", "/systemadmin"].some(
      (p) => pathname?.startsWith(p)
    );
    if (onDashboard) {
      window.dispatchEvent(
        new CustomEvent("switch-view", {
          detail: { view: "settings" },
        })
      );
      return;
    }
    const dashboardBase = isStudent
      ? "/student"
      : activeView === "systemadmin"
        ? "/systemadmin"
        : activeView === "admin"
          ? "/admin"
          : "/staff";
    router.push(`${dashboardBase}?view=settings`, { scroll: false });
  };

  // Accordion state management
  const [expandedKeys, setExpandedKeys] = useState(() => {
    const initial = {};
    items.forEach((item) => {
      if (item.type === "accordion" && item.children?.some((c) => c.key === activeKey)) {
        initial[item.key] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    items.forEach((item) => {
      if (item.type === "accordion" && item.children?.some((c) => c.key === activeKey)) {
        setExpandedKeys((prev) => {
          if (prev[item.key]) return prev;
          return { ...prev, [item.key]: true };
        });
      }
    });
  }, [activeKey, items]);

  const toggleAccordion = (key) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLinkClick = (e, key) => {
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (onSelect) {
        onSelect(key);
      }
    }
  };

  // Track active tab view for command palette
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("view") || "";
    }
    return "";
  });

  useEffect(() => {
    const handleSwitch = (e) => {
      if (e.detail?.view) {
        setCurrentTab(e.detail.view);
      }
    };
    window.addEventListener("switch-view", handleSwitch);
    return () => window.removeEventListener("switch-view", handleSwitch);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const v = new URLSearchParams(window.location.search).get("view");
        if (v) setCurrentTab(v);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, commandOpen]);

  const defaultTab = defaultHome.view;
  const activeTabKey = currentTab || defaultTab;

  const isAtDefaultHome = useMemo(() => {
    if (pathname === "/account" || isSettingsActive || isActivityActive) {
      return false;
    }
    const onBasePath = pathname?.startsWith(defaultHome.basePath);
    if (!onBasePath) {
      return false;
    }
    return (activeKey || activeTabKey) === defaultHome.view;
  }, [pathname, isSettingsActive, isActivityActive, defaultHome, activeKey, activeTabKey]);

  // Structured Navigation items for Mobile Drawer
  const filteredGroups = useMemo(() => {
    const enabledModules = new Set(authUser?.enabled_modules || []);
    const hasModuleFilter =
      Array.isArray(authUser?.enabled_modules) && authUser.enabled_modules.length > 0;

    let candidateGroups = [];

    if (activeView === "systemadmin") {
      candidateGroups = [
        {
          id: "sys_ops",
          title: "Campus Operations",
          badge: "System Admin",
          items: [
            {
              label: "Campus Operations",
              view: "health",
              icon: " Activity01Icon",
              breadcrumb: "Campus Operations • View",
              keywords:
                "campus operations system health telemetry status memory database ping metrics activity monitoring registrar queue osas proposals transactions live operations",
            },
            {
              label: "Processing Time Standards",
              view: "standards",
              icon: " HourglassIcon",
              breadcrumb: "Campus Operations • View",
              keywords:
                "service standards sla citizen charter arta ra 11032 turnaround time processing benchmark deadlines commitments fast-track university standard",
            },
          ],
        },
        {
          id: "sys_gov",
          title: "Institutional Governance",
          badge: "System Admin",
          items: [
            {
              label: "Departments & Stations",
              view: "offices",
              icon: " Building01Icon",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "offices departments stations campus registry osas admissions library accounting admin governance units colleges add department new office",
            },
            {
              label: "Department Features",
              view: "modules",
              icon: " LayoutGridIcon",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "features matrix permissions feature flags modules config toggle access roles supervisor staff tools category registrar osas",
            },
          ],
        },
        {
          id: "sys_portal",
          title: "Public Portal & Identity",
          badge: "System Admin",
          items: [
            {
              label: "Institutional Identity",
              view: "branding",
              icon: " Certificate01Icon",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "institutional identity branding logo seal university school credentials jurisdiction prefix name color pdf header letterhead institution identity accent white label report style",
            },
            {
              label: "Landing Page CMS",
              view: "landing",
              icon: " DashboardSquare01Icon",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "landing page cms public portal content website builder customization homepage portal editor",
            },
            {
              label: "Landing CMS: Hero Section",
              view: "landing",
              section: "hero",
              icon: " Image01Icon",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms hero section banner headline slides background photos rotation",
            },
            {
              label: "Landing CMS: Workflow & Steps",
              view: "landing",
              section: "workflow",
              icon: " GitMergeIcon",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms workflow steps how it works pipeline guide process",
            },
            {
              label: "Landing CMS: Academic Catalog",
              view: "landing",
              section: "catalog",
              icon: " LibraryIcon",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms academic catalog courses degrees document types requirements",
            },
            {
              label: "Landing CMS: FAQ Section",
              view: "landing",
              section: "faq",
              icon: " HelpCircleIcon",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms faq accordion questions answers help support common inquiries",
            },
            {
              label: "Landing CMS: Institutional Footer",
              view: "landing",
              section: "footer",
              icon: " LayoutBottomIcon",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms footer credentials address contact copyright socials links",
            },
          ],
        },
        {
          id: "sys_access",
          title: "Personnel & Access",
          badge: "System Admin",
          items: [
            {
              label: "Global Directory",
              view: "staff",
              icon: " UserSearch01Icon",
              breadcrumb: "Personnel & Access • View",
              keywords:
                "directory personnel users accounts staff global roles administrators employees add user invite staff",
            },
            {
              label: "Security Questions",
              view: "security",
              icon: " Shield01Icon",
              breadcrumb: "Personnel & Access • View",
              keywords:
                "security questions password reset recovery verification questions authentication default security questions",
            },
          ],
        },
        {
          id: "sys_system",
          title: "System & Security",
          badge: "System Admin",
          items: [
            {
              label: "Platform Activity History",
              view: "logs",
              icon: " Time01Icon",
              breadcrumb: "System & Security • View",
              keywords:
                "audit logs security platform activity history transactions compliance events logs export audit trail",
            },
            {
              label: "Platform Backups",
              view: "backups",
              icon: " CloudUploadIcon",
              breadcrumb: "System & Security • View",
              keywords:
                "platform backups database snapshots postgres dump restore export recovery archive maintenance automated schedule cloud backup restore download",
            },
          ],
        },
      ];
    } else if (activeView === "admin") {
      const allAdminGroups = [
        {
          id: "adm_verification",
          title: "Records & Verification",
          badge: "Office Admin",
          items: [
            {
              label: "Records Review",
              view: "review",
              icon: " CheckmarkBadge01Icon",
              module: "records_review",
              breadcrumb: "Records & Verification • View",
              keywords:
                "approve decline pending documents review scans verify verification records review queue",
            },
            {
              label: "Compliance Analytics",
              view: "digitization",
              icon: " Analytics01Icon",
              module: "compliance_analytics",
              breadcrumb: "Records & Verification • View",
              keywords:
                "metrics compliance digitization statistics kpi analytics progress monitoring",
            },
          ],
        },
        {
          id: "adm_ops",
          title: "Operations & Fulfillment",
          badge: "Office Admin",
          items: [
            {
              label: "SLA Analytics",
              view: "request_analytics",
              icon: " Analytics01Icon",
              module: "request_analytics",
              breadcrumb: "Operations & Fulfillment • View",
              keywords:
                "sla analytics turnaround duration requests fulfillment speed document requests",
            },
            {
              label: "Storage Room Layout",
              view: "storage_layout",
              icon: " WarehouseIcon",
              module: "storage_layout",
              breadcrumb: "Operations & Fulfillment • View",
              keywords:
                "storage room cabinet drawer layout 2d map archive physical locator storage editor",
            },
          ],
        },
        {
          id: "adm_governance",
          title: "Personnel & Governance",
          badge: "Office Admin",
          items: [
            {
              label: "Staff Directory",
              view: "directory",
              icon: " UserSearch01Icon",
              module: "staff_directory",
              breadcrumb: "Personnel & Governance • View",
              keywords:
                "directory staff users personnel accounts team members roles active inactive",
            },
            {
              label: "Activity History",
              view: "logs",
              icon: " Time01Icon",
              module: "audit_logs",
              breadcrumb: "Personnel & Governance • View",
              keywords:
                "audit trail history logs security compliance user activity events",
            },
          ],
        },
        {
          id: "adm_system",
          title: "System & Maintenance",
          badge: "Office Admin",
          items: [
            {
              label: "System Configuration",
              view: "system_data",
              icon: " Settings01Icon",
              module: "system_config",
              breadcrumb: "System & Maintenance • View",
              keywords:
                "courses sections doc types document types config system data institutional",
            },
            {
              label: "Backup & Recovery",
              view: "system",
              icon: " CloudUploadIcon",
              module: "backup",
              breadcrumb: "System & Maintenance • View",
              keywords:
                "backup maintenance database restore export encrypted snapshots recovery snapshots",
            },
          ],
        },
      ];

      candidateGroups = allAdminGroups
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) => !hasModuleFilter || !item.module || enabledModules.has(item.module)
          ),
        }))
        .filter((group) => group.items.length > 0);
    } else if (activeView === "staff") {
      const allStaffGroups = [
        {
          id: "stf_requests",
          title: "Service & Requests",
          badge: "Staff",
          items: [
            {
              label: "Document Requests",
              view: "requests",
              icon: " FileUploadIcon",
              module: "document_requests",
              breadcrumb: "Service & Requests • View",
              keywords:
                "document requests odrs transcript diploma certification operations processing client requests",
            },
            {
              label: "OSAS Monitoring",
              view: "osas_monitoring",
              icon: " StudentIcon",
              module: "osas_monitoring",
              breadcrumb: "Service & Requests • View",
              keywords:
                "osas student affairs proposals events monitoring activities organizations student submissions",
            },
          ],
        },
        {
          id: "stf_ingest",
          title: "Scanning & Document Upload",
          badge: "Staff",
          items: [
            {
              label: "Scan & Upload",
              view: "upload",
              icon: " FingerPrintScanIcon",
              module: "scan_upload",
              breadcrumb: "Scanning & Document Upload • View",
              keywords:
                "scan upload ocr document new ingest single upload file scanner digitization",
            },
            {
              label: "Batch Review",
              view: "batch_review",
              icon: " Task01Icon",
              module: "scan_upload",
              breadcrumb: "Scanning & Document Upload • View",
              keywords:
                "batch review scan queue bulk verification inspect documents approve decline scans",
            },
          ],
        },
        {
          id: "stf_roster",
          title: "Student & Organization Roster",
          badge: "Staff",
          items: [
            {
              label: "Student Directory",
              view: "students",
              icon: " UserSearch01Icon",
              module: "student_directory",
              breadcrumb: "Student & Organization Roster • View",
              keywords:
                "student directory students profiles records directory list search archive",
            },
            {
              label: "Student Organizations",
              view: "organizations",
              icon: " Building01Icon",
              module: "student_organizations",
              breadcrumb: "Student & Organization Roster • View",
              keywords:
                "student organizations osas cbl bylaws officers authorized student leaders roster accreditation",
            },
          ],
        },
        {
          id: "stf_archive",
          title: "Archive & Storage",
          badge: "Staff",
          items: [
            {
              label: "Records & Archive",
              view: "search",
              icon: " Archive01Icon",
              module: "records_archive",
              breadcrumb: "Archive & Storage • View",
              keywords:
                "records archive search students repository files folders year levels browse files",
            },
            {
              label: "Storage Explorer",
              view: "storage",
              icon: " FolderOpenIcon",
              module: "storage_explorer",
              breadcrumb: "Archive & Storage • View",
              keywords:
                "physical archive explorer room cabinet drawer storage 2d locator map locator",
            },
          ],
        },
        {
          id: "stf_records",
          title: "Records & Communications",
          badge: "Staff",
          items: [
            {
              label: "Student Documents",
              view: "documents",
              icon: " File02Icon",
              module: "documents",
              breadcrumb: "Records & Communications • View",
              keywords:
                "documents student records files matrix status table repository search documents",
            },
            {
              label: "Notifications",
              view: "notifications",
              icon: " Notification01Icon",
              module: "notifications",
              breadcrumb: "Records & Communications • View",
              keywords: "notifications alerts messages unread updates inbox reminders",
            },
          ],
        },
      ];

      candidateGroups = allStaffGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (!hasModuleFilter || !item.module) return true;
            return enabledModules.has(item.module);
          }),
        }))
        .filter((group) => group.items.length > 0);
    } else if (isStudent || activeView === "student") {
      candidateGroups = [
        {
          id: "stu_general",
          title: "Portal Home",
          badge: "Student Portal",
          items: [
            {
              label: "Overview & Status Hub",
              view: "overview",
              icon: " LayoutGridIcon",
              breadcrumb: "Student Portal • Home",
              keywords:
                "overview dashboard home status recent activities tracking quick actions summary blockers alerts",
            },
          ],
        },
        {
          id: "stu_academic",
          title: "Academic Records",
          badge: "Student Portal",
          items: [
            {
              label: "Document Requests",
              view: "odrs",
              icon: " FileUploadIcon",
              breadcrumb: "Academic Records • View",
              keywords:
                "document requests odrs transcript diploma certificate grades official records tracking new request status",
            },
            {
              label: "Document Checklist & Compliance",
              view: "compliance",
              icon: " ClipboardIcon",
              breadcrumb: "Academic Records • View",
              keywords:
                "document checklist compliance requirements missing documents submitted documents compliance status form 137 psa birth certificate unsubmitted pending",
            },
          ],
        },
        {
          id: "stu_affairs",
          title: "Student Affairs",
          badge: "Student Portal",
          items: [
            {
              label: "OSAS Submissions",
              view: "osas",
              icon: " StudentIcon",
              breadcrumb: "Student Affairs • View",
              keywords:
                "osas submissions event proposals activity student affairs organizations clearance submit proposal",
            },
          ],
        },
      ];
    }

    // Universal Controls
    const controlsGroup = {
      id: "controls",
      title: "Sidebar & Navigation Controls",
      badge: "Controls",
      items: [
        {
          label: "Toggle Sidebar",
          action: "toggle-sidebar",
          icon: " LayoutLeftIcon",
          shortcut: isMac ? "⌘B" : "CTRL B",
          breadcrumb: "Navigation • Action",
          keywords:
            "toggle sidebar collapse expand hide show drawer panel navigation view hide sidebar",
        },
        {
          label: isHighContrast ? "Disable High Contrast Mode" : "Enable High Contrast Mode",
          action: "toggle-contrast",
          icon: " CircleIcon",
          breadcrumb: "Accessibility • Display",
          keywords:
            "high contrast accessibility display contrast black white theme readability toggle colors",
        },
        ...(!isStudent
          ? [
            {
              label: "Reset Scale / Zoom (100%)",
              action: "zoom-reset",
              icon: " ArrowLeftRightIcon",
              breadcrumb: "Layout Scale • Action",
              keywords: "reset scale zoom default 100% normal view layout size restore",
            },
            {
              label: "Zoom In (+8%)",
              action: "zoom-in",
              icon: " ZoomInAreaIcon",
              breadcrumb: "Layout Scale • Action",
              keywords: "zoom in enlarge scale increase size bigger larger view",
            },
            {
              label: "Zoom Out (-8%)",
              action: "zoom-out",
              icon: " ZoomOutAreaIcon",
              breadcrumb: "Layout Scale • Action",
              keywords: "zoom out shrink scale decrease size smaller view",
            },
          ]
          : []),
        ...(hasAdminRights && !isSuperAdmin
          ? [
            activeView === "admin"
              ? {
                label: "Switch to Staff View",
                action: "switch-role",
                targetRole: "staff",
                icon: " UserSearch01Icon",
                breadcrumb: "Role Mode • Action",
                keywords: "switch to staff view operations portal toggle role personnel",
              }
              : {
                label: "Switch to Admin View",
                action: "switch-role",
                targetRole: "admin",
                icon: " Shield01Icon",
                breadcrumb: "Role Mode • Action",
                keywords:
                  "switch to admin view administrator management toggle role governance",
              },
          ]
          : []),
        ...(!isAtDefaultHome
          ? [
            {
              label: `Return to Home View (${defaultHome.label})`,
              action: "return-dashboard",
              icon: " Home01Icon",
              breadcrumb: "Navigation • Action",
              keywords: `return back home default view dashboard exit settings leave ${defaultHome.label.toLowerCase()}`,
            },
          ]
          : []),
      ],
    };

    // User Account & Session Group
    const accountGroup = {
      id: "account",
      title: "Account & Session",
      badge: "User Profile",
      items: [
        {
          label: "Account Settings",
          view: "settings",
          icon: " Settings01Icon",
          breadcrumb: "Preferences • Settings",
          keywords: "account settings my profile password credentials preferences security 2fa totp edit profile",
        },
        {
          label: "My Activity",
          view: "activity",
          icon: " Time01Icon",
          breadcrumb: "Activity History • Personal",
          keywords: "my activity history personal audit logs login sessions timeline recent actions",
        },
        {
          label: "Sign Out",
          action: "logout",
          icon: " Logout01Icon",
          breadcrumb: "Session • Sign Out",
          keywords: "sign out log out exit disconnect leave session terminate end",
        },
      ],
    };

    return [...candidateGroups, controlsGroup, accountGroup];
  }, [
    activeView,
    authUser,
    isStudent,
    isSuperAdmin,
    hasAdminRights,
    isMac,
    pathname,
    isHighContrast,
    isAtDefaultHome,
    defaultHome,
  ]);

  const handleSelectSuggestion = (item) => {
    setCommandOpen(false);

    if (item.action === "toggle-sidebar") {
      window.dispatchEvent(new CustomEvent("toggle-sidebar"));
      return;
    }

    if (item.action === "toggle-contrast") {
      const next = toggleHighContrastPreference(authUser?.id);
      setIsHighContrast(next);
      toast.success(next ? "High Contrast Enabled" : "High Contrast Disabled", {
        description: next
          ? "Enhanced border boundaries and text contrast are now active."
          : "Standard display contrast restored.",
      });
      return;
    }

    if (item.action === "zoom-in") {
      window.dispatchEvent(new CustomEvent("change-zoom", { detail: { action: "in" } }));
      return;
    }

    if (item.action === "zoom-out") {
      window.dispatchEvent(new CustomEvent("change-zoom", { detail: { action: "out" } }));
      return;
    }

    if (item.action === "zoom-reset") {
      window.dispatchEvent(new CustomEvent("change-zoom", { detail: { action: "reset" } }));
      return;
    }

    if (item.action === "switch-role") {
      handleViewSwitch(item.targetRole);
      return;
    }

    if (item.action === "return-dashboard") {
      handleMainDashboardClick();
      return;
    }

    if (item.action === "logout") {
      handleLogoutAction();
      return;
    }

    if (item.url) {
      router.push(item.url);
      return;
    }

    if (item.view) {
      const isSysAdmin = activeView === "systemadmin";
      const onSysAdminPage =
        pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin");

      const params = new URLSearchParams({ view: item.view });
      if (item.section) params.set("section", item.section);
      if (item.officeId) params.set("office", item.officeId);

      if (isStudent) {
        if (!pathname?.startsWith("/student")) {
          router.push(`/student?${params.toString()}`);
        } else {
          window.dispatchEvent(
            new CustomEvent("switch-view", {
              detail: { view: item.view },
            })
          );
        }
      } else if (isSysAdmin && !onSysAdminPage) {
        router.push(`/systemadmin?${params.toString()}`);
      } else if (pathname === "/account") {
        const targetPath = isStudent
          ? "/student"
          : isSysAdmin
            ? "/systemadmin"
            : activeView === "admin"
              ? "/admin"
              : "/staff";
        router.push(`${targetPath}?${params.toString()}`);
      } else {
        window.dispatchEvent(
          new CustomEvent("switch-view", {
            detail: { view: item.view, section: item.section, officeId: item.officeId },
          })
        );
      }
    }
  };

  // Profile Popover Content (Shared between Desktop & Mobile)
  const renderProfileMenuContent = () => (
    <>
      {/* 1. Header Zone */}
      <div className="bg-black/[0.02] dark:bg-white/[0.02] px-3.5 py-2.5 border-b border-black/[0.06] dark:border-white/10 flex items-center text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProfileAvatar
            id={authUser?.id}
            avatarFilename={currentAvatarFilename ? `${currentAvatarFilename}&t=${avatarTimestamp}` : null}
            name={displayName}
            initials={initials}
            className="size-8 rounded-full shadow-xs shrink-0"
            fallbackClassName="text-xs"
          />
          <div className="min-w-0 flex flex-col">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate">
              {displayName}
            </span>
            <span className="text-[10px] font-normal text-gray-500 dark:text-zinc-400 truncate">
              {authUser?.email || authUser?.username}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Body Zone */}
      <DropdownMenuGroup className="p-1 flex flex-col gap-0.5">
        {!isAtDefaultHome && (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg flex items-center justify-between gap-2 text-xs font-medium py-1.5 px-2 text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors outline-none"
            onClick={handleMainDashboardClick}
            title={`Return to default home view (${defaultHome.label})`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Home01Icon size="1em" className="text-sm text-pup-maroon dark:text-red-400 shrink-0" />
              <span className="truncate">Return to Home View</span>
            </span>
            <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-500 truncate max-w-[90px] shrink-0 text-right">
              {defaultHome.label}
            </span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className={cn(
            "cursor-pointer rounded-lg flex items-center gap-2 text-xs font-medium py-1.5 px-2 transition-colors outline-none",
            isSettingsActive
              ? "text-gray-900 bg-gray-100 dark:text-zinc-50 dark:bg-zinc-800"
              : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          )}
          onClick={openAccountSettings}
        >
          <Settings01Icon size="1em" className="text-sm text-gray-500 dark:text-zinc-400 shrink-0" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        {!isActivityActive && (
          <DropdownMenuItem
            className="cursor-pointer rounded-lg flex items-center gap-2 text-xs font-medium py-1.5 px-2 text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors outline-none"
            onClick={openMyActivity}
            >
            <Time01Icon size="1em" className="text-sm text-gray-500 dark:text-zinc-400 shrink-0" />
            <span>My Activity</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          data-sound="swoosh"
          onClick={handleToggleSoundFromMenu}
          className="cursor-pointer rounded-lg flex items-center justify-between gap-2 text-xs font-medium py-1.5 px-2 text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors outline-none"
        >
          <span className="flex items-center gap-2 min-w-0">
            {soundEnabled ? (
              <VolumeHighIcon size="1em" className="text-sm text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <VolumeMute01Icon size="1em" className="text-sm text-gray-500 dark:text-zinc-400 shrink-0" />
            )}
            <span className="truncate">Interface Sounds</span>
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums shrink-0",
              soundEnabled
                ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "bg-black/[0.04] text-gray-500 dark:bg-white/[0.06] dark:text-zinc-400"
            )}
          >
            {soundEnabled ? "On" : "Muted"}
          </span>
        </DropdownMenuItem>

        {!isSuperAdmin && hasAdminRights && (
          <DropdownMenuItem
            onClick={() => handleViewSwitch(activeView === "admin" ? "staff" : "admin")}
            className="cursor-pointer rounded-lg flex items-center gap-2 text-xs font-medium py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 transition-colors outline-none"
          >
            <AppIcon
              className={cn(
                "text-sm shrink-0",
                activeView === "admin"
                  ? " UserSearch01Icon text-blue-600 dark:text-blue-400"
                  : " Shield01Icon text-purple-600 dark:text-purple-400"
              )}
            />
            <span>{activeView === "admin" ? "Switch to Staff View" : "Switch to Admin View"}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>

      {/* 3. Footer Zone */}
      <div className="p-1 border-t-[0.5px] border-border dark:border-white/10">
        <button
          type="button"
          onClick={handleLogoutAction}
          className="w-full flex items-center justify-start gap-2 py-1.5 px-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors border-0 outline-none"
        >
          <Logout01Icon size="1em" className="text-sm" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Account Setup Modal (Enforces password & security questions if needed) */}
      <AccountSetupModal authUser={authUser} />

      {/* Mobile Top Bar (< md only) */}
      <div className="md:hidden flex items-center justify-between w-full h-[52px] px-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_1px_3px_rgba(0,0,0,0.02)] z-20 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-700 hover:bg-black/[0.05] dark:text-zinc-200 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Open portal navigation menu"
          >
            <ListViewIcon size="1em" className="text-xl" />
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleMainDashboardClick}
            title={`eManage - Return to ${defaultHome.label}`}
          >
            <img
              data-sidebar-logo={isSuperAdmin || undefined}
              src={roleBranding.iconSrc || "/assets/images/pup-logo.png"}
              alt="eManage Logo"
              className={cn("h-6 w-6 object-contain", isStudent && "brightness-0 saturate-100")}
              style={
                isStudent
                  ? {
                    filter:
                      "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)",
                  }
                  : undefined
              }
            />
            <span
              data-sidebar-title
              style={{ fontSize: "calc(17px * var(--app-font-scale, 1))" }}
              className="font-bold text-[17px] tracking-tight leading-none text-gray-900 dark:text-zinc-50"
            >
              eManage
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-black/[0.05] dark:text-zinc-400 dark:hover:bg-white/10 transition-colors cursor-pointer active:scale-95"
            aria-label="Search views"
          >
            <Search01Icon size="1em" className="text-lg" />
          </button>

          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild className="focus:outline-none select-none">
              <button
                type="button"
                className="flex items-center justify-center rounded-full cursor-pointer active:scale-95 transition-transform"
                aria-label="Open user profile menu"
              >
                <ProfileAvatar
                  id={authUser?.id}
                  avatarFilename={currentAvatarFilename ? `${currentAvatarFilename}&t=${avatarTimestamp}` : null}
                  name={displayName}
                  initials={initials}
                  className="size-8 rounded-full shadow-xs"
                  fallbackClassName="text-xs"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              sideOffset={8}
              className="w-64 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50"
            >
              {renderProfileMenuContent()}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Desktop Sidebar (>= md) */}
      <motion.aside
        ref={sidebarRef}
        initial={false}
        animate={{
          width: open ? 275 : 60,
          paddingLeft: open ? 12 : 8,
          paddingRight: open ? 12 : 8,
        }}
        transition={shouldReduceMotion ? { duration: 0 } : SIDEBAR_MORPH_TRANSITION}
        className="rms-sidebar z-10 flex-col bg-white/25 backdrop-blur-xl dark:bg-zinc-950/25 select-none sticky top-0 h-full overflow-hidden hidden md:flex shrink-0 py-3"
      >
        {/* 1. TOP ROW: Logo and Collapse Button */}
        {open ? (
          <div className="flex items-center justify-between w-full h-[40px] px-1 mb-4 shrink-0 select-none">
            {/* Logo: First thing in the sidebar, icon slot aligned with navigation column */}
            <div
              className="flex items-center cursor-pointer group/logo select-none min-w-0"
              onClick={handleMainDashboardClick}
              title={`eManage - Return to ${defaultHome.label}`}
            >
              <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                <img
                  data-sidebar-logo={isSuperAdmin || undefined}
                  src={roleBranding.iconSrc || "/assets/images/pup-logo.png"}
                  alt="eManage Logo"
                  className={cn(
                    "h-[22px] w-[22px] object-contain transition-transform duration-200 group-hover/logo:scale-105 shrink-0",
                    isStudent && "brightness-0 saturate-100"
                  )}
                  style={
                    isStudent
                      ? {
                        filter:
                          "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)",
                      }
                      : undefined
                  }
                />
              </span>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4, transition: LABEL_EXIT_TRANSITION }}
                    transition={LABEL_ENTER_TRANSITION}
                    data-sidebar-title
                    style={{ fontSize: "calc(17px * var(--app-font-scale, 1))" }}
                    className="font-bold text-[17px] tracking-tight leading-none text-gray-900 dark:text-zinc-50 group-hover/logo:opacity-80 transition-opacity ml-1.5 truncate"
                  >
                    eManage
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse Button: Beside the logo */}
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={SPRING_PRESS}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("toggle-sidebar"));
                }
              }}
              title={`Collapse Sidebar (${isMac ? "⌘B" : "Ctrl+B"})`}
              aria-label="Collapse Sidebar"
              className="flex w-[34px] h-[34px] items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors duration-150 ease-out shrink-0"
            >
              <LayoutLeftIcon size={18} aria-hidden="true" />
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full mb-4 shrink-0 select-none">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={SPRING_PRESS}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("toggle-sidebar"));
                }
              }}
              title={`Expand Sidebar (${isMac ? "⌘B" : "Ctrl+B"})`}
              aria-label="Expand Sidebar"
              className="group relative flex w-[38px] h-[38px] items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition-colors duration-200 ease-out"
            >
              {/* Default resting state: eManage Logo */}
              <img
                data-sidebar-logo={isSuperAdmin || undefined}
                src={roleBranding.iconSrc || "/assets/images/pup-logo.png"}
                alt="eManage Logo"
                className={cn(
                  "h-[22px] w-[22px] object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 shrink-0",
                  isStudent && "brightness-0 saturate-100"
                )}
                style={
                  isStudent
                    ? {
                      filter:
                        "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)",
                    }
                    : undefined
                }
              />

              {/* Dynamic hover state: Expand Sidebar icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 text-gray-700 dark:text-zinc-200">
                <LayoutLeftIcon size={18} aria-hidden="true" />
              </div>
            </motion.button>
          </div>
        )}

        {/* 2. COMMAND PALETTE: Below the logo & collapse row, icon aligned with navigation column */}
        {open ? (
          <div className="w-full mb-2 shrink-0">
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              transition={SPRING_PRESS}
              onClick={() => setCommandOpen(true)}
              title={`Search views, records & actions (${isMac ? "⌘K" : "Ctrl+K"})`}
              className="group w-full h-[38px] pl-1 pr-2.5 flex items-center justify-between rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] border border-black/[0.06] hover:border-black/10 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer shadow-2xs select-none"
            >
              <div className="flex items-center min-w-0 text-gray-500 dark:text-zinc-400">
                <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                  <Search01Icon size={16} aria-hidden="true" className="transition-colors group-hover:text-pup-maroon dark:group-hover:text-red-400 shrink-0" />
                </span>
                <span
                  style={{ fontSize: "calc(12px * var(--app-font-scale, 1))" }}
                  className="text-xs font-normal truncate text-gray-600 dark:text-zinc-300 ml-1.5"
                >
                  Search views, records...
                </span>
              </div>
              <kbd
                style={{ fontSize: "calc(9.5px * var(--app-font-scale, 1))" }}
                className="inline-flex items-center justify-center px-2 h-5 min-w-[32px] text-[9.5px] font-sans tabular-nums font-semibold text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-2xs leading-none shrink-0 select-none"
              >
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </motion.button>
          </div>
        ) : (
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
            transition={SPRING_PRESS}
            onClick={() => setCommandOpen(true)}
            title={`Search views, records & actions (${isMac ? "⌘K" : "Ctrl+K"})`}
            className="flex w-[38px] h-[38px] items-center justify-center rounded-xl text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.05] dark:border-white/10 cursor-pointer transition-colors duration-150 ease-out mx-auto mb-2 group shadow-2xs"
          >
            <Search01Icon size={16} aria-hidden="true" className="transition-transform group-hover:scale-105 group-hover:text-pup-maroon dark:group-hover:text-red-400" />
          </motion.button>
        )}

        {/* 3. MIDDLE: The rest of the sidebar content (scrollable) */}
        <div
          onMouseLeave={() => setHoveredKey(null)}
          className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col gap-[2px] items-stretch [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, idx) => {
            if (item.type === "header") {
              return (
                <div
                  key={`header-${idx}`}
                  className={cn(
                    "relative w-full flex items-center select-none overflow-hidden h-[22px] shrink-0 mb-1",
                    idx === 0 ? "mt-1" : "mt-3"
                  )}
                >
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.span
                        key="header-text"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4, transition: LABEL_EXIT_TRANSITION }}
                        transition={LABEL_ENTER_TRANSITION}
                        data-sidebar-header
                        style={{ fontSize: "calc(11.5px * var(--app-font-scale, 1))" }}
                        className="text-[11.5px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap px-2 block"
                      >
                        {item.label}
                      </motion.span>
                    ) : (
                      <motion.div
                        key="header-divider"
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.15 }}
                        className="w-full flex items-center justify-center"
                      >
                        <div className="h-[1px] bg-gray-300/80 dark:bg-zinc-800 w-[24px] rounded-full" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            if (item.type === "accordion") {
              const isExpanded = expandedKeys[item.key];
              const hasActiveChild = item.children?.some((c) => c.key === activeKey);
              const iconConfig = ICON_MAP[item.key] || {
                icon: item.iconClass,
                color: staffIconColor,
              };
              const iconName = item.iconClass || iconConfig.icon;

              return (
                <div key={item.key} className="flex flex-col gap-[2px] w-full items-stretch">
                  <motion.button
                    type="button"
                    onClick={() => toggleAccordion(item.key)}
                    onMouseEnter={() => setHoveredKey(item.key)}
                    title={!open ? item.label : undefined}
                    data-tooltip-placement="right"
                    data-background-color={hasActiveChild && !isExpanded ? activeColor : undefined}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    transition={SPRING_PRESS}
                    className={cn(
                      "flex w-full h-[40px] items-center rounded-xl text-[13.5px] outline-none cursor-pointer transition-colors duration-150 ease-out relative group select-none overflow-hidden shrink-0",
                      open ? "px-1 justify-start" : "px-0 justify-center",
                      hasActiveChild && !isExpanded
                        ? "font-medium"
                        : "text-[#1D1D1F] dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white font-normal"
                    )}
                  >
                    {/* Active highlight morphing pill when collapsed with active child */}
                    {hasActiveChild && !isExpanded && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl shadow-2xs z-0 pointer-events-none"
                        style={{ backgroundColor: activeColor }}
                        transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                      />
                    )}

                    {/* Smooth gliding hover pill */}
                    <AnimatePresence>
                      {hoveredKey === item.key && !(hasActiveChild && !isExpanded) && (
                        <motion.span
                          layoutId="sidebar-hover-pill"
                          className="absolute inset-0 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] z-0 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                        />
                      )}
                    </AnimatePresence>

                    <div
                      className={cn(
                        "flex items-center overflow-hidden relative z-10",
                        open ? "min-w-0 flex-1" : "justify-center w-full"
                      )}
                    >
                      <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                        <AppIcon
                          data-color={hasActiveChild && !isExpanded ? activeForeground : staffIconColor}
                          style={{
                            color: hasActiveChild && !isExpanded ? activeForeground : staffIconColor,
                          }}
                          className={cn(
                            "rms-style-color",
                            iconName,
                            "text-[21px] transition-colors shrink-0"
                          )}
                        />
                        {/* Notification dot */}
                        <span
                          data-background-color={activeColor}
                          style={{ backgroundColor: activeColor }}
                          className={cn(
                            "rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                            !open && item.badge > 0
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-0 pointer-events-none"
                          )}
                        />
                      </span>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4, transition: LABEL_EXIT_TRANSITION }}
                            transition={LABEL_ENTER_TRANSITION}
                            data-sidebar-label
                            style={{
                              color: hasActiveChild && !isExpanded ? activeForeground : undefined,
                              fontSize: "calc(14px * var(--app-font-scale, 1))",
                            }}
                            className="whitespace-nowrap font-medium text-[14px] text-left ml-1.5 truncate relative z-10 block"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 4, transition: LABEL_EXIT_TRANSITION }}
                          transition={LABEL_ENTER_TRANSITION}
                          className="flex items-center gap-1.5 shrink-0 mr-1 relative z-10"
                        >
                          {item.badge > 0 && (
                            <span
                              className={cn("rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold", BADGE_BASE)}
                              data-background-color={hasActiveChild && !isExpanded ? activeForeground : activeColor}
                              data-color={hasActiveChild && !isExpanded ? activeColor : activeForeground}
                              style={{
                                backgroundColor:
                                  hasActiveChild && !isExpanded ? activeForeground : activeColor,
                                color: hasActiveChild && !isExpanded ? activeColor : activeForeground,
                                fontSize: "calc(10px * var(--app-font-scale, 1))",
                              }}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                          <AppIcon
                            className={cn(
                              " ArrowDown01Icon text-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                              isExpanded && "rotate-180"
                            )}
                            style={{
                              color: hasActiveChild && !isExpanded ? activeForeground : undefined,
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {open && isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{
                          opacity: 1,
                          height: "auto",
                          transition: shouldReduceMotion
                            ? { duration: 0 }
                            : {
                              height: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
                              opacity: { duration: 0.18, delay: 0.03, ease: [0.16, 1, 0.3, 1] },
                            },
                        }}
                        exit={{
                          opacity: 0,
                          height: 0,
                          transition: shouldReduceMotion
                            ? { duration: 0 }
                            : {
                              opacity: { duration: 0.12, ease: [0.16, 1, 0.3, 1] },
                              height: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                            },
                        }}
                        className="overflow-hidden w-full mt-[2px]"
                      >
                        <div className="flex flex-col gap-[2px] items-stretch">
                      {item.children.map((child) => {
                        const isChildActive = activeKey === child.key;
                        const childIconConfig = ICON_MAP[child.key] || {
                          icon: child.iconClass,
                          color: staffIconColor,
                        };
                        const childIconName = child.iconClass || childIconConfig.icon;

                        return (
                          <motion.a
                            key={child.key}
                            data-sidebar-key={child.key}
                            href={`${pathname}?view=${child.key}`}
                            onClick={(e) => handleLinkClick(e, child.key)}
                            onMouseEnter={() => setHoveredKey(child.key)}
                            title={!open ? child.label : undefined}
                            data-tooltip-placement="right"
                            data-background-color={isChildActive ? activeColor : undefined}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                            transition={SPRING_PRESS}
                            className={cn(
                              "flex w-full h-[40px] items-center rounded-xl text-[13.5px] outline-none cursor-pointer transition-colors duration-150 ease-out relative group select-none overflow-hidden shrink-0",
                              open ? "pl-4 pr-1 justify-start" : "px-0 justify-center",
                              isChildActive
                                ? "font-medium"
                                : "text-[#1D1D1F] dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white font-normal"
                            )}
                          >
                            {isChildActive && (
                              <motion.span
                                layoutId="sidebar-active-pill"
                                className="absolute inset-0 rounded-xl shadow-2xs z-0 pointer-events-none"
                                style={{ backgroundColor: activeColor }}
                                transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                              />
                            )}

                            {/* Smooth gliding hover pill */}
                            <AnimatePresence>
                              {hoveredKey === child.key && !isChildActive && (
                                <motion.span
                                  layoutId="sidebar-hover-pill"
                                  className="absolute inset-0 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] z-0 pointer-events-none"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                                />
                              )}
                            </AnimatePresence>

                            <div
                              className={cn(
                                "flex items-center overflow-hidden relative z-10",
                                open ? "min-w-0 flex-1" : "justify-center w-full"
                              )}
                            >
                              <span className="w-[38px] h-[38px] flex items-center justify-center shrink-0">
                                <AppIcon
                                  data-color={isChildActive ? activeForeground : staffIconColor}
                                  style={{ color: isChildActive ? activeForeground : staffIconColor }}
                                  className={cn(
                                    "rms-style-color",
                                    childIconName,
                                    "text-[21px] transition-colors shrink-0"
                                  )}
                                  title={child.label}
                                />
                              </span>
                              <AnimatePresence initial={false}>
                                {open && (
                                  <motion.span
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -4, transition: LABEL_EXIT_TRANSITION }}
                                    transition={LABEL_ENTER_TRANSITION}
                                    data-sidebar-label
                                    style={{
                                      color: isChildActive ? activeForeground : undefined,
                                      fontSize: "calc(14px * var(--app-font-scale, 1))",
                                    }}
                                    className="whitespace-nowrap font-medium text-[14px] text-left ml-1.5 truncate relative z-10 block"
                                  >
                                    {child.label}
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>

                            <AnimatePresence initial={false}>
                              {open && child.badge > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8, transition: LABEL_EXIT_TRANSITION }}
                                  transition={LABEL_ENTER_TRANSITION}
                                  className="flex items-center shrink-0 mr-1 relative z-10"
                                >
                                  <span
                                    className={cn("rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold", BADGE_BASE)}
                                    data-background-color={isChildActive ? activeForeground : activeColor}
                                    data-color={isChildActive ? activeColor : activeForeground}
                                    style={{
                                      backgroundColor: isChildActive ? activeForeground : activeColor,
                                      color: isChildActive ? activeColor : activeForeground,
                                      fontSize: "calc(10px * var(--app-font-scale, 1))",
                                    }}
                                  >
                                    {child.badge > 99 ? "99+" : child.badge}
                                  </span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.a>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        const isActive = activeKey === item.key;
        const iconConfig = ICON_MAP[item.key] || {
              icon: item.iconClass,
              color: staffIconColor,
            };
            const iconName = item.iconClass || iconConfig.icon;

            return (
              <motion.a
                key={item.key}
                data-sidebar-key={item.key}
                href={`${pathname}?view=${item.key}`}
                onClick={(e) => handleLinkClick(e, item.key)}
                onMouseEnter={() => setHoveredKey(item.key)}
                title={!open ? item.label : undefined}
                data-tooltip-placement="right"
                data-background-color={isActive ? activeColor : undefined}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={SPRING_PRESS}
                className={cn(
                  "flex w-full h-[40px] items-center rounded-xl text-[13.5px] outline-none cursor-pointer transition-colors duration-150 ease-out relative group select-none overflow-hidden shrink-0",
                  open ? "px-1 justify-start" : "px-0 justify-center",
                  isActive
                    ? "font-medium"
                    : "text-[#1D1D1F] dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white font-normal"
                )}
              >
                {/* Active sliding pill morphing across navigation items */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl shadow-2xs z-0 pointer-events-none"
                    style={{ backgroundColor: activeColor }}
                    transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                  />
                )}

                {/* Smooth gliding hover pill */}
                <AnimatePresence>
                  {hoveredKey === item.key && !isActive && (
                    <motion.span
                      layoutId="sidebar-hover-pill"
                      className="absolute inset-0 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] z-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                    />
                  )}
                </AnimatePresence>

                <div
                  className={cn(
                    "flex items-center overflow-hidden relative z-10",
                    open ? "min-w-0 flex-1" : "justify-center w-full"
                  )}
                >
                  <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                    <AppIcon
                      data-color={isActive ? activeForeground : staffIconColor}
                      style={{ color: isActive ? activeForeground : staffIconColor }}
                      className={cn(
                        "rms-style-color",
                        iconName,
                        "text-[21px] transition-colors shrink-0"
                      )}
                      title={item.label}
                    />
                    <span
                      data-background-color={activeColor}
                      style={{ backgroundColor: activeColor }}
                      className={cn(
                        "rms-style-background-color absolute top-1 right-1 h-2 w-2 rounded-full ring-2 ring-white dark:ring-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        !open && item.badge > 0
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-0 pointer-events-none"
                      )}
                    />
                  </span>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4, transition: LABEL_EXIT_TRANSITION }}
                        transition={LABEL_ENTER_TRANSITION}
                        data-sidebar-label
                        style={{
                          color: isActive ? activeForeground : undefined,
                          fontSize: "calc(14px * var(--app-font-scale, 1))",
                        }}
                        className="whitespace-nowrap font-medium text-[14px] text-left ml-1.5 truncate relative z-10 block"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false}>
                  {open && item.badge > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8, transition: LABEL_EXIT_TRANSITION }}
                      transition={LABEL_ENTER_TRANSITION}
                      className="flex items-center shrink-0 mr-1 relative z-10"
                    >
                      <span
                        className={cn("rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold", BADGE_BASE)}
                        data-background-color={isActive ? activeForeground : activeColor}
                        data-color={isActive ? activeColor : activeForeground}
                        style={{
                          backgroundColor: isActive ? activeForeground : activeColor,
                          color: isActive ? activeColor : activeForeground,
                          fontSize: "calc(10px * var(--app-font-scale, 1))",
                        }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.a>
            );
          })}
        </div>

        {/* Pinned Bottom Container: Feedback Card on top of Profile Menu */}
        <div className="mt-auto shrink-0 w-full flex flex-col">
          {(bottomContent || children) && (
            <div className={cn("w-full shrink-0", open ? "pb-2" : "pb-1")}>
              {typeof bottomContent === "function" ? bottomContent({ open }) : bottomContent}
              {typeof children === "function" ? children({ open }) : children}
            </div>
          )}

          {/* 4. AT THE VERY BOTTOM: Profile Menu with popup on top */}
          <div className="pt-2 shrink-0 w-full border-t border-gray-200/80 dark:border-white/10 flex justify-center">
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild className="focus:outline-none select-none w-full">
                {open ? (
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    transition={SPRING_PRESS}
                    className={cn(
                      "group flex items-center w-full p-1 sm:pr-3 rounded-full transition-all duration-150 cursor-pointer select-none text-left border",
                      menuOpen
                        ? "bg-black/[0.06] dark:bg-white/12 border-black/10 dark:border-white/15 shadow-xs"
                        : "bg-black/[0.02] dark:bg-white/[0.04] border-black/[0.06] dark:border-white/10 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    )}
                  >
                    <div className="w-[38px] h-9 flex items-center justify-center shrink-0">
                      <ProfileAvatar
                        id={authUser?.id}
                        avatarFilename={currentAvatarFilename ? `${currentAvatarFilename}&t=${avatarTimestamp}` : null}
                        name={displayName}
                        initials={initials}
                        className="size-8 rounded-full shadow-xs shrink-0"
                        fallbackClassName="text-xs"
                      />
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0 flex flex-col leading-tight ml-2">
                      <span
                        data-sidebar-user-name
                        style={{ fontSize: "calc(13px * var(--app-font-scale, 1))" }}
                        className="text-[13px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-100 truncate"
                      >
                        {displayName}
                      </span>
                      <span
                        data-sidebar-user-role
                        style={{ fontSize: "calc(11px * var(--app-font-scale, 1))" }}
                        className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 truncate"
                      >
                        {displayRole}
                      </span>
                    </div>

                    {/* Upper-lower pointer icon (selector) */}
                    <UnfoldMoreIcon size="1em" className="text-[14px] text-gray-400 dark:text-zinc-500 shrink-0 ml-1 mr-1 transition-colors group-hover:text-gray-600 dark:group-hover:text-zinc-300" />
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                    transition={SPRING_PRESS}
                    title={`${displayName} (${displayRole})`}
                    className={cn(
                      "flex w-[38px] h-[38px] items-center justify-center rounded-full transition-all cursor-pointer mx-auto",
                      menuOpen
                        ? "bg-black/[0.06] dark:bg-white/12 ring-1 ring-black/10 dark:ring-white/15 shadow-xs"
                        : "hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                    )}
                  >
                    <ProfileAvatar
                      id={authUser?.id}
                      avatarFilename={currentAvatarFilename ? `${currentAvatarFilename}&t=${avatarTimestamp}` : null}
                      name={displayName}
                      initials={initials}
                      className="size-8 rounded-full shadow-xs shrink-0"
                      fallbackClassName="text-xs"
                    />
                  </motion.button>
                )}
              </DropdownMenuTrigger>

              {/* Popup ON TOP of profile button (side="top", NOT beside) */}
              <DropdownMenuContent
                side="top"
                sideOffset={8}
                align={open ? "start" : "start"}
                className="w-64 rounded-2xl border-[0.5px] border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none z-50 mb-1"
              >
                {renderProfileMenuContent()}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.aside>

      {/* COMMAND PALETTE (SPOTLIGHT / RAYCAST / APPLE HIG STYLE) */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        authUser={authUser}
        activeView={activeView}
        isStudent={isStudent}
        isSuperAdmin={isSuperAdmin}
        hasAdminRights={hasAdminRights}
        onLogout={handleLogoutAction}
        onViewSwitch={handleViewSwitch}
        onMainDashboard={handleMainDashboardClick}
      />

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[310px] sm:w-[360px] p-0 max-w-[85vw] flex flex-col"
        >
          <SheetHeader className="p-4 flex flex-row items-center gap-2.5">
            <img
              data-sidebar-logo={isSuperAdmin || undefined}
              src={roleBranding.iconSrc || "/assets/images/pup-logo.png"}
              alt="eManage Logo"
              className={cn("h-7 w-7 object-contain", isStudent && "brightness-0 saturate-100")}
              style={
                isStudent
                  ? {
                    filter:
                      "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)",
                  }
                  : undefined
              }
            />
            <div>
              <SheetTitle>
                eManage
              </SheetTitle>
              <SheetDescription>
                {isStudent
                  ? "Student Portal"
                  : activeView === "systemadmin"
                    ? "System Admin"
                    : activeView === "admin"
                      ? "Office Admin"
                      : "Staff"}
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="p-3 pb-1">
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setCommandOpen(true);
              }}
              className="w-full h-10 px-3.5 flex items-center justify-between rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] text-gray-500 dark:text-zinc-400 text-xs border border-black/[0.06] dark:border-white/10 transition-colors cursor-pointer select-none shadow-2xs active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <Search01Icon size="1em" className="text-sm text-pup-maroon dark:text-red-400" />
                <span className="font-medium text-gray-700 dark:text-zinc-200">
                  Search views, records...
                </span>
              </div>
              <kbd className="inline-flex items-center justify-center px-2 h-5 text-[9px] font-bold text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-full shadow-2xs leading-none">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin]">
            {filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div
                  style={{ fontSize: "calc(11px * var(--app-font-scale, 1))" }}
                  className="px-2.5 py-1 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider"
                >
                  {group.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const itemKey = item.section
                      ? `${item.view}-${item.section}`
                      : item.view || item.url || item.action || item.label;
                    const isActive =
                      item.view &&
                      !item.section &&
                      item.view === activeTabKey &&
                      (isStudent
                        ? pathname?.startsWith("/student")
                        : activeView === "systemadmin"
                          ? pathname?.startsWith("/systemadmin") ||
                          pathname?.startsWith("/superadmin")
                          : activeView === "admin"
                            ? pathname?.startsWith("/admin")
                            : pathname?.startsWith("/staff"));

                    return (
                      <button
                        key={itemKey}
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          handleSelectSuggestion(item);
                        }}
                        className={cn(
                          "w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer min-h-[44px]",
                          isActive
                            ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-50"
                            : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100/70 dark:hover:bg-white/5 active:scale-[0.98]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                              isActive
                                ? "bg-pup-maroon text-white dark:bg-white dark:text-zinc-900"
                                : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                            )}
                          >
                            <AppIcon className={cn(item.icon, "text-[16px]")} title={item.label} />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && (
                          <span className={cn(BADGE_PALETTES.emerald, "text-[9px] px-2 py-0.5", BADGE_BASE)}>
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Session Expired Modal */}
      <Dialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 bg-white dark:bg-zinc-900 dark:border-white/10">
          <DialogHeader>
            <DialogTitle>
              Session Expired
            </DialogTitle>
            <DialogDescription className="pt-2">
              Your active session has ended or you signed out from another window. Please sign in
              again to continue using the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              size="sm"
              onClick={handleSessionExpiredRedirect}
              className="w-full h-9 px-4 cursor-pointer"
            >
              Sign In Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
