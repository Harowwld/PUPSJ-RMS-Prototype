"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"


import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import Sidebar from "@/components/shared/Sidebar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import FloatingChatWidget from "@/components/shared/FloatingChatWidget"
import PromptModal from "@/components/shared/PromptModal"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import { AdminGuard } from "@/components/shared/AuthGuard"

import StaffDirectoryTab from "@/components/admin/StaffDirectoryTab"
import RegisterAccountTab from "@/components/admin/RegisterAccountTab"
import AuditLogsTab from "@/components/admin/AuditLogsTab"
import { generateExportFilename } from "@/lib/exportHelpers"
import BackupTab from "@/components/admin/BackupTab"
import EditUserModal from "@/components/admin/EditUserModal"
import SystemConfigTab from "@/components/admin/SystemConfigTab"
import DigitalRecordsReviewTab from "@/components/admin/DigitalRecordsReviewTab"
import DigitizationComplianceTab from "@/components/admin/DigitizationComplianceTab"
import SLAAnalyticsTab from "@/components/admin/SLAAnalyticsTab"
import StorageLayoutEditorTab from "@/components/admin/StorageLayoutEditorTab"
import { formatPHDateTime } from "@/lib/timeFormat"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function AdminPageContent() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const loadedViewsRef = useRef({
    directory: false,
    logs: false,
    system: false,
    backup: false,
    review: false,
    request_analytics: false,
    system_data: true,
  })

  const validViews = [
    "directory",
    "review",
    "digitization",
    "request_analytics",
    "storage_layout",
    "system_data",
    "system",
    "logs",
  ]
  const initialView = validViews.includes(searchParams?.get("view"))
    ? searchParams.get("view")
    : "review"

  const [view, setView] = useState(initialView)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((prev) => !prev)
    window.addEventListener("toggle-sidebar", handleToggle)
    return () => window.removeEventListener("toggle-sidebar", handleToggle)
  }, [])

  useEffect(() => {
    const handleSwitch = (e) => {
      const { view: targetView } = e.detail
      if (targetView) {
        setView(targetView)
        const params = new URLSearchParams(window.location.search)
        params.set("view", targetView)
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
      }
    }
    window.addEventListener("switch-view", handleSwitch)
    return () => window.removeEventListener("switch-view", handleSwitch)
  }, [router])

  useEffect(() => {
    // Dynamic favicon swap for admin page
    const updateFavicon = () => {
      const links = document.querySelectorAll("link[rel*='icon']");
      if (links.length > 0) {
        links.forEach(link => {
          link.type = 'image/png';
          link.rel = 'shortcut icon';
          link.href = '/admin-logo.png';
        });
      } else {
        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = '/admin-logo.png';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    };
    updateFavicon();
  }, [view, searchParams]);

  const [viewLoading, setViewLoading] = useState({
    directory: false,
    logs: false,
    system: false,
    backup: false,
    review: false,
    request_analytics: false,
  })

  const [zoomNode, setZoomNode] = useState(3); // 0 to 6 (7 nodes)
  const handleZoomMouseDown = (e) => {
    // Avoid text selection or default drag triggers
    e.preventDefault();
    const track = e.currentTarget;
    
    const updateZoom = (clientX) => {
      const rect = track.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const node = Math.max(0, Math.min(6, Math.round(percentage * 6)));
      setZoomNode(node);
    };

    const isTouch = e.type === "touchstart";
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    updateZoom(startX);

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updateZoom(clientX);
    };

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      } else {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", handleMove, { passive: true });
      document.addEventListener("touchend", handleEnd);
    } else {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    }
  };


  const [staffData, setStaffData] = useState([])
  const [auditLogs, setAuditLogs] = useState(null)
  const [logStats, setLogStats] = useState(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [logTotal, setLogTotal] = useState(0)
  const [logsPerPage, setLogsPerPage] = useState(20)
  const [logSearch, setLogSearch] = useState("")
  const [logRoleFilter, setLogRoleFilter] = useState("All")
  const [logSeverityFilter, setLogSeverityFilter] = useState("All")
  const [logStartDate, setLogStartDate] = useState("")
  const [logEndDate, setLogEndDate] = useState("")
  const [logSortBy, setLogSortBy] = useState("created_at")
  const [logSortOrder, setLogSortOrder] = useState("DESC")
  const [logsMineOnly, setLogsMineOnly] = useState(false)

  const [reviewLoading, setReviewLoading] = useState(false)

  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    memory: { percent: 0, total: 0, used: 0 },
    disk: { total: 0, free: 0, percent: 0 },
    dbSize: "0 KB",
    dbStatus: "Healthy",
  })
  const [backups, setBackups] = useState([])
  const [backupSearch, setBackupSearch] = useState("")
  const [backupStartDate, setBackupStartDate] = useState("")
  const [backupEndDate, setBackupEndDate] = useState("")
  const [reviewRecords, setReviewRecords] = useState(null)
  const [reviewStatusFilter, setReviewStatusFilter] = useState("All")
  const [pendingReviewCount, setPendingReviewCount] = useState(0)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")
  const [selectedStaffIds, setSelectedStaffIds] = useState(new Set())
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false)
  const [bulkArchiveLoading, setBulkArchiveLoading] = useState(false)
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false)
  const [bulkRestoreLoading, setBulkRestoreLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    id: "",
    role: "",
    fname: "",
    lname: "",
    email: "",
    status: "Active",
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editOriginalId, setEditOriginalId] = useState("")
  const [editForm, setEditForm] = useState({
    id: "",
    role: "",
    fname: "",
    lname: "",
    email: "",
    status: "Active",
  })

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState(null)

  const [backupDeleteTargets, setBackupDeleteTargets] = useState([])
  const [backupDeleteOpen, setBackupDeleteOpen] = useState(false)
  const [backupDeleteLoading, setBackupDeleteLoading] = useState(false)
  const [backupDeleteTypedText, setBackupDeleteTypedText] = useState("")
  const [backupDeleteVerificationTarget, setBackupDeleteVerificationTarget] = useState("")
  const [backupDeleteVerificationValue, setBackupDeleteVerificationValue] = useState("")

  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreLoading, setRestoreLoading] = useState(false)

  // External drive detection state
  const [extDriveModalOpen, setExtDriveModalOpen] = useState(false)
  const [extDriveEvent, setExtDriveEvent] = useState(null) // { type: 'connected'|'disconnected', label, path }
  const extDrivePrevConnectedRef = useRef(null) // null = not yet polled

  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpModalLoading, setTotpModalLoading] = useState(false)
  const totpPendingActionRef = useRef(null)
  const [totpActionLabel, setTotpActionLabel] = useState("Confirm")
  const [totpModalDescription, setTotpModalDescription] = useState(
    "Enter the 6-digit code from your authenticator app to confirm this action."
  )

  const [authUser, setAuthUser] = useState(null)

  const sidebarItems = useMemo(() => {
    if (!authUser?.enabled_modules) return []
    const enabled = new Set(authUser.enabled_modules)
    
    const MODULE_KEY_MAP = {
      review: "records_review",
      digitization: "compliance_analytics",
      request_analytics: "request_analytics",
      directory: "staff_directory",
      storage_layout: "storage_layout",
      system_data: "system_config",
      system: "backup",
      logs: "audit_logs",
    }

    const groups = [
      {
        type: "group",
        label: "Operations & Analytics",
        children: [
          {
            key: "review",
            label: "Records Review",
            iconClass: "ph-bold ph-seal-check",
            badge: pendingReviewCount,
          },
          {
            key: "digitization",
            label: "Compliance",
            iconClass: "ph-bold ph-chart-bar",
          },
          {
            key: "request_analytics",
            label: "Requests",
            iconClass: "ph-bold ph-trend-up",
          },
        ]
      },
      {
        type: "group",
        label: "User Management",
        children: [
          {
            key: "directory",
            label: "Directory",
            iconClass: "ph-bold ph-users",
          },
        ]
      },
      {
        type: "group",
        label: "System Configuration",
        children: [
          {
            key: "storage_layout",
            label: "Storage",
            iconClass: "ph-bold ph-warehouse",
          },
          {
            key: "system_data",
            label: "Data",
            iconClass: "ph-bold ph-gear",
          },
          {
            key: "system",
            label: "Backup",
            iconClass: "ph-bold ph-database-backup",
          },
          {
            key: "logs",
            label: "Audit Log",
            iconClass: "ti ti-history",
          },
        ]
      }
    ]

    const result = []
    for (const group of groups) {
      const activeChildren = group.children.filter(child => {
        const requiredModule = MODULE_KEY_MAP[child.key]
        return !requiredModule || enabled.has(requiredModule)
      })
      if (activeChildren.length > 0) {
        result.push({ type: "header", label: group.label })
        result.push(...activeChildren)
      }
    }
    return result
  }, [authUser?.enabled_modules, pendingReviewCount])

  const [defaultPwOpen, setDefaultPwOpen] = useState(false)
  const [defaultPwUserLabel, setDefaultPwUserLabel] = useState("")
  const [defaultReturnedPw, setDefaultReturnedPw] = useState("")
  const [copied, setCopied] = useState(false)

  const handleCopyPassword = useCallback(() => {
    if (!defaultReturnedPw) return
    navigator.clipboard.writeText(defaultReturnedPw).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [defaultReturnedPw])

  const [declinePromptOpen, setDeclinePromptOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [pendingDeclineDocId, setPendingDeclineDocId] = useState(null)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState({
    docId: null,
    docType: "",
    studentName: "",
    studentNo: "",
    refId: "",
  })

  // Unsaved Changes Protection
  const [isStorageDirty, setIsStorageDirty] = useState(false)
  const [pendingView, setPendingView] = useState(null)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  const showToast = useCallback(
    (msg, typeOrIsError = false, autoHide = true) => {
      const isRich = msg && typeof msg === "object" && msg.title
      const title = isRich ? msg.title : String(msg || "")
      const opts =
        isRich && msg.description ? { description: msg.description } : {}

      if (typeOrIsError === true || typeOrIsError === "error") {
        return toast.error(title, opts)
      }
      if (typeOrIsError === "warning") {
        return toast.warning(title, opts)
      }
      if (typeOrIsError === "loading") {
        return toast.loading(title, opts)
      }
      if (!autoHide) {
        return toast.message(title, { ...opts, duration: 5000 })
      }
      return toast.success(title, opts)
    },
    []
  )

  const executeWithTOTP = useCallback(
    async (action, actionLabel, hasToken = false) => {
      setTotpActionLabel(actionLabel)
      totpPendingActionRef.current = action
      setTotpModalOpen(true)
    },
    []
  )

  const handleTOTPConfirm = useCallback(async (token) => {
    console.log("[DELETE FLOW] handleTOTPConfirm called with token:", token)
    if (!totpPendingActionRef.current) {
      console.log("[DELETE FLOW] handleTOTPConfirm: no pending action")
      return
    }
    console.log("[DELETE FLOW] handleTOTPConfirm: setting loading true")
    setTotpModalLoading(true)
    try {
      console.log("[DELETE FLOW] handleTOTPConfirm: calling pending action")
      await totpPendingActionRef.current(token)
      console.log(
        "[DELETE FLOW] handleTOTPConfirm: success, setting loading false and closing modal"
      )
      setTotpModalLoading(false)
      setTotpModalOpen(false)
    } catch (err) {
      console.log("[DELETE FLOW] handleTOTPConfirm: error:", err.message)
      const msg = err?.message || "Action failed"
      const clean = msg.includes("TOTP verification required: ")
        ? msg.replace("TOTP verification required: ", "")
        : msg
      console.log(
        "[DELETE FLOW] handleTOTPConfirm: setting loading false, throwing error"
      )
      setTotpModalLoading(false)
      throw new Error(clean)
    }
  }, [])

  const refreshStaff = useCallback(async (isManual = false) => {
    if (isManual) setViewLoading((prev) => ({ ...prev, directory: true }))
    try {
      const [res] = await Promise.all([
        fetch("/api/staff?limit=500"),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
      const json = await res.json()
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to load staff")
      setStaffData(Array.isArray(json.data) ? json.data : [])
      loadedViewsRef.current.directory = true
    } catch (err) {
      showToast({ title: "Personnel Directory Load Failed", description: err.message || "The system was unable to retrieve the staff directory." }, true)
    } finally {
      setViewLoading((prev) => ({ ...prev, directory: false }))
    }
  }, [showToast])

  const refreshAuditLogs = useCallback(async (isManual = false) => {
    if (isManual) setViewLoading((prev) => ({ ...prev, logs: true }))
    setLogsLoading(true)
    try {
      const offset = (logPage - 1) * logsPerPage
      const mineQuery = logsMineOnly ? "&mine=1" : ""
      const roleQuery =
        logRoleFilter !== "All"
          ? `&role=${encodeURIComponent(logRoleFilter)}`
          : ""
      const sevQuery =
        logSeverityFilter !== "All"
          ? `&severity=${encodeURIComponent(logSeverityFilter)}`
          : ""
      const startQuery = logStartDate
        ? `&startDate=${encodeURIComponent(logStartDate)}`
        : ""
      const endQuery = logEndDate
        ? `&endDate=${encodeURIComponent(logEndDate)}`
        : ""
      const sortQuery = `&sortBy=${encodeURIComponent(logSortBy)}&sortOrder=${encodeURIComponent(logSortOrder)}`

      const [resLogs] = await Promise.all([
        fetch(
          `/api/audit-logs?limit=${logsPerPage}&offset=${offset}&search=${encodeURIComponent(logSearch)}${mineQuery}${roleQuery}${sevQuery}${startQuery}${endQuery}${sortQuery}`
        ),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
      const jsonLogs = await resLogs.json()
      if (!resLogs.ok || !jsonLogs?.ok)
        throw new Error(jsonLogs?.error || "Failed to load audit logs")

      setLogTotal(jsonLogs.total || 0)
      const rows = Array.isArray(jsonLogs.data) ? jsonLogs.data : []
      setAuditLogs(
        rows.map((r) => ({
          id: r.id,
          time: formatPHDateTime(r.created_at),
          user: r.actor,
          role: r.role,
          action: r.action,
          details: r.details || "—",
          severity: r.severity || "INFO",
          userAgent: r.user_agent || "—",
          entityType: r.entity_type || "",
          entityId: r.entity_id || "",
          ip: r.ip || "—",
        }))
      )
      loadedViewsRef.current.logs = true
    } catch (err) {
      // silent
    } finally {
      if (isManual) setViewLoading((prev) => ({ ...prev, logs: false }))
      setLogsLoading(false)
    }
  }, [
    logPage,
    logsPerPage,
    logSearch,
    logsMineOnly,
    logRoleFilter,
    logSeverityFilter,
    logStartDate,
    logEndDate,
    logSortBy,
    logSortOrder,
  ])

  const refreshLogStats = useCallback(async () => {
    setLogsLoading(true)
    try {
      const res = await fetch("/api/audit-logs/stats")
      const json = await res.json()
      if (res.ok && json?.ok) {
        setLogStats(json.data)
      }
    } catch {
      // ignore
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const refreshSystemHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/system/health", { cache: "no-store" })
      const json = await res.json()
      if (res.ok && json?.ok) {
        setSystemHealth(json.data)
      }
    } catch {
      // ignore
    }
  }, [])

  const refreshBackups = useCallback(async (isManual = false) => {
    if (isManual) setViewLoading((prev) => ({ ...prev, system: true, backup: true }))
    try {
      const searchQuery = backupSearch
        ? `&search=${encodeURIComponent(backupSearch)}`
        : ""
      const startQuery = backupStartDate
        ? `&startDate=${encodeURIComponent(backupStartDate)}`
        : ""
      const endQuery = backupEndDate
        ? `&endDate=${encodeURIComponent(backupEndDate)}`
        : ""

      const [res] = await Promise.all([
        fetch(`/api/system/backup?t=${Date.now()}${searchQuery}${startQuery}${endQuery}`, {
          cache: "no-store",
        }),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
      const json = await res.json()
      if (res.ok && json?.ok) {
        setBackups(Array.isArray(json.data) ? json.data : [])
        loadedViewsRef.current.system = true
        loadedViewsRef.current.backup = true
      }
    } catch (err) {
      console.error("Failed to refresh backups:", err)
    } finally {
      if (isManual) setViewLoading((prev) => ({ ...prev, system: false, backup: false }))
    }
  }, [backupSearch, backupStartDate, backupEndDate])

  const fetchPendingReviewCount = useCallback(async () => {
    try {
      const res = await fetch("/api/documents?limit=200&approvalStatus=Pending")
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok && Array.isArray(json.data)) {
        setPendingReviewCount(json.data.length)
      }
    } catch {
      // ignore
    }
  }, [])

  const refreshReviewRecords = useCallback(async (isManual = false) => {
    if (isManual) setViewLoading((prev) => ({ ...prev, review: true }))
    setReviewLoading(true)
    try {
      const approvalStatus =
        reviewStatusFilter === "All"
          ? ""
          : `&approvalStatus=${encodeURIComponent(reviewStatusFilter)}`
      const [res] = await Promise.all([
        fetch(`/api/documents?limit=200${approvalStatus}`),
        isManual ? new Promise((resolve) => setTimeout(resolve, 600)) : Promise.resolve(),
      ])
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load review records")
      }
      setReviewRecords(Array.isArray(json.data) ? json.data : [])
      loadedViewsRef.current.review = true
      fetchPendingReviewCount()
    } catch (err) {
      if (isManual) {
        showToast(
          {
            title: "Digital Records Review Load Failed",
            description: err?.message || "The system was unable to fetch digital records for review.",
          },
          true
        )
      }
    } finally {
      if (isManual) setViewLoading((prev) => ({ ...prev, review: false }))
      setReviewLoading(false)
    }
  }, [reviewStatusFilter, showToast, fetchPendingReviewCount])

  const performSwitchView = useCallback(
    (nextView) => {
      if (nextView === "storage_layout") {
        setIsStorageDirty(false)
      }
      setView(nextView)
      // Update URL without a full refresh
      const params = new URLSearchParams(window.location.search)
      params.set("view", nextView)
      router.replace(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })

      if (nextView === "directory" && !loadedViewsRef.current.directory) {
        setTimeout(() => {
          refreshStaff()
        }, 0)
      }
      if (nextView === "logs" && !loadedViewsRef.current.logs) {
        setTimeout(() => {
          refreshAuditLogs()
        }, 0)
      }
      if (
        (nextView === "system" || nextView === "backup") &&
        !loadedViewsRef.current.system
      ) {
        setTimeout(() => {
          refreshBackups()
        }, 0)
      }
      if (nextView === "review" && !loadedViewsRef.current.review) {
        setTimeout(() => {
          refreshReviewRecords()
        }, 0)
      }
    },
    [refreshAuditLogs, refreshBackups, refreshStaff, refreshReviewRecords, router]
  )

  const switchView = useCallback(
    (nextView) => {
      if (isStorageDirty && view === "storage_layout") {
        setPendingView(nextView)
        setDiscardConfirmOpen(true)
        return
      }
      performSwitchView(nextView)
    },
    [isStorageDirty, view, performSwitchView]
  )

  const confirmDiscardChanges = useCallback(() => {
    setIsStorageDirty(false)
    setDiscardConfirmOpen(false)
    if (pendingView) {
      performSwitchView(pendingView)
      setPendingView(null)
    }
  }, [pendingView, performSwitchView])

  const logAdminAction = useCallback(
    async (input, detailsInput = "") => {
      // Support legacy (action, details) and new { action, details, severity, ... } patterns
      const data =
        typeof input === "string"
          ? { action: input, details: detailsInput }
          : input

      const {
        action,
        details = "",
        severity = "INFO",
        entityType = "",
        entityId = "",
      } = data

      try {
        const actor = authUser
          ? `${authUser.fname} ${authUser.lname}`.trim()
          : "System"
        const role = authUser ? authUser.role : "System"

        await fetch("/api/audit-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor,
            role,
            action,
            details,
            severity,
            entity_type: entityType,
            entity_id: entityId,
          }),
        })
        refreshAuditLogs()
      } catch {
        // ignore
      }
    },
    [refreshAuditLogs, authUser]
  )

  useEffect(() => {
    const tab = String(searchParams?.get("view") || searchParams?.get("tab") || "").trim()
    const mine = searchParams?.get("mine") === "1"
    const allowedTabs = new Set([
      "directory",
      "create",
      "logs",
      "system_data",
      "review",
      "digitization",
      "request_analytics",
      "system",
      "backup",
      "storage_layout",
    ])
    if (allowedTabs.has(tab)) setView(tab)
    setLogsMineOnly(mine)
    if (mine) setLogPage(1)
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me")
        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.ok) {
          if (res.status === 401) {
            router.push("/")
          }
          return
        }
        setAuthUser(json.data)

        // Render first, then hydrate data in background.
        setLoading(false)
        setTimeout(() => {
          refreshStaff()
          refreshSystemHealth()
          fetchPendingReviewCount()
        }, 0)
      } catch (err) {
        console.error("[AdminPage] Profile fetch failed:", err)
      }
    })()
  }, [router, refreshStaff, refreshAuditLogs, refreshSystemHealth, fetchPendingReviewCount])

  useEffect(() => {
    if (!authUser) return
    const enabled = new Set(authUser.enabled_modules || [])
    const MODULE_KEY_MAP = {
      review: "records_review",
      digitization: "compliance_analytics",
      request_analytics: "request_analytics",
      directory: "staff_directory",
      storage_layout: "storage_layout",
      system_data: "system_config",
      system: "backup",
      logs: "audit_logs",
    }
    const requiredModule = MODULE_KEY_MAP[view]
    if (requiredModule && !enabled.has(requiredModule)) {
      const firstEnabled = sidebarItems.find(item => item.key)
      if (firstEnabled) {
        performSwitchView(firstEnabled.key)
      }
    }
  }, [authUser, view, sidebarItems, performSwitchView])

  useEffect(() => {
    const timer = setInterval(refreshSystemHealth, 10000)
    return () => clearInterval(timer)
  }, [refreshSystemHealth])

  // Poll pending review count every 10s and update on focus/visibility change
  useEffect(() => {
    fetchPendingReviewCount()
    const timer = setInterval(fetchPendingReviewCount, 10000)
    
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      fetchPendingReviewCount()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", onVisible)
    
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", onVisible)
    }
  }, [fetchPendingReviewCount])

  // Sync navigation layout preferences across tabs
  useEffect(() => {
    if (!authUser?.id) return;
    const handleStorageChange = (e) => {
      if (e.key === `pup_nav_layout_pref_${authUser.id}`) {
        setAuthUser((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            preferences: {
              ...(prev.preferences || {}),
              navigation_layout: e.newValue,
            },
          };
        });
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [authUser?.id]);

  // Poll external drive status every 5s
  useEffect(() => {
    let cancelled = false

    const checkDrive = async () => {
      try {
        const res = await fetch("/api/system/external-drive", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok || !json?.ok || cancelled) return

        const { configured, connected, label, path: drivePath } = json.data
        if (!configured) return // No drive configured — nothing to detect

        const prev = extDrivePrevConnectedRef.current

        if (prev === null) {
          // First poll — just record state without firing a modal
          extDrivePrevConnectedRef.current = connected
          return
        }

        if (prev !== connected) {
          extDrivePrevConnectedRef.current = connected
          setExtDriveEvent({
            type: connected ? "connected" : "disconnected",
            label: label || drivePath || "External Drive",
            path: drivePath,
          })
          setExtDriveModalOpen(true)
        }
      } catch {
        // silently ignore network errors
      }
    }

    checkDrive()
    const timer = setInterval(checkDrive, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, []) // intentionally empty — runs once on mount

  useEffect(() => {
    if (view === "backup" || view === "system") {
      setTimeout(() => {
        refreshBackups()
        refreshSystemHealth()
      }, 0)
    }
  }, [view, refreshBackups, refreshSystemHealth])

  useEffect(() => {
    if (view === "logs") {
      // Render the tab first, then hydrate data in the background.
      setTimeout(() => {
        refreshAuditLogs()
        refreshLogStats()
      }, 0)
    }
  }, [view, refreshAuditLogs, refreshLogStats])

  useEffect(() => {
    if (view === "review") {
      setTimeout(() => {
        refreshReviewRecords()
      }, 0)
    }
  }, [view, refreshReviewRecords])



  const reviewDocumentStatus = useCallback(
    async (id, approvalStatus, reviewNote = "", suppressToast = false) => {
      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalStatus, reviewNote }),
        })
        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Failed to review document")
        }

        if (!suppressToast) {
          showToast({
            title: "Document Review Finalized",
            description: "Record status updated in the repository.",
          })
        }
        refreshReviewRecords()
      } catch (err) {
        showToast(
          {
            title: "Review Update Failed",
            description: err?.message || "An error occurred while attempting to update the document's approval status.",
          },
          true
        )
      }
    },
    [reviewRecords, refreshReviewRecords, showToast]
  )

  const bulkReviewDocumentsStatus = useCallback(
    async (ids, approvalStatus, reviewNote = "", suppressToast = false) => {
      if (!ids || ids.length === 0) return
      const toastId = !suppressToast ? showToast(
        {
          title: "Processing Batch",
          description: `Updating ${ids.length} digital records...`,
        },
        "loading"
      ) : null

      const results = { success: 0, failed: 0 }

      for (const id of ids) {
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approvalStatus, reviewNote }),
          })
          const json = await res.json().catch(() => null)
          if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed")
          results.success++
        } catch {
          results.failed++
        }
      }

      if (toastId) toast.dismiss(toastId)
      
      if (!suppressToast) {
        if (results.failed === 0) {
          showToast({
            title: "Batch Action Complete",
            description: `Successfully ${approvalStatus.toLowerCase()} ${results.success} records.`,
          })
        } else {
          showToast(
            {
              title: "Batch Action Partial",
              description: `Processed ${results.success} success, ${results.failed} failed.`,
            },
            true
          )
        }
      }
      refreshReviewRecords()
    },
    [refreshReviewRecords, showToast]
  )

  const [bulkDeclineIds, setBulkDeclineIds] = useState([])
  const [bulkDeclineOpen, setBulkDeclineOpen] = useState(false)
  const [bulkDeclineReason, setBulkDeclineReason] = useState("")

  const handleBulkApprove = useCallback(
    async (ids) => {
      await bulkReviewDocumentsStatus(ids, "Approved")
    },
    [bulkReviewDocumentsStatus]
  )

  const handleBulkDecline = useCallback((ids) => {
    setBulkDeclineIds(ids)
    setBulkDeclineReason("")
    setBulkDeclineOpen(true)
  }, [])

  const submitBulkDecline = useCallback(async () => {
    const ids = bulkDeclineIds
    const note = bulkDeclineReason
    setBulkDeclineOpen(false)
    setBulkDeclineIds([])
    setBulkDeclineReason("")
    await bulkReviewDocumentsStatus(ids, "Declined", note)
  }, [bulkDeclineIds, bulkDeclineReason, bulkReviewDocumentsStatus])

  const openDeclinePrompt = useCallback((id) => {
    setPendingDeclineDocId(id)
    setDeclineReason("")
    setDeclinePromptOpen(true)
  }, [])

  const submitDeclineWithReason = useCallback(async () => {
    if (!pendingDeclineDocId) return
    const id = pendingDeclineDocId
    const note = declineReason
    setDeclinePromptOpen(false)
    setPendingDeclineDocId(null)
    setDeclineReason("")
    await reviewDocumentStatus(id, "Declined", note)
  }, [pendingDeclineDocId, declineReason, reviewDocumentStatus])

  const handlePreviewDocument = useCallback((preview) => {
    setPreviewData(preview)
    setPreviewOpen(true)
  }, [])



  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {
      /* ignore */
    }
    localStorage.setItem("pup-logout", Date.now())
    router.push("/")
  }

  const handleCreate = async (e, totpToken = null) => {
    if (e && e.preventDefault) e.preventDefault()
    if (createLoading) return
    setCreateLoading(true)
    const section = createForm.role === "Admin" ? "Administrative" : "Records"
    const headers = { "Content-Type": "application/json" }
    if (typeof totpToken === "string") {
      headers["x-totp-token"] = totpToken
    }
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...createForm, section }),
      })
      const json = await res.json()

      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (typeof totpToken === "string") {
            throw new Error(json.error || "Invalid verification code")
          }
          await executeWithTOTP(
            (token) => handleCreate(null, token),
            "Create Staff",
            true
          )
          return
        }
        throw new Error(json?.error || "Access denied")
      }

      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create staff")

      setStaffData((prev) => [json.data, ...prev])
      showToast({
        title: "Account Created",
        description: `Staff account for ${createForm.fname} ${createForm.lname} is now active.`,
      })
      setDefaultPwUserLabel(
        `${createForm.fname} ${createForm.lname}`.trim() || createForm.id
      )
      setDefaultReturnedPw(json.defaultPassword || "pupstaff")
      setDefaultPwOpen(true)
      setCreateForm({
        id: "",
        role: "",
        fname: "",
        lname: "",
        email: "",
        status: "Active",
      })
      setRegisterOpen(false)
    } catch (err) {
      if (typeof totpToken === "string") throw err
      showToast({ title: "Creation Failed", description: err.message }, true)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditSubmit = async (e, totpToken = null) => {
    if (e && e.preventDefault) e.preventDefault()
    const section = editForm.role === "Admin" ? "Administrative" : "Records"
    const headers = { "Content-Type": "application/json" }
    if (typeof totpToken === "string") {
      headers["x-totp-token"] = totpToken
    }
    try {
      const res = await fetch(`/api/staff/${editOriginalId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ ...editForm, section }),
      })
      const json = await res.json()

      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (typeof totpToken === "string") {
            throw new Error(json.error || "Invalid verification code")
          }
          await executeWithTOTP(
            (token) => handleEditSubmit(null, token),
            "Update Staff",
            true
          )
          return
        }
        throw new Error(json?.error || "Access denied")
      }

      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to update staff")

      setStaffData((prev) =>
        prev.map((u) => (u.id === editOriginalId ? json.data : u))
      )
      showToast({
        title: "Staff Account Updated",
        description: `Profile changes for ${editForm.fname} ${editForm.lname} have been successfully committed.`,
      })
      setEditOpen(false)
    } catch (err) {
      if (typeof totpToken === "string") throw err
      showToast({ title: "Account Update Failed", description: err.message || "An error occurred while synchronizing profile changes." }, true)
    }
  }

  const handleRestoreUser = async (id) => {
    const u = staffData.find((s) => s.id === id)
    if (!u) return
    setRestoreTarget(u)
    setRestoreOpen(true)
  }

  const confirmRestoreUser = async () => {
    if (!restoreTarget) return
    const { id, fname, lname } = restoreTarget
    const name = `${fname} ${lname}`
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to restore account")

      setStaffData((prev) => prev.map((s) => (s.id === id ? json.data : s)))
      showToast({
        title: "Staff Account Restored",
        description: `System access for ${name} has been successfully reactivated.`,
      })
      setSelectedStaffIds(new Set())
      setRestoreOpen(false)
    } catch (err) {
      showToast({ title: "Account Restoration Failed", description: err.message || "The system was unable to reactivate the personnel account." }, true)
    }
  }

  const confirmDelete = async (
    tokenOrEvent = null,
    targetId = null,
    targetName = null
  ) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null
    const id = targetId || deleteTarget?.id
    const name = targetName || deleteTarget?.fname

    if (!id || deleteLoading) return
    setDeleteLoading(true)
    const headers = {}
    if (totpToken) {
      headers["x-totp-token"] = totpToken
    }
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
        headers,
      })
      const json = await res.json()

      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            setDeleteLoading(false)
            throw new Error(json.error || "Invalid verification code")
          }
          setDeleteLoading(false)
          await executeWithTOTP(
            (token) => confirmDelete(token, id, name),
            "Delete Staff",
            true
          )
          return
        }
        throw new Error(json?.error || "Access denied")
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to delete staff")
      }
      setStaffData((prev) => prev.map((s) => (s.id === id ? json.data : s)))
      showToast({
        title: "Staff Account Archived",
        description: `The personnel account for ${name} has been successfully moved to the archive vault.`,
      })
      setSelectedStaffIds(new Set())
      setDeleteOpen(false)
    } catch (err) {
      if (totpToken) throw err
      showToast({ title: "Account Archival Failed", description: err.message || "An error occurred while attempting to archive the personnel record." }, true)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBulkArchive = () => {
    setBulkArchiveOpen(true)
  }

  const handleBulkRestore = () => {
    setBulkRestoreOpen(true)
  }

  const confirmBulkRestore = async () => {
    if (bulkRestoreLoading) return
    setBulkRestoreLoading(true)

    try {
      let successCount = 0
      let failCount = 0
      const idsToRestore = Array.from(selectedStaffIds)

      for (const id of idsToRestore) {
        const res = await fetch(`/api/staff/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Active" }),
        })
        const json = await res.json()

        if (res.ok && json.ok) {
          setStaffData((prev) => prev.map((s) => (s.id === id ? json.data : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast({
        title: "Bulk Restoration Complete",
        description: `Successfully reactivated system access for ${successCount} personnel account(s). ${failCount > 0 ? `${failCount} accounts could not be restored.` : ""}`,
      })
      setBulkRestoreOpen(false)
      setSelectedStaffIds(new Set())
    } catch (err) {
      showToast(
        {
          title: "Bulk Restoration Failed",
          description:
            err.message ||
            "An unexpected error occurred during batch processing.",
        },
        true
      )
    } finally {
      setBulkRestoreLoading(false)
    }
  }

  const confirmBulkArchive = async (token = null) => {
    if (bulkArchiveLoading) return
    setBulkArchiveLoading(true)

    const totpToken = typeof token === "string" ? token : null
    const headers = { "Content-Type": "application/json" }
    if (totpToken) headers["x-totp-token"] = totpToken

    try {
      let successCount = 0
      let failCount = 0
      const idsToArchive = Array.from(selectedStaffIds)

      for (const id of idsToArchive) {
        if (id === authUser?.id) {
          failCount++
          continue
        }

        const res = await fetch(`/api/staff/${id}`, {
          method: "DELETE",
          headers,
        })
        const json = await res.json()

        if (res.status === 403 && json?.requiresTOTP && !totpToken) {
          setBulkArchiveLoading(false)
          await executeWithTOTP(
            (t) => confirmBulkArchive(t),
            "Bulk Archive Staff",
            true
          )
          return
        }

        if (res.ok && json.ok) {
          setStaffData((prev) => prev.map((s) => (s.id === id ? json.data : s)))
          successCount++
        } else {
          failCount++
        }
      }

      showToast({
        title: "Bulk Archival Complete",
        description: `Successfully moved ${successCount} personnel record(s) to the archive vault. ${failCount > 0 ? `${failCount} records could not be archived.` : ""}`,
      })
      setBulkArchiveOpen(false)
      setSelectedStaffIds(new Set())
    } catch (err) {
      if (totpToken) throw err
      showToast(
        {
          title: "Bulk Archival Failed",
          description:
            err.message ||
            "An unexpected error occurred during batch processing.",
        },
        true
      )
    } finally {
      setBulkArchiveLoading(false)
    }
  }

  const simulateBackup = async (tokenOrEvent = null) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null

    if (authUser?.totp_enabled && !totpToken) {
      executeWithTOTP((token) => simulateBackup(token), "Create Backup", true)
      return
    }

    const headers = new Headers()
    if (totpToken) {
      headers.set("x-totp-token", totpToken)
    }

    const promise = (async () => {
      const res = await fetch("/api/system/backup", {
        method: "POST",
        headers,
      })
      const json = await res.json()

      if (res.status === 403 && json?.requiresTOTP) {
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        executeWithTOTP((token) => simulateBackup(token), "Create Backup", true)
        throw new Error("TOTP_REQUIRED")
      }

      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to create backup")

      // Await refresh to ensure table updates before UI completes
      await refreshBackups()

      if (json?.data?.id) {
        // Trigger download with a slight delay to avoid interrupting table refresh state
        setTimeout(() => {
          const link = document.createElement("a")
          link.href = `/api/system/backup/download?id=${json?.data?.id}`
          link.download = json?.data?.filename || "backup.zip.enc"
          link.click()
        }, 1000)
      }
      return json
    })()

    toast.promise(promise, {
      loading: "Creating full system snapshot...",
      success: (json) => {
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-emerald-700">Backup Successful</p>
            <p className="text-xs font-normal">
              Archive &apos;{json?.data?.filename || "backup package"}&apos; has been secured.
            </p>
          </div>
        )
      },
      error: (err) => {
        if (err.message === "TOTP_REQUIRED") return null
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-red-600">Backup Failed</p>
            <p className="text-xs font-medium opacity-80">
              {err.message || "Unable to complete system snapshot."}
            </p>
          </div>
        )
      },
    })
    
    return promise
  }

  const syncExternal = async (id) => {
    const promise = (async () => {
      const res = await fetch("/api/system/backup/sync-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Sync failed")
      refreshBackups()
      return json
    })()

    toast.promise(promise, {
      loading: "Transferring encrypted backup to external volume...",
      success: (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">External Sync Complete</p>
          <p className="text-xs font-medium opacity-80">
            A redundant copy has been secured on the external drive.
          </p>
        </div>
      ),
      error: (err) => (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-red-600">Sync Failed</p>
          <p className="text-xs font-medium opacity-80">
            {err.message || "Unable to secure external copy."}
          </p>
        </div>
      ),
    })

    return promise
  }

  const confirmDeleteBackup = async () => {
    if (backupDeleteTargets.length === 0 || backupDeleteLoading) return
    setBackupDeleteLoading(true)
    try {
      const isBulk = backupDeleteTargets.length > 1
      const res = await fetch(
        isBulk
          ? "/api/system/backup"
          : `/api/system/backup/${backupDeleteTargets[0].id}`,
        {
          method: "DELETE",
          headers: isBulk ? { "Content-Type": "application/json" } : {},
          body: isBulk
            ? JSON.stringify({ ids: backupDeleteTargets.map((t) => t.id) })
            : undefined,
        }
      )
      const json = await res.json()
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to delete backup(s)")

      showToast({
        title: isBulk ? "Bulk Deletion Successful" : "Deletion Successful",
        description: isBulk
          ? `Successfully removed ${json.deletedCount} backup archives from the system.`
          : "The selected backup archive has been permanently removed.",
      })
      setBackupDeleteOpen(false)
      refreshBackups()
    } catch (err) {
      showToast({ title: "Deletion Failed", description: err.message }, true)
    } finally {
      setBackupDeleteLoading(false)
    }
  }

  const confirmRestore = async (tokenOrEvent = null) => {
    const totpToken = typeof tokenOrEvent === "string" ? tokenOrEvent : null
    if (!restoreFile || restoreLoading) return
    setRestoreLoading(true)

    const formData = new FormData()
    formData.append("file", restoreFile)
    const headers = {}
    if (totpToken) {
      headers["x-totp-token"] = totpToken
    }

    const promise = (async () => {
      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        headers,
        body: formData,
      })
      const json = await res.json()

      if (res.status === 403) {
        if (json?.requiresTOTP) {
          if (totpToken) {
            setRestoreLoading(false)
            throw new Error(json.error || "Invalid verification code")
          }
          setRestoreLoading(false)
          await executeWithTOTP(
            (token) => confirmRestore(token),
            "Restore System",
            true
          )
          throw new Error("TOTP_REQUIRED")
        }
        throw new Error(json?.error || "Access denied")
      }

      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to restore system")

      setTimeout(() => location.reload(), 3000)
      return json
    })()

    toast.promise(promise, {
      loading: "Restoring system from encrypted archive...",
      success: {
        title: "System Restored",
        description:
          "Database recovered successfully. Reloading system in 3s...",
      },
      error: (err) => {
        setRestoreLoading(false)
        if (err.message === "TOTP_REQUIRED") return null
        return {
          title: "Restore Failed",
          description: err.message || "Critical error during restoration.",
        }
      },
    })
  }

  const exportData = (filteredData) => {
    try {
      const dataToExport = filteredData || staffData
      const headers = ["ID", "First Name", "Last Name", "Role", "Status", "Email"]
      const csvRows = dataToExport.map((s) => [
        s.id,
        s.fname || "—",
        s.lname || "—",
        s.role || "—",
        s.status || "—",
        s.email || "—"
      ])
      const csvContent = [
        headers.join(","),
        ...csvRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n")
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const fileName = generateExportFilename("STAFF-DIRECTORY", "DATA", "csv")
      link.setAttribute("href", url)
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast({
        title: "Export Success",
        description: `Personnel directory exported successfully as ${fileName}.`
      })

      logAdminAction({
        action: "Export Personnel List",
        details: `exported ${dataToExport.length} staff records to CSV`,
        entityType: "Report"
      })
    } catch (err) {
      showToast({
        title: "Export Failed",
        description: "An error occurred while exporting the personnel list."
      }, true)
    }
  }


  const sidebarActiveKey = view === "backup" ? "system" : view

  if (loading) {
    return (
      <div className="font-inter flex min-h-screen flex-col gap-4 bg-gray-50 p-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[30%] rounded-brand" />
          <Skeleton className="h-full w-[70%] rounded-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="font-inter flex h-screen overflow-hidden flex-col bg-slate-50/30 dark:bg-zinc-950/30 relative transition-colors duration-300">
      {/* Dynamic Liquid Glass Background Blobs */}
      <div className="liquid-container">
        <div className="liquid-blob liquid-blob-1"></div>
        <div className="liquid-blob liquid-blob-2"></div>
        <div className="liquid-blob liquid-blob-3"></div>
      </div>
      <Header authUser={authUser} onLogout={handleLogout} />

      {authUser?.preferences?.navigation_layout === "topbar" && (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-white/5 py-2.5 px-4 flex items-center justify-center gap-2 overflow-x-auto shadow-xs select-none shrink-0 scrollbar-none">
          {sidebarItems.map((item, idx) => {
            if (item.type === "header") {
              return (
                <div key={`header-${idx}`} className="text-[9px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500 whitespace-nowrap ml-4 first:ml-0 border-l border-gray-200 dark:border-white/5 pl-4 first:border-0 first:pl-0">
                  {item.label}
                </div>
              );
            }
            const active = sidebarActiveKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => switchView(item.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors duration-300 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer shrink-0",
                  active
                    ? "bg-red-50 text-pup-maroon dark:bg-red-500/10 dark:text-primary shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50"
                )}
              >
                <i className={cn(item.iconClass, "text-sm")}></i>
                {item.label}
                {item.badge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white bg-pup-maroon dark:bg-red-500/20 dark:text-red-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className={cn("flex w-full flex-1 min-h-0 overflow-hidden", authUser?.preferences?.navigation_layout === "topbar" ? "flex-col" : "flex-row")}>
        {authUser?.preferences?.navigation_layout !== "topbar" && (
          <Sidebar
            open={sidebarOpen}
            items={sidebarItems}
            activeKey={sidebarActiveKey}
            onSelect={switchView}
            onLogout={handleLogout}
            zoomNode={zoomNode}
            setZoomNode={setZoomNode}
            handleZoomMouseDown={handleZoomMouseDown}
            accentColor={authUser?.accent_color}
            officeName={authUser?.office_name}
          />
        )}
        <main className="relative w-full min-w-0 min-h-0 flex-1 bg-white/25 dark:bg-zinc-950/25 overflow-y-auto backdrop-blur-xs">
          <div 
            className="flex-1 p-4 flex flex-col min-h-0 w-full"
            style={{ zoom: [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25][zoomNode] }}
          >          {view === "directory" && (
            <StaffDirectoryTab
              staffData={staffData}
              isLoading={viewLoading.directory}
              currentUserId={authUser?.id}
              search={search}
              setSearch={setSearch}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              selectedIds={selectedStaffIds}
              onSelectionChange={setSelectedStaffIds}
              onEditUser={(id) => {
                const u = staffData.find((s) => s.id === id)
                if (!u) return
                setEditOriginalId(u.id)
                setEditForm({ ...u })
                setEditOpen(true)
              }}
              onRestoreUser={handleRestoreUser}
              onDeleteUser={(id) => {
                const u = staffData.find((s) => s.id === id)
                if (!u) return
                if (authUser?.totp_enabled) {
                  setDeleteTarget(u)
                  setTotpActionLabel("Delete Account")
                  setTotpModalDescription(
                    `Enter your authenticator code to permanently delete ${u.fname}'s account.`
                  )
                  const targetId = u.id
                  const targetName = u.fname
                  totpPendingActionRef.current = async (token) => {
                    await confirmDelete(token, targetId, targetName)
                  }
                  setTotpModalOpen(true)
                } else {
                  setDeleteTarget(u)
                  setDeleteOpen(true)
                }
              }}
              onBulkArchive={handleBulkArchive}
              onBulkRestore={handleBulkRestore}
              onSwitchView={(v) => {
                if (v === "create") {
                  setRegisterOpen(true)
                } else {
                  switchView(v)
                }
              }}
              onRefresh={() => refreshStaff(true)}
            />
          )}

          {view === "logs" && (
            <AuditLogsTab
              displayLogs={auditLogs}
              logStats={logStats}
              isLoading={logsLoading}
              isManualLoading={viewLoading.logs}
              logPage={logPage}
              setLogPage={setLogPage}
              logTotal={logTotal}
              logsPerPage={logsPerPage}
              setLogsPerPage={setLogsPerPage}
              logSearch={logSearch}
              setLogSearch={setLogSearch}
              logRoleFilter={logRoleFilter}
              setLogRoleFilter={setLogRoleFilter}
              logSeverityFilter={logSeverityFilter}
              setLogSeverityFilter={setLogSeverityFilter}
              logStartDate={logStartDate}
              setLogStartDate={setLogStartDate}
              logEndDate={logEndDate}
              setLogEndDate={setLogEndDate}
              logSortBy={logSortBy}
              setLogSortBy={setLogSortBy}
              logSortOrder={logSortOrder}
              setLogSortOrder={setLogSortOrder}
              showToast={showToast}
              onLogAction={logAdminAction}
              onRefresh={() => {
                refreshAuditLogs(true)
                refreshLogStats()
              }}
            />
          )}

          {view === "system_data" && (
            <SystemConfigTab
              showToast={showToast}
              logAdminAction={logAdminAction}
              onVerifyTOTP={(action) =>
                executeWithTOTP(action, "Save Security Questions", true)
              }
            />
          )}

          {view === "storage_layout" && (
            <StorageLayoutEditorTab 
              showToast={showToast} 
              isDirty={isStorageDirty}
              setIsDirty={setIsStorageDirty}
            />
          )}

          {view === "review" && (
            <DigitalRecordsReviewTab
              records={reviewRecords}
              isLoading={reviewLoading}
              isManualLoading={viewLoading.review}
              error={null}
              statusFilter={reviewStatusFilter}
              setStatusFilter={setReviewStatusFilter}
              onRefresh={refreshReviewRecords}
              onApprove={(id, suppress = false) => reviewDocumentStatus(id, "Approved", "", suppress)}
              onDecline={openDeclinePrompt}
              onBulkApprove={handleBulkApprove}
              onBulkDecline={handleBulkDecline}
              onSetStatus={reviewDocumentStatus}
              onPreviewDocument={handlePreviewDocument}
              showToast={showToast}
              onLogAction={logAdminAction}
            />
          )}

          {view === "digitization" && (
            <DigitizationComplianceTab
              showToast={showToast}
              onLogAction={logAdminAction}
            />
          )}

          {view === "request_analytics" && (
            <SLAAnalyticsTab
              showToast={showToast}
              onLogAction={logAdminAction}
              onSwitchView={switchView}
            />
          )}

          {(view === "system" || view === "backup") && (
            <BackupTab
              systemHealth={systemHealth}
              backups={backups}
              isLoading={viewLoading.system || viewLoading.backup}
              isManualLoading={viewLoading.system || viewLoading.backup}
              backupSearch={backupSearch}
              setBackupSearch={setBackupSearch}
              backupStartDate={backupStartDate}
              setBackupStartDate={setBackupStartDate}
              backupEndDate={backupEndDate}
              setBackupEndDate={setBackupEndDate}
              onSimulateBackup={() => simulateBackup()}
              onSyncExternal={syncExternal}
              onDownloadBackup={(b) => {
                const id = b && typeof b === "object" ? b.id : b
                const filename =
                  b && typeof b === "object" ? b.filename : "backup.zip.enc"
                const link = document.createElement("a")
                link.href = `/api/system/backup/download?id=${id}`
                link.download = filename
                link.click()
              }}
              onDeleteBackup={(id) => {
                const ids = Array.isArray(id) ? id : [id]
                const targets = backups.filter((x) => ids.includes(x.id))
                if (targets.length > 0) {
                  const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
                  setBackupDeleteVerificationTarget(randomCode)
                  setBackupDeleteVerificationValue("")
                  setBackupDeleteTargets(targets)
                  setBackupDeleteTypedText("")
                  setBackupDeleteOpen(true)
                }
              }}
              onRestoreFileChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  setRestoreFile(f)
                  setRestoreConfirmOpen(true)
                  // Reset file input value so selecting the same file again triggers onChange
                  e.target.value = ""
                }
              }}
              onRefresh={refreshBackups}
              showToast={showToast}
            />
          )}
          </div>
        </main>
      </div>

      <ConfirmModal
        open={discardConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved layout modifications. Navigating away will discard them."
        confirmLabel="Discard Changes"
        variant="warning"
        onConfirm={confirmDiscardChanges}
        onCancel={() => {
          setDiscardConfirmOpen(false)
          setPendingView(null)
        }}
        isUnsavedChangesModal={true}
      />

      <EditUserModal
        open={editOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <RegisterAccountTab
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        authUser={authUser}
        createForm={createForm}
        setCreateForm={setCreateForm}
        staffCount={staffData.length}
        isLoading={createLoading}
        onResetForm={() =>
          setCreateForm({
            id: "",
            role: "",
            fname: "",
            lname: "",
            email: "",
            status: "Active",
          })
        }
        onCreateAccount={handleCreate}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Archive Personnel Account"
        message="This account will be restricted immediately but can be restored later."
        confirmLabel="Archive Account"
        icon="ph-duotone ph-archive"
        buttonIcon="ph-bold ph-archive"
        selectedItems={[
          deleteTarget ? `${deleteTarget.fname} ${deleteTarget.lname}` : "",
        ]}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        isLoading={deleteLoading}
        isPersonnelModal={true}
      />

      <ConfirmModal
        open={restoreOpen}
        title="Restore Personnel Account"
        message="This account will be reactivated and the personnel will be able to log in again."
        confirmLabel="Restore Account"
        variant="success"
        selectedItems={[
          restoreTarget ? `${restoreTarget.fname} ${restoreTarget.lname}` : "",
        ]}
        onConfirm={confirmRestoreUser}
        onCancel={() => setRestoreOpen(false)}
        isRestoreModal={true}
      />

      <ConfirmModal
        open={backupDeleteOpen}
        title={
          backupDeleteTargets.length > 1
            ? "Bulk Delete Backups"
            : "Delete System Backup"
        }
        message={
          backupDeleteTargets.length > 1
            ? "This will permanently remove the selected backups from the server. This action cannot be undone."
            : "This will permanently remove the selected backup from the server. This action cannot be undone."
        }
        selectedItems={backupDeleteTargets.map((t) => t?.filename || "Unknown")}
        onConfirm={confirmDeleteBackup}
        onCancel={() => setBackupDeleteOpen(false)}
        confirmLabel={backupDeleteTargets.length > 1 ? "Bulk Delete" : "Delete Permanently"}
        isLoading={backupDeleteLoading}
        variant="danger"
        verificationTarget={backupDeleteVerificationTarget}
        verificationValue={backupDeleteVerificationValue}
        onVerificationChange={setBackupDeleteVerificationValue}
        isDeleteBackup={true}
      />

      <ConfirmModal
        open={restoreConfirmOpen}
        title="Restore System Image"
        variant="warning"
        message={`Overwrite all repository data with the following backup archive? This action is irreversible.`}
        selectedItems={[restoreFile?.name]}
        confirmLabel="Begin Restoration"
        icon="ph-duotone ph-arrow-counter-clockwise"
        buttonIcon="ph-bold ph-arrow-counter-clockwise"
        onConfirm={() => confirmRestore()}
        onCancel={() => setRestoreConfirmOpen(false)}
        isLoading={restoreLoading}
      />

      <PromptModal
        open={declinePromptOpen}
        title="Decline Digital Record"
        message="Provide a brief reason for declining. This will be sent to the student as a notification."
        value={declineReason}
        onChange={setDeclineReason}
        onConfirm={submitDeclineWithReason}
        onCancel={() => {
          setDeclinePromptOpen(false)
          setPendingDeclineDocId(null)
          setDeclineReason("")
        }}
        variant="danger"
        confirmLabel="Confirm Decline"
        buttonIcon="ph-bold ph-x"
        inputLabel="Reason"
        placeholder="e.g., Image is too blurry, incorrect document type..."
        multiline
        isDeclineModal={true}
      />

      {/* Bulk Decline Prompt */}
      <PromptModal
        open={bulkDeclineOpen}
        onCancel={() => {
          setBulkDeclineOpen(false)
          setBulkDeclineReason("")
        }}
        title="Bulk Decline Records"
        message={`You are about to decline ${bulkDeclineIds.length} digital records. This action will notify all impacted students.`}
        value={bulkDeclineReason}
        onChange={setBulkDeclineReason}
        variant="danger"
        buttonIcon="ph-bold ph-x"
        inputLabel="Common Rejection Reason"
        placeholder="Reason for bulk rejection (applied to all selected)..."
        onConfirm={submitBulkDecline}
        confirmLabel="Decline All Records"
        multiline
      />

      <ConfirmModal
        open={bulkArchiveOpen}
        title="Batch Archive Personnel"
        message={`${selectedStaffIds.size} personnel profiles will be archived and their system access revoked immediately.`}
        confirmLabel="Archive Selected"
        icon="ph-duotone ph-archive"
        buttonIcon="ph-bold ph-archive"
        selectedItems={Array.from(selectedStaffIds).map((id) => {
          const s = staffData.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        onConfirm={() => {
          if (authUser?.totp_enabled) {
            executeWithTOTP(
              (token) => confirmBulkArchive(token),
              "Bulk Archive Staff",
              true
            )
          } else {
            confirmBulkArchive()
          }
        }}
        onCancel={() => {
          setBulkArchiveOpen(false)
        }}
        isLoading={bulkArchiveLoading}
        isPersonnelModal={true}
      />

      <ConfirmModal
        open={bulkRestoreOpen}
        title="Batch Restore Personnel"
        message={`${selectedStaffIds.size} personnel profiles will be reactivated and able to log in again.`}
        confirmLabel="Restore Selected"
        variant="success"
        selectedItems={Array.from(selectedStaffIds).map((id) => {
          const s = staffData.find((x) => x.id === id)
          return s ? `${s.fname} ${s.lname}` : id
        })}
        onConfirm={confirmBulkRestore}
        onCancel={() => {
          setBulkRestoreOpen(false)
        }}
        isLoading={bulkRestoreLoading}
        isPersonnelModal={true}
        isRestoreModal={true}
      />

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewData}
      />

      <Dialog open={defaultPwOpen} onOpenChange={setDefaultPwOpen}>
        <DialogContent className="w-full max-w-2xl overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card">
          <DialogHeader className="bg-white p-6 pb-0 dark:bg-card border-none">
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Staff Account Created
                </DialogTitle>
                <DialogDescription className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                  Securely record the temporary credentials below before closing this window.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 p-6 pb-4">
            <div className="bg-transparent p-0 border-none">
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400">
                Temporary Password for{" "}
                <span className="text-pup-maroon dark:text-red-400">
                  {defaultPwUserLabel}
                </span>
              </label>

              <div 
                className="flex items-center justify-between rounded-[8px] border-[0.5px] border-gray-300 bg-white p-[10px_14px] dark:border-zinc-800 dark:bg-zinc-900/30"
                style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
              >
                <code className="font-mono text-[14px] font-medium text-pup-maroon dark:text-red-400">
                  {defaultReturnedPw}
                </code>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPassword}
                  className={cn(
                    "text-[12px] font-medium bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer focus:outline-none",
                    copied ? "text-emerald-600" : "text-pup-maroon dark:text-red-400"
                  )}
                >
                  {copied ? "copied" : "copy"}
                </Button>
              </div>

              <div className="mt-3 text-[11px] font-normal text-gray-500 dark:text-zinc-500 p-0 border-none bg-transparent">
                This password is temporary and expires after first login. Ensure the user receives it securely.
              </div>
            </div>
          </div>

          <div className="flex flex-row justify-end gap-2 bg-white p-6 dark:bg-card border-none">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDefaultPwOpen(false)}
              className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent hover:bg-transparent border-none shadow-none p-0 h-auto cursor-pointer focus:outline-none"
            >
              Close
            </Button>
            <Button
              onClick={() => setDefaultPwOpen(false)}
              className="flex h-[36px] items-center justify-center rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none border-none py-0 px-4 cursor-pointer"
            >
              Acknowledge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TOTPChallengeModal
        open={totpModalOpen}
        onOpenChange={setTotpModalOpen}
        onConfirm={handleTOTPConfirm}
        actionLabel={totpActionLabel}
        description={totpModalDescription}
        isLoading={totpModalLoading}
      />

      {/* Global External Drive Detection Modal */}
      <Dialog open={extDriveModalOpen} onOpenChange={setExtDriveModalOpen}>
        <DialogContent className="w-full max-w-lg overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-lg dark:border-white/10 dark:bg-card">
          <DialogHeader className={cn(
            "border-b p-6",
            extDriveEvent?.type === "connected"
              ? "border-emerald-100 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/40"
              : "border-amber-100 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/40"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                extDriveEvent?.type === "connected"
                  ? "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border-amber-200 bg-white text-amber-600 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                <i className={cn(
                  "ph-duotone text-xl",
                  extDriveEvent?.type === "connected" ? "ph-usb" : "ph-usb-slash"
                )} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  {extDriveEvent?.type === "connected"
                    ? "External Drive Connected"
                    : "External Drive Disconnected"}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {extDriveEvent?.type === "connected"
                    ? "An external backup storage device has been detected and is ready for use."
                    : "The external backup drive is no longer reachable. Backup synchronization is unavailable."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-6">
            {/* Drive Info Card */}
            <div className={cn(
              "flex items-center gap-4 rounded-xl border p-4",
              extDriveEvent?.type === "connected"
                ? "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/20 dark:bg-emerald-950/20"
                : "border-amber-100 bg-amber-50/50 dark:border-amber-900/20 dark:bg-amber-950/20"
            )}>
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                extDriveEvent?.type === "connected"
                  ? "border-emerald-200 bg-white dark:border-emerald-800/40 dark:bg-card"
                  : "border-amber-200 bg-white dark:border-amber-800/40 dark:bg-card"
              )}>
                <i className="ph-bold ph-hard-drive text-base text-gray-500 dark:text-zinc-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-zinc-500">Drive Label</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900 truncate dark:text-zinc-50">
                  {extDriveEvent?.label || "External Storage Device"}
                </p>
                {extDriveEvent?.path && (
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400 truncate dark:text-zinc-500">
                    {extDriveEvent.path}
                  </p>
                )}
              </div>
              <div className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold  tracking-widest",
                extDriveEvent?.type === "connected"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              )}>
                {extDriveEvent?.type === "connected" ? "Online" : "Offline"}
              </div>
            </div>

            {/* Contextual hint */}
            <div className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
              <i className={cn(
                "ph-fill text-sm mt-0.5 shrink-0",
                extDriveEvent?.type === "connected"
                  ? "ph-info text-blue-500"
                  : "ph-warning-circle text-amber-500"
              )} />
              <p className="text-[11px] font-medium text-gray-600 dark:text-zinc-400">
                {extDriveEvent?.type === "connected"
                  ? "Backup archives can now be synchronized to this external drive from the Backup & Maintenance panel."
                  : "Any pending or future backup synchronization to this drive will fail until it is reconnected."}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExtDriveModalOpen(false)}
              className="h-10 rounded-brand border border-gray-300 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:bg-white/2"
            >
              Dismiss
            </Button>
            {extDriveEvent?.type === "connected" && (
              <Button
                onClick={() => {
                  setExtDriveModalOpen(false)
                  switchView("backup")
                }}
                className="flex h-10 items-center gap-2 rounded-brand btn-brand-red px-5 font-semibold text-white shadow-sm"
              >
                <i className="ph-bold ph-hard-drives" />
                Go to Backup & Maintenance
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <FloatingChatWidget />
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center font-inter p-4">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-pup-maroon dark:border-zinc-800 dark:border-t-primary"></div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 dark:text-zinc-500 uppercase">Loading System...</p>
            </div>
          </div>
        }
      >
        <AdminPageContent />
      </Suspense>
    </AdminGuard>
  )
}
