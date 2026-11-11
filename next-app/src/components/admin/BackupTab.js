"use client"

import useUrlPage from "@/hooks/useUrlPage"
import { useMemo, useRef, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SegmentedControl } from "@/components/ui/tabs"
import { formatPHDateTime } from "@/lib/timeFormat"
import { format } from "date-fns"
import useTableScroll from "@/hooks/useTableScroll"
import TableScrollControls from "@/components/shared/TableScrollControls"
import { RefreshButton } from "@/components/shared/RefreshButton"

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
import { FilterPopover, SortPopover, GroupPopover, ColumnsPopover } from "@/components/systemadmin/OfficeTableControls"
import { PLATFORM_BACKUP_COLUMNS } from "@/components/systemadmin/PlatformBackupTable"
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertCircleIcon as EmptyAlertCircleIcon, CheckmarkCircle01Icon, Database01Icon, Loading01Icon, PieChartIcon } from "hugeicons-react"

const BACKUP_SORT_OPTIONS = [
  { key: "created_at", label: "Created" },
  { key: "filename", label: "Archive name" },
  { key: "actor", label: "Actor" },
  { key: "size_bytes", label: "Size" },
  { key: "backup_type", label: "Backup type" },
  { key: "status_local", label: "Storage status" },
]

const BACKUP_GROUP_OPTIONS = [
  { key: "backup_type", label: "Backup type", icon: Database01Icon },
  { key: "status_local", label: "Storage status", icon: CheckmarkCircle01Icon },
  { key: "none", label: "No grouping" },
]

