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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatPHDateTimeParts } from "@/lib/timeFormat"
import { cn } from "@/lib/utils"

import LogExpandedRow from "./LogExpandedRow"
import LogPagination from "./LogPagination"

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>
  return logSortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  )
}

function getActionIcon(action) {
  const act = String(action || "").toLowerCase()
  if (act.includes("report") || act.includes("generate")) return "ph-duotone ph-file-pdf"
  if (act.includes("login")) return "ph-duotone ph-sign-in"
  if (act.includes("logout")) return "ph-duotone ph-sign-out"
  if (act.includes("create") || act.includes("add")) return "ph-duotone ph-plus-circle"
  if (act.includes("delete") || act.includes("remove")) return "ph-duotone ph-trash"
  if (act.includes("restore")) return "ph-duotone ph-arrow-counter-clockwise"
  if (act.includes("update") || act.includes("edit")) return "ph-duotone ph-pencil-line"
  if (act.includes("upload") || act.includes("ingest")) return "ph-duotone ph-cloud-arrow-up"
  if (act.includes("download") || act.includes("export")) return "ph-duotone ph-download-simple"
  if (act.includes("view") || act.includes("preview")) return "ph-duotone ph-eye"
  if (act.includes("approve")) return "ph-duotone ph-check-circle"
  if (act.includes("reject")) return "ph-duotone ph-x-circle"
  if (act.includes("archive")) return "ph-duotone ph-archive"
  if (act.includes("rotate") || act.includes("password")) return "ph-duotone ph-key"
  if (act.includes("backup")) return "ph-duotone ph-database"
  if (act.includes("security") || act.includes("auth")) return "ph-duotone ph-shield-check"
  return "ph-duotone ph-activity"
}

