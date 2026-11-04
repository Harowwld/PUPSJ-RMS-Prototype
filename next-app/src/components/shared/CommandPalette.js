"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { matchesSearchQuery } from "@/lib/searchUtils";
import {
  getHighContrastPreference,
  toggleHighContrastPreference,
  HIGH_CONTRAST_EVENT,
} from "@/lib/accessibility";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AppIcon from "@/components/ui/app-icon";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import {
  Search01Icon,
  Cancel01Icon,
  Time01Icon,
  UserIcon,
  WarehouseIcon,
  SparklesIcon,
  Loading03Icon,
  Copy01Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  LayoutLeftIcon,
  CircleIcon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  ArrowLeftRightIcon,
  Shield01Icon,
  Settings01Icon,
  Logout01Icon,
  DashboardSquare01Icon,
  Building01Icon,
  Task01Icon,
  FingerPrintScanIcon,
  Archive01Icon,
  FolderOpenIcon,
  Notification01Icon,
  ClipboardIcon,
  StudentIcon,
  FileUploadIcon,
  Activity01Icon,
  HourglassIcon,
  Analytics01Icon,
  Certificate01Icon,
  Image01Icon,
  GitMergeIcon,
  LibraryIcon,
  HelpCircleIcon,
  LayoutBottomIcon,
  UserSearch01Icon,
  CloudUploadIcon,
  LayoutGridIcon,
  CheckmarkBadge01Icon,
} from "hugeicons-react";

const RECENT_COMMANDS_KEY = "pupsj_command_recent_v1";
const MAX_RECENTS = 5;

const SCOPE_TABS = [
  { id: "all", label: "All" },
  { id: "navigation", label: "Views" },
  { id: "actions", label: "Actions" },
  { id: "records", label: "Records" },
  { id: "system", label: "System" },
];

/**
 * Helper to safely extract 2-letter uppercase initials for profile avatars
 */
function getInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Universal icon renderer supporting Hugeicons forwardRef components, functions, and string identifiers
 */
function PaletteIcon({ icon, className, size = "1em" }) {
  if (!icon) return null;
  if (
    typeof icon === "function" ||
    (typeof icon === "object" && icon !== null && (icon.$$typeof || typeof icon.render === "function"))
  ) {
    const IconComponent = icon;
    return <IconComponent size={size} className={className} />;
  }
  return <AppIcon icon={icon} className={className} size={size} />;
}

/**
 * High-precision substring matching component for Apple Spotlight results
 */
function HighlightMatches({ text, query }) {
  if (!text) return null;
  const q = String(query || "").trim();
  if (!q) return <span>{text}</span>;

  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lowerText.indexOf(lowerQ);

  if (idx === -1) {
    return <span>{text}</span>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span>
      {before}
      <span className="font-semibold text-pup-maroon dark:text-red-400 bg-pup-maroon/10 dark:bg-white/10 px-0.5 rounded-sm">
        {match}
      </span>
      {after}
    </span>
  );
}

