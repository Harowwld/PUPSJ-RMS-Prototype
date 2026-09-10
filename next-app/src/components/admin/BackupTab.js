"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
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
} from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"

import HealthSidebar from "./backup/HealthSidebar"
import BackupTable from "./backup/BackupTable"
import AutoBackupSchedule from "./backup/AutoBackupSchedule"
import BackupTableSkeleton from "./backup/BackupTableSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { cn } from "@/lib/utils"

export default function BackupTab({
  systemHealth,
  backups,
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-up font-inter flex w-full flex-col gap-6">
        <div className="relative flex min-h-[600px] w-full items-stretch gap-5">
          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col">
            <Card className="flex-1 flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate">
              <PageHeader
                icon="ph-hard-drives"
                title="Backup & Maintenance"
                description="Manage system archives and secure copies."
                showBorder={false}
                titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                actions={
                  <div className="flex items-center gap-6">
                    <RefreshButton 
                      onRefresh={onRefresh} 
                      isLoading={isLoading} 
                      title="Refresh Backup & Maintenance"
                    />

                    <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          restoreFileRef.current &&
                          restoreFileRef.current.click()
                        }
                        disabled={localLoading.uploading}
                        className="flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-4 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        {localLoading.uploading ? (
                          <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                        ) : (
                          "Restore Backup"
                        )}
                      </Button>
                      <LiquidGlassButton
                        onClick={handleGenerateBackup}
                        disabled={localLoading.generating}
                        height={40}
                        radius={12}
                        glassColor="rgba(10, 132, 255, 0.15)"
                        className="flex h-10 items-center justify-center rounded-xl! px-5 active:scale-95 transition-all dark:shadow-none text-xs font-semibold text-white cursor-pointer"
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

              {/* Automatic Backup Configuration Section */}
              <AutoBackupSchedule showToast={showToast} scope="office" embedded={true} />

              {isLoading && !isManualLoading ? (
                <div className="p-6">
                  <BackupTableSkeleton />
                </div>
              ) : error ? (
                <div className="flex-1 flex min-h-[400px] flex-col items-center justify-center p-6">
                  <Empty className="flex h-[350px] flex-col items-center justify-center border-0 bg-transparent text-center">
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
                        onClick={onRefresh}
                        className="mt-6 flex h-10 items-center justify-center rounded-xl! border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        <i className="ph-bold ph-arrows-clockwise mr-2"></i>
                        Retry Loading
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
                    <div className="flex-none border-t border-gray-100 dark:border-white/10 bg-white dark:bg-card px-6 py-3 animate-in fade-in slide-in-from-top-1 duration-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                          Active filters:
                        </span>
                        {localSearch && (
                          <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                            Search: {localSearch}
                            <button
                              onClick={() => {
                                setLocalSearch("")
                                setBackupSearch("")
                                setPage(1)
                              }}
                              className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {(backupStartDate || backupEndDate) && (
                          <div className="flex items-center gap-[6px] rounded-lg bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                            Range: {backupStartDate || "..."} to{" "}
                            {backupEndDate || "..."}
                            <button
                              onClick={() => {
                                setBackupStartDate("")
                                setBackupEndDate("")
                                setPage(1)
                              }}
                              className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                            >
                              ×
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
                          className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                        >
                          Clear
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
                      onDeleteBackup={onDeleteBackup}
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
                </>
              )}
            </Card>
          </div>

          <HealthSidebar
            systemHealth={systemHealth}
            lastBackupTime={lastBackupTime}
            isLoading={isLoading}
            isManualLoading={isManualLoading}
            scopeInfo={{
              title: "Local Partition Archive",
              items: [
                "Office Student Records",
                "Documents Matrix",
                "Local Uploads",
                "Hardware Vault",
              ],
            }}
          />
        </div>

        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          onAction={() => onDeleteBackup(selectedBackupIds)}
          actionLabel="Delete Permanently"
          actionIcon="ph-trash"
        />
      </div>
    </TooltipProvider>
  )
}
