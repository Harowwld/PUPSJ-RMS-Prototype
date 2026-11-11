"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";

const columns = [
  { key: "name", kind: "text", minWidth: 260, maxWidth: 380 },
  { key: "adviser", kind: "text", maxWidth: 350 },
  { key: "cbl", kind: "status", width: 180 },
  { key: "officers", kind: "status", width: 180 },
  { key: "complianceScore", kind: "number", width: 220 },
];

export default function OsasComplianceTableSkeleton({ visibleColumns = columns.map(({ key }) => key), rowCount = 6 }) {
  const activeColumns = columns.filter(({ key }) => visibleColumns.includes(key));
  return (
    <div className="w-full overflow-x-auto pb-2 select-none" aria-label="Loading organization compliance" aria-busy="true">
      <Table columns={activeColumns}>
        <thead className="border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
          <tr>{activeColumns.map(({ key, kind }) => (
            <th key={key} className="px-6 py-3">
              <Skeleton className={`h-3.5 w-28 max-w-full ${kind === "status" ? "mx-auto" : kind === "number" ? "ml-auto" : ""}`} />
            </th>
          ))}</tr>
        </thead>
        <tbody className="divide-y divide-border bg-white dark:bg-card">
          {Array.from({ length: rowCount }, (_, index) => (
            <tr key={index}>{activeColumns.map(({ key, kind }) => (
              <td key={key} className="px-6 py-3">
                <div className={`flex flex-col gap-1.5 ${kind === "status" ? "items-center" : kind === "number" ? "items-end" : ""}`}>
                  <Skeleton className={kind === "status" ? "h-6 w-24 max-w-full rounded-full" : "h-4 w-36 max-w-full rounded"} />
                  {(key === "name" || key === "complianceScore") && <Skeleton className="h-3 w-24 max-w-full rounded" />}
                </div>
              </td>
            ))}</tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
