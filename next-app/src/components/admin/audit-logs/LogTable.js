"use client"

import React, { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
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
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPHDateTimeParts } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"

import LogExpandedRow from "./LogExpandedRow"

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return logSortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
  )
}

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400"
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400"
    };
  }
  return {
    label: sev || "Info",
    classes: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
  };
}
function formatActionLabel(actionStr) {
  if (!actionStr) return "—";
  if (actionStr === "Rotate Password") return "Password Rotated";
  if (actionStr.startsWith("[SECURITY]")) {
    if (actionStr.includes("UNAUTHORIZED_ACCESS")) return "Unauthorized Access Attempt";
    if (actionStr.includes("FORBIDDEN_ACCESS")) return "Forbidden Access Attempt";
    if (actionStr.includes("INVALID_SESSION")) return "Invalid Session Detected";
    if (actionStr.includes("RATE_LIMIT_EXCEEDED")) return "Rate Limit Exceeded";
    if (actionStr.includes("PRIVILEGE_ESCALATION")) return "Privilege Escalation Attempt";
    if (actionStr.includes("BRUTE_FORCE_ATTEMPT")) return "Brute Force Attempt Detected";
    return actionStr.split(" - ")[0].replace("[SECURITY] ", "");
  }
  return actionStr;
}

const LogRow = React.memo(function LogRow({
  log,
  isSelected,
  isExpanded,
  toggleRow,
  setSelectedLog,
  handleCopy,
  cn
}) {
  const severityInfo = getSeverityInfo(log.severity)
  
  const formattedTimestamp = (() => {
    try {
      const d = new Date(log.created_at || log.time);
      if (isNaN(d.getTime())) return log.created_at || log.time;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
    } catch (e) {
      return log.created_at || log.time;
    }
  })();

  return (
    <React.Fragment>
      <tr
        className={cn(
          "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
          isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
          isExpanded && "bg-gray-50 dark:bg-white/8"
        )}
        onClick={() => {
          toggleRow(log.id);
        }}
      >
        <td className="py-0 px-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleRow(log.id)}
            title={isExpanded ? "Collapse Details" : "Expand Details"}
            className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-200"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <i className="ti ti-chevron-down text-[14px]" style={{ fontSize: '14px' }}></i>
          </button>
        </td>
        <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-50">
          {formattedTimestamp}
        </td>
        <td className="py-0 px-4 align-middle">
          <span
            className={cn(
              "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em] shadow-none transition-all",
              severityInfo.classes
            )}
          >
            {severityInfo.label}
          </span>
        </td>
        <td className="py-0 px-4 align-middle">
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">
              {log.user}
            </span>
            <span className="truncate text-[12px] font-normal text-[#8E8E93] mt-[2px]">
              {log.role}
            </span>
          </div>
        </td>
        <td className="py-0 px-4 align-middle text-[13px] font-medium text-[#111111] dark:text-zinc-50">
          {formatActionLabel(log.action)}
        </td>
        <td className="py-0 px-4 align-middle">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[320px] truncate text-[13px] font-normal text-[#8E8E93]">
                {log.details || "No known description"}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[400px] rounded-xl border-gray-200 bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-card/95 dark:text-zinc-200"
            >
              {log.details || "No known description"}
            </TooltipContent>
          </Tooltip>
        </td>
        <td className="py-0 px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-[12px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelectedLog(log)}
                  className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#E5484D] dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                >
                  <i className="ti ti-eye text-[16px]"></i>
                </button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-0 bg-gray-50 dark:bg-muted/30">
          <td colSpan={7} className="p-0">
            <LogExpandedRow log={log} handleCopy={handleCopy} />
          </td>
        </tr>
      )}
    </React.Fragment>
  )
})