const BACKUP_FILTER_FIELDS = [
  {
    key: "status_local",
    label: "Storage Status",
    icon: CheckmarkCircle01Icon,
    options: [
      { value: "Completed", label: "Completed" },
      { value: "Pending", label: "Pending" },
      { value: "Failed", label: "Failed" },
    ],
  },
]

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
  const [statusSheetOpen, setStatusSheetOpen] = useState(false)

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
        showToast?.(
          {
            title: data?.unauthorizedDrives?.length ? "Unauthorized External Drive" : "No External Storage Detected",
            description: data?.message || "No physical USB storage drive was found. Connect an authorized drive (PUPSJ_BACKUP) or activate demo simulation.",
          },
          "warning"
        )
      }
    } catch {
      showToast?.(
        {
          title: "Drive Scan Failed",
          description: "Unable to complete external storage scan. Please verify USB connection.",
        },
        true
      )
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
      showToast?.(
        {
          title: "Simulation Toggle Failed",
          description: "Could not update demo simulation state.",
        },
        true
      )
    }
  }

  const [selectedBackupIds, setSelectedBackupIds] = useState([])
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState("DESC")
  const [filterRules, setFilterRules] = useState([])
  const [groupBy, setGroupBy] = useState("none")
  const [backupTypeFilter, setBackupTypeFilter] = useState("all")
  const [visibleColumns, setVisibleColumns] = useState(() =>
    PLATFORM_BACKUP_COLUMNS.filter(({ defaultHidden }) => !defaultHidden).map(({ key }) => key)
  )
  const [page, setPage] = useUrlPage()
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const [localSearch, setLocalSearch] = useState(backupSearch)

  const { containerRef: tableScrollRef, isScrolledX, scrollLeft, scrollRight, resetScroll } = useTableScroll([visibleColumns.join(","), (backups || []).length, isLoading])

  const validBackupIds = useMemo(() => new Set((backups || []).map((b) => b?.id).filter(Boolean)), [backups])
  const effectiveSelectedBackupIds = useMemo(() => selectedBackupIds.filter((id) => validBackupIds.has(id)), [selectedBackupIds, validBackupIds])

  useEffect(() => {
    const timer = setTimeout(() => {
      setBackupSearch(localSearch)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [localSearch, setBackupSearch, setPage])

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
    setSelectedBackupIds(checked ? (backups || []).filter(b => b).map((b) => b.id) : [])
  }

  const handleToggleRow = (id) => {
    setSelectedBackupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const backupTypeTabs = useMemo(() => {
    return [
      { value: "all", label: "All Types", count: (backups || []).length },
      { value: "Manual", label: "Manual", count: (backups || []).filter((b) => String(b?.backup_type).toLowerCase() === "manual").length },
      { value: "Scheduled", label: "Automated", count: (backups || []).filter((b) => String(b?.backup_type).toLowerCase() === "scheduled").length },
    ]
  }, [backups])

  const filteredBackups = useMemo(() => {
    let result = (backups || []).filter(Boolean)
    if (backupTypeFilter !== "all") {
      result = result.filter((b) => String(b?.backup_type).toLowerCase() === backupTypeFilter.toLowerCase())
    }
    if (filterRules.length > 0) {
      result = result.filter((b) => {
        return filterRules.every((rule) => {
          if (!rule.value) return true
          const val = b[rule.fieldKey] || ""
          return rule.operator === "is_not" ? val !== rule.value : val === rule.value
        })
      })
    }
    return result
  }, [backups, backupTypeFilter, filterRules])

  const sortedAndPaginatedBackups = useMemo(() => {
    const result = [...filteredBackups]
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
  }, [filteredBackups, sortBy, sortOrder, page, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredBackups.length / itemsPerPage))

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
    } catch {
      // toast.promise in onSyncExternal handles user notification
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

  const startItem = filteredBackups.length === 0 ? 0 : (page - 1) * itemsPerPage + 1
  const endItem = Math.min(page * itemsPerPage, filteredBackups.length)

  const isFilterActive = !!(backupSearch || backupStartDate || backupEndDate || filterRules.length > 0)

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
            <Card className="flex-[1_0_auto] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
              <PageHeader
                icon="CloudServerIcon"
                title={
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span>Office Partition Backup & Archive</span>
                    <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                      {isLoading ? "Loading backups…" : `${(backups || []).length.toLocaleString()} ${(backups || []).length === 1 ? "archive" : "archives"}`}
                    </span>
                  </div>
                }
                description="Create and restore office partition backups, and save offline copies to an external drive for safekeeping."
                showBorder={false}
                className="p-6"
                titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
                descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
                actions={
                  <div className="flex shrink-0 items-center gap-2">
                    <RefreshButton
                      onRefresh={onRefresh}
                      isLoading={isManualLoading}
                      title="Refresh Office Backups"
                      className="h-9 w-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusSheetOpen(true)}
                      className="h-9 w-9 p-0"
                      aria-label="Open System Status"
                      title="System Status"
                    >
                      <PieChartIcon size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => restoreFileRef.current?.click()}
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
                      size="sm"
                      onClick={handleGenerateBackup}
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

              {/* Connected Row: Backup Type Filter */}
              <div role="group" aria-label="Backup type" className="flex items-center px-6 py-2.5 border-b border-border dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
                <SegmentedControl
                  value={backupTypeFilter}
                  onValueChange={(val) => {
                    setBackupTypeFilter(val);
                    setPage(1);
                  }}
                  variant="capsule"
                  className="inline-grid grid-flow-col auto-cols-fr"
                  items={backupTypeTabs.map(({ value, label, count }) => ({
                    value,
                    label,
                    badge: count,
                  }))}
                />
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
                  <FilterPopover fields={BACKUP_FILTER_FIELDS} filters={filterRules} onFiltersChange={(rules) => { setFilterRules(rules); setPage(1) }} entityLabel="backups" />
                  <SortPopover options={BACKUP_SORT_OPTIONS} sortBy={sortBy} onSortByChange={(key) => { setSortBy(key); setSortOrder("ASC"); setPage(1) }} sortOrder={sortOrder} onSortOrderChange={(order) => { setSortOrder(order); setPage(1) }} />
                  <GroupPopover options={BACKUP_GROUP_OPTIONS} groupBy={groupBy} onGroupByChange={setGroupBy} />
                  <ColumnsPopover columns={PLATFORM_BACKUP_COLUMNS} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns} />
                </>}
                scrollControls={<TableScrollControls scrollContainerRef={tableScrollRef} onScrollLeft={scrollLeft} onScrollRight={scrollRight} onResetScroll={resetScroll} controlSize="md" />}
              />

              {/* Automatic Backup Configuration Section */}
              <AutoBackupSchedule showToast={showToast} scope="office" embedded={true} />

              {/* Active Filter Chips Row */}
              {(localSearch !== "" ||
                backupStartDate !== "" ||
                backupEndDate !== "" ||
                filterRules.length > 0) && (
                <ActiveFilterChips
                  searchQuery={localSearch}
                  onClearSearch={() => {
                    setLocalSearch("")
                    setBackupSearch("")
                    setPage(1)
                  }}
                  extraChips={[
                    ...filterRules.map((rule) => ({
                      key: rule.id || rule.fieldKey,
                      label: `${BACKUP_FILTER_FIELDS.find((f) => f.key === rule.fieldKey)?.label || rule.fieldKey} ${rule.operator.replaceAll("_", " ")} ${rule.value}`,
                      onRemove: () => setFilterRules((current) => current.filter((item) => (item.id || item.fieldKey) !== (rule.id || rule.fieldKey)))
                    })),
                    ...(backupStartDate || backupEndDate ? [{
                      key: "dateRange",
                      label: `Range: ${backupStartDate ? format(parseDateLocal(backupStartDate), "MMM d, yyyy") : "..."} to ${backupEndDate ? format(parseDateLocal(backupEndDate), "MMM d, yyyy") : "..."}`,
                      onRemove: () => {
                        setBackupStartDate("")
                        setBackupEndDate("")
                        setPage(1)
                      }
                    }] : [])
                  ]}
                  onClearAll={handleClearFilters}
                  className="border-t border-border dark:border-border bg-white dark:bg-card px-6 py-2.5"
                />
              )}

              {isLoading ? (
                <div className="w-full flex flex-[1_0_auto] flex-col border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <BackupTableSkeleton embedded={true} visibleColumns={visibleColumns} scrollRef={tableScrollRef} />
                </div>
              ) : error ? (
                <div className="flex-1 flex min-h-[400px] flex-col items-center justify-center p-6 rounded-b-2xl">
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
                        size="sm"
                        onClick={onRefresh}
                        className="mt-6 h-9 px-4 text-xs font-semibold rounded-xl"
                      >
                        Retry Connection
                      </Button>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div className="w-full flex flex-[1_0_auto] flex-col border-t border-border dark:border-border rounded-b-2xl overflow-hidden">
                  <BackupTable
                    backups={filteredBackups}
                    sortedAndPaginatedBackups={sortedAndPaginatedBackups}
                    selectedBackupIds={effectiveSelectedBackupIds}
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
                    totalCount={filteredBackups.length}
                    itemsPerPage={itemsPerPage}
                    handleItemsPerPageChange={handleItemsPerPageChange}
                    scope="office"
                    externalDriveConnected={Boolean(externalDrive?.connected)}
                    visibleColumns={visibleColumns}
                    tableScrollRef={tableScrollRef}
                    isScrolledX={isScrolledX}
                    resetScroll={resetScroll}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>

        <Sheet open={statusSheetOpen} onOpenChange={setStatusSheetOpen}>
          <SheetContent side="right" className="w-[480px] sm:w-[540px] max-w-[90vw] p-0">
            <SheetHeader className="px-6 py-5 pr-14">
              <SheetTitle>System Status</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <HealthSidebar
                systemHealth={systemHealth}
                lastBackupTime={lastBackupTime}
                isLoading={isLoading}
                externalDrive={externalDrive}
                onRescanDrive={handleRescanDrive}
                onToggleSimulation={handleToggleSimulationLocal}
                isRescanning={isRescanning}
                embedded
              />
            </div>
            <SheetFooter className="shrink-0 p-4 px-6">
              <SheetClose asChild>
                <Button type="button" variant="outline" size="sm" className="h-9 px-4">Close</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <FloatingActionBar
          selectedCount={effectiveSelectedBackupIds.length}
          selectionStatus="Selected Backups"
          onCancel={() => setSelectedBackupIds([])}
          primaryAction={{
            label: "Delete Backups",
            variant: "danger",
            onClick: () => onDeleteBackup(effectiveSelectedBackupIds),
          }}
          secondaryActions={[
            {
              label: "Copy Filenames",
              copiedLabel: "Filenames Copied!",
              onClick: () => {
                const selected = (backups || []).filter((b) => effectiveSelectedBackupIds.includes(b.id))
                const filenames = selected.map((b) => b.filename).filter(Boolean)
                if (filenames.length === 0) return
                navigator.clipboard?.writeText(filenames.join("\n"))
                showToast?.(`Copied ${filenames.length} archive filename${filenames.length === 1 ? "" : "s"} to clipboard`)
              },
            },
          ]}
        />
      </div>
    </TooltipProvider>
  )
}
