"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import ViewModeIcon from "@/components/shared/ViewModeIcon"
import OfficeGridSkeleton from "@/components/systemadmin/skeletons/OfficeGridSkeleton"
import useViewPreference from "@/hooks/useViewPreference"
import { cn } from "@/lib/utils"

const OFFICE_COLUMNS = ["department", "office", "station", "staff", "modules", "status", "created_at", "updated_at"]

export default function OfficeManagementPageSkeleton() {
  const [statusFilter] = useViewPreference("offices", "statusFilter", "Active")
  const [layoutView] = useViewPreference("offices", "layoutView", "grid")
  const [visibleColumns] = useViewPreference("offices", "visibleColumns", OFFICE_COLUMNS.slice(0, 6))
  const [groupBy] = useViewPreference("offices", "groupBy", "none")
  const [pageSize] = useViewPreference("offices", "pageSize", 20)
  const orderedVisibleColumns = OFFICE_COLUMNS.filter((column) => visibleColumns.includes(column))

  return (
    <div className="animate-fade-up flex flex-[1_0_auto] w-full flex-col gap-6 font-jakarta">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-sm dark:border-border dark:bg-card dark:shadow-none">
        <PageHeader
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Departments &amp; Stations</span>
              <Skeleton aria-hidden="true" className="h-3.5 w-44 rounded dark:bg-muted" />
            </div>
          }
          description="Manage campus offices, link scanning computers, and configure departmental storage folders."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="mt-[4px] text-[13px] font-normal text-gray-900 dark:text-zinc-300"
          actions={
            <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
              <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted" />
              <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        <div aria-hidden="true" className="flex items-center justify-between gap-4 overflow-x-auto px-6 py-2.5 scrollbar-none border-b border-border bg-white dark:bg-card dark:border-white/10">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            <div className={cn("inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", statusFilter === "Active" ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
              Active
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
            <div className={cn("inline-flex items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", statusFilter === "Inactive" ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
              Archived
              <Skeleton className="h-3 w-5 rounded-full dark:bg-muted" />
            </div>
          </div>

          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] ml-auto">
            <div className={cn("inline-flex w-full items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", layoutView === "grid" ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
              <ViewModeIcon mode="grid" className="text-sm" />
              Grid
            </div>
            <div className={cn("inline-flex w-full items-center justify-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", layoutView === "table" ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
              <ViewModeIcon mode="table" className="text-sm" />
              Table
            </div>
          </div>
        </div>

        <DataViewToolbar
          label="Department search and filters"
          className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3"
        >
          <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
            <div className="relative w-72 sm:w-80 shrink-0">
              <Skeleton className="h-9 w-full rounded-xl dark:bg-muted" />
              <Skeleton className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded dark:bg-muted" />
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2" aria-hidden="true">
            <Skeleton className="h-9 w-20 shrink-0 rounded-xl dark:bg-muted" />
          </div>
        </DataViewToolbar>

        <div aria-busy="true" className="flex flex-[1_0_auto] flex-col rounded-b-2xl border-t border-border bg-white dark:border-border dark:bg-card">
          <OfficeGridSkeleton
            layoutView={layoutView}
            count={layoutView === "table" ? pageSize : 6}
            visibleColumns={orderedVisibleColumns}
            groupBy={groupBy}
            statusFilter={statusFilter}
          />
        </div>
      </Card>
    </div>
  )
}