export default function CommandPalette({
  open,
  onOpenChange,
  authUser,
  activeView,
  isStudent,
  isSuperAdmin,
  hasAdminRights,
  onLogout,
  onViewSwitch,
  onMainDashboard,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [internalOpen, setInternalOpen] = useState(false);
  const isPaletteOpen = open !== undefined ? open : internalOpen;
  const setIsPaletteOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeScope, setActiveScope] = useState("all");
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Live university data search states
  const [liveStudents, setLiveStudents] = useState([]);
  const [liveRequests, setLiveRequests] = useState([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);

  // High contrast state initialized lazily
  const [isHighContrast, setIsHighContrast] = useState(() =>
    typeof window !== "undefined" ? getHighContrastPreference(authUser?.id) : false
  );

  // Recent commands from localStorage initialized lazily
  const [recentCommands, setRecentCommands] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.slice(0, MAX_RECENTS);
        }
      } catch {
        // Fallback gracefully
      }
    }
    return [];
  });

  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [isMac] = useState(() =>
    typeof window !== "undefined"
      ? /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent || navigator.platform)
      : false
  );

  // Sync high contrast mode state on custom event
  useEffect(() => {
    const handleContrastChange = (e) => {
      if (e.detail && typeof e.detail.enabled === "boolean") {
        setIsHighContrast(e.detail.enabled);
      }
    };
    window.addEventListener(HIGH_CONTRAST_EVENT, handleContrastChange);
    return () => window.removeEventListener(HIGH_CONTRAST_EVENT, handleContrastChange);
  }, []);

  // Debounce search query for live database calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        if (!isPaletteOpen) {
          setSearchQuery("");
          setFocusedIndex(0);
          setActiveScope("all");
        }
        setIsPaletteOpen(!isPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isPaletteOpen, setIsPaletteOpen]);

  // External event trigger: "open-command-palette"
  useEffect(() => {
    const handleOpen = () => {
      setSearchQuery("");
      setFocusedIndex(0);
      setActiveScope("all");
      setIsPaletteOpen(true);
    };
    window.addEventListener("open-command-palette", handleOpen);
    return () => window.removeEventListener("open-command-palette", handleOpen);
  }, [setIsPaletteOpen]);

  // Autofocus input when modal opens
  useEffect(() => {
    if (isPaletteOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isPaletteOpen]);

  // Determine active tab key
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
      if (v) {
        const timer = setTimeout(() => setCurrentTab(v), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, isPaletteOpen]);

  const defaultTab = isStudent
    ? "odrs"
    : activeView === "systemadmin"
      ? "offices"
      : activeView === "admin"
        ? "review"
        : "requests";
  const activeTabKey = currentTab || defaultTab;

  // ---------------------------------------------------------------------------
  // LIVE DATABASE ASYNCHRONOUS SEARCH (STUDENTS & REQUESTS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      const timer = setTimeout(() => {
        setLiveStudents([]);
        setLiveRequests([]);
        setIsLiveSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    const startTimer = setTimeout(() => {
      setIsLiveSearching(true);
    }, 0);

    if (isStudent) {
      // Student portal live search (their own requests)
      fetch(`/api/student/document-requests`, { signal: ac.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          if (!payload?.ok || !Array.isArray(payload.data)) {
            setLiveRequests([]);
            return;
          }
          const filtered = payload.data
            .filter((item) =>
              matchesSearchQuery(
                [item.doc_type, item.status, item.id ? `REQ-${item.id}` : "", item.student_no],
                debouncedQuery
              )
            )
            .slice(0, 5);
          setLiveRequests(filtered);
        })
        .catch(() => {
          setLiveRequests([]);
        })
        .finally(() => {
          setIsLiveSearching(false);
        });
      return () => {
        clearTimeout(startTimer);
        ac.abort();
      };
    }

    // Staff & Admin live search: fetch both students and requests in parallel
    Promise.allSettled([
      fetch(`/api/students?q=${encodeURIComponent(debouncedQuery)}&limit=5`, { signal: ac.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => (res?.ok && Array.isArray(res.data) ? res.data : [])),
      fetch(`/api/document-requests?q=${encodeURIComponent(debouncedQuery)}&limit=5`, {
        signal: ac.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => (res?.ok && Array.isArray(res.data) ? res.data : [])),
    ])
      .then(([studentsRes, requestsRes]) => {
        if (studentsRes.status === "fulfilled") {
          setLiveStudents(studentsRes.value || []);
        } else {
          setLiveStudents([]);
        }

        if (requestsRes.status === "fulfilled") {
          setLiveRequests(requestsRes.value || []);
        } else {
          setLiveRequests([]);
        }
      })
      .finally(() => {
        setIsLiveSearching(false);
      });

    return () => {
      clearTimeout(startTimer);
      ac.abort();
    };
  }, [debouncedQuery, isStudent]);

  // ---------------------------------------------------------------------------
  // CANDIDATE GROUPS DEFINITION & FILTERING
  // ---------------------------------------------------------------------------
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
              id: "sys-offices",
              label: "Departments & Stations",
              view: "offices",
              icon: Building01Icon,
              scope: "navigation",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "offices departments stations campus registry osas admissions library accounting admin governance units colleges add department new office",
              description:
                "Manage institutional organizational units, campus stations, and office operational settings.",
            },
            {
              id: "sys-modules",
              label: "Department Features",
              view: "modules",
              icon: LayoutGridIcon,
              scope: "navigation",
              breadcrumb: "Institutional Governance • View",
              keywords:
                "features matrix permissions feature flags modules config toggle access roles supervisor staff tools category registrar osas",
              description:
                "Configure role-based feature matrices, module enablement, and operational permissions.",
            },
          ],
        },
        {
          id: "sys_ops",
          title: "Campus Operations",
          badge: "System Admin",
          items: [
            {
              id: "sys-standards",
              label: "Processing Time Standards",
              view: "standards",
              icon: HourglassIcon,
              scope: "navigation",
              breadcrumb: "Campus Operations • View",
              keywords:
                "service standards sla citizen charter arta ra 11032 turnaround time processing benchmark deadlines commitments fast-track university standard",
              description:
                "Set ARTA Citizen's Charter SLA benchmarks, processing windows, and document fulfillment standards.",
            },
            {
              id: "sys-health",
              label: "Campus Operations & Telemetry",
              view: "health",
              icon: Activity01Icon,
              scope: "system",
              breadcrumb: "Campus Operations • View",
              keywords:
                "campus operations system health telemetry status memory database ping metrics activity monitoring registrar queue osas proposals transactions live operations",
              description:
                "Live database connections, server metrics, process health, and queue latency telemetry.",
            },
          ],
        },
        {
          id: "sys_portal",
          title: "Public Portal & Identity",
          badge: "System Admin",
          items: [
            {
              id: "sys-branding",
              label: "Institutional Identity",
              view: "branding",
              icon: Certificate01Icon,
              scope: "navigation",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "institutional identity branding logo seal university school credentials jurisdiction prefix name color pdf header letterhead institution identity accent white label report style",
              description:
                "Customize university seal, primary brand color accents, and institutional PDF report letterheads.",
            },
            {
              id: "sys-landing",
              label: "Landing Page CMS",
              view: "landing",
              icon: DashboardSquare01Icon,
              scope: "navigation",
              breadcrumb: "Public Portal & Identity • View",
              keywords:
                "landing page cms public portal content website builder customization homepage portal editor",
              description:
                "Manage public-facing portal homepage sections, announcements, and catalog presentation.",
            },
            {
              id: "sys-landing-hero",
              label: "Landing CMS: Hero Section",
              view: "landing",
              section: "hero",
              icon: Image01Icon,
              scope: "navigation",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms hero section banner headline slides background photos rotation",
              description:
                "Configure hero title, mission subtitle, call-to-action badges, and banner assets.",
            },
            {
              id: "sys-landing-workflow",
              label: "Landing CMS: Workflow & Steps",
              view: "landing",
              section: "workflow",
              icon: GitMergeIcon,
              scope: "navigation",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms workflow steps how it works pipeline guide process",
              description:
                "Outline step-by-step document issuance guides and student verification pathways.",
            },
            {
              id: "sys-landing-catalog",
              label: "Landing CMS: Academic Catalog",
              view: "landing",
              section: "catalog",
              icon: LibraryIcon,
              scope: "navigation",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms academic catalog courses degrees document types requirements",
              description:
                "Present available credential certifications, transcript fees, and requirements.",
            },
            {
              id: "sys-landing-faq",
              label: "Landing CMS: FAQ Section",
              view: "landing",
              section: "faq",
              icon: HelpCircleIcon,
              scope: "navigation",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms faq accordion questions answers help support common inquiries",
              description:
                "Manage frequently asked questions regarding ODRS, admissions, and campus clearance.",
            },
            {
              id: "sys-landing-footer",
              label: "Landing CMS: Institutional Footer",
              view: "landing",
              section: "footer",
              icon: LayoutBottomIcon,
              scope: "navigation",
              breadcrumb: "Landing CMS • Section",
              keywords:
                "landing cms footer credentials address contact copyright socials links",
              description:
                "Campus office contact details, map address, hotline numbers, and legal disclaimers.",
            },
          ],
        },
        {
          id: "sys_access",
          title: "Personnel & Access",
          badge: "System Admin",
          items: [
            {
              id: "sys-staff",
              label: "Global Directory",
              view: "staff",
              icon: UserSearch01Icon,
              scope: "navigation",
              breadcrumb: "Personnel & Access • View",
              keywords:
                "directory personnel users accounts staff global roles administrators employees add user invite staff",
              description:
                "Manage staff records, office assignments, administrative designations, and accounts.",
            },
            {
              id: "sys-security",
              label: "Security Questions",
              view: "security",
              icon: Shield01Icon,
              scope: "system",
              breadcrumb: "Personnel & Access • View",
              keywords:
                "security questions password reset recovery verification questions authentication default security questions",
              description:
                "System default security verification challenges for self-service password recovery.",
            },
          ],
        },
        {
          id: "sys_system",
          title: "System & Security",
          badge: "System Admin",
          items: [
            {
              id: "sys-logs",
              label: "Platform Activity History",
              view: "logs",
              icon: Time01Icon,
              scope: "system",
              breadcrumb: "System & Security • View",
              keywords:
                "audit logs security platform activity history transactions compliance events logs export audit trail",
              description:
                "Immutable transaction ledger, operator events, IP origins, and compliance audit logs.",
            },
            {
              id: "sys-backups",
              label: "Platform Backups",
              view: "backups",
              icon: CloudUploadIcon,
              scope: "system",
              breadcrumb: "System & Security • View",
              keywords:
                "platform backups database snapshots postgres dump restore export recovery archive maintenance automated schedule cloud backup restore download",
              description:
                "Encrypted PostgreSQL database dumps, physical snapshot archives, and external synchronization.",
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
              id: "adm-review",
              label: "Records Review",
              view: "review",
              icon: CheckmarkBadge01Icon,
              module: "records_review",
              scope: "records",
              breadcrumb: "Records & Verification • View",
              keywords:
                "approve decline pending documents review scans verify verification records review queue",
              description:
                "Verify ingested digital scans, inspect student credentials, and approve or decline submissions.",
            },
            {
              id: "adm-compliance",
              label: "Compliance Analytics",
              view: "digitization",
              icon: Analytics01Icon,
              module: "compliance_analytics",
              scope: "records",
              breadcrumb: "Records & Verification • View",
              keywords:
                "metrics compliance digitization statistics kpi analytics progress monitoring",
              description:
                "Track cohort digitization completeness percentages, required document rates, and compliance trends.",
            },
          ],
        },
        {
          id: "adm_ops",
          title: "Operations & Fulfillment",
          badge: "Office Admin",
          items: [
            {
              id: "adm-sla",
              label: "SLA Analytics",
              view: "request_analytics",
              icon: Analytics01Icon,
              module: "request_analytics",
              scope: "navigation",
              breadcrumb: "Operations & Fulfillment • View",
              keywords:
                "sla analytics turnaround duration requests fulfillment speed document requests",
              description:
                "Measure fulfillment duration vs. ARTA standards, identify bottlenecks, and export reports.",
            },
            {
              id: "adm-storage-layout",
              label: "Storage Room Layout",
              view: "storage_layout",
              icon: WarehouseIcon,
              module: "storage_layout",
              scope: "records",
              breadcrumb: "Operations & Fulfillment • View",
              keywords:
                "storage room cabinet drawer layout 2d map archive physical locator storage editor",
              description:
                "2D visual archive floor planner, cabinet placement, drawer capacities, and shelf indexing.",
            },
          ],
        },
        {
          id: "adm_governance",
          title: "Personnel & Governance",
          badge: "Office Admin",
          items: [
            {
              id: "adm-directory",
              label: "Staff Directory",
              view: "directory",
              icon: UserSearch01Icon,
              module: "staff_directory",
              scope: "navigation",
              breadcrumb: "Personnel & Governance • View",
              keywords:
                "directory staff users personnel accounts team members roles active inactive",
              description:
                "View and manage personnel assigned to this department, activity status, and credentials.",
            },
            {
              id: "adm-logs",
              label: "Activity History",
              view: "logs",
              icon: Time01Icon,
              module: "audit_logs",
              scope: "system",
              breadcrumb: "Personnel & Governance • View",
              keywords:
                "audit trail history logs security compliance user activity events",
              description:
                "Departmental audit log records of all student lookups, document approvals, and exports.",
            },
          ],
        },
        {
          id: "adm_system",
          title: "System & Maintenance",
          badge: "Office Admin",
          items: [
            {
              id: "adm-system-config",
              label: "System Configuration",
              view: "system_data",
              icon: Settings01Icon,
              module: "system_config",
              scope: "system",
              breadcrumb: "System & Maintenance • View",
              keywords:
                "courses sections doc types document types config system data institutional",
              description:
                "Manage institutional course catalogs, class sections, and accepted document classifications.",
            },
            {
              id: "adm-backup",
              label: "Backup & Recovery",
              view: "system",
              icon: CloudUploadIcon,
              module: "backup",
              scope: "system",
              breadcrumb: "System & Maintenance • View",
              keywords:
                "backup maintenance database restore export encrypted snapshots recovery snapshots",
              description:
                "Create encrypted snapshots of office records and verify local/external backup health.",
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
              id: "stf-requests",
              label: "Document Requests",
              view: "requests",
              icon: FileUploadIcon,
              module: "document_requests",
              scope: "records",
              breadcrumb: "Service & Requests • View",
              keywords:
                "document requests odrs transcript diploma certification operations processing client requests",
              description:
                "Process incoming alumni and student requests, update fulfillment stages, and attach release PDFs.",
            },
            {
              id: "stf-osas-monitoring",
              label: "OSAS Monitoring",
              view: "osas_monitoring",
              icon: StudentIcon,
              module: "osas_monitoring",
              scope: "records",
              breadcrumb: "Service & Requests • View",
              keywords:
                "osas student affairs proposals events monitoring activities organizations student submissions",
              description:
                "Track student organization event proposals, post-event liquidation reports, and status.",
            },
          ],
        },
        {
          id: "stf_ingest",
          title: "Scanning & Document Upload",
          badge: "Staff",
          items: [
            {
              id: "stf-upload",
              label: "Scan & Upload",
              view: "upload",
              icon: FingerPrintScanIcon,
              module: "scan_upload",
              scope: "actions",
              breadcrumb: "Scanning & Document Upload • View",
              keywords:
                "scan upload ocr document new ingest single upload file scanner digitization",
              description:
                "Digitize incoming paperwork with assisted OCR, student identification, and physical location mapping.",
            },
            {
              id: "stf-batch-review",
              label: "Batch Review",
              view: "batch_review",
              icon: Task01Icon,
              module: "scan_upload",
              scope: "records",
              breadcrumb: "Scanning & Document Upload • View",
              keywords:
                "batch review scan queue bulk verification inspect documents approve decline scans",
              description:
                "Review multi-page scan jobs, verify auto-detected metadata, and commit batches to archive.",
            },
          ],
        },
        {
          id: "stf_roster",
          title: "Student & Organization Roster",
          badge: "Staff",
          items: [
            {
              id: "stf-students",
              label: "Student Directory",
              view: "students",
              icon: UserSearch01Icon,
              module: "student_directory",
              scope: "records",
              breadcrumb: "Student & Organization Roster • View",
              keywords:
                "student directory students profiles records directory list search archive",
              description:
                "Search student profiles, enrollment status, course classifications, and assigned archive drawers.",
            },
            {
              id: "stf-organizations",
              label: "Student Organizations",
              view: "organizations",
              icon: Building01Icon,
              module: "student_organizations",
              scope: "records",
              breadcrumb: "Student & Organization Roster • View",
              keywords:
                "student organizations osas cbl bylaws officers authorized student leaders roster accreditation",
              description:
                "Campus student organization charters, constitution bylaws, and authorized officer registries.",
            },
          ],
        },
        {
          id: "stf_archive",
          title: "Archive & Storage",
          badge: "Staff",
          items: [
            {
              id: "stf-records-search",
              label: "Records & Archive",
              view: "search",
              icon: Archive01Icon,
              module: "records_archive",
              scope: "records",
              breadcrumb: "Archive & Storage • View",
              keywords:
                "records archive search students repository files folders year levels browse files",
              description:
                "Deep archive repository browser by academic year, course partition, and permanent student envelopes.",
            },
            {
              id: "stf-storage-explorer",
              label: "Storage Explorer",
              view: "storage",
              icon: FolderOpenIcon,
              module: "storage_explorer",
              scope: "records",
              breadcrumb: "Archive & Storage • View",
              keywords:
                "physical archive explorer room cabinet drawer storage 2d locator map locator",
              description:
                "Interactive 2D room map to physically locate cabinets, drawers, and student folder envelopes.",
            },
          ],
        },
        {
          id: "stf_records",
          title: "Records & Communications",
          badge: "Staff",
          items: [
            {
              id: "stf-documents",
              label: "Student Documents",
              view: "documents",
              icon: File02Icon,
              module: "documents",
              scope: "records",
              breadcrumb: "Records & Communications • View",
              keywords:
                "documents student records files matrix status table repository search documents",
              description:
                "Master document matrix showing Form 137, Birth Certificate, TOR, and Good Moral records.",
            },
            {
              id: "stf-notifications",
              label: "Notifications",
              view: "notifications",
              icon: Notification01Icon,
              module: "notifications",
              scope: "system",
              breadcrumb: "Records & Communications • View",
              keywords: "notifications alerts messages unread updates inbox reminders",
              description:
                "Operational alerts, urgent student request notifications, and system broadcast updates.",
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
              id: "stu-overview",
              label: "Overview & Status Hub",
              view: "overview",
              icon: LayoutGridIcon,
              scope: "navigation",
              breadcrumb: "Student Portal • Home",
              keywords:
                "overview dashboard home status recent activities tracking quick actions summary blockers alerts",
              description:
                "Personal dashboard overview, pending clearance alerts, and active document request timelines.",
            },
          ],
        },
        {
          id: "stu_academic",
          title: "Academic Records",
          badge: "Student Portal",
          items: [
            {
              id: "stu-odrs",
              label: "Document Requests",
              view: "odrs",
              icon: FileUploadIcon,
              scope: "records",
              breadcrumb: "Academic Records • View",
              keywords:
                "document requests odrs transcript diploma certificate grades official records tracking new request status",
              description:
                "Submit official document requests (Transcript of Records, Certificate of Grades, Good Moral).",
            },
            {
              id: "stu-compliance",
              label: "Document Checklist & Compliance",
              view: "compliance",
              icon: ClipboardIcon,
              scope: "records",
              breadcrumb: "Academic Records • View",
              keywords:
                "document checklist compliance requirements missing documents submitted documents compliance status form 137 psa birth certificate unsubmitted pending",
              description:
                "View verified admission records on file, missing document requirements, and submission statuses.",
            },
          ],
        },
        {
          id: "stu_affairs",
          title: "Student Affairs",
          badge: "Student Portal",
          items: [
            {
              id: "stu-osas",
              label: "OSAS Submissions",
              view: "osas",
              icon: StudentIcon,
              scope: "records",
              breadcrumb: "Student Affairs • View",
              keywords:
                "osas submissions event proposals activity student affairs organizations clearance submit proposal",
              description:
                "Submit student organization activity proposals, request campus clearances, and upload post-event reports.",
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
          id: "ctrl-toggle-sidebar",
          label: "Toggle Sidebar",
          action: "toggle-sidebar",
          icon: LayoutLeftIcon,
          scope: "actions",
          shortcut: isMac ? "⌘B" : "Ctrl B",
          breadcrumb: "Navigation • Action",
          keywords:
            "toggle sidebar collapse expand hide show drawer panel navigation view hide sidebar",
          description: "Expand or collapse the primary dashboard navigation sidebar.",
        },
        {
          id: "ctrl-toggle-contrast",
          label: isHighContrast ? "Disable High Contrast Mode" : "Enable High Contrast Mode",
          action: "toggle-contrast",
          icon: CircleIcon,
          scope: "actions",
          breadcrumb: "Accessibility • Display",
          keywords:
            "high contrast accessibility display contrast black white theme readability toggle colors",
          description:
            "Toggle enhanced tactile borders, increased text boldness, and maximum contrast ratios.",
        },
        ...(!isStudent
          ? [
              {
                id: "ctrl-zoom-reset",
                label: "Reset Scale / Zoom (100%)",
                action: "zoom-reset",
                icon: ArrowLeftRightIcon,
                scope: "actions",
                breadcrumb: "Layout Scale • Action",
                keywords: "reset scale zoom default 100% normal view layout size restore",
                description: "Restore normal 100% dashboard display scaling.",
              },
              {
                id: "ctrl-zoom-in",
                label: "Zoom In (+8%)",
                action: "zoom-in",
                icon: ZoomInAreaIcon,
                scope: "actions",
                breadcrumb: "Layout Scale • Action",
                keywords: "zoom in enlarge scale increase size bigger larger view",
                description: "Enlarge interface dimensions and typography by 8%.",
              },
              {
                id: "ctrl-zoom-out",
                label: "Zoom Out (-8%)",
                action: "zoom-out",
                icon: ZoomOutAreaIcon,
                scope: "actions",
                breadcrumb: "Layout Scale • Action",
                keywords: "zoom out shrink scale decrease size smaller view",
                description: "Reduce interface scaling by 8% to fit more data onto the screen.",
              },
            ]
          : []),
        ...(hasAdminRights && !isSuperAdmin
          ? [
              activeView === "admin"
                ? {
                    id: "ctrl-switch-role",
                    label: "Switch to Staff View",
                    action: "switch-role",
                    targetRole: "staff",
                    icon: UserSearch01Icon,
                    scope: "actions",
                    breadcrumb: "Role Mode • Action",
                    keywords: "switch to staff view operations portal toggle role personnel",
                    description: "Switch active session mode to standard operational staff view.",
                  }
                : {
                    id: "ctrl-switch-role",
                    label: "Switch to Admin View",
                    action: "switch-role",
                    targetRole: "admin",
                    icon: Shield01Icon,
                    scope: "actions",
                    breadcrumb: "Role Mode • Action",
                    keywords:
                      "switch to admin view administrator management toggle role governance",
                    description:
                      "Switch active session mode to office administration & configuration view.",
                  },
            ]
          : []),
        ...(pathname === "/account"
          ? [
              {
                id: "ctrl-return-dash",
                label: "Return to Dashboard",
                action: "return-dashboard",
                icon: DashboardSquare01Icon,
                scope: "actions",
                breadcrumb: "Navigation • Action",
                keywords: "return back dashboard home main view exit settings leave",
                description: "Exit account settings and return to your primary operational workspace.",
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
          id: "act-settings",
          label: "Account Settings",
          view: "settings",
          icon: Settings01Icon,
          scope: "system",
          breadcrumb: "Preferences • Settings",
          keywords:
            "account settings my profile password credentials preferences security 2fa totp edit profile avatar",
          description: "Update personal profile, multi-factor authentication, and security preferences.",
        },
        {
          id: "act-activity",
          label: "My Activity",
          view: "activity",
          icon: Time01Icon,
          scope: "system",
          breadcrumb: "Activity History • Personal",
          keywords: "my activity history personal audit logs login sessions timeline recent actions",
          description: "View your personal login sessions, recent interactions, and timestamp history.",
        },
        {
          id: "act-logout",
          label: "Sign Out",
          action: "logout",
          icon: Logout01Icon,
          scope: "actions",
          breadcrumb: "Session • Sign Out",
          keywords: "sign out log out exit disconnect leave session terminate end",
          description: "Safely terminate active authentication session and return to login portal.",
        },
      ],
    };

    // Live University Data Groups (When Searching)
    let liveGroups = [];

    if (liveStudents.length > 0) {
      liveGroups.push({
        id: "live_students",
        title: "Student Records & Archive Folders",
        badge: "Live Database",
        items: liveStudents.map((stu) => {
          const hasStorage = Boolean(stu.room || stu.cabinet || stu.drawer);
          const storageStr = hasStorage
            ? `Rm ${stu.room || 1} • Cab ${stu.cabinet || "A"} • Drw ${stu.drawer || 1}`
            : null;
          const studentNo = stu.student_no || stu.studentNo;
          return {
            id: `stu-${studentNo}`,
            label: stu.name,
            icon: UserIcon,
            iconName: "UserIcon",
            scope: "records",
            type: "student",
            badge: studentNo,
            studentNo: studentNo,
            storageBadge: storageStr,
            breadcrumb: `Student Directory • ${stu.course_code || ""}`,
            keywords: `${stu.name} ${studentNo} ${stu.course_code} ${stu.section}`,
            description: `Student enrolled in ${stu.course_code || "Academic Course"} (${stu.year_level || ""}-${stu.section || ""}). Physical archive located in ${storageStr || "Unassigned"}.`,
            rawStudent: stu,
          };
        }),
      });
    }

    if (liveRequests.length > 0) {
      liveGroups.push({
        id: "live_requests",
        title: "Document Requests & Fulfillment",
        badge: "Live Database",
        items: liveRequests.map((req) => {
          return {
            id: `req-${req.id}`,
            label: `${req.doc_type || "Document"} Request`,
            icon: FileUploadIcon,
            scope: "records",
            type: "request",
            badge: `REQ-${req.id}`,
            statusBadge: req.status || "Pending",
            breadcrumb: `ODRS Requests • ${req.student_no}`,
            keywords: `${req.doc_type} ${req.student_no} ${req.status} ${req.id}`,
            description: `Service request #${req.id} for ${req.doc_type} filed by ${req.student_no}. Current operational state: ${req.status}.`,
            rawRequest: req,
          };
        }),
      });
    }

    // Build the master candidate set
    const allCandidateGroups = [
      ...liveGroups,
      ...candidateGroups,
      controlsGroup,
      accountGroup,
    ];

    // Filter by query and active scope tab
    const filtered = allCandidateGroups
      .map((group) => {
        let items = group.items;

        // Scope tab filter
        if (activeScope !== "all") {
          items = items.filter((item) => item.scope === activeScope);
        }

        // Query filter
        if (q) {
          items = items.filter((item) =>
            matchesSearchQuery(
              [item.label, item.breadcrumb, item.keywords, item.description, group.title, item.badge],
              searchQuery
            )
          );
        }

        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);

    return {
      filteredGroups: filtered,
      flatSuggestions: filtered.flatMap((g) => g.items),
    };
  }, [
    searchQuery,
    activeScope,
    activeView,
    authUser,
    isStudent,
    isSuperAdmin,
    hasAdminRights,
    isMac,
    pathname,
    isHighContrast,
    liveStudents,
    liveRequests,
  ]);

  // Save selected item to recents
  const saveRecentCommand = useCallback((item) => {
    if (!item || !item.label) return;
    try {
      setRecentCommands((prev) => {
        const filtered = prev.filter((r) => r.id !== item.id && r.label !== item.label);
        const iconName =
          typeof item.icon === "string"
            ? item.icon
            : item.icon?.displayName?.replace(/Icon$/, "") ||
              item.iconName ||
              "ArrowRight01Icon";
        const updated = [
          {
            id: item.id || item.label,
            label: item.label,
            iconName: iconName,
            breadcrumb: item.breadcrumb,
            scope: item.scope,
            action: item.action,
            view: item.view,
            section: item.section,
            type: item.type,
            badge: item.badge,
            studentNo: item.studentNo,
            rawStudent: item.rawStudent,
          },
          ...filtered,
        ].slice(0, MAX_RECENTS);
        if (typeof window !== "undefined") {
          localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearRecentCommands = useCallback((e) => {
    e?.stopPropagation();
    setRecentCommands([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(RECENT_COMMANDS_KEY);
    }
    toast.success("Recent Commands Cleared");
  }, []);

  // ---------------------------------------------------------------------------
  // SELECTION HANDLER (EXECUTES ACTIONS, VIEWS, DEEP STUDENT LOCATING)
  // ---------------------------------------------------------------------------
  const handleSelectSuggestion = useCallback(
    (item) => {
      saveRecentCommand(item);
      setSearchQuery("");
      setIsPaletteOpen(false);
      setFocusedIndex(0);

      // Student record clicked
      if (item.type === "student" && item.rawStudent) {
        const student = item.rawStudent;
        const studentNo = student.student_no || student.studentNo;

        if (activeView === "staff") {
          // If student has storage and we are on staff view, offer instant physical location
          if (student.room || student.cabinet || student.drawer) {
            window.dispatchEvent(
              new CustomEvent("switch-view", { detail: { view: "storage" } })
            );
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("locate-student", { detail: { student } })
              );
            }, 100);
            toast.success(`Locating ${student.name} in Archive`, {
              description: `Room ${student.room} • Cabinet ${student.cabinet} • Drawer ${student.drawer}`,
            });
            return;
          }

          // Otherwise jump to student directory
          window.dispatchEvent(
            new CustomEvent("switch-view", { detail: { view: "students" } })
          );
          toast.info(`Opening ${student.name}'s Profile`);
          return;
        }

        // On Admin: open Records Review or Archive
        window.dispatchEvent(
          new CustomEvent("switch-view", { detail: { view: "review" } })
        );
        toast.info(`Navigating to records for ${studentNo}`);
        return;
      }

      // Document request clicked
      if (item.type === "request" && item.rawRequest) {
        const req = item.rawRequest;
        const targetView = isStudent ? "odrs" : "requests";
        window.dispatchEvent(new CustomEvent("switch-view", { detail: { view: targetView } }));
        toast.info(`Opening Request #${req.id}`, {
          description: `${req.doc_type || "Document"} • ${req.status || "Pending"}`,
        });
        return;
      }

      // Universal controls
      if (item.action === "toggle-sidebar") {
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
        return;
      }

      if (item.action === "toggle-contrast") {
        const next = toggleHighContrastPreference(authUser?.id);
        setIsHighContrast(next);
        toast.success(next ? "High Contrast Enabled" : "High Contrast Disabled", {
          description: next
            ? "Tactile borders and maximum contrast readability active."
            : "Standard interface contrast restored.",
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
        if (onViewSwitch) {
          onViewSwitch(item.targetRole);
        } else {
          localStorage.setItem("pup_admin_view_pref", item.targetRole);
          router.push(item.targetRole === "admin" ? "/admin" : "/staff");
        }
        return;
      }

      if (item.action === "return-dashboard") {
        if (onMainDashboard) {
          onMainDashboard();
        } else {
          router.push(
            isStudent
              ? "/student"
              : isSuperAdmin
                ? "/systemadmin"
                : activeView === "admin"
                  ? "/admin"
                  : "/staff"
          );
        }
        return;
      }

      if (item.action === "logout") {
        if (onLogout) {
          onLogout();
        } else {
          fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          window.location.href = "/login";
        }
        return;
      }

      if (item.url) {
        router.push(item.url);
        return;
      }

      // Standard navigation views
      if (item.view) {
        const isSysAdmin = activeView === "systemadmin";
        const onSysAdminPage =
          pathname?.startsWith("/systemadmin") || pathname?.startsWith("/superadmin");

        const params = new URLSearchParams({ view: item.view });
        if (item.section) params.set("section", item.section);

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
              detail: { view: item.view, section: item.section },
            })
          );
        }
      }
    },
    [
      saveRecentCommand,
      setIsPaletteOpen,
      activeView,
      isStudent,
      isSuperAdmin,
      onViewSwitch,
      onMainDashboard,
      onLogout,
      router,
      pathname,
      authUser?.id,
    ]
  );

  // Keyboard navigation inside command palette
  const handleCommandKeyDown = (e) => {
    // Tab cycles category scopes
    if (e.key === "Tab") {
      e.preventDefault();
      const currentIdx = SCOPE_TABS.findIndex((t) => t.id === activeScope);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + SCOPE_TABS.length) % SCOPE_TABS.length
        : (currentIdx + 1) % SCOPE_TABS.length;
      setActiveScope(SCOPE_TABS[nextIdx].id);
      setFocusedIndex(0);
      return;
    }

    if (flatSuggestions.length === 0) {
      if (e.key === "Escape") setIsPaletteOpen(false);
      return;
    }

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
      setIsPaletteOpen(false);
    }
  };

  // Auto-scroll focused element into view
  useEffect(() => {
    if (isPaletteOpen) {
      const el = document.getElementById(`command-item-${focusedIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex, isPaletteOpen]);

  // Focused item for Inspector preview panel
  const focusedItem = flatSuggestions[focusedIndex] || flatSuggestions[0] || null;

  // Copy helper for Inspector
  const handleCopyIdentifier = useCallback((text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast.success("Copied to Clipboard", { description: text });
  }, []);

  return (
    <Dialog open={isPaletteOpen} onOpenChange={setIsPaletteOpen}>
      <DialogContent
        hideClose={true}
        className={cn(
          "p-0 gap-0 overflow-hidden rounded-[20px] max-w-full sm:max-w-3xl md:max-w-[840px] lg:max-w-[880px] w-full",
          "border border-black/[0.08] dark:border-white/10",
          "bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl",
          "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.7)]",
          "dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
          "transition-all duration-200"
        )}
      >
        {/* ----------------------------------------------------------------- */}
        {/* TOP SPOTLIGHT SEARCH HEADER BAR                                   */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center gap-3.5 px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl bg-pup-maroon/10 dark:bg-white/10 flex items-center justify-center shrink-0 text-pup-maroon dark:text-red-400">
            {isLiveSearching ? (
              <Loading03Icon size="1em" className="text-lg animate-spin" />
            ) : (
              <Search01Icon size="1em" className="text-lg" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            aria-label="Spotlight Command Search"
            placeholder={
              isStudent
                ? "Search student views, requests, compliance..."
                : "Search views, actions, students (e.g. 2024-), or requests..."
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFocusedIndex(0);
            }}
            onKeyDown={handleCommandKeyDown}
            className="flex-1 bg-transparent border-0 outline-none text-[16.5px] font-medium text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 dark:placeholder:text-zinc-500 tracking-[-0.01em]"
          />

          <div className="flex items-center gap-2 shrink-0">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFocusedIndex(0);
                  inputRef.current?.focus();
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Clear Search"
              >
                <Cancel01Icon size="1em" className="text-xs" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-sans font-semibold text-gray-400 dark:text-zinc-400 bg-black/[0.04] dark:bg-white/[0.08] border border-black/10 dark:border-white/10 rounded-md shadow-2xs select-none">
              ESC
            </kbd>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SCOPE FILTER PILLS BAR (RAYCAST / SPOTLIGHT TABS)                 */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/[0.05] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.01]">
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {SCOPE_TABS.map((tab) => {
              const isActive = activeScope === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveScope(tab.id);
                    setFocusedIndex(0);
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-all cursor-pointer select-none font-medium flex items-center gap-1.5",
                    isActive
                      ? "bg-pup-maroon text-white dark:bg-white dark:text-zinc-900 shadow-xs font-semibold scale-[1.02]"
                      : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-zinc-500">
            <span>Tab to cycle scopes</span>
            <kbd className="px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 text-[9px] font-sans">
              ⇥
            </kbd>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* MAIN BODY: TWO-PANE LAYOUT (LIST + INSPECTOR PREVIEW)             */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-col md:flex-row h-[480px] min-h-0">
          {/* LEFT COLUMN: LIST RESULTS */}
          <div className="flex-1 min-w-0 overflow-y-auto p-2.5 [scrollbar-width:thin] border-r border-black/[0.06] dark:border-white/[0.08]">
            {/* Empty search: Show Recent Commands if available */}
            {!searchQuery && activeScope === "all" && recentCommands.length > 0 && (
              <div className="mb-3">
                <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between select-none">
                  <span className="flex items-center gap-1.5">
                    <Time01Icon size="1em" className="text-xs" />
                    <span>Recent Commands</span>
                  </span>
                  <button
                    type="button"
                    onClick={clearRecentCommands}
                    className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  {recentCommands.map((item, idx) => (
                    <button
                      key={`recent-${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.type === "student" ? (
                          <ProfileAvatar
                            studentNo={item.studentNo || item.badge}
                            name={item.label}
                            initials={getInitials(item.label)}
                            className="w-7 h-7 rounded-full text-[10px] font-semibold border border-black/10 dark:border-white/10 shrink-0 overflow-hidden"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-gray-500 dark:text-zinc-400 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
                            <PaletteIcon icon={item.icon || item.iconName || "ArrowRight01Icon"} size="1.1em" />
                          </div>
                        )}
                        <span className="truncate text-[13px] font-medium text-gray-800 dark:text-zinc-200">
                          {item.label}
                        </span>
                      </div>
                      <ArrowRight02Icon size="1em" className="text-gray-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filtered Grouped Items */}
            {filteredGroups.length > 0 ? (
              (() => {
                let currentGlobalIndex = 0;
                return filteredGroups.map((group) => (
                  <div key={group.id} className="mb-3 last:mb-0">
                    <div className="px-3 pt-1.5 pb-1 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider flex items-center justify-between select-none">
                      <span className="flex items-center gap-1.5">
                        <span>{group.title}</span>
                      </span>
                      {group.badge && (
                        <span className="font-semibold text-[9.5px] px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400">
                          {group.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => {
                        const globalIdx = currentGlobalIndex++;
                        const isFocused = focusedIndex === globalIdx;
                        const itemKey = item.id || item.view || item.action || item.label;

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

                        const IconComp = item.icon || ArrowRight01Icon;

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
                                ? "bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-50 shadow-2xs font-semibold"
                                : "text-gray-700 dark:text-zinc-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                              {item.type === "student" ? (
                                <ProfileAvatar
                                  studentNo={item.studentNo || item.badge}
                                  name={item.label}
                                  initials={getInitials(item.label)}
                                  className="w-8 h-8 rounded-full text-[11px] font-semibold border border-black/10 dark:border-white/10 shrink-0 overflow-hidden"
                                />
                              ) : (
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    isFocused
                                      ? "bg-pup-maroon text-white dark:bg-white dark:text-zinc-900 shadow-2xs"
                                      : "bg-black/[0.04] dark:bg-white/[0.06] text-gray-500 dark:text-zinc-400"
                                  )}
                                >
                                  <PaletteIcon icon={item.icon || ArrowRight01Icon} size="1.1em" />
                                </div>
                              )}

                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[13.5px] font-medium truncate">
                                    <HighlightMatches text={item.label} query={searchQuery} />
                                  </span>

                                  {isActiveTab && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                                      Active
                                    </span>
                                  )}

                                  {item.badge && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-zinc-400">
                                      {item.badge}
                                    </span>
                                  )}

                                  {item.storageBadge && (
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                      {item.storageBadge}
                                    </span>
                                  )}

                                  {item.statusBadge && (
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold",
                                        item.statusBadge === "Completed" || item.statusBadge === "Approved"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                          : item.statusBadge === "Pending"
                                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                            : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                      )}
                                    >
                                      {item.statusBadge}
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
                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-sans tabular-nums font-semibold bg-black/[0.04] dark:bg-white/[0.08] text-gray-600 dark:text-zinc-300 rounded border border-black/10 dark:border-white/10 shadow-2xs">
                                  {item.shortcut}
                                </kbd>
                              )}
                              {isFocused && (
                                <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400 flex items-center gap-1">
                                  <span>Select</span>
                                  <kbd className="px-1 py-0.5 rounded bg-pup-maroon/15 dark:bg-white/15 text-[9px] font-sans">
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
              <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="w-12 h-12 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/10 flex items-center justify-center text-gray-400 dark:text-zinc-500 mb-3">
                  <Search01Icon size="1.5em" />
                </div>
                <h4 className="text-[14px] font-semibold text-gray-800 dark:text-zinc-200">
                  No Matching Results
                </h4>
                <p className="text-[12px] text-gray-500 dark:text-zinc-400 max-w-xs mt-1 leading-relaxed">
                  Try searching with student number (e.g. 2024-), request ID, or view name.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SPOTLIGHT INSPECTOR PREVIEW PANEL (MD+ SCREENS) */}
          <div className="hidden md:flex md:w-[330px] lg:w-[360px] shrink-0 min-w-0 flex-col justify-between p-6 bg-black/[0.015] dark:bg-white/[0.01] overflow-y-auto border-l border-black/[0.06] dark:border-white/[0.08]">
            {focusedItem ? (
              <div className="flex flex-col">
                {/* Large spotlight icon badge or Student Avatar (Rounded-Full with Increased Width) */}
                {focusedItem.type === "student" ? (
                  <ProfileAvatar
                    studentNo={focusedItem.studentNo || focusedItem.badge}
                    name={focusedItem.label}
                    initials={getInitials(focusedItem.label)}
                    className="w-20 h-20 rounded-full text-xl font-bold shadow-xs mb-4 border border-black/10 dark:border-white/10 shrink-0 overflow-hidden"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pup-maroon/15 via-pup-maroon/5 to-transparent dark:from-white/15 dark:to-transparent border border-pup-maroon/15 dark:border-white/10 flex items-center justify-center text-pup-maroon dark:text-red-400 shadow-xs mb-4 shrink-0">
                    <PaletteIcon icon={focusedItem.icon || ArrowRight01Icon} size="2.2em" className="text-3xl" />
                  </div>
                )}

                {/* Title & Badge */}
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-zinc-50 leading-snug">
                  {focusedItem.label}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-white/10 dark:text-zinc-200">
                    {focusedItem.scope === "records"
                      ? "Records & Data"
                      : focusedItem.scope === "actions"
                        ? "Quick Action"
                        : focusedItem.scope === "system"
                          ? "System Utility"
                          : "Navigation View"}
                  </span>

                  {focusedItem.badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-zinc-400">
                      {focusedItem.badge}
                    </span>
                  )}
                </div>

                {/* Breadcrumb / Section */}
                {focusedItem.breadcrumb && (
                  <p className="text-[11.5px] text-gray-500 dark:text-zinc-400 mt-2 font-medium">
                    {focusedItem.breadcrumb}
                  </p>
                )}

                {/* Detailed description */}
                {focusedItem.description && (
                  <p className="text-[12.5px] text-gray-600 dark:text-zinc-300 mt-3 leading-relaxed border-t border-black/[0.06] dark:border-white/[0.06] pt-3">
                    {focusedItem.description}
                  </p>
                )}

                {/* Contextual Student Metadata Card */}
                {focusedItem.type === "student" && focusedItem.rawStudent && (
                  <div className="mt-4 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Student No:</span>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200 font-mono">
                        {focusedItem.rawStudent.student_no || focusedItem.rawStudent.studentNo}
                      </span>
                    </div>
                    {focusedItem.rawStudent.course_code && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-zinc-400">Course & Section:</span>
                        <span className="font-semibold text-gray-800 dark:text-zinc-200">
                          {focusedItem.rawStudent.course_code} {focusedItem.rawStudent.year_level || ""}-{focusedItem.rawStudent.section || ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Physical Archive:</span>
                      <span className="font-semibold text-pup-maroon dark:text-red-400">
                        {focusedItem.storageBadge || "Unassigned"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Contextual Request Metadata Card */}
                {focusedItem.type === "request" && focusedItem.rawRequest && (
                  <div className="mt-4 p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Request ID:</span>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200 font-mono">
                        REQ-{focusedItem.rawRequest.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Document Type:</span>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200">
                        {focusedItem.rawRequest.doc_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Status:</span>
                      <span className="font-semibold text-pup-maroon dark:text-red-400">
                        {focusedItem.rawRequest.status || "Pending"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500">
                <SparklesIcon size="2em" className="opacity-40 mb-2" />
                <p className="text-xs">Select any item to preview details</p>
              </div>
            )}

            {/* Quick Action Button at the bottom of Inspector */}
            {focusedItem && (
              <div className="mt-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-2">
                <Button
                  onClick={() => handleSelectSuggestion(focusedItem)}
                  className="w-full h-10 px-5 text-xs font-semibold rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {focusedItem.type === "student"
                    ? "Open Student Record"
                    : focusedItem.type === "request"
                      ? "Open Document Request"
                      : focusedItem.action
                        ? "Run Action"
                        : "Navigate to View"}
                </Button>

                {focusedItem.badge && (
                  <Button
                    variant="outline"
                    onClick={() => handleCopyIdentifier(focusedItem.badge)}
                    className="w-full h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Copy {focusedItem.type === "student" ? "Student No" : "Identifier"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* FOOTER STATUS BAR WITH APPLE CHICLET KEYBOARD HINTS               */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] text-[11px] text-gray-500 dark:text-zinc-400 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                ↓
              </kbd>
              <span>navigate</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                ↵
              </kbd>
              <span>select</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                Tab
              </kbd>
              <span>scope</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                ESC
              </kbd>
              <span>dismiss</span>
            </span>

            <span className="hidden lg:flex items-center gap-1 text-[10px] text-gray-400">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 font-sans tabular-nums text-[9px] shadow-2xs">
                {isMac ? "⌘B" : "Ctrl B"}
              </kbd>
              <span>sidebar</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-gray-400 dark:text-zinc-500 text-[10.5px]">
            <span>
              {isStudent
                ? "Student Portal"
                : activeView === "systemadmin"
                  ? "System Administration"
                  : activeView === "admin"
                    ? "Office Administration"
                    : "Records Staff"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
