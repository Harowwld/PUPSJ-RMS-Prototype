"use client"
import DataGroupHeader from "@/components/shared/DataGroupHeader";
import { SUPERADMIN_BADGE_BASE as BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";

import { Table, TableRow } from "@/components/ui/table";


import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatTitleCase, formatLogDetails } from "@/lib/utils"
import AuditActorAvatar from "@/components/shared/AuditActorAvatar"
import NarrativeText from "@/components/shared/NarrativeText"

import LogExpandedRow from "./LogExpandedRow"
import LogPagination from "./LogPagination"
import { DEFAULT_VISIBLE_COLUMNS } from "./LogFilters"
import AuditLogsTableSkeleton from "@/components/systemadmin/skeletons/AuditLogsTableSkeleton"
import { AlertCircleIcon as EmptyAlertCircleIcon, Search01Icon as EmptySearch01Icon , ArrowDown01Icon, ArrowUp01Icon, ArrowUpDownIcon, ViewIcon} from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column) {
    return <ArrowUpDownIcon size="1em" className="ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  }
  return logSortOrder === "ASC" ? (
    <ArrowUp01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  ) : (
    <ArrowDown01Icon size="1em" className="ml-1 text-[12px] text-gray-400" />
  )
}

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: BADGE_PALETTES.rose,
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: BADGE_PALETTES.amber,
    };
  }
  return {
    label: "Info",
    classes: BADGE_PALETTES.emerald,
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
  showColumn,
  visibleColumnCount,
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
      <TableRow
        selected={Boolean(isSelected)}
        className={cn(
          "group transition-colors hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 select-none cursor-pointer",
          isSelected && "bg-blue-50/60 dark:bg-blue-950/20",
          isExpanded && "bg-gray-50 dark:bg-white/8"
        )}
        onClick={() => {
          toggleRow(log.id);
        }}
        onDoubleClick={(e) => {
          if (e.target.closest("button, input, a")) return;
          setSelectedLog(log);
        }}
      >
        <td
          className={cn(
            "w-12 min-w-12 max-w-12 px-2.5 py-4 align-middle text-center border-r border-border/70 dark:border-border/70 sticky left-0 z-10 transition-colors",
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
            <AppIcon className={cn("text-[14px]", isExpanded ? "MinusSignIcon" : "Add01Icon")} />
          </button>
        </td>

        {/* Timestamp */}
        {showColumn("created_at") && (
          <td className="p-4 align-middle text-xs font-normal text-gray-600 dark:text-zinc-300 tabular-nums whitespace-nowrap border-r border-border/70 dark:border-border/70">
            {formattedTimestamp}
          </td>
        )}

        {/* Level */}
        {showColumn("severity") && (
          <td className="p-4 align-middle whitespace-nowrap border-r border-border/70 dark:border-border/70">
            <span
              className={cn("w-fit select-none", BADGE_BASE, severityInfo.classes)}
            >
              {severityInfo.label}
            </span>
          </td>
        )}

        {/* Actor */}
        {showColumn("actor") && (
          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <AuditActorAvatar
                log={log}
                className="size-8 border-0"
                fallbackClassName="text-[10px] font-semibold"
              />
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="truncate text-[13px] font-semibold text-gray-900 dark:text-zinc-100" title={formatTitleCase(log.actor_display_name || log.user || log.actor)}>
                  {formatTitleCase(log.actor_display_name || log.user || log.actor)}
                </span>
                <span className="truncate text-[11px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5" title={log.role}>
                  {log.role}
                </span>
              </div>
            </div>
          </td>
        )}

        {/* Action */}
        {showColumn("action") && (
          <td className="p-4 align-middle text-[13px] font-medium text-gray-900 dark:text-zinc-100 border-r border-border/70 dark:border-border/70">
            <span className="block w-full min-w-0 truncate" title={formatActionLabel(log.action)}>
              {formatActionLabel(log.action)}
            </span>
          </td>
        )}

        {/* Description */}
        {showColumn("details") && (
          <td className="p-4 align-middle overflow-hidden border-r border-border/70 dark:border-border/70">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full min-w-0 truncate text-xs font-normal text-gray-700 dark:text-zinc-300" title={formatLogDetails(log.details) || "N/A"}>
                  <NarrativeText text={log.details} mode="compact" />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[440px] rounded-xl border-border bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-border dark:bg-card/95 dark:text-zinc-200"
              >
                <NarrativeText text={log.details} mode="full" />
              </TooltipContent>
            </Tooltip>
          </td>
        )}

        {/* IP Address */}
        {showColumn("ip") && (
          <td className="p-4 align-middle whitespace-nowrap text-xs font-normal text-gray-700 dark:text-zinc-300 tabular-nums border-r border-border/70 dark:border-border/70">
            {log.ip || "N/A"}
          </td>
        )}

        {/* Actions */}
        <td className="w-12 px-2 align-middle text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  aria-label="View Details"
                  className="table-action-button rounded-lg active:scale-95 cursor-pointer"
                >
                  <ViewIcon size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>View Details</TooltipContent>
            </Tooltip>
          </div>
        </td>
      </TableRow>
      {isExpanded && (
        <TableRow expanded className="border-0 bg-gray-50 dark:bg-muted/30">
          <td colSpan={visibleColumnCount} className="p-0">
            <LogExpandedRow log={log} handleCopy={handleCopy} />
          </td>
        </TableRow>
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
  hasActiveFilters,
  handleCopy,
  embedded = false,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  groupBy = "none",
  tableContainerRef,
  isScrolledX = false,
  onClearFilters,
}) {
  const [expandedRows, setExpandedRows] = useState({})

  const showColumn = useCallback((key) => {
    return !visibleColumns || visibleColumns.includes(key);
  }, [visibleColumns]);

  const visibleColumnCount =
    1 + // expand
    (showColumn("created_at") ? 1 : 0) +
    (showColumn("severity") ? 1 : 0) +
    (showColumn("actor") ? 1 : 0) +
    (showColumn("action") ? 1 : 0) +
    (showColumn("details") ? 1 : 0) +
    (showColumn("ip") ? 1 : 0) +
    1; // actions

  const tableColumns = [
    { kind: "selection" },
    ...(showColumn("created_at") ? [{ kind: "date", width: 205 }] : []),
    ...(showColumn("severity") ? [{ kind: "status", maxWidth: 120 }] : []),
    ...(showColumn("actor") ? [{ kind: "text", maxWidth: 240 }] : []),
    ...(showColumn("action") ? [{ kind: "text", maxWidth: 300 }] : []),
    ...(showColumn("details") ? [{ kind: "text", maxWidth: 300 }] : []),
    ...(showColumn("ip") ? [{ kind: "text", maxWidth: 200 }] : []),
    { kind: "actions" },
  ];

  const toggleRow = useCallback((id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }, [])

  const allExpanded = displayLogs.length > 0 && displayLogs.every((l) => Boolean(expandedRows[l.id]))

  const toggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedRows({})
    } else {
      const next = {}
      for (const log of displayLogs) {
        next[log.id] = true
      }
      setExpandedRows(next)
    }
  }, [allExpanded, displayLogs])

  const groupedLogs = React.useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "all", label: "", logs: displayLogs }]
    }
    const map = new Map()
    for (const log of displayLogs) {
      let label = ""
      if (groupBy === "role") {
        label = log.role || "Unspecified Role"
      } else if (groupBy === "severity") {
        label = (log.severity || "INFO").toUpperCase()
      }
      if (!map.has(label)) map.set(label, [])
      map.get(label).push(log)
    }
    return [...map.entries()].map(([label, logs]) => ({ key: label, label, logs }))
  }, [groupBy, displayLogs])

  if (isLoading && (!displayLogs || displayLogs.length === 0)) {
    return <AuditLogsTableSkeleton rowCount={8} embedded={embedded} showScope={false} visibleColumns={visibleColumns} />
  }

  if (error) {
    return (
      <div className={cn(
        "flex flex-1 min-h-[320px] flex-col items-center justify-center p-6 text-center text-gray-900 dark:text-zinc-300",
        embedded
          ? "border-t border-border dark:border-border rounded-b-2xl"
          : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card"
      )}>
        <EmptyState
          icon={EmptyAlertCircleIcon}
          title="Load failed"
          description={error}
        />
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
          <div className="rounded-b-2xl flex-1 flex flex-col items-center justify-center min-h-[420px] w-full p-6">
            <EmptyState
              icon={EmptySearch01Icon}
              title="No Activity Found"
              description="Try adjusting your search filters to find what you're looking for."
            >
              {hasActiveFilters && onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear Filters
                </Button>
              )}
            </EmptyState>
          </div>
        ) : (
          <div className="w-full flex-[1_0_auto] flex flex-col">
            <div
              ref={tableContainerRef}
              className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2 select-none"
            >
              <Table columns={tableColumns} className="min-w-[900px]">
                <thead className="sticky top-0 z-10 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs select-none">
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 select-none">
                    <th className={cn(
                      "w-12 min-w-12 max-w-12 px-2.5 py-4 text-center sticky left-0 z-20 bg-gray-50/90 dark:bg-zinc-900/90 backdrop-blur-xs transition-shadow duration-200",
                      isScrolledX && "shadow-[4px_0_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_12px_-2px_rgba(0,0,0,0.4)]"
                    )}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={toggleExpandAll}
                            disabled={displayLogs.length === 0}
                            aria-label={allExpanded ? "Collapse all rows" : "Expand all rows"}
                            className="mx-auto flex h-7 w-7 rounded-lg items-center justify-center bg-transparent border-none text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer active:scale-95 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <AppIcon className={cn("text-[14px]", allExpanded ? "MinusSignIcon" : "Add01Icon")} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {allExpanded ? "Collapse all rows" : "Expand all rows"}
                        </TooltipContent>
                      </Tooltip>
                    </th>

                    {/* Timestamp */}
                    {showColumn("created_at") && (
                      <th className="p-4 w-[14%]" aria-sort={logSortBy === "created_at" ? (logSortOrder === "ASC" ? "ascending" : "descending") : undefined}>
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
                    )}

                    {/* Level */}
                    {showColumn("severity") && (
                      <th className="p-4 w-[9%]" aria-sort={logSortBy === "severity" ? (logSortOrder === "ASC" ? "ascending" : "descending") : undefined}>
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
                    )}

                    {/* Actor */}
                    {showColumn("actor") && (
                      <th className="p-4 w-[14%]" aria-sort={logSortBy === "actor" ? (logSortOrder === "ASC" ? "ascending" : "descending") : undefined}>
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
                    )}

                    {/* Action */}
                    {showColumn("action") && (
                      <th className="p-4 w-[16%]" aria-sort={logSortBy === "action" ? (logSortOrder === "ASC" ? "ascending" : "descending") : undefined}>
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
                    )}

                    {/* Description */}
                    {showColumn("details") && (
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        Description
                      </th>
                    )}

                    {/* IP Address */}
                    {showColumn("ip") && (
                      <th className="p-4 text-xs font-semibold text-gray-500 dark:text-zinc-400">
                        IP Address
                      </th>
                    )}

                    <th className="w-12 px-2 text-center text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border dark:divide-border bg-white dark:bg-card">
                  {groupedLogs.map((group) => (
                    <React.Fragment key={group.key}>
                      {groupBy !== "none" && (
                        <DataGroupHeader label={group.label} count={group.logs.length} colSpan={visibleColumnCount} />
                      )}
                      {group.logs.map((log) => (
                        <LogRow
                          key={log.id}
                          log={log}
                          isSelected={selectedLog?.id === log.id}
                          isExpanded={!!expandedRows[log.id]}
                          toggleRow={toggleRow}
                          setSelectedLog={setSelectedLog}
                          handleCopy={handleCopy}
                          isScrolledX={isScrolledX}
                          showColumn={showColumn}
                          visibleColumnCount={visibleColumnCount}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </Table>
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
