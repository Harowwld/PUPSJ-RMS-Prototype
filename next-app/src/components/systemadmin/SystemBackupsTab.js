"use client"
import useViewPreference from "@/hooks/useViewPreference"


import useUrlPage from "@/hooks/useUrlPage"
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
import { cn } from "@/lib/utils"
import { format } from "date-fns"

import HealthSidebar from "@/components/admin/backup/HealthSidebar"
import PlatformBackupTable, { PLATFORM_BACKUP_COLUMNS } from "@/components/systemadmin/PlatformBackupTable"
import AutoBackupSchedule from "@/components/admin/backup/AutoBackupSchedule"
import BackupFilters from "@/components/admin/backup/BackupFilters"
import BackupTableSkeleton from "@/components/admin/backup/BackupTableSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import RestoreModal from "@/components/shared/RestoreModal"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import TableScrollControls from "@/components/shared/TableScrollControls"
import useTableScroll from "@/hooks/useTableScroll"
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"
import { AlertCircleIcon as EmptyAlertCircleIcon, CheckmarkCircle01Icon, Database01Icon, HardDriveIcon, Loading01Icon } from "hugeicons-react";

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
  const [backupStartDate, setBackupStartDate] = useViewPreference("backups", "backupStartDate", "")
  const [backupEndDate, setBackupEndDate] = useViewPreference("backups", "backupEndDate", "")
  const [localSearch, setLocalSearch] = useViewPreference("backups", "localSearch", "")

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
  const [sortBy, setSortBy] = useViewPreference("backups", "sortBy", "created_at")
  const [sortOrder, setSortOrder] = useViewPreference("backups", "sortOrder", "DESC")
  const [page, setPage] = useUrlPage()
  const [itemsPerPage, setItemsPerPage] = useViewPreference("backups", "itemsPerPage", 20)
  const [filterRules, setFilterRules] = useViewPreference("backups", "filterRules", [])
  const [backupTypeFilter, setBackupTypeFilter] = useViewPreference("backups", "backupTypeFilter", "all")
  const [groupBy, setGroupBy] = useViewPreference("backups", "groupBy", "none")
  const [visibleColumns, setVisibleColumns] = useViewPreference("backups", "visibleColumns", PLATFORM_BACKUP_COLUMNS.filter(({ defaultHidden }) => !defaultHidden).map(({ key }) => key))
  const { containerRef: tableScrollRef, scrollLeft, scrollRight, resetScroll } = useTableScroll([visibleColumns.join(","), backups.length, isLoading])

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
            title: json.data.unauthorizedDrives?.length ? "Unauthorized External Drive" : "No External Storage Detected",
            description: json.data.message || "No physical USB storage drive was found. Connect an authorized drive (PUPSJ_BACKUP) or activate demo simulation.",
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
      } catch { }
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setBackupSearch(localSearch)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [localSearch, setPage])

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
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  // Prune stale selected backup IDs when backups update
  useEffect(() => {
    if (!backups) return
    const timer = setTimeout(() => {
      setSelectedBackupIds((prev) => {
        if (prev.length === 0) return prev
        const validIds = new Set(backups.map((b) => b?.id).filter(Boolean))
        const pruned = prev.filter((id) => validIds.has(id))
        return pruned.length !== prev.length ? pruned : prev
      })
    }, 0)
    return () => clearTimeout(timer)
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

  const backupTypes = useMemo(() => [...new Set(backups.map((backup) => backup.backup_type).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [backups])
  const filterFields = useMemo(() => [
    { key: "status_local", label: "Storage status", icon: CheckmarkCircle01Icon, options: [...new Set(backups.map((backup) => backup.status_local).filter(Boolean))].map((value) => ({ value, label: value })) },
    { key: "size_bytes", label: "Size (bytes)", icon: HardDriveIcon, type: "number" },
  ], [backups])
  const filteredBackups = useMemo(() => (backups || []).filter((backup) => backup && (backupTypeFilter === "all" || backup.backup_type === backupTypeFilter) && filterRules.every((rule) => {
    const actual = backup[rule.fieldKey]
    if (rule.fieldKey === "size_bytes") {
      const value = Number(rule.value)
      if (!Number.isFinite(value)) return true
      if (rule.operator === "greater_than") return Number(actual) > value
      if (rule.operator === "less_than") return Number(actual) < value
      return rule.operator === "is_not" ? Number(actual) !== value : Number(actual) === value
    }
    return rule.operator === "is_not" ? String(actual ?? "") !== rule.value : String(actual ?? "") === rule.value
  })), [backups, backupTypeFilter, filterRules])
  const sortedBackups = useMemo(() => [...filteredBackups].sort((a, b) => {
    const left = sortBy === "size_bytes" ? Number(a[sortBy] || 0) : String(a[sortBy] || "").toLowerCase()
    const right = sortBy === "size_bytes" ? Number(b[sortBy] || 0) : String(b[sortBy] || "").toLowerCase()
    return (left < right ? -1 : left > right ? 1 : 0) * (sortOrder === "ASC" ? 1 : -1)
  }), [filteredBackups, sortBy, sortOrder])
  const totalPages = Math.max(1, Math.ceil(sortedBackups.length / itemsPerPage))
  const sortedAndPaginatedBackups = sortedBackups.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const groups = useMemo(() => {
    if (groupBy === "none") return []
    const grouped = new Map()
    for (const backup of sortedAndPaginatedBackups) {
      const label = String(backup[groupBy] || "Unknown")
      if (!grouped.has(label)) grouped.set(label, [])
      grouped.get(label).push(backup)
    }
    return [...grouped].map(([label, items]) => ({ label, items }))
  }, [groupBy, sortedAndPaginatedBackups])

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

  const isFilterActive = !!(backupSearch || backupStartDate || backupEndDate || filterRules.length || backupTypeFilter !== "all")

  const handleClearFilters = () => {
    setLocalSearch("")
    setBackupSearch("")
    setBackupStartDate("")
    setBackupEndDate("")
    setFilterRules([])
    setBackupTypeFilter("all")
    setPage(1)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] w-full flex-col gap-6">
        <div className="relative flex flex-[1_0_auto] min-h-[600px] w-full items-stretch gap-5">

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0 flex flex-col">
            <Card className="flex-[1_0_auto] flex flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
              <PageHeader
                icon="Database01Icon"
                title={
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span>Platform Backups</span>
                    <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                      {isLoading ? "Loading backups…" : `${backups.length.toLocaleString()} ${backups.length === 1 ? "archive" : "archives"}`}
                    </span>
                  </div>
                }
                description="Create and restore full system backups, manage scheduled snapshots, and sync to external hardware."
                showBorder={false}
                className="p-6"
                titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
                actions={
                  <div className="flex shrink-0 items-center gap-2">
                    <RefreshButton
                      onRefresh={() => fetchData(true)}
                      isLoading={isManualLoading}
                      title="Refresh Governance Backups"
                      className="h-9 w-9"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleToggleStatusSidebar()}
                      className="h-9 px-4"
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
                      className="h-9 px-4"
                    >
                      {localLoading.uploading ? (
                        <span className="flex items-center gap-1.5">
                          <Loading01Icon size="1em" className="animate-spin text-xs" />
                          <span>Restoring...</span>
                        </span>
                      ) : (
                        "Restore Backup"
                      )}
                    </Button>
                    <Button
                      onClick={() => handleGenerateBackup()}
                      disabled={localLoading.generating}
                      className="h-9 px-4 cursor-pointer"
                    >
                      {localLoading.generating ? (
                        <span className="flex items-center gap-1.5">
                          <Loading01Icon size="1em" className="animate-spin text-xs" />
                          <span>Creating...</span>
                        </span>
                      ) : (
                        "Create Backup"
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
              <div role="group" aria-label="Backup type" className="flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-gray-50/40 dark:bg-zinc-900/30 overflow-x-auto scrollbar-none">
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] select-none">
                  {[{ value: "all", label: "All Types", count: backups.length }, ...backupTypes.map((type) => ({ value: type, label: type, count: backups.filter((backup) => backup.backup_type === type).length }))].map(({ value, label, count }) => {
                    const isSelected = backupTypeFilter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => { setBackupTypeFilter(value); setPage(1) }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-[0.98]",
                          isSelected
                            ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                            : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                        )}
                      >
                        <span>{label}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums min-w-4 text-center",
                          isSelected ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-zinc-100" : "bg-black/5 dark:bg-white/5 text-gray-400 dark:text-zinc-500"
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
                backupTotal={filteredBackups.length}
                isLoading={isLoading}
                inline
                tableControls={<>
                  <FilterPopover fields={filterFields} filters={filterRules} onFiltersChange={(rules) => { setFilterRules(rules); setPage(1) }} entityLabel="backups" />
                  <SortPopover options={[{ key: "created_at", label: "Created" }, { key: "filename", label: "Archive name" }, { key: "size_bytes", label: "Size" }, { key: "backup_type", label: "Backup type" }, { key: "status_local", label: "Storage status" }]} sortBy={sortBy} onSortByChange={(key) => { setSortBy(key); setSortOrder("ASC"); setPage(1) }} sortOrder={sortOrder} onSortOrderChange={(order) => { setSortOrder(order); setPage(1) }} />
                  <GroupPopover options={[{ key: "backup_type", label: "Backup type", icon: Database01Icon }, { key: "status_local", label: "Storage status", icon: CheckmarkCircle01Icon }, { key: "none", label: "No grouping" }]} groupBy={groupBy} onGroupByChange={setGroupBy} />
                  <ColumnsPopover columns={PLATFORM_BACKUP_COLUMNS} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} />
                </>}
                scrollControls={<TableScrollControls scrollContainerRef={tableScrollRef} onScrollLeft={scrollLeft} onScrollRight={scrollRight} onResetScroll={resetScroll} controlSize="md" />}
              />

              <AutoBackupSchedule showToast={showToast} scope="system" embedded={true} />

              {/* Active Filter Chips Row */}
              {(localSearch !== "" || backupStartDate !== "" || backupEndDate !== "" || filterRules.length > 0) && (
                <ActiveFilterChips
                  searchQuery={localSearch}
                  onClearSearch={() => {
                    setLocalSearch("")
                    setBackupSearch("")
                    setPage(1)
                  }}
                  extraChips={[...(backupTypeFilter !== "all" ? [{ key: "backupType", groupLabel: "Backup type", label: backupTypeFilter, onRemove: () => { setBackupTypeFilter("all"); setPage(1) } }] : []), ...filterRules.map((rule) => ({ key: rule.id, label: `${filterFields.find((field) => field.key === rule.fieldKey)?.label || rule.fieldKey} ${rule.operator.replaceAll("_", " ")} ${rule.value}`, onRemove: () => setFilterRules((current) => current.filter((item) => item.id !== rule.id)) })), ...(backupStartDate || backupEndDate ? [{
                    key: "dateRange",
                    label: `Range: ${backupStartDate ? format(parseDateLocal(backupStartDate), "MMM d, yyyy") : "..."} to ${backupEndDate ? format(parseDateLocal(backupEndDate), "MMM d, yyyy") : "..."}`,
                    onRemove: () => {
                      setBackupStartDate("")
                      setBackupEndDate("")
                      setPage(1)
                    }
                  }] : [])]}
                  onClearAll={handleClearFilters}
                  className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                />
              )}

              {isLoading && !isManualLoading ? (
                <BackupTableSkeleton embedded={true} scope="platform" visibleColumns={visibleColumns} rowCount={itemsPerPage} />
              ) : error ? (
                <div className="flex-1 flex min-h-[450px] flex-col border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <CardContent className="flex flex-1 flex-col items-center justify-center p-6 rounded-b-2xl">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia className="text-red-600 dark:text-red-400"><EmptyAlertCircleIcon size="1em" /></EmptyMedia>
                        <EmptyTitle>
                          Could not load backups
                        </EmptyTitle>
                        <EmptyDescription>
                          {error}
                        </EmptyDescription>
                        <Button
                          variant="outline"
                          onClick={() => fetchData(true)}
                          className="mt-6 flex h-10 items-center justify-center px-5"
                        >
                          Retry
                        </Button>
                      </EmptyHeader>
                    </Empty>
                  </CardContent>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 rounded-b-2xl border-t border-border dark:border-border overflow-hidden">
                  <PlatformBackupTable backups={filteredBackups} rows={sortedAndPaginatedBackups} visibleColumns={visibleColumns} selectedIds={selectedBackupIds} onSelectAll={(checked, rows) => setSelectedBackupIds((current) => checked ? Array.from(new Set([...current, ...rows.map((row) => row.id)])) : current.filter((id) => !rows.some((row) => row.id === id)))} onToggle={handleToggleRow} onSort={handleSort} sortBy={sortBy} sortOrder={sortOrder} onDownload={handleDownloadBackup} onDelete={handleDeletePrompt} onCreate={handleGenerateBackup} isFilterActive={isFilterActive} onClearFilters={handleClearFilters} page={page} pageSize={itemsPerPage} onPageChange={setPage} onPageSizeChange={setItemsPerPage} scrollRef={tableScrollRef} groups={groups} />
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

        {/* Floating Action Bar for batch deletion & utilities */}
        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          entityName="archive"
          onCancel={() => setSelectedBackupIds([])}
          primaryAction={{
            label: "Delete Selected",
            variant: "danger",
            onClick: () => handleDeletePrompt(selectedBackupIds),
          }}
          secondaryActions={[
            {
              label: "Copy Filenames",
              onClick: () => {
                const selectedBackups = backups.filter((b) => selectedBackupIds.includes(b.id))
                const filenames = selectedBackups.map((b) => b.filename).filter(Boolean)
                if (filenames.length === 0) {
                  showToast?.("No archive filenames found for selection", true)
                  return
                }
                navigator.clipboard.writeText(filenames.join("\n"))
                showToast?.(`Copied ${filenames.length} archive filename${filenames.length === 1 ? "" : "s"} to clipboard`)
              },
            },
          ]}
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
          confirmLabel={backupDeleteTargets.length > 1 ? "Delete Selected" : "Delete Archive"}
          cancelLabel="Cancel"
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
