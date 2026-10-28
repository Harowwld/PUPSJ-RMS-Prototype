"use client";

import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getRoleBranding } from "@/lib/roleBranding";
import {
  isAdminRole,
  getOfficePrefix,
  getOfficeRoleLabel,
  isSystemAdminRole,
  hasAdminPrivileges,
} from "@/lib/roleUtils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import {
  getHighContrastPreference,
  toggleHighContrastPreference,
  HIGH_CONTRAST_EVENT,
} from "@/lib/accessibility";
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

// Icon map for navigation items
const ICON_MAP = {
  // Admin views
  review: { icon: "ti ti-file-check" },
  digitization: { icon: "ti ti-chart-bar" },
  request_analytics: { icon: "ti ti-arrow-up-right" },
  directory: { icon: "ti ti-users" },
  create: { icon: "ti ti-user-plus" },
  storage_layout: { icon: "ti ti-building-warehouse" },
  system_data: { icon: "ti ti-settings-cog" },
  system: { icon: "ti ti-database-backup" },
  logs: { icon: "ti ti-history" },
  offices: { icon: "ti ti-building-community" },
  modules: { icon: "ti ti-layout-grid" },
  standards: { icon: "ph-bold ph-clock-countdown" },
  staff: { icon: "ti ti-users" },
  security: { icon: "ph-bold ph-shield-check" },
  health: { icon: "ti ti-activity-heartbeat" },
  backups: { icon: "ti ti-database-backup" },
  landing: { icon: "ph-bold ph-layout" },

  // Staff views
  requests: { icon: "ti ti-arrow-up-right" },
  odrs: { icon: "ti ti-file-text" },
  compliance: { icon: "ti ti-clipboard-check" },
  osas: { icon: "ti ti-school" },
  osas_monitoring: { icon: "ti ti-school" },
  upload: { icon: "ti ti-scan" },
  batch_review: { icon: "ph-bold ph-check-square" },
  documents: { icon: "ti ti-file-text" },
  notifications: { icon: "ti ti-bell" },
  search: { icon: "ti ti-archive" },
  storage: { icon: "ti ti-folder-open" },
  students: { icon: "ph-bold ph-users" },
  organizations: { icon: "ph-bold ph-buildings" },
  overview: { icon: "ph-bold ph-squares-four" },
};

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
  const commandInputRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

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

  // Global shortcuts: (Cmd+K / Ctrl+K for command palette, Cmd+B / Ctrl+B for sidebar toggle)
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
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
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
      setSearchQuery("");
      setFocusedIndex(0);
      setCommandOpen(true);
    };
    window.addEventListener("open-command-palette", handleOpenCommand);
    return () => window.removeEventListener("open-command-palette", handleOpenCommand);
  }, []);

  // Autofocus search input when command palette opens
  useEffect(() => {
    if (commandOpen) {
      const timer = setTimeout(() => {
        commandInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [commandOpen]);

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
  const staffIconColor = activeColor;

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

  const handleMainDashboardClick = () => {
    if (isStudent) {
      router.push("/student");
    } else if (isSuperAdmin) {
      router.push("/systemadmin");
    } else if (hasAdminRights) {
      router.push(activeView === "admin" ? "/admin" : "/staff");
    } else {
      router.push("/staff");
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

  const handleLogoutAction = () => {
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
    localStorage.setItem("pup-logout", Date.now().toString());
    window.location.href = "/login";
  };

  const handleSessionExpiredRedirect = () => {
    setShowSessionExpired(false);
    window.location.href = "/login";
  };

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

  const defaultTab = isStudent
    ? "odrs"
    : activeView === "systemadmin"
      ? "offices"
      : activeView === "admin"
        ? "review"
        : "requests";
  const activeTabKey = currentTab || defaultTab;

  // Structured Command Palette items
  const { filteredGroups, flatSuggestions } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const enabledModules = new Set(authUser?.enabled_modules || []);
    const hasModuleFilter =
      Array.isArray(authUser?.enabled_modules) && authUser.enabled_modules.length > 0;

    let candidateGroups = [];

    if (activeView === "systemadmin") {
      candidateGroups = [
        {
          id: "sys_gov",
          title: "Institutional Governance",
          badge: "System Admin",
          items: [
            {
              label: "Departments & Stations",
              view: "offices",
              icon: "ph-bold ph-buildings",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "offices departments stations campus registry osas admissions library accounting admin governance units colleges add department new office",
            },
            {
              label: "Department Features",
              view: "modules",
              icon: "ph-bold ph-squares-four",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "features matrix permissions feature flags modules config toggle access roles supervisor staff tools category registrar osas",
            },
          ],
        },
        {
          id: "sys_ops",
          title: "Campus Operations",
          badge: "System Admin",
          items: [
            {
              label: "Processing Time Standards",
              view: "standards",
              icon: "ph-bold ph-clock-countdown",
              breadcrumb: "Campus Operations • View",
              keywords:
                "service standards sla citizen charter arta ra 11032 turnaround time processing benchmark deadlines commitments fast-track university standard",
            },
            {
              label: "Campus Operations",
              view: "health",
              icon: "ph-bold ph-activity",
              breadcrumb: "Campus Operations • View",
              keywords:
                "campus operations system health telemetry status memory database ping metrics activity monitoring registrar queue osas proposals transactions live operations",
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
              icon: "ph-bold ph-certificate",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "institutional identity branding logo seal university school credentials jurisdiction prefix name color pdf header letterhead institution identity accent white label report style",
            },
            {
              label: "Landing Page CMS",
              view: "landing",
              icon: "ph-bold ph-layout",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "landing page cms public portal content website builder customization homepage portal editor",
            },
            {
              label: "Landing CMS: Hero Section",
              view: "landing",
              section: "hero",
              icon: "ph-bold ph-image",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms hero section banner headline slides background photos rotation",
            },
            {
              label: "Landing CMS: Workflow & Steps",
              view: "landing",
              section: "workflow",
              icon: "ph-bold ph-git-merge",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms workflow steps how it works pipeline guide process",
            },
            {
              label: "Landing CMS: Academic Catalog",
              view: "landing",
              section: "catalog",
              icon: "ph-bold ph-books",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms academic catalog courses degrees document types requirements",
            },
            {
              label: "Landing CMS: FAQ Section",
              view: "landing",
              section: "faq",
              icon: "ph-bold ph-question",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms faq accordion questions answers help support common inquiries",
            },
            {
              label: "Landing CMS: Institutional Footer",
              view: "landing",
              section: "footer",
              icon: "ph-bold ph-panel-bottom",
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
              icon: "ph-bold ph-users",
              breadcrumb: "Personnel & Access • View",
              keywords:
                "directory personnel users accounts staff global roles administrators employees add user invite staff",
            },
            {
              label: "Security Questions",
              view: "security",
              icon: "ph-bold ph-shield-check",
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
              icon: "ph-bold ph-history",
              breadcrumb: "System & Security • View",
              keywords:
                "audit logs security platform activity history transactions compliance events logs export audit trail",
            },
            {
              label: "Platform Backups",
              view: "backups",
              icon: "ph-bold ph-cloud-arrow-up",
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
              icon: "ph-bold ph-seal-check",
              module: "records_review",
              breadcrumb: "Records & Verification • View",
              keywords:
                "approve decline pending documents review scans verify verification records review queue",
            },
            {
              label: "Compliance Analytics",
              view: "digitization",
              icon: "ph-bold ph-chart-bar",
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
              icon: "ph-bold ph-trend-up",
              module: "request_analytics",
              breadcrumb: "Operations & Fulfillment • View",
              keywords:
                "sla analytics turnaround duration requests fulfillment speed document requests",
            },
            {
              label: "Storage Room Layout",
              view: "storage_layout",
              icon: "ph-bold ph-warehouse",
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
              icon: "ph-bold ph-users",
              module: "staff_directory",
              breadcrumb: "Personnel & Governance • View",
              keywords:
                "directory staff users personnel accounts team members roles active inactive",
            },
            {
              label: "Activity History",
              view: "logs",
              icon: "ph-bold ph-history",
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
              icon: "ph-bold ph-gear",
              module: "system_config",
              breadcrumb: "System & Maintenance • View",
              keywords:
                "courses sections doc types document types config system data institutional",
            },
            {
              label: "Backup & Recovery",
              view: "system",
              icon: "ph-bold ph-cloud-arrow-up",
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
              icon: "ph-bold ph-tray-arrow-up",
              module: "document_requests",
              breadcrumb: "Service & Requests • View",
              keywords:
                "document requests odrs transcript diploma certification operations processing client requests",
            },
            {
              label: "OSAS Monitoring",
              view: "osas_monitoring",
              icon: "ph-bold ph-student",
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
              icon: "ph-bold ph-scan",
              module: "scan_upload",
              breadcrumb: "Scanning & Document Upload • View",
              keywords:
                "scan upload ocr document new ingest single upload file scanner digitization",
            },
            {
              label: "Batch Review",
              view: "batch_review",
              icon: "ph-bold ph-check-square",
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
              icon: "ph-bold ph-users",
              module: "student_directory",
              breadcrumb: "Student & Organization Roster • View",
              keywords:
                "student directory students profiles records directory list search archive",
            },
            {
              label: "Student Organizations",
              view: "organizations",
              icon: "ph-bold ph-buildings",
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
              icon: "ph-bold ph-archive-box",
              module: "records_archive",
              breadcrumb: "Archive & Storage • View",
              keywords:
                "records archive search students repository files folders year levels browse files",
            },
            {
              label: "Storage Explorer",
              view: "storage",
              icon: "ph-bold ph-folder-open",
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
              icon: "ph-bold ph-file-text",
              module: "documents",
              breadcrumb: "Records & Communications • View",
              keywords:
                "documents student records files matrix status table repository search documents",
            },
            {
              label: "Notifications",
              view: "notifications",
              icon: "ph-bold ph-bell",
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
              icon: "ph-bold ph-squares-four",
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
              icon: "ph-bold ph-tray-arrow-up",
              breadcrumb: "Academic Records • View",
              keywords:
                "document requests odrs transcript diploma certificate grades official records tracking new request status",
            },
            {
              label: "Document Checklist & Compliance",
              view: "compliance",
              icon: "ph-bold ph-clipboard-text",
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
              icon: "ph-bold ph-student",
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
          icon: "ph-bold ph-sidebar-simple",
          shortcut: isMac ? "⌘B" : "CTRL B",
          breadcrumb: "Navigation • Action",
          keywords:
            "toggle sidebar collapse expand hide show drawer panel navigation view hide sidebar",
        },
        {
          label: isHighContrast ? "Disable High Contrast Mode" : "Enable High Contrast Mode",
          action: "toggle-contrast",
          icon: "ph-bold ph-circle-half",
          breadcrumb: "Accessibility • Display",
          keywords:
            "high contrast accessibility display contrast black white theme readability toggle colors",
        },
        ...(!isStudent
          ? [
            {
              label: "Reset Scale / Zoom (100%)",
              action: "zoom-reset",
              icon: "ph-bold ph-arrows-out-line-horizontal",
              breadcrumb: "Layout Scale • Action",
              keywords: "reset scale zoom default 100% normal view layout size restore",
            },
            {
              label: "Zoom In (+8%)",
              action: "zoom-in",
              icon: "ph-bold ph-magnifying-glass-plus",
              breadcrumb: "Layout Scale • Action",
              keywords: "zoom in enlarge scale increase size bigger larger view",
            },
            {
              label: "Zoom Out (-8%)",
              action: "zoom-out",
              icon: "ph-bold ph-magnifying-glass-minus",
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
                icon: "ph-bold ph-users",
                breadcrumb: "Role Mode • Action",
                keywords: "switch to staff view operations portal toggle role personnel",
              }
              : {
                label: "Switch to Admin View",
                action: "switch-role",
                targetRole: "admin",
                icon: "ph-bold ph-shield-check",
                breadcrumb: "Role Mode • Action",
                keywords:
                  "switch to admin view administrator management toggle role governance",
              },
          ]
          : []),
        ...(pathname === "/account"
          ? [
            {
              label: "Return to Dashboard",
              action: "return-dashboard",
              icon: "ph-bold ph-layout",
              breadcrumb: "Navigation • Action",
              keywords: "return back dashboard home main view exit settings leave",
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
          icon: "ph-bold ph-gear",
          breadcrumb: "Preferences • Settings",
          keywords: "account settings my profile password credentials preferences security 2fa totp edit profile",
        },
        {
          label: "My Activity",
          view: "activity",
          icon: "ph-bold ph-clock-counter-clockwise",
          breadcrumb: "Activity History • Personal",
          keywords: "my activity history personal audit logs login sessions timeline recent actions",
        },
        {
          label: "Sign Out",
          action: "logout",
          icon: "ph-bold ph-sign-out",
          breadcrumb: "Session • Sign Out",
          keywords: "sign out log out exit disconnect leave session terminate end",
        },
      ],
    };

    const allCandidateGroups = [...candidateGroups, controlsGroup, accountGroup];

    const filtered = allCandidateGroups
      .map((group) => {
        if (!q) return group;
        const matchingItems = group.items.filter((item) =>
          matchesSearchQuery([item.label, item.breadcrumb, item.keywords, group.title], searchQuery)
        );
        return { ...group, items: matchingItems };
      })
      .filter((group) => group.items.length > 0);

    return {
      filteredGroups: filtered,
      flatSuggestions: filtered.flatMap((g) => g.items),
    };
  }, [
    searchQuery,
    activeView,
    authUser,
    isStudent,
    isSuperAdmin,
    hasAdminRights,
    isMac,
    pathname,
    isHighContrast,
  ]);

  const handleSelectSuggestion = (item) => {
    setSearchQuery("");
    setCommandOpen(false);
    setFocusedIndex(0);

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

  const handleCommandKeyDown = (e) => {
    if (flatSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % flatSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + flatSuggestions.length) % flatSuggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const targetItem = flatSuggestions[focusedIndex] || flatSuggestions[0];
      if (targetItem) handleSelectSuggestion(targetItem);
    } else if (e.key === "Escape") {
      setCommandOpen(false);
    }
  };

  useEffect(() => {
    if (commandOpen) {
      const el = document.getElementById(`command-item-${focusedIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, commandOpen]);

  // Profile Popover Content (Shared between Desktop & Mobile)
  const renderProfileMenuContent = () => (
    <>
      {/* 1. Header Zone */}
      <div className="bg-gray-50/70 dark:bg-zinc-800/50 px-4 py-3 border-b-[0.5px] border-border dark:border-white/10 flex items-center text-left">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-9 w-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-xs font-bold border border-border dark:border-white/10 shadow-xs shrink-0 text-gray-800 dark:text-zinc-100 overflow-hidden">
            {currentAvatarFilename && !imageError ? (
              <img
                src={`/api/account/avatar?id=${authUser?.id}&t=${avatarTimestamp}`}
                alt=""
                className="w-full h-full object-cover scale-[1.2]"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
              {displayName}
            </span>
            <span className="text-[11px] font-normal text-gray-500 dark:text-zinc-400 truncate">
              {authUser?.email || authUser?.username}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Body Zone */}
      <DropdownMenuGroup className="p-1.5 flex flex-col gap-0.5">
        {(isSettingsActive || isActivityActive) && (
          <DropdownMenuItem
            className="cursor-pointer rounded-xl flex items-center gap-2.5 text-xs font-medium py-2 px-3 text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors outline-none"
            onClick={handleMainDashboardClick}
          >
            <HugeIcon className="ph-bold ph-layout text-sm text-pup-maroon dark:text-red-400 shrink-0" />
            <span>Return to Dashboard</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          className={cn(
            "cursor-pointer rounded-xl flex items-center gap-2.5 text-xs font-medium py-2 px-3 transition-colors outline-none",
            isSettingsActive
              ? "text-gray-900 bg-gray-100 dark:text-zinc-50 dark:bg-zinc-800"
              : "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          )}
          onClick={openAccountSettings}
        >
          <HugeIcon className="ph-bold ph-gear text-sm text-gray-500 dark:text-zinc-400 shrink-0" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        {!isActivityActive && (
          <DropdownMenuItem
            className="cursor-pointer rounded-xl flex items-center gap-2.5 text-xs font-medium py-2 px-3 text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors outline-none"
            onClick={openMyActivity}
            >
            <HugeIcon className="ph-bold ph-clock-counter-clockwise text-sm text-gray-500 dark:text-zinc-400 shrink-0" />
            <span>My Activity</span>
          </DropdownMenuItem>
        )}

        {!isSuperAdmin && hasAdminRights && (
          <DropdownMenuItem
            onClick={() => handleViewSwitch(activeView === "admin" ? "staff" : "admin")}
            className="cursor-pointer rounded-xl flex items-center gap-2.5 text-xs font-medium py-2 px-3 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 transition-colors outline-none"
          >
            <HugeIcon
              className={cn(
                "text-sm shrink-0",
                activeView === "admin"
                  ? "ph-bold ph-users text-blue-600 dark:text-blue-400"
                  : "ph-bold ph-shield-check text-purple-600 dark:text-purple-400"
              )}
            />
            <span>{activeView === "admin" ? "Switch to Staff View" : "Switch to Admin View"}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>

      {/* 3. Footer Zone */}
      <div className="p-1.5 border-t-[0.5px] border-border dark:border-white/10">
        <button
          type="button"
          onClick={handleLogoutAction}
          className="w-full flex items-center justify-start gap-2.5 py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer transition-colors border-0 outline-none"
        >
          <HugeIcon className="ph-bold ph-sign-out text-sm" />
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
      <div className="md:hidden flex items-center justify-between w-full h-[52px] px-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 z-20 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 shrink-0"
            aria-label="Open portal navigation menu"
          >
            <HugeIcon className="ph-bold ph-list text-xl" />
          </button>
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleMainDashboardClick}
          >
            <img
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
            <span className="font-bold text-[17px] tracking-tight leading-none text-gray-900 dark:text-zinc-50">
              eManage
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFocusedIndex(0);
              setCommandOpen(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95"
            aria-label="Search views"
          >
            <HugeIcon className="ph-bold ph-magnifying-glass text-lg" />
          </button>

          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild className="focus:outline-none select-none">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-zinc-850 text-xs font-bold border border-gray-200 dark:border-white/10 shadow-2xs overflow-hidden"
              >
                {currentAvatarFilename && !imageError ? (
                  <img
                    src={`/api/account/avatar?id=${authUser?.id}&t=${avatarTimestamp}`}
                    alt=""
                    className="w-full h-full object-cover scale-[1.2]"
                  />
                ) : (
                  initials
                )}
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
      <aside
        ref={sidebarRef}
        className={cn(
          "rms-sidebar z-10 flex-col bg-white/25 backdrop-blur-xl dark:bg-zinc-950/25 select-none sticky top-0 h-full overflow-hidden hidden md:flex shrink-0 will-change-[width] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          open ? "w-[275px] py-3 px-3" : "w-[60px] py-3 px-2"
        )}
      >
        {/* 1. TOP ROW: Logo and Collapse Button */}
        {open ? (
          <div className="flex items-center justify-between w-full h-[40px] px-1 mb-4 shrink-0 select-none">
            {/* Logo: First thing in the sidebar */}
            <div
              className="flex items-center gap-2 cursor-pointer group/logo select-none min-w-0"
              onClick={handleMainDashboardClick}
              title="eManage Dashboard"
            >
              <img
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
              <span className="font-bold text-[17px] tracking-tight leading-none text-gray-900 dark:text-zinc-50 group-hover/logo:opacity-80 transition-opacity">
                eManage
              </span>
            </div>

            {/* Collapse Button: Beside the logo */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("toggle-sidebar"));
                }
              }}
              title={`Collapse Sidebar (${isMac ? "⌘B" : "Ctrl+B"})`}
              aria-label="Collapse Sidebar"
              className="flex w-[34px] h-[34px] items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 cursor-pointer transition-all duration-150 ease-out shrink-0"
            >
              <HugeIcon className="ti ti-panel-left-dashed text-[20px]" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full mb-4 shrink-0 select-none">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("toggle-sidebar"));
                }
              }}
              title={`Expand Sidebar (${isMac ? "⌘B" : "Ctrl+B"})`}
              aria-label="Expand Sidebar"
              className="group relative flex w-[34px] h-[34px] items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 cursor-pointer transition-all duration-200 ease-out"
            >
              {/* Default resting state: eManage Logo */}
              <img
                src={roleBranding.iconSrc || "/assets/images/pup-logo.png"}
                alt="eManage Logo"
                className={cn(
                  "h-[20px] w-[20px] object-contain transition-all duration-200 group-hover:opacity-0 group-hover:scale-75 shrink-0",
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
                <HugeIcon className="ti ti-panel-left text-[20px]" />
              </div>
            </button>
          </div>
        )}

        {/* 2. COMMAND PALETTE: Below the logo & collapse row */}
        {open ? (
          <div className="w-full mb-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFocusedIndex(0);
                setCommandOpen(true);
              }}
              title={`Search views & actions (${isMac ? "⌘K" : "Ctrl+K"})`}
              className="group w-full h-[36px] px-2.5 flex items-center justify-between rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-zinc-900/60 dark:hover:bg-zinc-800/80 border border-gray-200/80 hover:border-gray-300 dark:border-white/10 dark:hover:border-white/20 transition-all cursor-pointer shadow-2xs select-none active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0 text-gray-500 dark:text-zinc-400">
                <HugeIcon className="ph-bold ph-magnifying-glass text-xs transition-colors group-hover:text-pup-maroon dark:group-hover:text-red-400 shrink-0" />
                <span className="text-xs font-normal truncate text-gray-600 dark:text-zinc-300">
                  Search views...
                </span>
              </div>
              <kbd className="inline-flex items-center justify-center px-1.5 h-4.5 min-w-[32px] text-[9.5px] font-mono font-semibold text-gray-400 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-2xs leading-none shrink-0">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFocusedIndex(0);
              setCommandOpen(true);
            }}
            title={`Search views & actions (${isMac ? "⌘K" : "Ctrl+K"})`}
            className="flex w-[38px] h-[38px] items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 cursor-pointer transition-all duration-150 ease-out mx-auto mb-2 group"
          >
            <HugeIcon className="ph-bold ph-magnifying-glass text-[19px] transition-transform group-hover:scale-105" />
          </button>
        )}

        {/* 3. MIDDLE: The rest of the sidebar content (scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col gap-[2px] items-stretch [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  <span
                    className={cn(
                      "text-[11.5px] font-semibold tracking-[0.05em] uppercase text-[#8E8E93] dark:text-zinc-500 whitespace-nowrap px-2 block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
                    )}
                  >
                    {item.label}
                  </span>

                  <div
                    className={cn(
                      "absolute inset-x-0 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none",
                      open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
                    )}
                  >
                    <div className="h-[1px] bg-gray-300/80 dark:bg-zinc-800 w-[24px] rounded-full" />
                  </div>
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
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.key)}
                    title={!open ? item.label : undefined}
                    data-tooltip-placement="right"
                    data-background-color={hasActiveChild && !isExpanded ? activeColor : undefined}
                    style={
                      hasActiveChild && !isExpanded
                        ? { backgroundColor: activeColor, color: activeForeground }
                        : undefined
                    }
                    className={cn(
                      "flex w-full h-[40px] items-center rounded-[8px] text-[13.5px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                      open ? "px-1 justify-start" : "px-0 justify-center",
                      hasActiveChild && !isExpanded
                        ? "font-medium shadow-2xs rms-style-background-color"
                        : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center overflow-hidden",
                        open ? "min-w-0 flex-1" : "justify-center w-full"
                      )}
                    >
                      <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                        <HugeIcon
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
                      {open && (
                        <span className="whitespace-nowrap font-medium text-[14px] text-left ml-1.5 overflow-hidden block">
                          {item.label}
                        </span>
                      )}
                    </div>

                    {open && (
                      <div className="flex items-center gap-1.5 shrink-0 mr-1">
                        {item.badge > 0 && (
                          <span
                            className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                            data-background-color={hasActiveChild && !isExpanded ? activeForeground : activeColor}
                            data-color={hasActiveChild && !isExpanded ? activeColor : activeForeground}
                            style={{
                              backgroundColor:
                                hasActiveChild && !isExpanded ? activeForeground : activeColor,
                              color: hasActiveChild && !isExpanded ? activeColor : activeForeground,
                            }}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                        <HugeIcon
                          className={cn(
                            "ti ti-chevron-down text-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    )}
                  </button>

                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-full",
                      open && isExpanded
                        ? "mt-[2px] max-h-[500px] opacity-100"
                        : "mt-0 max-h-0 opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="flex flex-col gap-[2px] items-stretch">
                      {item.children.map((child, childIdx) => {
                        const isActive = activeKey === child.key;
                        const childIconConfig = ICON_MAP[child.key] || {
                          icon: child.iconClass,
                          color: staffIconColor,
                        };
                        const childIconName = child.iconClass || childIconConfig.icon;

                        return (
                          <a
                            key={child.key}
                            data-sidebar-key={child.key}
                            href={`${pathname}?view=${child.key}`}
                            onClick={(e) => handleLinkClick(e, child.key)}
                            title={!open ? child.label : undefined}
                            data-tooltip-placement="right"
                            data-background-color={isActive ? activeColor : undefined}
                            data-transition-delay={isExpanded ? `${childIdx * 30}ms` : "0ms"}
                            style={isActive ? { backgroundColor: activeColor, color: activeForeground } : undefined}
                            className={cn(
                              "rms-style-transition-delay flex w-full h-[40px] items-center rounded-[8px] text-[13.5px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                              open ? "pl-4 pr-1 justify-start" : "px-0 justify-center",
                              isActive
                                ? "font-medium shadow-2xs rms-style-background-color"
                                : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center overflow-hidden",
                                open ? "min-w-0 flex-1" : "justify-center w-full"
                              )}
                            >
                              <span className="w-[38px] h-[38px] flex items-center justify-center shrink-0">
                                <HugeIcon
                                  data-color={isActive ? activeForeground : staffIconColor}
                                  style={{ color: isActive ? activeForeground : staffIconColor }}
                                  className={cn(
                                    "rms-style-color",
                                    childIconName,
                                    "text-[21px] transition-colors shrink-0"
                                  )}
                                  title={child.label}
                                />
                              </span>
                              <span
                                className={cn(
                                  "whitespace-nowrap font-medium text-[14px] text-left ml-1.5 overflow-hidden block transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                  open
                                    ? "opacity-100 max-w-[170px] translate-x-0"
                                    : "opacity-0 max-w-0 ml-0 -translate-x-3 pointer-events-none"
                                )}
                              >
                                {child.label}
                              </span>
                            </div>
                            <div
                              className={cn(
                                "flex items-center shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
                                open
                                  ? "opacity-100 max-w-[50px] translate-x-0 mr-1"
                                  : "opacity-0 max-w-0 translate-x-2 pointer-events-none mr-0"
                              )}
                            >
                              {child.badge > 0 && (
                                <span
                                  className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                                  data-background-color={isActive ? activeForeground : activeColor}
                                  data-color={isActive ? activeColor : activeForeground}
                                  style={{
                                    backgroundColor: isActive ? activeForeground : activeColor,
                                    color: isActive ? activeColor : activeForeground,
                                  }}
                                >
                                  {child.badge > 99 ? "99+" : child.badge}
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
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
              <a
                key={item.key}
                data-sidebar-key={item.key}
                href={`${pathname}?view=${item.key}`}
                onClick={(e) => handleLinkClick(e, item.key)}
                title={!open ? item.label : undefined}
                data-tooltip-placement="right"
                data-background-color={isActive ? activeColor : undefined}
                style={isActive ? { backgroundColor: activeColor, color: activeForeground } : undefined}
                className={cn(
                  "flex w-full h-[40px] items-center rounded-[8px] text-[13.5px] outline-none cursor-pointer transition-colors duration-200 ease-out relative group select-none overflow-hidden shrink-0",
                  open ? "px-1 justify-start" : "px-0 justify-center",
                  isActive
                    ? "font-medium shadow-2xs rms-style-background-color"
                    : "text-[#1D1D1F] dark:text-zinc-200 hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/5 font-normal"
                )}
              >
                <div
                  className={cn(
                    "flex items-center overflow-hidden",
                    open ? "min-w-0 flex-1" : "justify-center w-full"
                  )}
                >
                  <span className="relative w-[38px] h-[38px] flex items-center justify-center shrink-0">
                    <HugeIcon
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
                  {open && (
                    <span className="whitespace-nowrap font-medium text-[14px] text-left ml-1.5 overflow-hidden block">
                      {item.label}
                    </span>
                  )}
                </div>

                {open && (
                  <div className="flex items-center shrink-0 mr-1">
                    {item.badge > 0 && (
                      <span
                        className="rms-style-background-color rms-style-color flex h-[16px] min-w-[16px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                        data-background-color={isActive ? activeForeground : activeColor}
                        data-color={isActive ? activeColor : activeForeground}
                        style={{
                          backgroundColor: isActive ? activeForeground : activeColor,
                          color: isActive ? activeColor : activeForeground,
                        }}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </div>
                )}
              </a>
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
                  <button
                    type="button"
                    className={cn(
                      "group flex items-center gap-2.5 w-full p-1.5 rounded-xl transition-all cursor-pointer select-none text-left border border-transparent",
                      menuOpen
                        ? "bg-gray-100 dark:bg-zinc-850 border-gray-200/80 dark:border-white/10 shadow-2xs"
                        : "hover:bg-gray-100/80 dark:hover:bg-zinc-900/80"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative h-9 w-9 rounded-full bg-white dark:bg-zinc-850 flex items-center justify-center text-[13px] font-bold border border-gray-200 dark:border-white/10 shadow-2xs shrink-0 text-gray-700 dark:text-zinc-300 overflow-hidden">
                      {currentAvatarFilename && !imageError ? (
                        <>
                          <img
                            src={`/api/account/avatar?id=${authUser?.id}&t=${avatarTimestamp}`}
                            alt=""
                            className={cn(
                              "w-full h-full object-cover scale-[1.2]",
                              imageLoaded ? "block" : "hidden"
                            )}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                          />
                          {!imageLoaded && (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-zinc-800 animate-pulse">
                              <HugeIcon className="ph-bold ph-user text-[14px] text-gray-400 dark:text-zinc-500" />
                            </div>
                          )}
                        </>
                      ) : (
                        initials
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0 flex flex-col leading-tight">
                      <span className="text-[13px] font-bold text-gray-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 truncate">
                        {displayRole}
                      </span>
                    </div>

                    {/* Upward Caret icon */}
                    <HugeIcon className="ph-bold ph-caret-up text-[12px] text-gray-400 dark:text-zinc-500 shrink-0 ml-1 transition-transform group-hover:text-gray-600 dark:group-hover:text-zinc-300" />
                  </button>
                ) : (
                  <button
                    type="button"
                    title={`${displayName} (${displayRole})`}
                    className={cn(
                      "flex w-[38px] h-[38px] items-center justify-center rounded-xl transition-all cursor-pointer mx-auto",
                      menuOpen
                        ? "bg-gray-100 dark:bg-zinc-850 border border-gray-200/80 dark:border-white/10 shadow-2xs"
                        : "hover:bg-gray-100/80 dark:hover:bg-zinc-900/80"
                    )}
                  >
                    <div className="relative h-8 w-8 rounded-full bg-white dark:bg-zinc-850 flex items-center justify-center text-xs font-bold border border-gray-200 dark:border-white/10 shadow-2xs shrink-0 text-gray-700 dark:text-zinc-300 overflow-hidden">
                      {currentAvatarFilename && !imageError ? (
                        <img
                          src={`/api/account/avatar?id=${authUser?.id}&t=${avatarTimestamp}`}
                          alt=""
                          className="w-full h-full object-cover scale-[1.2]"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  </button>
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
      </aside>

      {/* COMMAND PALETTE MODAL */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent
          hideClose={true}
          className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200/80 dark:border-white/10">
            <HugeIcon className="ph-bold ph-magnifying-glass text-xl text-pup-maroon dark:text-red-400 shrink-0" />
            <input
              ref={commandInputRef}
              type="text"
              aria-label="Search views and actions"
              placeholder="Type a sidebar view or action to navigate..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleCommandKeyDown}
              className="flex-1 bg-transparent border-0 outline-none text-[16px] font-normal text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded select-none">
              ESC
            </kbd>
          </div>

          <div className="max-h-[450px] overflow-y-auto p-2 [scrollbar-width:thin]">
            {filteredGroups.length > 0 ? (
              (() => {
                let currentGlobalIndex = 0;
                return filteredGroups.map((group) => (
                  <div key={group.id} className="mb-2.5 last:mb-0">
                    <div className="px-3 pt-2 pb-1 text-[11.5px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between select-none">
                      <span className="flex items-center gap-1.5">
                        <span>{group.title}</span>
                      </span>
                      {group.badge && (
                        <span className="font-semibold text-[9.5px] text-gray-400 dark:text-zinc-500">
                          {group.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const globalIdx = currentGlobalIndex++;
                        const isFocused = focusedIndex === globalIdx;
                        const itemKey = item.section
                          ? `${item.view}-${item.section}`
                          : item.view || item.url || item.action || item.label;
                        const isActiveTab =
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
                            id={`command-item-${globalIdx}`}
                            key={itemKey}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setFocusedIndex(globalIdx)}
                            className={cn(
                              "w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer border-0 outline-none select-none",
                              isFocused
                                ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-50 shadow-2xs"
                                : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100/70 dark:hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  isFocused
                                    ? "bg-pup-maroon text-white dark:bg-white dark:text-zinc-900"
                                    : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                                )}
                              >
                                <HugeIcon className={cn(item.icon, "text-[16px]")} title={item.label} />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[14px] font-medium truncate">
                                    {item.label}
                                  </span>
                                  {isActiveTab && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                                      Active
                                    </span>
                                  )}
                                </div>
                                {item.breadcrumb && (
                                  <span className="text-[11.5px] text-gray-400 dark:text-zinc-500 font-normal truncate mt-0.5">
                                    {item.breadcrumb}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.shortcut && (
                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded border border-gray-200 dark:border-zinc-700">
                                  {item.shortcut}
                                </kbd>
                              )}
                              {isFocused && (
                                <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400 flex items-center gap-1">
                                  <span>Select</span>
                                  <kbd className="px-1 py-0.5 rounded bg-pup-maroon/10 dark:bg-white/10 text-[9px] font-mono">
                                    ↵
                                  </kbd>
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
                <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl mb-2 opacity-50" />
                <div className="text-sm font-medium">No matching views or actions found</div>
                <div className="text-xs text-gray-400 mt-1">
                  Try searching for a sidebar section, view name, or control
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/90 dark:bg-zinc-850/70 border-t border-gray-200/80 dark:border-white/10 text-[11px] text-gray-500 dark:text-zinc-400 select-none">
            <div className="flex items-center gap-3.5">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  ↓
                </kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  ↵
                </kbd>
                <span>select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  ESC
                </kbd>
                <span>close</span>
              </span>
              <span className="hidden md:flex items-center gap-1 text-[10px] text-gray-400">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  {isMac ? "⌘B" : "CTRL B"}
                </kbd>
                <span>sidebar</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-gray-400 dark:text-zinc-500 text-[10px]">
              <span>
                {isStudent
                  ? "Student Portal"
                  : activeView === "systemadmin"
                    ? "System Admin"
                    : activeView === "admin"
                      ? "Office Admin"
                      : "Staff"}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[310px] sm:w-[360px] p-0 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-white/10 flex flex-col"
        >
          <SheetHeader className="p-4 border-b border-gray-200/80 dark:border-white/10 flex flex-row items-center gap-2.5">
            <img
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
              <SheetTitle className="font-bold text-base leading-tight text-gray-900 dark:text-zinc-50">
                eManage
              </SheetTitle>
              <SheetDescription className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
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

          <div className="p-3 pb-1 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => {
                setMobileDrawerOpen(false);
                setSearchQuery("");
                setFocusedIndex(0);
                setCommandOpen(true);
              }}
              className="w-full h-10 px-3.5 flex items-center justify-between rounded-xl bg-gray-100/80 hover:bg-gray-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 dark:text-zinc-400 text-xs border border-gray-200/80 dark:border-white/10 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <HugeIcon className="ph-bold ph-magnifying-glass text-sm text-pup-maroon dark:text-red-400" />
                <span className="font-medium text-gray-700 dark:text-zinc-200">
                  Search views, actions...
                </span>
              </div>
              <kbd className="inline-flex items-center justify-center px-1.5 h-5 text-[9px] font-bold text-gray-400 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded shadow-2xs leading-none">
                {isMac ? "⌘K" : "CTRL K"}
              </kbd>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:thin]">
            {filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
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
                            <HugeIcon className={cn(item.icon, "text-[16px]")} title={item.label} />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
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
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-zinc-50">
              Session Expired
            </DialogTitle>
            <DialogDescription className="font-medium text-gray-500 pt-2 dark:text-zinc-400">
              Your active session has ended or you signed out from another window. Please sign in
              again to continue using the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              onClick={handleSessionExpiredRedirect}
              className="w-full h-10 px-5 text-xs font-semibold rounded-xl bg-pup-maroon hover:bg-pup-darkMaroon text-white dark:bg-red-600 dark:hover:bg-red-500 dark:text-white shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Sign In Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
