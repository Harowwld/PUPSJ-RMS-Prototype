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
import LogPagination from "./LogPagination"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"

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
            <i className="ph-bold ph-caret-down text-[14px]"></i>
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
                  aria-label="View Details"
                  className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                >
                  <i className="ph-bold ph-eye text-[16px]"></i>
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
  embedded = false,
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
    return <AuditLogsTableSkeleton rowCount={8} embedded={embedded} />
  }

  if (error) {
    return (
      <div className={cn(
        "flex flex-1 min-h-[320px] flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-zinc-400",
        embedded
          ? "border-t border-gray-100 dark:border-white/10"
          : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      )}>
        <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
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
    <div className={cn("flex flex-1 flex-col min-h-0", !embedded && "gap-6")}>
      <div className={cn(
        "flex-1 min-h-0 flex flex-col overflow-hidden isolate",
        embedded
          ? "border-t border-gray-100 dark:border-white/10"
          : "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      )}>
        <div className="flex-1 overflow-hidden overflow-x-auto select-none">
          <table className={cn("min-w-full text-sm", displayLogs.length === 0 && "h-full")}>
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                <th className="w-12 p-4 text-center"></th>
                <th className="p-4">
                  <button
                    onClick={() => handleSort("created_at")}
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      logSortBy === "created_at"
                        ? "text-[#111111] dark:text-white font-semibold"
                        : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
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
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      logSortBy === "severity"
                        ? "text-[#111111] dark:text-white font-semibold"
                        : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
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
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      logSortBy === "actor"
                        ? "text-[#111111] dark:text-white font-semibold"
                        : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
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
                    className={cn(
                      "group flex items-center transition-colors focus:outline-none cursor-pointer text-[12px] font-medium tracking-[0.04em]",
                      logSortBy === "action"
                        ? "text-[#111111] dark:text-white font-semibold"
                        : "text-[#8E8E93] dark:text-zinc-500 hover:text-[#111111] dark:hover:text-white"
                    )}
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
                            className="mt-6 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-6 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                          >
                            Clear
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
          <LogPagination
            logTotal={logTotal}
            logPage={logPage}
            setLogPage={setLogPage}
            itemsPerPage={itemsPerPage}
            logsPerPage={logsPerPage}
            displayCount={displayLogs.length}
            handleItemsPerPageChange={(size) => {
              setItemsPerPage(size)
              setLogsPerPage?.(size)
              setLogPage(1)
            }}
          />
        )}
      </div>
    </div>
  )
}
