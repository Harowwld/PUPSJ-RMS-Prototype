"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useTablePreferences } from "@/components/shared/TablePreferences";
import { KANBAN_CARD_CLASS, KANBAN_CARD_HEADER_CLASS, KANBAN_CARD_METADATA_CLASS, KANBAN_CARD_FOOTER_CLASS } from "@/components/shared/KanbanPrimitives";
import { getListDensityClasses } from "@/lib/tablePresentation";
import { cn } from "@/lib/utils";
import { Table } from "@/components/ui/table";

/** Data-only loading: the page keeps ownership of its header, controls and footer. */
export default function DataContentSkeleton({
  columns = ["text", "status", "date", "actions"],
  viewMode = "table",
  rowCount = 6,
  kanbanColumnCount = 4,
  kanbanColumnClassName = "w-80",
  kanbanViewportClassName = "min-h-[calc(100vh-20rem)] p-4 sm:p-5",
  grouped = false,
  className,
}) {
  const { density } = useTablePreferences();
  const { paddingX, paddingY, gap, minHeight } = getListDensityClasses(density);
  if (viewMode === "kanban") {
    return (
      <div aria-busy="true" aria-label="Loading records" className={cn("w-full overflow-x-auto border-t border-border", kanbanViewportClassName)}>
        <div aria-hidden="true" className="flex min-h-[500px] min-w-max items-stretch gap-3.5">
          {Array.from({ length: kanbanColumnCount }, (_, index) => (
            <div key={index} className={cn("flex shrink-0 flex-col gap-2 rounded-2xl border border-gray-200/60 bg-gray-100/75 p-2.5 dark:border-white/[0.06] dark:bg-zinc-900/60", kanbanColumnClassName)}>
              <div className="flex items-center gap-2 px-2 pb-2.5 pt-1.5">
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-4" />
              </div>
              {[0, 1].map((card) => (
                <div key={card} className={KANBAN_CARD_CLASS}>
                  <div className={KANBAN_CARD_HEADER_CLASS}>
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Skeleton className="size-3.5 shrink-0 rounded-full" />
                      <Skeleton className="h-4 w-36 max-w-full" />
                    </div>
                    <Skeleton className="size-7 rounded-lg" />
                  </div>
                  <div className={KANBAN_CARD_METADATA_CLASS}><Skeleton className="h-4 w-28" /></div>
                  <div className={KANBAN_CARD_METADATA_CLASS}><Skeleton className="h-5 w-20 rounded-lg" /></div>
                  <div className={KANBAN_CARD_FOOTER_CLASS}>
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (viewMode !== "table") {
    const grid = viewMode === "grid" || viewMode === "cards";
    return (
      <div aria-busy="true" aria-label="Loading records">
        <div aria-hidden="true" className="divide-y divide-border">
          {Array.from({ length: grouped ? 2 : 1 }, (_, group) => (
            <div key={group}>
              {grouped && <div className="flex min-h-11 items-center gap-2.5 border-b border-border/70 bg-gray-50/80 px-5 sm:px-6 dark:bg-zinc-900/60"><Skeleton className="h-4 w-28" /><Skeleton className="h-5 w-7 rounded-full" /></div>}
              <div className={grid ? "grid grid-cols-1 content-start gap-5 p-6 md:grid-cols-2 lg:grid-cols-3" : "divide-y divide-border"}>
                {Array.from({ length: grouped ? Math.ceil(rowCount / 2) : rowCount }, (_, index) => grid ? (
                  <div key={index} className="space-y-4 rounded-2xl border border-border p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-4 w-40 max-w-full" /><Skeleton className="h-3 w-28 max-w-full" /></div>
                      <Skeleton className="size-7 rounded-lg" />
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ) : (
                  <div key={index} className={cn("flex items-center justify-between", paddingX, paddingY, gap, minHeight)}>
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {columns.includes("selection") && <Skeleton className="size-4 shrink-0" />}
                      <Skeleton className="h-4 w-16 shrink-0" />
                      <Skeleton className="h-4 w-36 min-w-0" />
                      <Skeleton className="hidden h-3.5 w-40 min-w-0 md:block" />
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="hidden h-3.5 w-16 sm:block" />
                      <Skeleton className="size-7 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto pb-2" aria-busy="true" aria-label="Loading records">
      <Table columns={columns} className={className}>
        <thead className="border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
          <tr>{columns.map((column, index) => {
            const kind = typeof column === "string" ? column : column.kind;
            return <th key={index} className="align-middle">{kind === "actions" ? <span className="sr-only">Actions</span> : <Skeleton className={kind === "selection" ? "size-4 mx-auto" : `h-3.5 w-20 max-w-full ${["status", "year", "category"].includes(kind) ? "mx-auto" : kind === "number" ? "ml-auto" : ""}`} />}</th>;
          })}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-white dark:bg-card">
          {Array.from({ length: rowCount }, (_, row) => <tr key={row}>{columns.map((column, index) => {
            const kind = typeof column === "string" ? column : column.kind;
            const shape = kind === "selection" ? "size-4 mx-auto" : kind === "actions" ? "size-7 mx-auto rounded-lg" : ["status", "year", "category"].includes(kind) ? "h-6 w-20 mx-auto rounded-full" : kind === "identifier" ? "h-6 w-28 rounded-lg" : kind === "number" ? "h-4 w-12 ml-auto" : "h-4 w-32";
            return <td key={index} className="align-middle"><Skeleton className={`${shape} max-w-full`} /></td>;
          })}</tr>)}
        </tbody>
      </Table>
    </div>
  );
}
