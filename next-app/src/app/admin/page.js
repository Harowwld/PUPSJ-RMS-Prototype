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
    create: true,
  })

  const validViews = [
    "directory",
    "create",
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
    : "directory"

  const [view, setView] = useState(initialView)
  const [viewLoading, setViewLoading] = useState({
    directory: false,
    logs: false,
    system: false,
    backup: false,
    review: false,
    request_analytics: false,
  })

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
            description: `The digital record has been successfully ${approvalStatus.toLowerCase()} and the status updated in the repository.`,
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
      switchView("directory")
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
              Archive '{json?.data?.filename || "backup package"}' has been secured.
            </p>
          </div>
        )
      },
      error: (err) => {
        if (err.message === "TOTP_REQUIRED") return null
        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-red-600">Backup Failed</p>
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
          <p className="text-sm font-bold">External Sync Complete</p>
          <p className="text-xs font-medium opacity-80">
            A redundant copy has been secured on the external drive.
          </p>
        </div>
      ),
      error: (err) => (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-red-600">Sync Failed</p>
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

  const sidebarItems = [
    { type: "header", label: "Operations & Analytics" },
    {
      key: "review",
      label: "Digital Records Review",
      iconClass: "ph-bold ph-seal-check",
      badge: pendingReviewCount,
    },
    {
      key: "digitization",
      label: "Compliance Analysis",
      iconClass: "ph-bold ph-chart-bar",
    },
    {
      key: "request_analytics",
      label: "Request Analysis",
      iconClass: "ph-bold ph-trend-up",
    },

    { type: "header", label: "User Management" },
    {
      key: "directory",
      label: "Staff Directory",
      iconClass: "ph-bold ph-users",
    },
    {
      key: "create",
      label: "Register Account",
      iconClass: "ph-bold ph-user-plus",
    },

    { type: "header", label: "System Configuration" },
    {
      key: "storage_layout",
      label: "Storage Layout",
      iconClass: "ph-bold ph-warehouse",
    },
    { key: "system_data", label: "System Data", iconClass: "ph-bold ph-gear" },
    { key: "system", label: "Backup", iconClass: "ph-bold ph-database" },
    { key: "logs", label: "Audit Logs", iconClass: "ph-bold ph-scroll" },
  ]

  const sidebarActiveKey = view === "backup" ? "system" : view

  if (loading) {
    return (
      <div className="font-inter flex h-screen flex-col gap-4 overflow-hidden bg-gray-50 p-4 transition-colors duration-300 dark:bg-background">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[30%] rounded-brand" />
          <Skeleton className="h-full w-[70%] rounded-brand" />
        </div>
      </div>
    )
  }

  return (
    <div className="font-inter flex h-screen flex-col overflow-hidden bg-gray-50 transition-colors duration-300 dark:bg-background">
      <Header authUser={authUser} onLogout={handleLogout} />

      <div className="flex min-h-0 w-full flex-1">
        <Sidebar
          items={sidebarItems}
          activeKey={sidebarActiveKey}
          onSelect={switchView}
        />

        <main className="relative w-full min-w-0 flex-1 overflow-y-auto p-4">
          {view === "directory" && (
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
              onSwitchView={switchView}
              onRefresh={() => refreshStaff(true)}
            />
          )}

          {view === "create" && (
            <RegisterAccountTab
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
              onSwitchView={switchView}
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
        </main>
      </div>

      <Footer />

      <ConfirmModal
        open={discardConfirmOpen}
        title="Unsaved Changes"
        message="You have unsaved layout modifications. Moving to another section will discard these changes."
        confirmLabel="Discard Changes"
        variant="warning"
        onConfirm={confirmDiscardChanges}
        onCancel={() => {
          setDiscardConfirmOpen(false)
          setPendingView(null)
        }}
        confirmClassName="bg-linear-to-b from-orange-700 to-orange-500 border-4 border-orange-900 hover:from-orange-600 hover:to-orange-800 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-xl shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
      />

      <EditUserModal
        open={editOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <ConfirmModal
        open={deleteOpen}
        title="Archive Personnel Account"
        message={`Archive this personnel account? This will restrict their system access immediately but can be restored later if needed.`}
        confirmLabel="Archive Account"
        icon="ph-duotone ph-archive"
        buttonIcon="ph-bold ph-archive"
        selectedItems={[
          deleteTarget ? `${deleteTarget.fname} ${deleteTarget.lname}` : "",
        ]}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
        isLoading={deleteLoading}
      />

      <ConfirmModal
        open={restoreOpen}
        title="Restore Personnel Account"
        message={`Reactivate system access for this personnel profile? They will be able to log in to the system again.`}
        confirmLabel="Restore Account"
        variant="success"
        selectedItems={[
          restoreTarget ? `${restoreTarget.fname} ${restoreTarget.lname}` : "",
        ]}
        onConfirm={confirmRestoreUser}
        onCancel={() => setRestoreOpen(false)}
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
            ? `You are about to permanently remove ${backupDeleteTargets.length} backup archives from the local server. This action is irreversible.`
            : `You are about to permanently remove the following backup archive from the local server. This action is irreversible.`
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
        message="Please provide a brief reason for declining this digital record. This will be sent as a notification to the student."
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
        inputLabel="Reason for Rejection"
        placeholder="e.g., Image is too blurry, incorrect document type..."
        multiline
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
        message={`Move ${selectedStaffIds.size} personnel profiles to the archive vault? This will revoke their system access immediately.`}
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
      />

      <ConfirmModal
        open={bulkRestoreOpen}
        title="Batch Restore Personnel"
        message={`Reactivate system access for ${selectedStaffIds.size} personnel profiles? They will be able to log in to the system again.`}
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
      />

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        preview={previewData}
      />

      <Dialog open={defaultPwOpen} onOpenChange={setDefaultPwOpen}>
        <DialogContent className="w-full max-w-2xl overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-white/10 dark:bg-card">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-100 dark:border-primary/20 bg-red-50 text-pup-maroon dark:text-primary shadow-sm dark:bg-primary/10">
                <i className="ph-duotone ph-key text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  Staff Account Created
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
                  System account configured successfully. Securely record the
                  following temporary credentials before closing this window.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 p-8">
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50 p-6 shadow-sm dark:bg-amber-950/50">
              <label className="mb-3 block text-[10px] font-black tracking-widest text-amber-900 dark:text-amber-400 uppercase opacity-60 dark:opacity-100">
                Temporary Password for{" "}
                <span className="text-pup-maroon dark:text-primary">
                  {defaultPwUserLabel}
                </span>
              </label>

              <div className="group relative flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-900/40 bg-white p-4 shadow-inner transition-all hover:border-amber-300 dark:hover:border-amber-800/50 dark:bg-white/5 dark:shadow-none">
                <code className="font-mono text-lg font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  {defaultReturnedPw}
                </code>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPassword}
                  className={cn(
                    "h-10 gap-2 rounded-brand border-amber-200 dark:border-amber-900/50 px-4 font-black transition-all",
                    copied
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-200"
                      : "bg-white dark:bg-white/5 text-amber-900 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-white/10 hover:border-amber-400 dark:hover:border-amber-700/50"
                  )}
                >
                  <i className={cn("ph-bold", copied ? "ph-check-circle" : "ph-copy")} />
                  {copied ? "COPIED!" : "COPY"}
                </Button>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200/50 dark:border-amber-900/20 bg-white p-3 text-[10px] font-bold leading-relaxed text-amber-800/80 dark:text-amber-400/80 dark:bg-white/5">
                <i className="ph-fill ph-warning-circle text-sm text-amber-600 mt-0.5" />
                This password is temporary and will expire after the first login. Please ensure the user receives this securely.
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDefaultPwOpen(false)}
              className="h-11 rounded-brand border border-gray-300 px-6 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:bg-white/2"
            >
              Close
            </Button>
            <Button
              onClick={() => setDefaultPwOpen(false)}
              className="flex h-11 items-center gap-2 rounded-brand btn-brand-red px-6 font-bold text-white shadow-sm"
            >
              <i className="ph-bold ph-check"></i>
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
                  "ph-duotone text-2xl",
                  extDriveEvent?.type === "connected" ? "ph-usb" : "ph-usb-slash"
                )} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight font-black tracking-tight text-gray-900 dark:text-zinc-50">
                  {extDriveEvent?.type === "connected"
                    ? "External Drive Connected"
                    : "External Drive Disconnected"}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed font-medium text-gray-600 dark:text-zinc-300">
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
                <p className="text-xs font-black tracking-widest text-gray-400 uppercase dark:text-zinc-500">Drive Label</p>
                <p className="mt-0.5 text-sm font-black text-gray-900 truncate dark:text-zinc-50">
                  {extDriveEvent?.label || "External Storage Device"}
                </p>
                {extDriveEvent?.path && (
                  <p className="mt-0.5 font-mono text-[10px] text-gray-400 truncate dark:text-zinc-500">
                    {extDriveEvent.path}
                  </p>
                )}
              </div>
              <div className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
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
              <p className="text-[11px] font-medium leading-relaxed text-gray-600 dark:text-zinc-400">
                {extDriveEvent?.type === "connected"
                  ? "Backup archives can now be synchronized to this external drive from the Backup Records panel."
                  : "Any pending or future backup synchronization to this drive will fail until it is reconnected."}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-gray-100 bg-white p-4 sm:flex-row sm:justify-end dark:border-white/10 dark:bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExtDriveModalOpen(false)}
              className="h-10 rounded-brand border border-gray-300 px-5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5 dark:bg-white/2"
            >
              Dismiss
            </Button>
            {extDriveEvent?.type === "connected" && (
              <Button
                onClick={() => {
                  setExtDriveModalOpen(false)
                  switchView("backup")
                }}
                className="flex h-10 items-center gap-2 rounded-brand btn-brand-red px-5 font-bold text-white shadow-sm"
              >
                <i className="ph-bold ph-hard-drives" />
                Go to Backup Records
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className="font-inter flex h-screen flex-col gap-4 overflow-hidden bg-gray-50 p-4 dark:bg-background">
            <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
            <div className="flex flex-1 gap-4">
              <Skeleton className="h-full w-[30%] rounded-brand" />
              <Skeleton className="h-full w-[70%] rounded-brand" />
            </div>
          </div>
        }
      >
        <AdminPageContent />
      </Suspense>
    </AdminGuard>
  )
}
