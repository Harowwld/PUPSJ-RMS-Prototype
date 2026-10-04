"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useMemo, useRef, useState, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"

function parseDateLocal(str) {
  if (!str) return undefined
  const [y, m, d] = str.split("-").map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined
  return new Date(y, m - 1, d)
}

import HealthSidebar from "./backup/HealthSidebar"
import BackupTable from "./backup/BackupTable"
import AutoBackupSchedule from "./backup/AutoBackupSchedule"
import BackupFilters from "./backup/BackupFilters"
import BackupTableSkeleton from "./backup/BackupTableSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import { cn } from "@/lib/utils"

export default function BackupTab({
  systemHealth,
  backups,
  externalDrive = null,
  isLoading = false,
  isManualLoading = false,
  error = null,
  backupSearch,
  setBackupSearch,
  backupStartDate,
  setBackupStartDate,
  backupEndDate,
  setBackupEndDate,
  onSimulateBackup,
  onRestoreFileChange,
  onSyncExternal,
  onRescanDrive,
  onToggleSimulation,
  onDownloadBackup,
  onDeleteBackup,
  onRefresh,
  showToast,
}) {
  const restoreFileRef = useRef(null)

  const [localLoading, setLocalLoading] = useState({
    generating: false,
    generatingStatus: "",
    syncingId: null,
    syncStatus: "",
    uploading: false,
  })

  const [isRescanning, setIsRescanning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefresh?.(true)
      showToast?.({
        title: "Backup Records Refreshed",
        description: "Loaded latest backup records and storage status.",
      })
    } catch {
      showToast?.({
        title: "Refresh Failed",
        description: "Failed to reload backup records.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRescanDrive = async () => {
    setIsRescanning(true)
    try {
      const data = await onRescanDrive?.()
      if (data?.connected) {
        showToast?.({
          title: "External Storage Connected",
          description: `Detected volume "${data.label || "External Storage"}" (${data.freeFormatted ? `${data.freeFormatted} free` : "Ready"}).`,
        })
      } else {
        showToast?.({
          title: "No External Storage Detected",
          description: "No physical USB storage drive was found. Connect a drive or activate demo simulation.",
          variant: "warning",
        })
      }
    } catch {
      showToast?.({
        title: "Scan Failed",
        description: "Unable to complete storage device scan.",
        variant: "destructive",
      })
    } finally {
      setIsRescanning(false)
    }
  }

  const handleToggleSimulationLocal = async () => {
    try {
      const nextSimulate = !externalDrive?.connected
      const data = await onToggleSimulation?.(nextSimulate)
      if (nextSimulate && data?.connected) {
        showToast?.({
          title: "Demo Mode Enabled",
          description: "Simulated offline external storage volume is now active for demonstration.",
        })
      } else {
        showToast?.({
          title: "Demo Mode Disabled",
          description: "Switched back to real physical hardware detection.",
        })
      }
    } catch {
      showToast?.({
        title: "Toggle Failed",
        description: "Could not update demo simulation state.",
        variant: "destructive",
      })
    }
  }

  const [selectedBackupIds, setSelectedBackupIds] = useState([])
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")

  const [localSearch, setLocalSearch] = useState(backupSearch)

  useEffect(() => {
    setJumpPage(String(page))
  }, [page])

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setBackupSearch(localSearch)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setBackupSearch])

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

  const handleGenerateBackup = async () => {
    setLocalLoading((prev) => ({
      ...prev,
      generating: true,
      generatingStatus: "Packing...",
    }))
    const timer = setTimeout(() => {
      setLocalLoading((prev) => ({ ...prev, generatingStatus: "Encrypting..." }))
    }, 1500)

    try {
      await onSimulateBackup()
    } finally {
      clearTimeout(timer)
      setLocalLoading((prev) => ({
        ...prev,
        generating: false,
        generatingStatus: "",
      }))
    }
  }

  const handleSyncExternal = async (id) => {
    setLocalLoading((prev) => ({
      ...prev,
      syncingId: id,
      syncStatus: "Transferring...",
    }))
    try {
      await onSyncExternal(id)
    } finally {
      setLocalLoading((prev) => ({ ...prev, syncingId: null, syncStatus: "" }))
    }
  }

  const handleRestoreFileChangeLocal = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setLocalLoading(prev => ({ ...prev, uploading: true }));
    setTimeout(() => {
      onRestoreFileChange(e);
      setLocalLoading(prev => ({ ...prev, uploading: false }));
    }, 300);
  }

  const handleDownloadBackup = (id, filename) => {
    const backup = backups.find(b => b?.id === id)
    onDownloadBackup(backup || { id, filename })
    showToast({
      title: "Download Initiated",
      description: `Your system image is being streamed to your local machine.`,
    })
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
      <div className="animate-fade-up font-jakarta flex w-full flex-col gap-6">
        <div className="relative flex min-h-[600px] w-full items-stretch gap-5">
          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
              <PageHeader
                icon="ph-hard-drives"
                title="Office Partition Backup & Archive"
                description="Create and restore office partition backups, and save offline copies to an external drive for safekeeping."
                showBorder={false}
                titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
                actions={
                  <div className="flex items-center gap-2">
                    

                    

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
                        <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></HugeIcon>
                      ) : (
                        "Restore"
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerateBackup}
                      disabled={localLoading.generating}
                      className="flex h-10 items-center justify-center rounded-xl! btn-brand-red px-5 active:scale-95 transition-all text-xs font-semibold text-white shadow-xs cursor-pointer border-0"
                    >
                      {localLoading.generating ? (
                        <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></HugeIcon>
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
              <AutoBackupSchedule showToast={showToast} scope="office" embedded={true} />

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

              {isLoading && !isManualLoading ? (
                <div className="flex-1 flex flex-col min-h-0 border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <BackupTableSkeleton embedded={true} />
                </div>
              ) : error ? (
                <div className="flex-1 flex min-h-[400px] flex-col items-center justify-center p-6 rounded-b-2xl">
                  <Empty className="flex h-[350px] flex-col items-center justify-center border-0 bg-transparent text-center">
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
                        onClick={onRefresh}
                        className="mt-6 flex h-10 items-center justify-center rounded-xl! border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        Retry
                      </Button>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <>
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
                      onDeleteBackup={onDeleteBackup}
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
                      scope="office"
                      externalDriveConnected={Boolean(externalDrive?.connected)}
                    />
                  </div>
                </>
              )}
            </Card>
          </div>

          {true ? (
            <HealthSidebar
              systemHealth={systemHealth}
              lastBackupTime={lastBackupTime}
              isLoading={isLoading}
              isManualLoading={isManualLoading}
              externalDrive={externalDrive}
              onRescanDrive={handleRescanDrive}
              onToggleSimulation={handleToggleSimulationLocal}
              isRescanning={isRescanning}
              
            />
          ) : (
            <button
              type="button"
              onClick={() => handleToggleStatusSidebar(true)}
              title="Expand System Status"
              className="hidden md:flex flex-col items-center justify-center gap-2 w-8 self-stretch rounded-2xl border border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white shadow-2xs transition-all cursor-pointer group py-4 select-none shrink-0"
            >
              <HugeIcon className="ph-bold ph-caret-left text-[14px] group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-gray-400 dark:text-zinc-500 [writing-mode:vertical-lr] rotate-180">
                Status
              </span>
            </button>
          )}
        </div>

        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          onAction={() => onDeleteBackup(selectedBackupIds)}
          actionLabel="Delete"
          actionIcon="ph-trash"
        />
      </div>
    </TooltipProvider>
  )
}
