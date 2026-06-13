"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
      generatingStatus: "PACKING...",
    }))
    const timer = setTimeout(() => {
      setLocalLoading((prev) => ({ ...prev, generatingStatus: "ENCRYPTING..." }))
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
      syncStatus: "TRANSFERRING...",
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
          <div className="flex-1 flex flex-col gap-6">
            {/* Page Header Card */}
            <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none w-full">
              <PageHeader
                icon="ph-hard-drives"
                title="Backup Records"
                description="Manage system archives and secure copies."
                actions={
                  <div className="flex items-center gap-2">
                    <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-2 dark:border-white/10">
                      <Button
                        onClick={handleGenerateBackup}
                        disabled={localLoading.generating}
                        className="flex h-10 items-center gap-2 rounded-brand btn-brand-red shadow-sm active:scale-95 transition-all dark:shadow-none px-5 text-[10px] font-bold tracking-widest tracking-widest"
                      >
                        <i
                          className={cn("ph-bold text-base", localLoading.generating ? "ph-arrows-clockwise animate-spin" : "ph-download-simple")}
                        ></i>
                        {localLoading.generating
                          ? localLoading.generatingStatus || "WORKING..."
                          : "CREATE BACKUP"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          restoreFileRef.current &&
                          restoreFileRef.current.click()
                        }
                        disabled={localLoading.uploading}
                        className="flex h-10 items-center gap-2 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-bold tracking-widest tracking-widest text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:border-white/10"
                      >
                        <i
                          className={cn("ph-bold text-base", localLoading.uploading ? "ph-arrows-clockwise animate-spin" : "ph-arrow-counter-clockwise")}
                        ></i>{" "}
                        {localLoading.uploading
                          ? "READING FILE..."
                          : "RESTORE BACKUP"}
                      </Button>
                      <input
                        ref={restoreFileRef}
                        type="file"
                        className="hidden"
                        accept=".zip,.enc,.bak,.backup,.pupbak,application/zip,application/octet-stream"
                        onChange={handleRestoreFileChangeLocal}
                      />
                    </div>

                    <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-white/10">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">Refresh Status</p>
                        <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap dark:text-zinc-400">
                          {isFilterActive ? "Filtering live records..." : "Get latest database updates"}
                        </p>
                      </div>
                      <RefreshButton 
                        onRefresh={onRefresh} 
                        isLoading={isLoading} 
                        title="Refresh Backup Records"
                      />
                    </div>
                  </div>
                }
              />
            </Card>

            {isLoading && !isManualLoading ? (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-10">
                <div className="flex flex-col items-center gap-4">
                  <i className="ph-bold ph-spinner animate-spin text-4xl text-pup-maroon dark:text-primary" />
                  <p className="text-sm font-bold text-gray-500 tracking-widest dark:text-zinc-400">
                    Loading...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
                <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
                  <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                        <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                          <i className="ph-duotone ph-warning-circle text-5xl text-gray-300 dark:text-zinc-650" />
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-lg font-bold tracking-normal text-gray-900 dark:text-zinc-50">
                        Could not load backups
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                        {error}
                      </EmptyDescription>
                      <Button 
                        variant="outline" 
                        onClick={onRefresh}
                        className="mt-6 rounded-full border-gray-200 font-bold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 dark:bg-card"
                      >
                        <i className="ph-bold ph-arrows-clockwise mr-2"></i>
                        RETRY LOADING
                      </Button>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </div>
            ) : (
              <div className="flex-1 flex h-fit min-h-[600px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
              {/* Active Filter Chips Row */}
              {(localSearch !== "" ||
                backupStartDate !== "" ||
                backupEndDate !== "") && (
                <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 dark:text-zinc-550">
                      Active filters:
                    </span>
                    {localSearch && (
                      <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                        Search: {localSearch}
                        <button
                          onClick={() => {
                            setLocalSearch("")
                            setBackupSearch("")
                            setPage(1)
                          }}
                          className="ml-1 hover:text-pup-darkMaroon transition-colors"
                        >
                          <i className="ph-bold ph-x text-[8px]"></i>
                        </button>
                      </div>
                    )}
                    {(backupStartDate || backupEndDate) && (
                      <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-widest text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Range: {backupStartDate || "..."} to{" "}
                        {backupEndDate || "..."}
                        <button
                          onClick={() => {
                            setBackupStartDate("")
                            setBackupEndDate("")
                            setPage(1)
                          }}
                          className="ml-1 hover:text-emerald-800 transition-colors"
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
                      className="h-6 rounded-full border border-dashed border-gray-300 px-3 text-[10px] font-bold tracking-widest text-pup-maroon dark:text-primary hover:bg-red-50 hover:text-pup-darkMaroon dark:border-white/10 dark:text-primary dark:bg-red-950/30"
                    >
                      CLEAR ALL FILTERS
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
            </div>
          )}
        </div>

          <HealthSidebar
            systemHealth={systemHealth}
            lastBackupTime={lastBackupTime}
            isLoading={isLoading}
            isManualLoading={isManualLoading}
          />
        </div>

        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          onAction={() => onDeleteBackup(selectedBackupIds)}
          actionLabel="DELETE PERMANENTLY"
          actionIcon="ph-trash"
        />
      </div>
    </TooltipProvider>
  )
}
