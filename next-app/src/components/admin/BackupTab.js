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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPHDateTime } from "@/lib/timeFormat"

import HealthSidebar from "./backup/HealthSidebar"
import BackupTable from "./backup/BackupTable"
import BackupPagination from "./backup/BackupPagination"
import PageHeader from "@/components/shared/PageHeader"
import FloatingActionBar from "@/components/shared/FloatingActionBar"
import ConfirmModal from "@/components/shared/ConfirmModal"

export default function BackupTab({
  systemHealth,
  backups,
  isLoading = false,
  error = null,
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
  })

  const [selectedBackupIds, setSelectedBackupIds] = useState([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [jumpPage, setJumpPage] = useState("1")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmPayload, setConfirmPayload] = useState({
    title: "",
    message: "",
    confirmLabel: "",
    variant: "danger",
    selectedItems: [],
    onConfirm: () => {},
  })

  useEffect(() => {
    setJumpPage(String(page))
  }, [page])

  const handleSort = (column, order) => {
    setSortBy(column)
    setSortOrder(order)
    setPage(1)
  }

  const handleSelectAll = (checked) => {
    setSelectedBackupIds(checked ? backups.map((b) => b.id) : [])
  }

  const handleToggleRow = (id) => {
    setSelectedBackupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleDeleteClick = (ids) => {
    const idArray = Array.isArray(ids) ? ids : [ids]
    if (idArray.length === 0) return

    const involvedFilenames = backups
      .filter((b) => idArray.includes(b.id))
      .map((b) => b.filename)

    setConfirmPayload({
      title: idArray.length > 1 ? "Bulk Delete Backups" : "Delete Backup Archive",
      message:
        idArray.length > 1
          ? `You are about to permanently delete ${idArray.length} backup snapshots. This action cannot be undone.`
          : `Permanently delete this backup archive? This will remove it from local storage and cannot be undone.`,
      confirmLabel: idArray.length > 1 ? "Delete Selected" : "Delete Archive",
      variant: "danger",
      selectedItems: involvedFilenames,
      onConfirm: async () => {
        try {
          await onDeleteBackup(idArray)
          setSelectedBackupIds([])
          setConfirmOpen(false)
        } catch (err) {
          showToast({ title: "Delete Failed", description: err.message }, true)
        }
      },
    })
    setConfirmOpen(true)
  }

  const handleBulkDelete = () => {
    if (selectedBackupIds.length === 0) return
    handleDeleteClick(selectedBackupIds)
  }

  const sortedAndPaginatedBackups = useMemo(() => {
    let result = [...backups]
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

  const handleDownloadBackup = async (id, filename) => {
    try {
      await onDownloadBackup(id)
      showToast({
        title: "Download Initiated",
        description: `Your system image is being streamed to your local machine.`,
      })
    } catch (err) {
      showToast({ title: "Download Failed", description: err.message }, true)
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
  const endItem = Math.min(page * itemsPerPage, backups.length)

  return (
    <TooltipProvider delayDuration={200}>
      <div className="animate-fade-in font-inter flex h-full w-full flex-col gap-4">
        {isLoading ? (
          <div className="flex h-full w-full flex-1 items-stretch gap-4 overflow-hidden">
            <Skeleton className="h-full w-[300px] shrink-0 rounded-brand" />
            <Skeleton className="h-full flex-1 rounded-brand" />
          </div>
        ) : error ? (
          <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
            <CardContent className="flex min-h-0 flex-1 flex-col p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
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
          <div className="relative flex h-full w-full flex-1 items-stretch gap-4 overflow-hidden">
            {/* LEFT SIDEBAR */}
            <HealthSidebar
              systemHealth={systemHealth}
              lastBackupTime={lastBackupTime}
              localLoading={localLoading}
              isSidebarOpen={isSidebarOpen}
              restoreFileRef={restoreFileRef}
              onRestoreFileChange={onRestoreFileChange}
              handleGenerateBackup={handleGenerateBackup}
            />

            {/* MAIN CONTENT */}
            <Card className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm">
              <PageHeader
                icon="ph-hard-drives"
                title="Encrypted Backup History"
                description="Manage institutional snapshots and secure redundancy nodes."
                leftAction={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`h-11 w-11 shrink-0 rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm transition-all hover:bg-gray-50 ${
                          isSidebarOpen ? "" : "rotate-180"
                        }`}
                      >
                        <i className="ph-bold ph-caret-double-left text-lg"></i>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {isSidebarOpen ? "Collapse Insights" : "Expand Insights"}
                    </TooltipContent>
                  </Tooltip>
                }
                actions={
                  <div className="flex items-center gap-2">
                    {!isSidebarOpen && (
                      <div className="mr-2 flex items-center gap-2 border-r border-gray-200 pr-2">
                        <Button
                          onClick={handleGenerateBackup}
                          disabled={localLoading.generating}
                          className="flex h-9 items-center gap-2 rounded-brand bg-pup-maroon px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-900 active:scale-95"
                        >
                          <i
                            className={`ph-bold ${localLoading.generating ? "ph-arrows-clockwise animate-spin" : "ph-plus"} text-sm`}
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
                          className="flex h-9 items-center gap-2 rounded-brand border-amber-300 bg-amber-50/30 px-4 text-xs font-bold text-amber-700 shadow-sm transition-colors hover:border-amber-500 hover:bg-amber-100/50 hover:text-amber-800 active:scale-95"
                        >
                          <i className="ph-bold ph-warning-circle text-sm"></i>{" "}
                          UPLOAD
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackupIds([])
                        onRefresh()
                      }}
                      disabled={isLoading}
                      className="flex h-9 items-center gap-2 rounded-brand border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95"
                    >
                      <i
                        className={`ph-bold ph-arrows-clockwise ${isLoading ? "animate-spin" : ""}`}
                      ></i>
                      REFRESH
                    </Button>
                  </div>
                }
              />

              <CardContent className="flex min-h-0 flex-1 flex-col bg-white p-5">
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
                  onDeleteBackup={handleDeleteClick}
                  handleGenerateBackup={handleGenerateBackup}
                />
              </CardContent>

              {backups.length > 0 && (
                <BackupPagination
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
              )}
            </Card>

            <ConfirmModal
              open={confirmOpen}
              onCancel={() => setConfirmOpen(false)}
              {...confirmPayload}
            />

          </div>
        )}

        <FloatingActionBar
          selectedCount={selectedBackupIds.length}
          onCancel={() => setSelectedBackupIds([])}
          onAction={handleBulkDelete}
          actionLabel="DELETE PERMANENTLY"
          actionIcon="ph-trash"
        />
      </div>
    </TooltipProvider>
  )
}
