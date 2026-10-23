"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
import { isAdminRole, getOfficePrefix, getOfficeRoleLabel, isSystemAdminRole, hasAdminPrivileges } from "@/lib/roleUtils";
import { getRoleBranding } from "@/lib/roleBranding";
import { cn } from "@/lib/utils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import {
  getHighContrastPreference,
  toggleHighContrastPreference,
  HIGH_CONTRAST_EVENT,
} from "@/lib/accessibility";

export default function Header({ authUser, onLogout, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [preferredView, setPreferredView] = useState(null);
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMac] = useState(() => (typeof window !== "undefined" ? /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform) : false));

  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const commandInputRef = useRef(null);

  const [currentAvatarFilename, setCurrentAvatarFilename] = useState(authUser?.avatar_filename || null);
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

  // Global shortcut (Ctrl+K to toggle command palette, Ctrl+B to toggle sidebar)
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

  // Listen for mobile drawer toggle events
  useEffect(() => {
    const handleToggleMobile = () => setMobileDrawerOpen((prev) => !prev);
    window.addEventListener("toggle-mobile-drawer", handleToggleMobile);
    return () => window.removeEventListener("toggle-mobile-drawer", handleToggleMobile);
  }, []);

  // Listen for external open-command-palette events (e.g. from Sidebar or Topbar)
  useEffect(() => {
    const handleOpenCommand = () => {
      setSearchQuery("");
      setFocusedIndex(0);
      setCommandOpen(true);
    };
    window.addEventListener("open-command-palette", handleOpenCommand);
    return () => window.removeEventListener("open-command-palette", handleOpenCommand);
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
  const isStudent = String(authUser?.role || "").toLowerCase() === "student";
  const isAdmin = isAdminRole(authUser?.role);
  const hasAdminRights = hasAdminPrivileges(authUser?.role);
  const branding = getRoleBranding(authUser);

  useEffect(() => {
    if (branding?.color) {
      document.documentElement.style.setProperty("--brand-accent", branding.color);
      document.documentElement.style.setProperty("--brand-foreground", branding.foreground || "#ffffff");
    }
  }, [branding?.color, branding?.foreground]);

  useEffect(() => {
    if (isSuperAdmin) {
      const timer = setTimeout(() => {
        setPreferredView("systemadmin");
      }, 0);
      return () => clearTimeout(timer);
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

  const cleanFirst = authUser?.fname && !authUser.fname.startsWith("enc:v1:") ? authUser.fname.trim() : "";
  const cleanLast = authUser?.lname && !authUser.lname.startsWith("enc:v1:") ? authUser.lname.trim() : "";
  const cleanName = authUser?.name && !authUser.name.startsWith("enc:v1:") ? authUser.name.trim() : "";
  const cleanEmail = authUser?.email && !authUser.email.startsWith("enc:v1:") ? authUser.email.trim() : "";
  const cleanUsername = authUser?.username && !authUser.username.startsWith("enc:v1:") ? authUser.username.trim() : "";

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
    : (pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin"))
      ? "systemadmin"
      : (pathname?.startsWith("/admin"))
        ? "admin"
          : (pathname?.startsWith("/staff"))
          ? "staff"
          : (isStudent ? "student" : (preferredView || (isAdmin ? "admin" : "staff")));

  const handleViewSwitch = (viewKey) => {
    localStorage.setItem("pup_admin_view_pref", viewKey);
    setPreferredView(viewKey);
    router.push(viewKey === "systemadmin" || viewKey === "superadmin" ? "/systemadmin" : (viewKey === "admin" ? "/admin" : "/staff"));
  };

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

  useEffect(() => {
    router.prefetch("/staff");
    router.prefetch("/admin");
    if (isSuperAdmin) router.prefetch("/systemadmin");
  }, [router, isSuperAdmin]);

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
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
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

  // Dynamically reflect the current view role & accent color based on activeView
  const currentViewRole = (() => {
    if (isStudent) return "Student";
    if (isSuperAdmin || activeView === "systemadmin" || activeView === "superadmin") {
      return "System Administrator";
    }
    if (activeView === "admin") {
      return (authUser?.office_short_name || authUser?.office_id) ? `${getOfficePrefix(authUser)} Admin` : "Administrator";
    }
    if (activeView === "staff") {
      return (authUser?.office_short_name || authUser?.office_id) ? `${getOfficePrefix(authUser)} Staff` : "Staff";
    }
    return getOfficeRoleLabel(authUser?.role, authUser);
  })();

  const displayRole = isSuperAdmin ? "System Administrator" : currentViewRole;

  // Track active tab view to display "Active" indicator in Command Palette
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
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v) setCurrentTab(v);
    }
  }, [pathname, commandOpen]);

  const defaultTab = isStudent
    ? "odrs"
    : activeView === "systemadmin"
      ? "offices"
      : activeView === "admin"
        ? "review"
        : "requests";
  const activeTabKey = currentTab || defaultTab;

  // ---------------------------------------------------------------------------
  // STRUCTURED COMMAND PALETTE HIERARCHY (SIDEBAR GROUPS + CONTROLS + ACCOUNT)
  // ---------------------------------------------------------------------------
  const { filteredGroups, flatSuggestions } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const enabledModules = new Set(authUser?.enabled_modules || []);
    const hasModuleFilter = Array.isArray(authUser?.enabled_modules) && authUser.enabled_modules.length > 0;

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
              keywords: "offices departments stations campus registry osas admissions library accounting admin governance units colleges add department new office",
            },
            {
              label: "Department Features",
              view: "modules",
              icon: "ph-bold ph-squares-four",
              breadcrumb: "Institutional Governance • View",
              keywords: "features matrix permissions feature flags modules config toggle access roles supervisor staff tools category registrar osas",
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
              keywords: "service standards sla citizen charter arta ra 11032 turnaround time processing benchmark deadlines commitments fast-track university standard",
            },
            {
              label: "Campus Operations",
              view: "health",
              icon: "ph-bold ph-activity",
              breadcrumb: "Campus Operations • View",
              keywords: "campus operations system health telemetry status memory database ping metrics activity monitoring registrar queue osas proposals transactions live operations",
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
              keywords: "institutional identity branding logo seal university school credentials jurisdiction prefix name color pdf header letterhead institution identity accent white label report style",
            },
            {
              label: "Landing Page CMS",
              view: "landing",
              icon: "ph-bold ph-layout",
              breadcrumb: "Public Portal & Identity • View",
              keywords: "landing page cms public portal content website builder customization homepage portal editor",
            },
            {
              label: "Landing CMS: Hero Section",
              view: "landing",
              section: "hero",
              icon: "ph-bold ph-image",
              breadcrumb: "Landing CMS • Section",
              keywords: "landing cms hero section banner headline slides background photos rotation",
            },
            {
              label: "Landing CMS: Workflow & Steps",
              view: "landing",
              section: "workflow",
              icon: "ph-bold ph-git-merge",
              breadcrumb: "Landing CMS • Section",
              keywords: "landing cms workflow steps how it works pipeline guide process",
            },
            {
              label: "Landing CMS: Academic Catalog",
              view: "landing",
              section: "catalog",
              icon: "ph-bold ph-books",
              breadcrumb: "Landing CMS • Section",
              keywords: "landing cms academic catalog courses degrees document types requirements",
            },
            {
              label: "Landing CMS: FAQ Section",
              view: "landing",
              section: "faq",
              icon: "ph-bold ph-question",
              breadcrumb: "Landing CMS • Section",
              keywords: "landing cms faq accordion questions answers help support common inquiries",
            },
            {
              label: "Landing CMS: Institutional Footer",
              view: "landing",
              section: "footer",
              icon: "ph-bold ph-panel-bottom",
              breadcrumb: "Landing CMS • Section",
              keywords: "landing cms footer credentials address contact copyright socials links",
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
              keywords: "directory personnel users accounts staff global roles administrators employees add user invite staff",
            },
            {
              label: "Security Questions",
              view: "security",
              icon: "ph-bold ph-shield-check",
              breadcrumb: "Personnel & Access • View",
              keywords: "security questions password reset recovery verification questions authentication default security questions",
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
              keywords: "audit logs security platform activity history transactions compliance events logs export audit trail",
            },
            {
              label: "Platform Backups",
              view: "backups",
              icon: "ph-bold ph-cloud-arrow-up",
              breadcrumb: "System & Security • View",
              keywords: "platform backups database snapshots postgres dump restore export recovery archive maintenance automated schedule cloud backup restore download",
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
              keywords: "approve decline pending documents review scans verify verification records review queue",
            },
            {
              label: "Compliance Analytics",
              view: "digitization",
              icon: "ph-bold ph-chart-bar",
              module: "compliance_analytics",
              breadcrumb: "Records & Verification • View",
              keywords: "metrics compliance digitization statistics kpi analytics progress monitoring",
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
              keywords: "sla analytics turnaround duration requests fulfillment speed document requests",
            },
            {
              label: "Storage Room Layout",
              view: "storage_layout",
              icon: "ph-bold ph-warehouse",
              module: "storage_layout",
              breadcrumb: "Operations & Fulfillment • View",
              keywords: "storage room cabinet drawer layout 2d map archive physical locator storage editor",
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
              keywords: "directory staff users personnel accounts team members roles active inactive",
            },
            {
              label: "Activity History",
              view: "logs",
              icon: "ph-bold ph-history",
              module: "audit_logs",
              breadcrumb: "Personnel & Governance • View",
              keywords: "audit trail history logs security compliance user activity events",
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
              keywords: "courses sections doc types document types config system data institutional",
            },
            {
              label: "Backup & Recovery",
              view: "system",
              icon: "ph-bold ph-cloud-arrow-up",
              module: "backup",
              breadcrumb: "System & Maintenance • View",
              keywords: "backup maintenance database restore export encrypted snapshots recovery snapshots",
            },
          ],
        },
      ];

      candidateGroups = allAdminGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !hasModuleFilter || !item.module || enabledModules.has(item.module)),
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
              keywords: "document requests odrs transcript diploma certification operations processing client requests",
            },
            {
              label: "OSAS Monitoring",
              view: "osas_monitoring",
              icon: "ph-bold ph-student",
              module: "osas_monitoring",
              breadcrumb: "Service & Requests • View",
              keywords: "osas student affairs proposals events monitoring activities organizations student submissions",
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
              keywords: "scan upload ocr document new ingest single upload file scanner digitization",
            },
            {
              label: "Batch Review",
              view: "batch_review",
              icon: "ph-bold ph-check-square",
              module: "scan_upload",
              breadcrumb: "Scanning & Document Upload • View",
              keywords: "batch review scan queue bulk verification inspect documents approve decline scans",
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
              keywords: "student directory students profiles records directory list search archive",
            },
            {
              label: "Student Organizations",
              view: "organizations",
              icon: "ph-bold ph-buildings",
              module: "student_organizations",
              breadcrumb: "Student & Organization Roster • View",
              keywords: "student organizations osas cbl bylaws officers authorized student leaders roster accreditation",
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
              keywords: "records archive search students repository files folders year levels browse files",
            },
            {
              label: "Storage Explorer",
              view: "storage",
              icon: "ph-bold ph-folder-open",
              module: "storage_explorer",
              breadcrumb: "Archive & Storage • View",
              keywords: "physical archive explorer room cabinet drawer storage 2d locator map locator",
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
              keywords: "documents student records files matrix status table repository search documents",
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
              keywords: "overview dashboard home status recent activities tracking quick actions summary blockers alerts",
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
              keywords: "document requests odrs transcript diploma certificate grades official records tracking new request status",
            },
            {
              label: "Document Checklist & Compliance",
              view: "compliance",
              icon: "ph-bold ph-clipboard-text",
              breadcrumb: "Academic Records • View",
              keywords: "document checklist compliance requirements missing documents submitted documents compliance status form 137 psa birth certificate unsubmitted pending",
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
              keywords: "osas submissions event proposals activity student affairs organizations clearance submit proposal",
            },
          ],
        },
      ];
    }

    // Universal Sidebar Controls & Navigation Utilities
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
          keywords: "toggle sidebar collapse expand hide show drawer panel navigation view hide sidebar",
        },
        {
          label: isHighContrast ? "Disable High Contrast Mode" : "Enable High Contrast Mode",
          action: "toggle-contrast",
          icon: "ph-bold ph-circle-half",
          breadcrumb: "Accessibility • Display",
          keywords: "high contrast accessibility display contrast black white theme readability toggle colors",
        },
        ...(!isStudent ? [
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
        ] : []),
        ...(hasAdminRights && !isSuperAdmin ? [
          activeView === "admin" ? {
            label: "Switch to Staff View",
            action: "switch-role",
            targetRole: "staff",
            icon: "ph-bold ph-users",
            breadcrumb: "Role Mode • Action",
            keywords: "switch to staff view operations portal toggle role personnel",
          } : {
            label: "Switch to Admin View",
            action: "switch-role",
            targetRole: "admin",
            icon: "ph-bold ph-shield-check",
            breadcrumb: "Role Mode • Action",
            keywords: "switch to admin view administrator management toggle role governance",
          }
        ] : []),
          ...((pathname === "/account") ? [
          {
            label: "Return to Dashboard",
            action: "return-dashboard",
            icon: "ph-bold ph-layout",
            breadcrumb: "Navigation • Action",
            keywords: "return back dashboard home main view exit settings leave",
          }
        ] : []),
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
  }, [searchQuery, activeView, authUser, isStudent, isSuperAdmin, hasAdminRights, isMac, pathname, isHighContrast]);

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
        description: next ? "Enhanced border boundaries and text contrast are now active." : "Standard display contrast restored."
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
      const isSystemAdmin = activeView === "systemadmin";
      const onSystemAdminPage = pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin");

      const params = new URLSearchParams({ view: item.view });
      if (item.section) params.set("section", item.section);
      if (item.officeId) params.set("office", item.officeId);

      if (isStudent) {
        if (!pathname?.startsWith("/student")) {
          router.push(`/student?${params.toString()}`);
        } else {
          window.dispatchEvent(new CustomEvent("switch-view", {
            detail: { view: item.view }
          }));
        }
      } else if (isSystemAdmin && !onSystemAdminPage) {
        router.push(`/systemadmin?${params.toString()}`);
      } else if (pathname === "/account") {
        const targetPath = isStudent ? "/student" : (isSystemAdmin ? "/systemadmin" : (activeView === "admin" ? "/admin" : "/staff"));
        router.push(`${targetPath}?${params.toString()}`);
      } else {
        window.dispatchEvent(new CustomEvent("switch-view", {
          detail: { view: item.view, section: item.section, officeId: item.officeId }
        }));
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

  // Scroll focused command item into view
  useEffect(() => {
    if (commandOpen) {
      const el = document.getElementById(`command-item-${focusedIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, commandOpen]);

  return (
    <header className="bg-white/75 backdrop-blur-xl dark:bg-zinc-950/75 border-b border-gray-200/80 dark:border-white/10 flex-none z-30 select-none transition-colors duration-200 shadow-[0_1px_6px_rgba(0,0,0,0.02)]">
      <AccountSetupModal authUser={authUser} />
      <div className="w-full px-4 sm:px-6 h-[60px] flex items-center justify-between gap-3">
        
        {/* LEFT: Branding & Workspace Context Pill (Changes per active view) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {authUser && (
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex h-10 w-10 min-w-[40px] min-h-[40px] items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 shrink-0"
              aria-label="Open portal navigation menu"
            >
              <HugeIcon className="ph-bold ph-list text-xl" />
            </button>
          )}
          <div 
            className="flex items-center gap-2 cursor-pointer group/logo select-none"
            onClick={handleMainDashboardClick}
            onDoubleClick={(e) => e.preventDefault()}
          >
            <img 
              src={branding.iconSrc}
              alt="eManage Logo" 
              className={cn("h-7 w-7 object-contain transition-transform group-hover/logo:scale-105", isStudent && "brightness-0 saturate-100")}
              style={isStudent ? { filter: "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)" } : undefined}
            />
            <span className={cn("font-bold text-[19px] tracking-tight leading-none group-hover/logo:opacity-75 transition-opacity", "text-gray-900 dark:text-zinc-50")}>
              eManage
            </span>
          </div>
        </div>

        {/* CENTER: Optional Children */}
        {children && (
          <div className="flex-1 flex items-center justify-center max-w-lg px-2">
            {children}
          </div>
        )}

        {/* RIGHT: User Profile Pill Trigger + Original Popover Design */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="focus:outline-none select-none">
              <div className={cn(
                "flex items-center gap-2 py-1.5 px-2 sm:pr-3 rounded-xl transition-all border border-transparent cursor-pointer",
                menuOpen 
                  ? "bg-gray-100 dark:bg-zinc-850 border-gray-200/80 dark:border-white/10 shadow-2xs" 
                  : "hover:bg-gray-100/70 dark:hover:bg-zinc-900"
              )}>
                <div className="relative h-9 w-9 rounded-full bg-white flex items-center justify-center text-[13px] font-bold border overflow-hidden shadow-2xs shrink-0 text-gray-700 dark:bg-zinc-850 dark:text-zinc-300 border-gray-200 dark:border-white/10">
                  {currentAvatarFilename && !imageError ? (
                    <>
                      <img 
                        src={`/api/account/avatar?id=${authUser.id}&t=${avatarTimestamp}`}
                        alt=""
                        className={cn("w-full h-full object-cover scale-[1.2]", imageLoaded ? "block" : "hidden")}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                      />
                      {!imageLoaded && (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-zinc-800 animate-pulse">
                          <HugeIcon  className="ph-bold ph-user text-[14px] text-gray-400 dark:text-zinc-550" />
                        </div>
                      )}
                    </>
                  ) : (
                    initials
                  )}
                </div>

                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-[13px] font-bold truncate max-w-[140px] text-gray-800 dark:text-zinc-100">
                    {displayName}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                    {displayRole}
                  </span>
                </div>

                <HugeIcon  className="ph-bold ph-caret-down text-[11px] text-gray-400 dark:text-zinc-500 shrink-0 ml-0.5"></HugeIcon>
              </div>
            </DropdownMenuTrigger>
            
            {/* Popover content with Three-Zone Architecture */}
            <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-2xl border border-border dark:border-white/10 shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900 select-none">
              {/* 1. Header Zone */}
              <div className="bg-gray-50/70 dark:bg-zinc-800/50 px-4 py-3 border-b border-border dark:border-white/10 flex items-center justify-between text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-9 w-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-xs font-bold border border-border dark:border-white/10 shadow-xs shrink-0 text-gray-800 dark:text-zinc-100 overflow-hidden">
                    {currentAvatarFilename && !imageError ? (
                      <img 
                        src={`/api/account/avatar?id=${authUser.id}&t=${avatarTimestamp}`}
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/15 dark:text-red-300 border-pup-maroon/20 shrink-0">
                  {displayRole}
                </span>
              </div>

              {/* 2. Body Zone */}
              <DropdownMenuGroup className="p-1.5 flex flex-col gap-0.5">
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
                    className={cn(
                      "cursor-pointer rounded-xl flex items-center gap-2.5 text-xs font-medium py-2 px-3 transition-colors outline-none",
                      "text-gray-700 hover:bg-gray-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    )}
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
                    <HugeIcon className={cn(
                      "text-sm shrink-0",
                      activeView === "admin" ? "ph-bold ph-users text-blue-600 dark:text-blue-400" : "ph-bold ph-shield-check text-purple-600 dark:text-purple-400"
                    )} />
                    <span>{activeView === "admin" ? "Switch to Staff View" : "Switch to Admin View"}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              {/* 3. Footer Zone */}
              <div className="p-1.5 border-t border-border dark:border-white/10 bg-gray-50/70 dark:bg-zinc-800/50">
                <button
                  type="button"
                  onClick={handleLogoutAction}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/40"
                >
                  <HugeIcon className="ph-bold ph-sign-out text-sm" />
                  <span>Sign Out</span>
                </button>
              </div>
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
          className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
        >
          {/* Top Search Input Section */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200/80 dark:border-white/10">
            <HugeIcon  className="ph-bold ph-magnifying-glass text-xl text-pup-maroon dark:text-red-400 shrink-0"></HugeIcon>
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

          {/* Results List */}
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
                          : (item.view || item.url || item.action || item.label);
                        const isActiveTab =
                          item.view &&
                          !item.section &&
                          item.view === activeTabKey &&
                          (isStudent
                            ? pathname?.startsWith("/student")
                            : activeView === "systemadmin"
                            ? pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin")
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
                                <HugeIcon className={cn(item.icon, "text-[16px]")} title={item.label}></HugeIcon>
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
                                  <kbd className="px-1 py-0.5 rounded bg-pup-maroon/10 dark:bg-white/10 text-[9px] font-mono">↵</kbd>
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
                <HugeIcon  className="ph-duotone ph-magnifying-glass text-3xl mb-2 opacity-50"></HugeIcon>
                <div className="text-sm font-medium">No matching views or actions found</div>
                <div className="text-xs text-gray-400 mt-1">Try searching for a sidebar section, view name, or control</div>
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
              <span className="hidden md:flex items-center gap-1 text-[10px] text-gray-400">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-[9px] shadow-2xs">
                  {isMac ? "⌘B" : "CTRL B"}
                </kbd>
                <span>sidebar</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-gray-400 dark:text-zinc-500 text-[10px]">
              
              <span>{isStudent ? "Student Portal" : (activeView === "systemadmin" ? "System Admin" : (activeView === "admin" ? "Office Admin" : "Staff"))}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-[310px] sm:w-[360px] p-0 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-white/10 flex flex-col">
          <SheetHeader className="p-4 border-b border-gray-200/80 dark:border-white/10 flex flex-row items-center gap-2.5">
            <img 
              src={branding.iconSrc}
              alt="eManage Logo" 
              className={cn("h-7 w-7 object-contain", isStudent && "brightness-0 saturate-100")}
              style={isStudent ? { filter: "brightness(0) saturate(100%) invert(13%) sepia(95%) saturate(3180%) hue-rotate(355deg) brightness(77%) contrast(118%)" } : undefined}
            />
            <div>
              <SheetTitle className="font-bold text-base leading-tight text-gray-900 dark:text-zinc-50">
                eManage
              </SheetTitle>
              <SheetDescription className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">
                {isStudent ? "Student Portal" : (activeView === "systemadmin" ? "System Admin" : (activeView === "admin" ? "Office Admin" : "Staff"))}
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
                <span className="font-medium text-gray-700 dark:text-zinc-200">Search views, actions...</span>
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
                      : (item.view || item.url || item.action || item.label);
                    const isActive =
                      item.view &&
                      !item.section &&
                      item.view === activeTabKey &&
                      (isStudent
                        ? pathname?.startsWith("/student")
                        : activeView === "systemadmin"
                        ? pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin")
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
              Your active session has ended or you signed out from another window. Please sign in again to continue using the system.
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
    </header>
  );
}
