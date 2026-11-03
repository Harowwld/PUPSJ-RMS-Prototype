"use client";

import { Table } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function DocumentsMatrixSkeleton({ rowCount = 7, embedded = false, docTypes = [] }) {
  const requirements = docTypes.length ? docTypes : [null, null, null];
  const columns = [{ kind: "identifier", width: 180 }, { kind: "text", width: 240 }, { kind: "category", width: 160 }, { kind: "number", width: 210 }, ...requirements.map(() => ({ kind: "category", width: 185 }))];
  return <div className={cn("flex w-full min-w-0 flex-col", !embedded && "overflow-hidden rounded-2xl border border-border bg-white dark:bg-card")} aria-busy="true" aria-label="Loading student document matrix">
    <div className="min-w-0 overflow-x-auto show-scrollbar">
      <Table layout="matrix" columns={columns}>
        <thead><tr>{columns.map((_, index) => <th key={index}><Skeleton className="h-3.5 w-24" /></th>)}</tr></thead>
        <tbody>{Array.from({ length: rowCount }, (_, row) => <tr key={row}>{columns.map((_, index) => <td key={index}><Skeleton className={cn("h-4", index === 1 ? "w-40" : "w-24")} /></td>)}</tr>)}</tbody>
      </Table>
    </div>
    {!embedded && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-40" /></div>}
  </div>;
}
