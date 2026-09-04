"use client"

import { useMemo, useRef, useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { TooltipProvider } from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"

import HealthSidebar from "@/components/admin/backup/HealthSidebar"
import BackupTable from "@/components/admin/backup/BackupTable"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { cn } from "@/lib/utils"
import { getCachedData, setCachedData, invalidateDataCache } from "@/lib/dataCache"

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
        const token = window.prompt("Enter your 6-digit Authenticator TOTP Code:")
        if (token) {
          return handleGenerateBackup(token.trim())
        }
        throw new Error("TOTP verification is required to generate a governance backup.")
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
  const handleSyncExternal = async (id) => {
    setLocalLoading((prev) => ({
      ...prev,
      syncingId: id,
      syncStatus: "Transferring...",
    }))

    try {
      const res = await fetch("/api/system/backup/sync-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      const json = await res.json().catch(() => null)
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

      const json = await res.json().catch(() => null)
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
  const confirmRestore = async () => {
    if (!restoreFile || restoreLoading) return
    setRestoreLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", restoreFile)

      const res = await fetch("/api/system/backup/restore", {
        method: "POST",
        body: formData,
      })

      const json = await res.json().catch(() => null)
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6" style={{ "--brand-accent": "#000000", "--brand-foreground": "#FFFFFF" }}>
        <div className="relative flex min-h-[600px] w-full items-stretch gap-5">
          
          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Page Header Card */}
            <Card className="p-0 gap-0 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none w-full">
              <PageHeader
                icon="ph-hard-drives"
                title="Backup & Maintenance"
                description="Manage governance archives and secure copies."
                showBorder={false}
                titleClassName="text-[15px] font-bold text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[2px]"
                actions={
                  <div className="flex items-center gap-6">
                    <RefreshButton 
                      onRefresh={() => fetchData(true)} 
                      isLoading={isLoading} 
                      title="Refresh Backup & Maintenance"
                    />

                    <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          restoreFileRef.current &&
                          restoreFileRef.current.click()
                        }
                        disabled={localLoading.uploading}
                        className="h-10 w-[130px] justify-center font-semibold text-sm text-gray-600 hover:text-[#111] hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center rounded-brand shadow-none border-0 cursor-pointer"
                      >
                        {localLoading.uploading ? (
                          <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                        ) : (
                          "Restore Backup"
                        )}
                      </Button>
                      <LiquidGlassButton
                        onClick={() => handleGenerateBackup()}
                        disabled={localLoading.generating}
                        height={36}
                        radius={18}
                        glassColor="rgba(10, 132, 255, 0.15)"
                        className="w-[130px] active:scale-95 transition-all dark:shadow-none text-[13px] font-medium text-white cursor-pointer"
                      >
                        {localLoading.generating ? (
                          <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                        ) : (
                          "Create Backup"
                        )}
                      </LiquidGlassButton>
                      <input
                        ref={restoreFileRef}
                        type="file"
                        className="hidden"
                        accept=".zip,.enc,.bak,.backup,.pupbak,application/zip,application/octet-stream"
                        onChange={handleRestoreFileChangeLocal}
                      />
                    </div>
                  </div>
                }
              />
            </Card>

            {/* Governance Scope Banner */}
            <div className="rounded-brand border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center gap-2.5">
              <i className="ph-fill ph-shield-check text-base text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold">Platform Governance Scope:</span>
              <span className="text-indigo-700 dark:text-indigo-300">Department Stations · Department Features · Global Directory · Platform Audit Trail · System Settings</span>
            </div>

            {isLoading && !isManualLoading ? (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col items-center justify-center rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-10">
                <div className="flex flex-col items-center gap-4">
                  <i className="ph-bold ph-spinner animate-spin text-xl text-indigo-600 dark:text-primary" />
                  <p className="text-sm font-semibold text-gray-500 tracking-widest dark:text-zinc-400">
                    Loading...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
                <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
                  <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                          <i className="ph-duotone ph-warning-circle text-xl text-gray-300 dark:text-zinc-650" />
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-lg font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                        Could not load backups
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                        {error}
                      </EmptyDescription>
                      <Button 
                        variant="outline" 
                        onClick={() => fetchData(true)}
                        className="mt-6 rounded-full border-gray-200 font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 dark:bg-card"
                      >
                        <i className="ph-bold ph-arrows-clockwise mr-2"></i>
                        Retry Loading
                      </Button>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </div>
            ) : (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card isolate">
                {/* Active Filter Chips Row */}
                {(localSearch !== "" ||
                  backupStartDate !== "" ||
                  backupEndDate !== "") && (
                  <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-normal dark:border-white/10 dark:bg-card">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-550">
                        Active filters:
                      </span>
                      {localSearch && (
                        <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-indigo-700 dark:text-primary dark:border-white/10">
                          Search: {localSearch}
                          <button
                            onClick={() => {
                              setLocalSearch("")
                              setBackupSearch("")
                              setPage(1)
                            }}
                            className="ml-1 hover:text-indigo-900 transition-colors cursor-pointer"
                          >
                            <i className="ph-bold ph-x text-[8px]"></i>
                          </button>
                        </div>
                      )}
                      {(backupStartDate || backupEndDate) && (
                        <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold tracking-widest text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                          Range: {backupStartDate || "..."} to{" "}
                          {backupEndDate || "..."}
                          <button
                            onClick={() => {
                              setBackupStartDate("")
                              setBackupEndDate("")
                              setPage(1)
                            }}
                            className="ml-1 hover:text-emerald-800 transition-colors cursor-pointer"
                          >
                            <i className="ph-bold ph-x text-[8px]"></i>
                          </button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLocalSearch("")
                          setBackupSearch("")
                          setBackupStartDate("")
                          setBackupEndDate("")
                          setPage(1)
                        }}
                        className="h-6 rounded-full border border-dashed border-gray-300 px-3 text-[10px] font-semibold tracking-widest text-indigo-700 dark:text-primary hover:bg-indigo-50 hover:text-indigo-900 dark:border-white/10 dark:bg-indigo-950/30 cursor-pointer"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col min-h-0">
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
                    onClearFilters={() => {
                      setLocalSearch("")
                      setBackupSearch("")
                      setBackupStartDate("")
                      setBackupEndDate("")
                      setPage(1)
                    }}
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
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: System Status */}
          <HealthSidebar
            systemHealth={systemHealth}
            lastBackupTime={lastBackupTime}
            isLoading={isLoading}
            isManualLoading={isManualLoading}
          />
        </div>

        {/* Floating Action Bar for batch deletion */}
        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          onAction={() => handleDeletePrompt(selectedBackupIds)}
          actionLabel="Delete Permanently"
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
          confirmLabel={backupDeleteTargets.length > 1 ? "Bulk Delete" : "Delete Permanently"}
          isLoading={backupDeleteLoading}
          variant="danger"
          verificationTarget={backupDeleteVerificationTarget}
          verificationValue={backupDeleteVerificationValue}
          onVerificationChange={setBackupDeleteVerificationValue}
          isDeleteBackup={true}
        />

        {/* Restore System Image Confirmation Modal */}
        <ConfirmModal
          open={restoreConfirmOpen}
          title="Restore System Image"
          variant="warning"
          message="Overwrite all repository data with the following backup archive? This action is irreversible."
          selectedItems={[restoreFile?.name]}
          confirmLabel="Begin Restoration"
          icon="ph-duotone ph-arrow-counter-clockwise"
          buttonIcon="ph-bold ph-arrow-counter-clockwise"
          onConfirm={confirmRestore}
          onCancel={() => {
            setRestoreConfirmOpen(false)
            setRestoreFile(null)
          }}
          isLoading={restoreLoading}
        />
      </div>
    </TooltipProvider>
  )
}
