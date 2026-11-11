"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";

/** Data-only loading: the page keeps ownership of its header, controls and footer. */
export default function DataContentSkeleton({ columns = ["text", "status", "date", "actions"], viewMode = "table", rowCount = 6, kanbanColumnCount = 4, className }) {
  if (viewMode !== "table") {
    const grid = viewMode === "grid" || viewMode === "cards";
    const kanban = viewMode === "kanban";
    return (
      <div aria-busy="true" aria-label="Loading records" className={kanban ? "flex gap-4 overflow-x-auto p-5" : grid ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6" : "flex flex-col divide-y divide-border"}>
        {Array.from({ length: kanban ? kanbanColumnCount : rowCount }, (_, index) => (
          <div key={index} className={kanban ? "w-72 shrink-0 rounded-2xl border border-border p-4 space-y-4" : grid ? "rounded-2xl border border-border p-5 space-y-4" : "flex items-center gap-4 px-6 py-4"}>
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-28 max-w-full" />
            </div>
            <Skeleton className={kanban ? "h-28 w-full rounded-xl" : "h-6 w-24 rounded-full"} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto pb-2" aria-busy="true" aria-label="Loading records">
      <Table columns={columns} className={className}>
        <thead className="border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
          <tr>{columns.map((column, index) => {
            const kind = typeof column === "string" ? column : column.kind;
            return <th key={index} className="px-4 py-3">{kind === "actions" ? <span className="sr-only">Actions</span> : <Skeleton className={kind === "selection" ? "size-4 mx-auto" : `h-3.5 w-20 max-w-full ${kind === "status" || kind === "category" ? "mx-auto" : kind === "number" ? "ml-auto" : ""}`} />}</th>;
          })}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-white dark:bg-card">
          {Array.from({ length: rowCount }, (_, row) => <tr key={row}>{columns.map((column, index) => {
            const kind = typeof column === "string" ? column : column.kind;
            const shape = kind === "selection" ? "size-4 mx-auto" : kind === "actions" ? "size-7 mx-auto rounded-lg" : kind === "status" || kind === "category" ? "h-6 w-20 mx-auto rounded-full" : kind === "identifier" ? "h-6 w-28 rounded-lg" : kind === "number" ? "h-4 w-12 ml-auto" : "h-4 w-32";
            return <td key={index} className="px-4 py-3"><Skeleton className={`${shape} max-w-full`} /></td>;
          })}</tr>)}
        </tbody>
      </Table>
    </div>
  );
}
