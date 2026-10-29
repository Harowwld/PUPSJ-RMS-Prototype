"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import React, { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import TableScrollControls from "@/components/shared/TableScrollControls"
import useTableScroll from "@/hooks/useTableScroll"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatTitleCase } from "@/lib/utils"
import AuditActorAvatar from "@/components/shared/AuditActorAvatar"

import LogExpandedRow from "./LogExpandedRow"
import LogPagination from "./LogPagination"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column) {
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
  }
  return logSortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
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
  if (s === "INFO") {
    return {
      label: "Info",
      classes: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
    };
  }
  return {
    label: sev ? (sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase()) : "Info",
    classes: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
  };
}
function formatActionLabel(actionStr) {
  if (!actionStr) return "N/A";
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
  isScrolledX,
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
    } catch {
      return log.created_at || log.time;
    }
  })();

  return (
    <React.Fragment>
      <tr
        className={cn(
          "group transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none cursor-pointer",
          isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
          isExpanded && "bg-gray-50 dark:bg-white/8"
        )}
        onClick={() => {
          toggleRow(log.id);
        }}
      >
        <td
          className={cn(
            "p-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 transition-colors",
            isSelected
              ? "bg-blue-50 dark:bg-blue-950"
              : isExpanded
                ? "bg-gray-50 dark:bg-zinc-800"
                : "bg-white group-hover:bg-gray-50/70 dark:bg-card dark:group-hover:bg-zinc-800/40",
            isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => toggleRow(log.id)}
            title={isExpanded ? "Collapse Details" : "Expand Details"}
            className="mx-auto flex h-7 w-7 rounded-lg items-center justify-center bg-transparent border-none text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer active:scale-95 transition-colors"
          >
            <HugeIcon className={cn("ph-bold text-[14px]", isExpanded ? "ph-minus" : "ph-plus")}></HugeIcon>
          </button>
        </td>
        <td className="p-4 align-middle whitespace-nowrap text-xs font-medium text-gray-500 dark:text-zinc-400">
          {formattedTimestamp}
        </td>
        <td className="p-4 align-middle whitespace-nowrap">
          <span
            className={cn(
              "inline-flex w-fit items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide shadow-none transition-all",
              severityInfo.classes
            )}
          >
            {severityInfo.label}
          </span>
        </td>
        <td className="p-4 align-middle overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <AuditActorAvatar
              log={log}
              className="size-8 border border-border"
              fallbackClassName="text-[10px] font-semibold"
            />
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-zinc-100" title={formatTitleCase(log.user || log.actor)}>
                {formatTitleCase(log.user || log.actor)}
              </span>
              <span className="truncate text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5" title={log.role}>
                {log.role}
              </span>
            </div>
          </div>
        </td>
        <td className="p-4 align-middle whitespace-nowrap text-[13px] font-medium text-gray-900 dark:text-zinc-100">
          {formatActionLabel(log.action)}
        </td>
        <td className="p-4 align-middle overflow-hidden max-w-[280px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block truncate max-w-[260px] text-xs font-normal text-gray-500 dark:text-zinc-400">
                {log.details || "No known description"}
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[400px] rounded-xl border-border bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-border dark:bg-card/95 dark:text-zinc-200"
            >
              {log.details || "No known description"}
            </TooltipContent>
          </Tooltip>
        </td>
        <td className="p-4 pr-6 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSelectedLog(log)}
                  aria-label="View Details"
                  className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                >
                  <HugeIcon  className="ph-bold ph-eye text-[16px]"></HugeIcon>
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
}) {
  const [expandedRows, setExpandedRows] = useState({})

  const {
    containerRef: tableContainerRef,
    isScrolledX,
    scrollLeft,
    scrollRight,
    resetScroll,
  } = useTableScroll([displayLogs.length])

  useEffect(() => {
    resetScroll()
  }, [logPage, logSortBy, logSortOrder, logRoleFilter, logSeverityFilter, localSearch, resetScroll])

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
        "flex flex-1 min-h-[320px] flex-col items-center justify-center p-6 text-center text-gray-900 dark:text-zinc-300",
        embedded
          ? "border-t border-border dark:border-border rounded-b-2xl"
          : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}>
        <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
          <EmptyHeader className="flex flex-col items-center gap-0">
            <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
              <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
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

  return (
    <div className={cn("flex flex-[1_0_auto] flex-col", !embedded && "gap-6")}>
      <div className={cn(
        "flex flex-[1_0_auto] flex-col isolate",
        embedded
          ? "border-t border-border dark:border-border rounded-b-2xl"
          : "rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}>
        {displayLogs.length === 0 ? (
          <div className="py-16 rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full">
            <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center">
              <EmptyHeader className="flex flex-col items-center gap-0">
                <div className="relative mb-6">
                  <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                  <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-white shadow-xl dark:border-border dark:bg-card dark:shadow-none">
                    <HugeIcon className="ph-duotone ph-magnifying-glass text-3xl text-gray-400 dark:text-zinc-500"></HugeIcon>
                  </EmptyMedia>
                </div>
                <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                  No Activity Found
                </EmptyTitle>
                <EmptyDescription className="max-w-xs text-sm font-medium text-gray-900 dark:text-zinc-300 mt-1">
                  Try adjusting your search filters to find what you&apos;re looking for.
                </EmptyDescription>
              </EmptyHeader>
              {(localSearch !== "" ||
                logRoleFilter !== "All" ||
                logSeverityFilter !== "All" ||
                logStartDate !== "" ||
                logEndDate !== "") && (
                <EmptyContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLocalSearch("")
                      setLogSearch("")
                      setLogRoleFilter("All")
                      setLogSeverityFilter("All")
                      setLogStartDate("")
                      setLogEndDate("")
                      setLogPage(1)
                    }}
                    title="Reset Filters"
                    className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <div className="w-full flex-[1_0_auto] flex flex-col">
            <div className="flex items-center justify-between gap-4 px-6 py-2.5 bg-gray-50/40 dark:bg-zinc-900/30 border-b border-border dark:border-border">
              <span className="text-[11px] font-mono text-gray-400 dark:text-zinc-500">
                Showing {displayLogs.length.toLocaleString()} of {logTotal.toLocaleString()} {logTotal === 1 ? "event" : "events"}
              </span>
              <TableScrollControls
                onScrollLeft={scrollLeft}
                onScrollRight={scrollRight}
                onResetScroll={resetScroll}
                isScrolled={isScrolledX}
              />
            </div>

            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 motion-safe:animate-in motion-safe:fade-in-50 duration-200 ease-out select-none"
            >
              <table className="w-full text-sm border-separate border-spacing-0 min-w-[1240px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400">
                    <th className={cn(
                      "w-12 p-4 text-center border-r border-border/80 dark:border-border sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                      isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                    )}>
                      {isScrolledX && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={resetScroll}
                              aria-label="Reset scroll to start"
                              className="p-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                            >
                              <HugeIcon className="ph-bold ph-arrow-line-left text-xs" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Reset scroll to start</TooltipContent>
                        </Tooltip>
                      )}
                    </th>
                    <th className="p-4 w-[16%]">
                      <button
                        onClick={() => handleSort("created_at")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          logSortBy === "created_at"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                    <th className="p-4 w-[10%]">
                      <button
                        onClick={() => handleSort("severity")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          logSortBy === "severity"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                    <th className="p-4 w-[20%]">
                      <button
                        onClick={() => handleSort("actor")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          logSortBy === "actor"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                    <th className="p-4 w-[18%]">
                      <button
                        onClick={() => handleSort("action")}
                        className={cn(
                          "group flex items-center transition-colors focus:outline-none cursor-pointer text-xs font-semibold",
                          logSortBy === "action"
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
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
                    <th className="p-4 w-[24%] max-w-[280px] text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Description
                    </th>
                    <th className="p-4 pr-6 w-20 text-right text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border dark:divide-border">
                  {displayLogs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      isSelected={selectedLog?.id === log.id}
                      isExpanded={!!expandedRows[log.id]}
                      toggleRow={toggleRow}
                      setSelectedLog={setSelectedLog}
                      handleCopy={handleCopy}
                      isScrolledX={isScrolledX}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