export default function LogTable({
  isLoading,
  error,
  displayLogs,
  selectedLog,
  setSelectedLog,
  logTotal,
  logPage,
  setLogPage,
  itemsPerPage,
  logsPerPage,
  setItemsPerPage,
  setLogsPerPage,
  jumpPage,
  setJumpPage,
  handleSort,
  logSortBy,
  logSortOrder,
  localSearch,
  logRoleFilter,
  logSeverityFilter,
  logStartDate,
  logEndDate,
  setLocalSearch,
  setLogSearch,
  setLogRoleFilter,
  setLogSeverityFilter,
  setLogStartDate,
  setLogEndDate,
  handleCopy,
  cn,
}) {
  const [expandedRows, setExpandedRows] = useState({})

  const toggleRow = useCallback((id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }, [])

  if (isLoading && (!displayLogs || displayLogs.length === 0)) {
    return (
      <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card animate-pulse">
        <div className="h-10 border-b border-gray-200 bg-transparent dark:border-white/10 dark:bg-transparent" />
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-full bg-gray-50 dark:bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card p-6">
        <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
          <EmptyHeader className="flex flex-col items-center gap-0">
            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <i className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
            </EmptyMedia>
            <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
              Load failed
            </EmptyTitle>
            <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600 dark:text-zinc-300">
              {error}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const totalPages = Math.ceil(logTotal / itemsPerPage) || 1
  const displayPage = Math.min(logPage, totalPages)

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-6">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card isolate">
        <div className="flex-1 overflow-hidden rounded-[inherit] isolate">
          <table className={cn("min-w-full text-sm", displayLogs.length === 0 && "h-full")}>
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                <th className="w-12 p-4 text-center"></th>
                <th className="p-4">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                  >
                    Timestamp{" "}
                    <SortIndicator
                      column="created_at"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="p-4">
                  <button
                    onClick={() => handleSort("severity")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                  >
                    Level{" "}
                    <SortIndicator
                      column="severity"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="p-4">
                  <button
                    onClick={() => handleSort("actor")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                  >
                    Actor{" "}
                    <SortIndicator
                      column="actor"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="p-4">
                  <button
                    onClick={() => handleSort("action")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em]"
                  >
                    Action{" "}
                    <SortIndicator
                      column="action"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="p-4 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Description</th>
                <th className="p-4 text-right text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("bg-transparent", displayLogs.length === 0 && "h-full")}>
              {displayLogs.length === 0 ? (
                <tr className="border-0 hover:bg-transparent h-full">
                  <td colSpan={7} className="border-0 p-0 h-full">
                    <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <i className="ph-duotone ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-600"></i>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          No Activity Found
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                          Try adjusting your search filters to find what you&apos;re looking for.
                        </EmptyDescription>
                        {(localSearch !== "" ||
                          logRoleFilter !== "All" ||
                          logSeverityFilter !== "All" ||
                          logStartDate !== "" ||
                          logEndDate !== "") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLocalSearch("")
                              setLogSearch("")
                              setLogRoleFilter("All")
                              setLogSeverityFilter("All")
                              setLogStartDate("")
                              setLogEndDate("")
                              setLogPage(1)
                            }}
                            className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
                          >
                            <i className="ph-bold ph-arrow-counter-clockwise"></i>
                            Clear Search
                          </Button>
                        )}
                      </EmptyHeader>
                    </Empty>
                  </td>
                </tr>
              ) : (
                displayLogs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    isSelected={selectedLog?.id === log.id}
                    isExpanded={!!expandedRows[log.id]}
                    toggleRow={toggleRow}
                    setSelectedLog={setSelectedLog}
                    handleCopy={handleCopy}
                    cn={cn}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {logTotal > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                <span>
                  Showing {displayLogs.length} of {logTotal}
                </span>
                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                  <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setItemsPerPage(size)
                          setLogsPerPage(size)
                          setLogPage(1)
                        }}
                        className={`px-2 py-0.5 rounded-[4px] text-[12px] font-normal cursor-pointer transition-colors border-0 ${
                          itemsPerPage === size
                            ? "bg-gray-100 text-[#111111] font-medium dark:bg-white/10 dark:text-zinc-50"
                            : "bg-transparent text-gray-450 dark:text-zinc-550 hover:text-gray-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                disabled={displayPage <= 1}
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Prev
              </button>

              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                {displayPage}
              </div>

              <button
                disabled={displayPage >= totalPages}
                onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
