"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { format } from "date-fns"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"

import HealthSidebar from "./backup/HealthSidebar"
import BackupTable from "./backup/BackupTable"
import BackupPagination from "./backup/BackupPagination"
import BackupFilters from "./backup/BackupFilters"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"

export default function BackupTab({
  systemHealth,
  backups,
  isLoading = false,
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
    let result = backups.filter(b => b)
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

  const totalPages = Math.max(1, Math.ceil(backups.length / itemsPerPage))

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
    // Small delay to ensure the UI updates before the heavy file selection state update
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
  const endItem = Math.min(page * itemsPerPage, backups.length)

  const isFilterActive = !!(backupSearch || backupStartDate || backupEndDate)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-in font-inter flex min-h-full w-full flex-col gap-4 pb-8">
        {isLoading ? (
          <div className="flex min-h-[600px] w-full items-stretch gap-5 overflow-hidden">
            <Skeleton className="h-full flex-1 rounded-brand" />
            <Skeleton className="h-full w-[350px] rounded-brand" />
          </div>
        ) : error ? (
          <Card className="flex min-h-[400px] flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <CardContent className="flex flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                    <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
                  </EmptyMedia>
                  <EmptyTitle className="text-lg font-bold text-gray-900">
                    Could not load report
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                    {error}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="relative flex min-h-[600px] w-full items-stretch gap-5">
            {/* MAIN CONTENT */}
            <Card className="flex h-fit min-h-[600px] w-full flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
              <PageHeader
                icon="ph-hard-drives"
                title="Encrypted Backup History"
                description="Manage institutional snapshots and secure redundancy nodes."
                actions={
                  <div className="flex items-center gap-2">
                    <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-2">
                      <Button
                        onClick={handleGenerateBackup}
                        disabled={localLoading.generating}
                        className="flex h-9 items-center gap-2 rounded-brand bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-4 text-xs font-black text-white shadow-sm active:scale-95 transition-all"
                      >
                        <i
                          className={`ph-bold ${localLoading.generating ? "ph-arrows-clockwise animate-spin" : "ph-download-simple"} text-sm`}
                        ></i>
                        {localLoading.generating
                          ? localLoading.generatingStatus || "WORKING..."
                          : "CREATE SNAPSHOT"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          restoreFileRef.current &&
                          restoreFileRef.current.click()
                        }
                        disabled={localLoading.uploading}
                        className="flex h-9 items-center gap-2 rounded-brand border-amber-300 bg-amber-50/30 px-4 text-xs font-bold text-amber-700 shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-100/50 hover:text-amber-800 active:scale-95 disabled:opacity-50"
                      >
                        <i
                          className={`ph-bold ${localLoading.uploading ? "ph-arrows-clockwise animate-spin" : "ph-arrow-counter-clockwise"} text-sm`}
                        ></i>{" "}
                        {localLoading.uploading
                          ? "READING FILE..."
                          : "RESTORE IMAGE"}
                      </Button>
                      <input
                        ref={restoreFileRef}
                        type="file"
                        className="hidden"
                        accept=".zip,.enc,.bak,.backup,.pupbak,application/zip,application/octet-stream"
                        onChange={handleRestoreFileChangeLocal}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isLoading}
                      className="flex h-10 w-28 items-center justify-center gap-2 rounded-brand border-gray-300 bg-white px-4 text-[10px] font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-50"
                    >
                      <i className={`ph-bold ph-arrows-clockwise ${isLoading ? "animate-spin" : ""} text-base`}></i>
                      REFRESH
                    </Button>
                  </div>
                }
              />

              {/* Active Filter Chips Row */}
              {(localSearch !== "" || backupStartDate !== "" || backupEndDate !== "") && (
                <div className="flex-none border-b border-gray-100 bg-white px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[10px] font-bold tracking-widest text-gray-400 uppercase">Active Filters:</span>
                    {localSearch && (
                      <div className="flex items-center gap-1 rounded-full border border-gray-300/20 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-bold text-pup-maroon">
                        Search: {localSearch}
                        <button
                          onClick={() => { setLocalSearch(""); setBackupSearch(""); setPage(1); }}
                          className="ml-1 hover:text-pup-darkMaroon transition-colors"
                        >
                          <i className="ph-bold ph-x text-[8px]"></i>
                        </button>
                      </div>
                    )}
                    {(backupStartDate || backupEndDate) && (
                      <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                        Range: {backupStartDate || "..."} to {backupEndDate || "..."}
                        <button
                          onClick={() => { setBackupStartDate(""); setBackupEndDate(""); setPage(1); }}
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
                      className="h-6 rounded-full border border-dashed border-gray-300/30 px-3 text-[10px] font-black text-pup-maroon hover:bg-red-50 hover:text-pup-darkMaroon"
                    >
                      CLEAR ALL FILTERS
                    </Button>
                  </div>
                </div>
              )}

              <BackupFilters
                localSearch={localSearch}
                handleSearchChange={(e) => {
                  setLocalSearch(e.target.value)
                }}
                backupStartDate={backupStartDate}
                setBackupStartDate={setBackupStartDate}
                backupEndDate={backupEndDate}
                setBackupEndDate={setBackupEndDate}
                setPage={setPage}
                setLocalSearch={setLocalSearch}
                setBackupSearch={setBackupSearch}
                backupTotal={backups.length}
              />

              <CardContent className="flex min-h-[400px] flex-1 flex-col bg-white p-5">
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
                  totalCount={backups.length}
                  itemsPerPage={itemsPerPage}
                  jumpPage={jumpPage}
                  setJumpPage={setJumpPage}
                  handleJumpPage={handleJumpPage}
                  handleItemsPerPageChange={handleItemsPerPageChange}
                />
              </CardContent>
            </Card>

            <HealthSidebar
              systemHealth={systemHealth}
              lastBackupTime={lastBackupTime}
            />
          </div>
        )}

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