function getSeverityConfig(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-500/10",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/20 dark:border-red-400/20",
        dot: "bg-red-500",
        icon: "ph-fill ph-warning-circle"
      }
    case "WARNING":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/20 dark:border-amber-400/20",
        dot: "bg-amber-500",
        icon: "ph-fill ph-warning"
      }
    default:
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/20 dark:border-blue-400/20",
        dot: "bg-blue-500",
        icon: "ph-fill ph-info"
      }
  }
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
  const sevConfig = getSeverityConfig(log.severity)
  const uploaded = formatPHDateTimeParts(log.created_at || log.time)

  return (
    <React.Fragment>
      <tr
        className={cn(
          "group border-l-2 border-transparent transition-all duration-200 hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
          isSelected && "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
          isExpanded && "bg-gray-50 dark:bg-white/8"
        )}
        onClick={() => {
          toggleRow(log.id);
        }}
      >
        <td className="p-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRow(log.id);
            }}
            className={cn(
              "mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 transition-all hover:bg-pup-maroon dark:hover:bg-zinc-800 dark:hover:text-primary hover:text-white",
              isExpanded && "bg-pup-maroon dark:bg-zinc-700 text-white dark:text-primary rotate-90 shadow-sm"
            )}
          >
            <i className="ph-bold ph-caret-right text-xs"></i>
          </button>
        </td>
        <td className="p-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-900 dark:text-zinc-50">
              {uploaded.date}
            </span>
            <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-400">
              {uploaded.time}
            </span>
          </div>
        </td>
        <td className="p-4">
          <div className={cn(
            "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black  tracking-wider transition-all",
            sevConfig.bg,
            sevConfig.text,
            sevConfig.border
          )}>
            <i className={cn(sevConfig.icon, "text-[10px]")}></i>
            {log.severity}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-bold text-gray-900 dark:text-zinc-50">
                {log.user}
              </span>
              <span className="text-[9px] font-black tracking-widest text-gray-400 dark:text-zinc-400">
                {log.role}
              </span>
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold tracking-tight text-gray-700 dark:text-zinc-300">
              {log.action}
            </span>
          </div>
        </td>
        <td className="p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="line-clamp-1 max-w-[500px] text-xs font-medium leading-relaxed text-gray-500 dark:text-zinc-400">
                {log.details || "No known description"}
              </p>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-[400px] rounded-xl border-gray-200 bg-white p-3 text-xs font-medium text-gray-700 shadow-2xl backdrop-blur-sm dark:border-white/10 dark:bg-card/95 dark:text-zinc-200"
            >
              {log.details || "No known description"}
            </TooltipContent>
          </Tooltip>
        </td>
        <td className="p-4 text-center">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl border border-transparent transition-all active:scale-95 dark:shadow-none",
              isSelected 
                ? "bg-white text-pup-maroon border-gray-200 dark:bg-zinc-800 dark:text-primary dark:border-white/10 shadow-sm" 
                : "text-gray-400 hover:bg-white hover:text-pup-maroon hover:border-gray-200 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-primary dark:hover:border-white/10"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLog(log);
            }}
          >
            <i className="ph-bold ph-eye text-lg"></i>
          </Button>
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
});

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
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = useCallback((id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value)
    setItemsPerPage(value)
    setLogsPerPage(value)
    setLogPage(1)
  }

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage)
      const maxPage = Math.max(1, Math.ceil(logTotal / itemsPerPage))
      if (!isNaN(val) && val >= 1 && val <= maxPage) {
        setLogPage(val)
      } else {
        setJumpPage(String(logPage))
      }
    }
  }

  if (isLoading && !displayLogs) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="overflow-hidden overflow-x-auto rounded-brand border border-gray-100 bg-white dark:border-white/10 dark:bg-card">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-muted">
              <tr>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <th key={i} className="p-4">
                    <Skeleton className="h-3 w-16 dark:bg-muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <tr key={row}>
                  <td className="p-4"><Skeleton className="h-6 w-6 rounded-full dark:bg-muted" /></td>
                  <td className="p-4"><Skeleton className="h-3 w-24 dark:bg-muted" /></td>
                  <td className="p-4"><Skeleton className="h-6 w-20 rounded-full dark:bg-muted" /></td>
                  <td className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 dark:bg-muted" />
                      <Skeleton className="h-2 w-16 dark:bg-muted" />
                    </div>
                  </td>
                  <td className="p-4"><Skeleton className="h-4 w-28 dark:bg-muted" /></td>
                  <td className="p-4"><Skeleton className="h-3 w-full dark:bg-muted" /></td>
                  <td className="p-4 text-center"><Skeleton className="h-8 w-8 mx-auto rounded-full dark:bg-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Empty className="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 text-center dark:border-white/10 dark:bg-muted/30">
        <EmptyHeader className="flex flex-col items-center gap-2">
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-100 opacity-20"></div>
            <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-white shadow-xl dark:bg-card dark:shadow-none">
              <i className="ph-duotone ph-warning-circle text-4xl text-red-600" />
            </EmptyMedia>
          </div>
          <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
            System Log Error
          </EmptyTitle>
          <EmptyDescription className="max-w-md text-sm font-medium text-gray-500 dark:text-zinc-400">
            {error}
          </EmptyDescription>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full border-gray-200 font-bold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 dark:bg-card"
          >
            <i className="ph-bold ph-arrows-clockwise mr-2 animate-spin"></i>
            Retry Loading
          </Button>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-0">
      <div
        key={`${logPage}-${logSortBy}-${logSortOrder}-${itemsPerPage}`}
        className={cn(
          "overflow-hidden rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-500 animate-fade-up",
          isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}
      >
        <div className="overflow-x-auto rounded-[inherit]">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-gray-50 backdrop-blur-sm select-none dark:bg-muted">
              <tr className="text-left text-[10px] font-black tracking-widest text-gray-600 dark:text-zinc-300">
                <th className="w-[50px] p-4 text-center">
                </th>
                 <th className="w-[180px] p-4">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                  >
                    Timestamp{" "}
                    <SortIndicator
                      column="created_at"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="w-[120px] p-4">
                  <button
                    onClick={() => handleSort("severity")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                  >
                    Severity{" "}
                    <SortIndicator
                      column="severity"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="w-[200px] p-4">
                  <button
                    onClick={() => handleSort("actor")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                  >
                    Actor{" "}
                    <SortIndicator
                      column="actor"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="w-[220px] p-4">
                  <button
                    onClick={() => handleSort("action")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300"
                  >
                    Event / Action{" "}
                    <SortIndicator
                      column="action"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="min-w-[300px] p-4 dark:text-zinc-300">Description</th>
                <th className="w-[80px] p-4 text-center">
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <i className="ph-duotone ph-magnifying-glass text-5xl text-gray-300 dark:text-zinc-600"></i>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-black text-gray-900 dark:text-zinc-50">
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
                            className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-bold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10"
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

        {/* Pagination inside the card container */}
        {logTotal > 0 && (
          <LogPagination
            logTotal={logTotal}
            logPage={logPage}
            setLogPage={setLogPage}
            itemsPerPage={itemsPerPage}
            logsPerPage={logsPerPage}
            handleItemsPerPageChange={handleItemsPerPageChange}
            jumpPage={jumpPage}
            setJumpPage={setJumpPage}
            handleJumpPage={handleJumpPage}
          />
        )}
      </div>
    </div>
  )
}
