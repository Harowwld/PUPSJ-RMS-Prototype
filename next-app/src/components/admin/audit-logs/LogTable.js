"use client"

import React, { useState } from "react"
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

import LogExpandedRow from "./LogExpandedRow"
import LogPagination from "./LogPagination"

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 opacity-30"></i>
  return logSortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-pup-maroon"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-pup-maroon"></i>
  )
}

function getSeverityColor(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200"
    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200"
    default:
      return "bg-blue-100 text-blue-700 border-blue-200"
  }
}

function getSeverityTextColor(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return "text-red-600"
    case "WARNING":
      return "text-amber-600"
    default:
      return "text-blue-600"
  }
}

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

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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

  if (isLoading && displayLogs.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="overflow-x-auto rounded-brand border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50/50">
              <tr>
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <th key={i} className="p-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td className="p-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-5 w-16 rounded-sm" />
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2 w-12" />
                    </div>
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-3 w-full" />
                  </td>
                  <td className="p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </td>
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
      <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500">
        <EmptyHeader className="flex flex-col items-center gap-0">
          <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
            <i className="ph-duotone ph-warning-circle text-3xl text-pup-maroon" />
          </EmptyMedia>
          <EmptyTitle className="text-lg font-bold text-gray-900">
            Could not load report
          </EmptyTitle>
          <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
            {error}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div
        className={`overflow-x-auto rounded-brand select-none transition-opacity duration-200 ${displayLogs.length === 0 ? "" : "border border-gray-200"} ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
              <th className="w-10 p-3 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-500 transition-colors hover:bg-pup-maroon/10 hover:text-pup-maroon">
                      <i className="ph-bold ph-info text-[10px]"></i>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="rounded-brand max-w-[200px] text-[10px] font-bold leading-tight uppercase tracking-tight">
                    Double-click any row to quickly expand details.
                  </TooltipContent>
                </Tooltip>
              </th>
              <th className="w-40 p-3 font-bold">
                <button
                  onClick={() => handleSort("created_at")}
                  className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  Timestamp{" "}
                  <SortIndicator
                    column="created_at"
                    logSortBy={logSortBy}
                    logSortOrder={logSortOrder}
                  />
                </button>
              </th>
              <th className="w-24 p-3 font-bold">
                <button
                  onClick={() => handleSort("severity")}
                  className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  Severity{" "}
                  <SortIndicator
                    column="severity"
                    logSortBy={logSortBy}
                    logSortOrder={logSortOrder}
                  />
                </button>
              </th>
              <th className="w-44 p-3 font-bold">
                <button
                  onClick={() => handleSort("actor")}
                  className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  User / Actor{" "}
                  <SortIndicator
                    column="actor"
                    logSortBy={logSortBy}
                    logSortOrder={logSortOrder}
                  />
                </button>
              </th>
              <th className="w-44 p-3 font-bold">
                <button
                  onClick={() => handleSort("action")}
                  className="group flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100 focus:outline-none"
                >
                  Action{" "}
                  <SortIndicator
                    column="action"
                    logSortBy={logSortBy}
                    logSortOrder={logSortOrder}
                  />
                </button>
              </th>
              <th className="p-3 font-bold">Rich Details</th>
              <th className="w-20 p-3 text-center font-bold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayLogs.length === 0 ? (
              <tr className="border-0 hover:bg-transparent">
                <td colSpan={7} className="border-0 p-0">
                  <Empty className="flex h-[400px] flex-col items-center justify-center border-0 text-center text-gray-500">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                        <i className="ph-duotone ph-list-magnifying-glass text-3xl text-pup-maroon"></i>
                      </EmptyMedia>
                      <EmptyTitle className="text-lg font-bold text-gray-900">
                        No audit logs yet
                      </EmptyTitle>
                      <EmptyDescription className="mt-1 max-w-md text-sm font-medium text-gray-600">
                        We couldn&apos;t find any audit logs matching your search
                        criteria.
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
                          className="mt-4 flex items-center gap-2 rounded-brand border border-gray-300 px-4 text-[10px] font-bold text-gray-600 hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon sm:text-xs shadow-sm transition-colors"
                        >
                          <i className="ph-bold ph-x-circle"></i>
                          CLEAR ALL FILTERS
                        </Button>
                      )}
                    </EmptyHeader>
                  </Empty>
                </td>
              </tr>
            ) : (
              displayLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id
                const isExpanded = !!expandedRows[log.id]
                const isCritical = String(log.severity || "").toUpperCase() === "CRITICAL"
                const uploaded = formatPHDateTimeParts(log.created_at || log.time)

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className={cn(
                        "group cursor-default transition-colors hover:bg-gray-50",
                        isSelected && "bg-red-50/20",
                        isCritical && !isSelected && "bg-red-50/50",
                        isExpanded && "bg-gray-50/80"
                      )}
                      onDoubleClick={() => toggleRow(log.id)}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleRow(log.id)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600",
                            isExpanded && "rotate-90 text-pup-maroon"
                          )}
                        >
                          <i className="ph-bold ph-caret-right text-xs"></i>
                        </button>
                      </td>
                      <td className="p-3 text-[10px] whitespace-nowrap text-gray-500 font-medium">
                        {uploaded.date}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`rounded-sm border-0 px-1.5 py-0.5 text-[9px] font-black ${getSeverityColor(log.severity)}`}
                        >
                          {log.severity}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold whitespace-nowrap text-gray-900">
                            {log.user}
                          </span>
                          <span className="text-[9px] font-black tracking-tighter text-gray-400 uppercase">
                            {log.role}
                          </span>
                        </div>
                      </td>
                      <td
                        className={`p-3 text-xs font-bold tracking-tighter uppercase ${getSeverityTextColor(log.severity)}`}
                      >
                        {log.action}
                      </td>
                      <td className="p-3 text-xs leading-relaxed font-medium text-gray-600">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="line-clamp-1 max-w-[600px]">
                              {log.details}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[450px] rounded-brand text-xs leading-normal"
                          >
                            {log.details}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-full border-gray-300 bg-gray-50 p-0 text-gray-500 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon active:scale-95 shadow-xs transition-all"
                                onClick={() => setSelectedLog(log)}
                              >
                                <i className="ph-bold ph-eye text-base"></i>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="rounded-brand font-bold text-[10px] uppercase tracking-wider">
                              View Log Details
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-0 bg-gray-50/50">
                        <td colSpan={7} className="p-0">
                          <LogExpandedRow log={log} handleCopy={handleCopy} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
    </>
  )
}
