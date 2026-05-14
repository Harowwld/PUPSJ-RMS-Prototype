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

  const startItem = (logPage - 1) * itemsPerPage + 1
  const endItem = Math.min(logPage * itemsPerPage, logTotal)

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-brand" />
          ))}
        </div>
        <Skeleton className="h-4 w-full max-w-md rounded-brand" />
        <Skeleton className="h-32 rounded-brand" />
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
        className={`overflow-x-auto rounded-brand ${displayLogs.length === 0 ? "" : "border border-gray-200"}`}
      >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs tracking-wider text-gray-600 uppercase">
              <th className="w-10 p-3 text-center"></th>
              <th className="w-40 p-3 font-bold">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100">
                      Timestamp{" "}
                      <SortIndicator
                        column="created_at"
                        logSortBy={logSortBy}
                        logSortOrder={logSortOrder}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-brand">
                    <DropdownMenuItem onClick={() => handleSort("created_at", "ASC")}>
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("created_at", "DESC")}>
                      Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="w-24 p-3 font-bold">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100">
                      Severity{" "}
                      <SortIndicator
                        column="severity"
                        logSortBy={logSortBy}
                        logSortOrder={logSortOrder}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-brand">
                    <DropdownMenuItem onClick={() => handleSort("severity", "ASC")}>
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("severity", "DESC")}>
                      Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="w-44 p-3 font-bold">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100">
                      User / Actor{" "}
                      <SortIndicator
                        column="actor"
                        logSortBy={logSortBy}
                        logSortOrder={logSortOrder}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-brand">
                    <DropdownMenuItem onClick={() => handleSort("actor", "ASC")}>
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("actor", "DESC")}>
                      Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="w-44 p-3 font-bold">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100">
                      Action{" "}
                      <SortIndicator
                        column="action"
                        logSortBy={logSortBy}
                        logSortOrder={logSortOrder}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-brand">
                    <DropdownMenuItem onClick={() => handleSort("action", "ASC")}>
                      Ascending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort("action", "DESC")}>
                      Descending
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </th>
              <th className="p-3 font-bold">Rich Details</th>
              <th className="w-32 p-3 text-right font-bold">
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center rounded px-1 py-0.5 uppercase transition-colors hover:bg-gray-100">
                        IP Address{" "}
                        <SortIndicator
                          column="ip"
                          logSortBy={logSortBy}
                          logSortOrder={logSortOrder}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-brand">
                      <DropdownMenuItem onClick={() => handleSort("ip", "ASC")}>
                        Ascending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSort("ip", "DESC")}>
                        Descending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </th>
              <th className="w-20 p-3 text-center font-bold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayLogs.length === 0 ? (
              <tr className="border-0 hover:bg-transparent">
                <td colSpan={8} className="border-0 p-0">
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
                          className="mt-4 flex items-center gap-2 rounded-brand border border-gray-300 px-4 text-[10px] font-bold text-gray-600 hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon sm:text-xs shadow-sm transition-colors"
                        >
                          <i className="ph-bold ph-arrow-counter-clockwise"></i>
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
                      <td className="p-3 text-[10px] whitespace-nowrap text-gray-500">
                        {log.time}
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
                            <div className="line-clamp-1 max-w-[400px]">
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
                      <td className="p-3 text-right text-[10px] text-gray-400">
                        {log.ip}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 rounded-full border-gray-200 bg-gray-50 p-0 text-gray-500 hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon active:scale-95 shadow-xs transition-all"
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
                        <td colSpan={8} className="p-0">
                          <div className="animate-in fade-in slide-in-from-top-1 border-t border-gray-100 p-6 duration-200">
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                              {/* Rich Description */}
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                                    <i className="ph-duotone ph-newspaper text-sm"></i>
                                  </div>
                                  <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                                    Rich Description
                                  </h5>
                                </div>
                                <div className="rounded-brand border border-gray-200 bg-white p-3 shadow-xs">
                                  <p className="text-xs leading-relaxed font-medium text-gray-700">
                                    {log.details}
                                  </p>
                                </div>
                              </div>

                              {/* Network & Device */}
                              <div className="flex flex-col gap-3 border-l border-gray-100 pl-6">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                                    <i className="ph-duotone ph-broadcast text-sm"></i>
                                  </div>
                                  <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                                    Network & Device
                                  </h5>
                                </div>
                                <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400">IP ADDRESS:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold text-gray-900">{log.ip}</span>
                                      <Button 
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleCopy(log.ip, "IP Address")}
                                        className="h-6 w-6 rounded-md border-gray-200 bg-gray-50 text-gray-400 hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon shadow-xs transition-all"
                                      >
                                        <i className="ph-bold ph-copy text-[10px]"></i>
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5 border-t border-gray-50 pt-3">
                                    <span className="text-[10px] font-bold text-gray-400">USER AGENT:</span>
                                    <span className="text-[10px] leading-snug font-medium text-gray-600 italic">
                                      {log.userAgent}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Entity Context */}
                              <div className="flex flex-col gap-3 border-l border-gray-100 pl-6">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
                                    <i className="ph-duotone ph-cube text-sm"></i>
                                  </div>
                                  <h5 className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                                    Entity Context
                                  </h5>
                                </div>
                                <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400">TARGET TYPE:</span>
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-600 uppercase">
                                      {log.entityType || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                                    <span className="text-[10px] font-bold text-gray-400">REFERENCE ID:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-[10px] font-bold text-gray-900">{log.entityId || "N/A"}</span>
                                      {log.entityId && (
                                        <Button 
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleCopy(log.entityId, "Reference ID")}
                                          className="h-6 w-6 rounded-md border-gray-200 bg-gray-50 text-gray-400 hover:border-pup-maroon hover:bg-red-50 hover:text-pup-maroon shadow-xs transition-all"
                                        >
                                          <i className="ph-bold ph-copy text-[10px]"></i>
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
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
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
          {logTotal > 0 ? (
            <span>
              {startItem}-{endItem} of{" "}
              <strong className="text-gray-900">
                {logTotal.toLocaleString()}
              </strong>{" "}
              entries
            </span>
          ) : null}

          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase">
              Rows:
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-7 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-1 text-[10px] font-bold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-brand">
                Items per page
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={logPage <= 1}
            onClick={() => setLogPage((p) => p - 1)}
            className="h-8 rounded-brand border-gray-300 px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30 shadow-sm transition-colors"
          >
            <i className="ph-bold ph-caret-left mr-1"></i> PREV
          </Button>
          <div className="flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 shadow-xs focus-within:border-pup-maroon focus-within:ring-1 focus-within:ring-pup-maroon">
            <input
              type="text"
              className="w-8 bg-transparent text-center focus:outline-none"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={handleJumpPage}
              onBlur={handleJumpPage}
            />
            <span className="mx-0.5 text-gray-400">/</span>
            <span>{Math.max(1, Math.ceil(logTotal / logsPerPage))}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={logPage >= Math.ceil(logTotal / logsPerPage)}
            onClick={() => setLogPage((p) => p + 1)}
            className="h-8 rounded-brand border-gray-300 px-3 text-[10px] font-black tracking-widest text-gray-600 uppercase hover:border-pup-maroon hover:bg-red-50/30 hover:text-pup-maroon active:scale-95 disabled:opacity-30 shadow-sm transition-colors"
          >
            NEXT <i className="ph-bold ph-caret-right ml-1"></i>
          </Button>
        </div>
      </div>
    </>
  )
}
