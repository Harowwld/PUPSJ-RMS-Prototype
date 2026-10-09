"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useMemo, useRef, useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"

import HealthSidebar from "@/components/admin/backup/HealthSidebar"
import BackupTable from "@/components/admin/backup/BackupTable"
import AutoBackupSchedule from "@/components/admin/backup/AutoBackupSchedule"
import BackupFilters from "@/components/admin/backup/BackupFilters"
import BackupTableSkeleton from "@/components/admin/backup/BackupTableSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import RestoreModal from "@/components/shared/RestoreModal"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

export default function SystemBackupsTab({ showToast }) {
  const restoreFileRef = useRef(null)

  const [backups, setBackups] = useState([])
  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    memory: { percent: 0, total: 0, used: 0 },
    disk: { total: 447, free: 194, percent: 0 },
    lastRestorationAt: null,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isManualLoading, setIsManualLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [backupSearch, setBackupSearch] = useState("")
  const [backupStartDate, setBackupStartDate] = useState("")
  const [backupEndDate, setBackupEndDate] = useState("")
  const [localSearch, setLocalSearch] = useState("")

  // Loading states for actions
  const [localLoading, setLocalLoading] = useState({
    generating: false,
    generatingStatus: "",
    syncingId: null,
    syncStatus: "",
    uploading: false,
  })

  // Table state
  const [selectedBackupIds, setSelectedBackupIds] = useState([])
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")

  // Delete modal state
  const [backupDeleteTargets, setBackupDeleteTargets] = useState([])
  const [backupDeleteOpen, setBackupDeleteOpen] = useState(false)
  const [backupDeleteLoading, setBackupDeleteLoading] = useState(false)
  const [backupDeleteVerificationTarget, setBackupDeleteVerificationTarget] = useState("")
  const [backupDeleteVerificationValue, setBackupDeleteVerificationValue] = useState("")

  // Restore modal state
  const [restoreFile, setRestoreFile] = useState(null)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreMode, setRestoreMode] = useState("merge")

  const [statusSidebarOpen, setStatusSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pupsj_backup_status_sidebar")
      if (saved !== null) return saved === "true"
    }
    return true
  })

  const handleToggleStatusSidebar = (forcedState) => {
    setStatusSidebarOpen((prev) => {
      const next = typeof forcedState === "boolean" ? forcedState : !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("pupsj_backup_status_sidebar", String(next))
      }
      return next
    })
  }

  // TOTP Challenge Modal state
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpModalLoading, setTotpModalLoading] = useState(false)

  // External drive state
  const [externalDrive, setExternalDrive] = useState(null)
  const [isRescanning, setIsRescanning] = useState(false)

  const rescanExternalDrive = useCallback(async () => {
    setIsRescanning(true)
    try {
      const res = await fetch(`/api/system/external-drive?t=${Date.now()}`, { cache: "no-store" })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok && json.data) {
        setExternalDrive(json.data)
        if (json.data.connected) {
          showToast?.({
            title: "External Storage Connected",
            description: `Detected volume "${json.data.label || "External Storage"}" (${json.data.freeFormatted ? `${json.data.freeFormatted} free` : "Ready"}).`,
          })
        } else {
          showToast?.({
            title: "No External Storage Detected",
            description: "No physical USB storage drive was found. Connect a drive or activate demo simulation.",
            variant: "warning",
          })
        }
        return json.data
      }
    } catch (err) {
      console.error("Failed to rescan external drive:", err)
      showToast?.({
        title: "Scan Failed",
        description: "Unable to complete storage device scan.",
        variant: "destructive",
      })
    } finally {
      setIsRescanning(false)
    }
    return null
  }, [showToast])

  const toggleExternalDriveSimulation = useCallback(async () => {
    try {
      const nextSimulate = !externalDrive?.connected
      const res = await fetch("/api/system/external-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate: nextSimulate }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.ok && json.data) {
        setExternalDrive(json.data)
        showToast?.({
          title: nextSimulate ? "Demo Mode Enabled" : "Demo Mode Disabled",
          description: nextSimulate
            ? "Simulated external storage volume is now active for demonstration."
            : "Switched back to real physical hardware detection.",
        })
        return json.data
      }
    } catch (err) {
      console.error("Failed to toggle external drive simulation:", err)
      showToast?.({
        title: "Toggle Failed",
        description: "Could not update demo simulation state.",
        variant: "destructive",
      })
    }
    return null
  }, [externalDrive, showToast])

  useEffect(() => {
    let cancelled = false
    const checkDrive = async () => {
      try {
        const res = await fetch(`/api/system/external-drive?t=${Date.now()}`, { cache: "no-store" })
        const json = await res.json().catch(() => null)
        if (!cancelled && res.ok && json?.ok && json.data) {
          setExternalDrive(json.data)
        }
      } catch {}
    }
    checkDrive()
    return () => {
      cancelled = true
    }
  }, [])
  const [totpActionLabel, setTotpActionLabel] = useState("Confirm")
  const [totpModalDescription, setTotpModalDescription] = useState(
    "Enter the 6-digit code from your authenticator app to confirm this action."
  )
  const totpPendingActionRef = useRef(null)

  const executeWithTOTP = useCallback(
    (action, actionLabel = "Confirm", description = "Enter the 6-digit code from your authenticator app to confirm this action.") => {
      setTotpActionLabel(actionLabel)
      setTotpModalDescription(description)
      totpPendingActionRef.current = action
      setTotpModalOpen(true)
    },
    []
  )

  const handleTOTPConfirm = useCallback(async (token) => {
    if (!totpPendingActionRef.current) return
    setTotpModalLoading(true)
    try {
      await totpPendingActionRef.current(token)
      setTotpModalLoading(false)
      setTotpModalOpen(false)
    } catch (err) {
      setTotpModalLoading(false)
      const msg = err?.message || "Action failed"
      const clean = msg.includes("TOTP verification required: ")
        ? msg.replace("TOTP verification required: ", "")
        : msg
      throw new Error(clean)
    }
  }, [])

  // Sync jumpPage with page
  useEffect(() => {
    setJumpPage(String(page))
  }, [page])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setBackupSearch(localSearch)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch])

  // Fetch backups and system telemetry
  const fetchData = useCallback(async (isManual = false) => {
    const searchParam = backupSearch ? `&search=${encodeURIComponent(backupSearch)}` : ""
    const startParam = backupStartDate ? `&startDate=${encodeURIComponent(backupStartDate)}` : ""
    const endParam = backupEndDate ? `&endDate=${encodeURIComponent(backupEndDate)}` : ""
    const cacheKey = `systemadmin_backups_${backupSearch}_${backupStartDate}_${backupEndDate}`

    if (!isManual) {
      const cachedBackups = getCachedData(cacheKey)
      const cachedHealth = getCachedData("systemadmin_health")
      if (Array.isArray(cachedBackups)) {
        setBackups(cachedBackups)
        setIsLoading(false)
      }
      if (cachedHealth) {
        setSystemHealth(cachedHealth)
      }
    } else {
      setIsManualLoading(true)
    }

    if (!Array.isArray(getCachedData(cacheKey)) && !isManual) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const [backupRes, healthRes] = await Promise.all([
        fetch(`/api/system/backup?scope=system${searchParam}${startParam}${endParam}`, {
          cache: "no-store",
        }),
        fetch("/api/system/health", {
          cache: "no-store",
        }).catch(() => null),
      ])

      const backupJson = await backupRes.json().catch(() => null)
      if (!backupRes.ok || !backupJson?.ok) {
        throw new Error(backupJson?.error || "Failed to load governance backups")
      }

      const list = Array.isArray(backupJson.data) ? backupJson.data : []
      setBackups(list)
      setCachedData(cacheKey, list, 30000)

      if (healthRes && healthRes.ok) {
        const healthJson = await healthRes.json().catch(() => null)
        if (healthJson?.ok && healthJson.data) {
          setSystemHealth(healthJson.data)
          setCachedData("systemadmin_health", healthJson.data, 15000)
        }
      }
    } catch (err) {
      console.error("[SystemBackupsTab] Fetch Error:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
      if (isManual) setIsManualLoading(false)
    }
  }, [backupSearch, backupStartDate, backupEndDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Prune stale selected backup IDs when backups update
  useEffect(() => {
    if (!backups) return
    setSelectedBackupIds((prev) => {
      if (prev.length === 0) return prev
      const validIds = new Set(backups.map((b) => b?.id).filter(Boolean))
      const pruned = prev.filter((id) => validIds.has(id))
      return pruned.length !== prev.length ? pruned : prev
    })
  }, [backups])

  const handleSort = (column) => {
    if (sortBy === column) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC")
      } else if (column !== "created_at") {
        setSortBy("created_at")
        setSortOrder("DESC")
      } else {
        setSortOrder("ASC")
      }
    } else {
      setSortBy(column)
      setSortOrder("ASC")
    }
    setPage(1)
  }

  const handleSelectAll = (checked) => {
    setSelectedBackupIds(checked ? backups.filter(b => b).map((b) => b.id) : [])
  }

  const handleToggleRow = (id) => {
    setSelectedBackupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const sortedAndPaginatedBackups = useMemo(() => {
    let result = (backups || []).filter(b => b)
    result.sort((a, b) => {
      let valA, valB
      if (sortBy === "size_bytes") {
        valA = a.size_bytes
        valB = b.size_bytes
      } else {
        valA = a[sortBy] || ""
        valB = b[sortBy] || ""
        if (typeof valA === "string") valA = valA.toLowerCase()
        if (typeof valB === "string") valB = valB.toLowerCase()
      }
      if (valA < valB) return sortOrder === "ASC" ? -1 : 1
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1
      return 0
    })
    const start = (page - 1) * itemsPerPage
    return result.slice(start, start + itemsPerPage)
  }, [backups, sortBy, sortOrder, page, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil((backups || []).length / itemsPerPage))

  // Backup Creation with optional TOTP
  const handleGenerateBackup = async (totpToken = "") => {
    setLocalLoading((prev) => ({
      ...prev,
      generating: true,
      generatingStatus: "Packing...",
    }))
    const timer = setTimeout(() => {
      setLocalLoading((prev) => ({ ...prev, generatingStatus: "Encrypting..." }))
    }, 1500)

    try {
      const headers = { "Content-Type": "application/json" }
      if (totpToken) {
        headers["X-TOTP-Token"] = totpToken
      }

      const res = await fetch("/api/system/backup", {
        method: "POST",
        headers,
        body: JSON.stringify({ scope: "system" }),
      })

      const json = await res.json().catch(() => null)

      if (res.status === 403 && json?.requiresTOTP) {
        clearTimeout(timer)
        setLocalLoading((prev) => ({ ...prev, generating: false, generatingStatus: "" }))
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        executeWithTOTP(
          (token) => handleGenerateBackup(token),
          "Create Backup",
          "Enter your 6-digit Authenticator TOTP Code to generate a governance backup."
        )
        return
      }

      if (res.status === 403 && json?.totpNotConfigured) {
        clearTimeout(timer)
        setLocalLoading((prev) => ({ ...prev, generating: false, generatingStatus: "" }))
        showToast?.({
          title: "Two-Factor Auth Required",
          description: "Two-Factor Authentication (TOTP) must be enabled on your account before generating governance backups. Please configure 2FA in your Account settings.",
        }, "warning")
        return
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to create governance backup")
      }

      invalidateDataCache("systemadmin_backups")
      await fetchData()
      showToast?.({
        title: "Backup Successful",
        description: `Platform archive '${json?.data?.filename || "package"}' has been secured.`,
      })
    } catch (err) {
      if (totpModalOpen) {
        throw err
      }
      showToast?.({
        title: "Backup Failed",
        description: err.message,
      }, "error")
    } finally {
      clearTimeout(timer)
      setLocalLoading((prev) => ({
        ...prev,
        generating: false,
        generatingStatus: "",
      }))
    }
  }

  // External hardware sync
  const handleSyncExternal = async (id, totpToken = "") => {
    setLocalLoading((prev) => ({
      ...prev,
      syncingId: id,
      syncStatus: "Transferring...",
    }))

    try {
      const headers = { "Content-Type": "application/json" }
      if (totpToken) {
        headers["X-TOTP-Token"] = totpToken
      }

      const res = await fetch("/api/system/backup/sync-external", {
        method: "POST",
        headers,
        body: JSON.stringify({ id }),
      })

      const json = await res.json().catch(() => null)

      if (res.status === 403 && json?.requiresTOTP) {
        setLocalLoading((prev) => ({ ...prev, syncingId: null, syncStatus: "" }))
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        executeWithTOTP(
          (token) => handleSyncExternal(id, token),
          "Sync Hardware",
          "Enter your 6-digit Authenticator TOTP Code to mirror archive to secondary hardware."
        )
        return
      }

      if (res.status === 403 && json?.totpNotConfigured) {
        setLocalLoading((prev) => ({ ...prev, syncingId: null, syncStatus: "" }))
        showToast?.({
          title: "Two-Factor Auth Required",
          description: "Two-Factor Authentication (TOTP) must be enabled on your account before synchronizing to external storage.",
        }, "warning")
        return
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to synchronize to external drive")
      }

      invalidateDataCache("systemadmin_backups")
      await fetchData()
      showToast?.({
        title: "Sync Successful",
        description: "Governance archive mirrored to secondary hardware node.",
      })
    } catch (err) {
      if (totpModalOpen) {
        throw err
      }
      showToast?.({
        title: "Sync Failed",
        description: err.message || "Unable to secure external copy.",
      }, "error")
    } finally {
      setLocalLoading((prev) => ({ ...prev, syncingId: null, syncStatus: "" }))
    }
  }

  // Download backup
  const handleDownloadBackup = (id, filename) => {
    const backup = backups.find((b) => b?.id === id)
    const targetFilename = backup?.filename || filename || "backup.zip.enc"
    const link = document.createElement("a")
    link.href = `/api/system/backup/download?id=${id}`
    link.download = targetFilename
    link.click()
    showToast?.({
      title: "Download Initiated",
      description: "Streaming governance backup package to your local workstation.",
    })
  }

  // Delete Prompt
  const handleDeletePrompt = (id) => {
    const ids = Array.isArray(id) ? id : [id]
    const targets = backups.filter((x) => ids.includes(x.id))
    if (targets.length > 0) {
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
      setBackupDeleteVerificationTarget(randomCode)
      setBackupDeleteVerificationValue("")
      setBackupDeleteTargets(targets)
      setBackupDeleteOpen(true)
    }
  }

  // Confirm Delete
  const confirmDeleteBackup = async (totpToken = "") => {
    if (backupDeleteTargets.length === 0 || backupDeleteLoading) return
    setBackupDeleteLoading(true)

    try {
      const isBulk = backupDeleteTargets.length > 1
      const headers = isBulk ? { "Content-Type": "application/json" } : {}
      if (totpToken) {
        headers["X-TOTP-Token"] = totpToken
      }

      const res = await fetch(
        isBulk
          ? "/api/system/backup"
          : `/api/system/backup/${backupDeleteTargets[0].id}`,
        {
          method: "DELETE",
          headers,
          body: isBulk
            ? JSON.stringify({ ids: backupDeleteTargets.map((t) => t.id) })
            : undefined,
        }
      )

      const json = await res.json().catch(() => null)

      if (res.status === 403 && json?.requiresTOTP) {
        setBackupDeleteLoading(false)
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        executeWithTOTP(
          (token) => confirmDeleteBackup(token),
          "Delete Archive",
          "Enter your 6-digit Authenticator TOTP Code to permanently remove backup archive(s)."
        )
        return
      }

      if (res.status === 403 && json?.totpNotConfigured) {
        setBackupDeleteLoading(false)
        showToast?.({
          title: "Two-Factor Auth Required",
          description: "Two-Factor Authentication (TOTP) must be enabled on your account before deleting archives.",
        }, "warning")
        return
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to delete backup archive(s)")
      }

      showToast?.({
        title: isBulk ? "Bulk Deletion Successful" : "Deletion Successful",
        description: isBulk
          ? `Successfully removed ${json.deletedCount || backupDeleteTargets.length} backup archives from the platform.`
          : "The selected governance backup archive has been permanently removed.",
      })

      setBackupDeleteOpen(false)
      setSelectedBackupIds([])
      invalidateDataCache("systemadmin_backups")
      await fetchData()
    } catch (err) {
      if (totpModalOpen) {
        throw err
      }
      showToast?.({
        title: "Deletion Failed",
        description: err.message,
      }, "error")
    } finally {
      setBackupDeleteLoading(false)
    }
  }

  // Restore file selection
  const handleRestoreFileChangeLocal = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setRestoreFile(f)
    setRestoreConfirmOpen(true)
    if (e.target) e.target.value = ""
  }

  // Confirm Restore
  const confirmRestore = async (totpToken = "", targetMode = null) => {
    if (!restoreFile || restoreLoading) return
    setRestoreLoading(true)

    const effectiveMode = targetMode || restoreMode || "merge"
    try {
      const formData = new FormData()
      formData.append("file", restoreFile)
      formData.append("mode", effectiveMode)

      const headers = {}
      if (totpToken) {
        headers["X-TOTP-Token"] = totpToken
      }

      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        headers,
        body: formData,
      })

      const json = await res.json().catch(() => null)

      if (res.status === 403 && json?.requiresTOTP) {
        setRestoreLoading(false)
        if (totpToken) {
          throw new Error(json.error || "Invalid verification code")
        }
        executeWithTOTP(
          (token) => confirmRestore(token, effectiveMode),
          effectiveMode === "merge" ? "Safe Merge" : "Overwrite System",
          "Enter your 6-digit Authenticator TOTP Code to authorize system restoration."
        )
        return
      }

      if (res.status === 403 && json?.totpNotConfigured) {
        setRestoreLoading(false)
        showToast?.({
          title: "Two-Factor Auth Required",
          description: "Two-Factor Authentication (TOTP) must be enabled on your account before restoring system images.",
        }, "warning")
        return
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to restore backup archive.")
      }

      showToast?.({
        title: "Restoration Successful",
        description: json.message || "System image successfully restored.",
      })
      setRestoreConfirmOpen(false)
      setRestoreFile(null)
      invalidateDataCache("systemadmin")
      await fetchData()
      setTimeout(() => location.reload(), 2500)
    } catch (err) {
      if (totpModalOpen) {
        throw err
      }
      showToast?.({
        title: "Restoration Failed",
        description: err.message,
      }, "error")
      setRestoreConfirmOpen(false)
      setRestoreFile(null)
    } finally {
      setRestoreLoading(false)
    }
  }

  const lastBackupTime = useMemo(() => {
    if (!backups || backups.length === 0) return "Never"
    return formatPHDateTime(backups[0].created_at)
  }, [backups])

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setPage(1)
  }

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        setPage(val)
      } else {
        setJumpPage(String(page))
      }
    }
  }

  const startItem = (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, (backups || []).length)
  const isFilterActive = !!(backupSearch || backupStartDate || backupEndDate)

  const handleClearFilters = () => {
    setLocalSearch("")
    setBackupSearch("")
    setBackupStartDate("")
    setBackupEndDate("")
    setPage(1)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rms-brand-scope animate-fade-up font-jakarta flex w-full flex-col gap-6" data-brand-accent="#000000" data-brand-foreground="#FFFFFF" style={{ "--brand-accent": "#000000", "--brand-foreground": "#FFFFFF" }}>
        <div className="relative flex min-h-[600px] w-full items-stretch gap-5">
          
          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
              <PageHeader
                icon="ph-hard-drives"
                title="Platform Governance Backups"
                description="Create and restore full system governance backups, manage scheduled snapshots, and sync to external hardware."
                showBorder={false}
                titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleToggleStatusSidebar()}
                      className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                      title={statusSidebarOpen ? "Hide System Status panel" : "Show System Status panel"}
                    >
                      {statusSidebarOpen ? "Hide Status" : "Show Status"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        restoreFileRef.current &&
                        restoreFileRef.current.click()
                      }
                      disabled={localLoading.uploading}
                      className="flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                    >
                      {localLoading.uploading ? (
                        <span className="flex items-center gap-1.5">
                          <HugeIcon className="ph-bold ph-spinner animate-spin text-xs" />
                          <span>Restoring...</span>
                        </span>
                      ) : (
                        "Restore"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleGenerateBackup()}
                      disabled={localLoading.generating}
                      className="flex h-10 items-center justify-center rounded-xl! btn-brand-red px-5 active:scale-95 transition-all text-xs font-semibold text-white shadow-xs cursor-pointer border-0"
                    >
                      {localLoading.generating ? (
                        <span className="flex items-center gap-1.5">
                          <HugeIcon className="ph-bold ph-spinner animate-spin text-xs" />
                          <span>Creating...</span>
                        </span>
                      ) : (
                        "Create"
                      )}
                    </Button>
                    <input
                      ref={restoreFileRef}
                      type="file"
                      className="hidden"
                      accept=".zip,.enc,.bak,.backup,.pupbak,application/zip,application/octet-stream"
                      onChange={handleRestoreFileChangeLocal}
                    />
                  </div>
                }
              />

              {/* Automatic Backup Configuration Section */}
              <AutoBackupSchedule showToast={showToast} scope="system" embedded={true} />

              {/* Standard Filter Toolbar */}
              <BackupFilters
                localSearch={localSearch}
                handleSearchChange={(e) => {
                  setLocalSearch(e.target.value)
                  setPage(1)
                }}
                backupStartDate={backupStartDate}
                setBackupStartDate={setBackupStartDate}
                backupEndDate={backupEndDate}
                setBackupEndDate={setBackupEndDate}
                setPage={setPage}
                setLocalSearch={setLocalSearch}
                setBackupSearch={setBackupSearch}
                backupTotal={(backups || []).length}
                isLoading={isLoading}
              />

              {/* Active Filter Chips Row */}
              {(localSearch !== "" ||
                backupStartDate !== "" ||
                backupEndDate !== "") && (
                <ActiveFilterChips
                  searchQuery={localSearch}
                  onClearSearch={() => {
                    setLocalSearch("")
                    setBackupSearch("")
                    setPage(1)
                  }}
                  extraChips={(backupStartDate || backupEndDate) ? [{
                    key: "dateRange",
                    label: `Range: ${backupStartDate ? format(parseDateLocal(backupStartDate), "MMM d, yyyy") : "..."} to ${backupEndDate ? format(parseDateLocal(backupEndDate), "MMM d, yyyy") : "..."}`,
                    onRemove: () => {
                      setBackupStartDate("")
                      setBackupEndDate("")
                      setPage(1)
                    }
                  }] : []}
                  onClearAll={handleClearFilters}
                  className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                />
              )}

              {isLoading && !isManualLoading ? (
                <BackupTableSkeleton embedded={true} />
              ) : error ? (
                <div className="flex-1 flex min-h-[450px] flex-col border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <CardContent className="flex flex-1 flex-col items-center justify-center p-6 rounded-b-2xl">
                    <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                            <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-gray-300 dark:text-zinc-650" />
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                          Could not load backups
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300">
                          {error}
                        </EmptyDescription>
                        <Button 
                          variant="outline" 
                          onClick={() => fetchData(true)}
                          className="mt-6 flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                        >
                          Retry
                        </Button>
                      </EmptyHeader>
                    </Empty>
                  </CardContent>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <BackupTable
                    backups={backups}
                    sortedAndPaginatedBackups={sortedAndPaginatedBackups}
                    selectedBackupIds={selectedBackupIds}
                    handleToggleRow={handleToggleRow}
                    handleSelectAll={handleSelectAll}
                    handleSort={handleSort}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    localLoading={localLoading}
                    handleSyncExternal={handleSyncExternal}
                    onDownloadBackup={handleDownloadBackup}
                    onDeleteBackup={handleDeletePrompt}
                    handleGenerateBackup={handleGenerateBackup}
                    isFilterActive={isFilterActive}
                    onClearFilters={handleClearFilters}
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    startItem={startItem}
                    endItem={endItem}
                    totalCount={(backups || []).length}
                    itemsPerPage={itemsPerPage}
                    jumpPage={jumpPage}
                    setJumpPage={setJumpPage}
                    handleJumpPage={handleJumpPage}
                    handleItemsPerPageChange={handleItemsPerPageChange}
                    scope="system"
                  />
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT SIDEBAR: System Status */}
          {statusSidebarOpen ? (
            <HealthSidebar
              systemHealth={systemHealth}
              lastBackupTime={lastBackupTime}
              isLoading={isLoading}
              isManualLoading={isManualLoading}
              externalDrive={externalDrive}
              onRescanDrive={rescanExternalDrive}
              onToggleSimulation={toggleExternalDriveSimulation}
              isRescanning={isRescanning}
              onToggleCollapse={() => handleToggleStatusSidebar(false)}
              scopeInfo={{
                title: "Platform Governance Scope",
                items: [
                  "Department Stations",
                  "Department Features",
                  "Global Directory",
                  "Platform Audit Trail",
                  "System Settings",
                ],
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => handleToggleStatusSidebar(true)}
              title="Show System Status"
              className="hidden md:flex flex-col items-center justify-center w-8 self-stretch rounded-2xl border border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white shadow-2xs transition-all cursor-pointer group py-4 select-none shrink-0"
            >
              <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-zinc-500 [writing-mode:vertical-lr] rotate-180">
                Status
              </span>
            </button>
          )}
        </div>

        {/* Floating Action Bar for batch deletion */}
        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          onAction={() => handleDeletePrompt(selectedBackupIds)}
          actionLabel="Delete"
          actionIcon="ph-trash"
        />

        {/* Delete System Backup Confirmation Modal */}
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
          confirmLabel="Delete"
          isLoading={backupDeleteLoading}
          variant="danger"
          verificationTarget={backupDeleteVerificationTarget}
          verificationValue={backupDeleteVerificationValue}
          onVerificationChange={setBackupDeleteVerificationValue}
          isDeleteBackup={true}
        />

        {/* Restore System Image Confirmation Modal */}
        <RestoreModal
          open={restoreConfirmOpen}
          onOpenChange={setRestoreConfirmOpen}
          restoreFile={restoreFile}
          title="Restore System Image"
          description="Inspect snapshot contents and choose how data merges with live records."
          onConfirm={(mode) => {
            setRestoreMode(mode)
            confirmRestore("", mode)
          }}
          onCancel={() => {
            setRestoreConfirmOpen(false)
            setRestoreFile(null)
          }}
          isLoading={restoreLoading}
        />

        {/* TOTP Challenge Modal */}
        <TOTPChallengeModal
          open={totpModalOpen}
          onOpenChange={setTotpModalOpen}
          onConfirm={handleTOTPConfirm}
          actionLabel={totpActionLabel}
          description={totpModalDescription}
          isLoading={totpModalLoading}
        />
      </div>
    </TooltipProvider>
  )
}
