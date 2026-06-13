"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { formatPHDateTimeParts, formatPHDateTime } from "@/lib/timeFormat";
import { isAdminRole } from "@/lib/roleUtils";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { generateAuditLogsPdf } from "@/lib/pdfGenerator";
import { generateExportFilename } from "@/lib/exportHelpers";
import PdfPreviewDialog from "@/components/admin/audit-logs/PdfPreviewDialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";


// 1. ICONS & CONSTANTS
function getActionIcon(action) {
  const act = String(action || "").toLowerCase();
  if (act.includes("report") || act.includes("generate")) return "ph-duotone ph-file-pdf";
  if (act.includes("login")) return "ph-duotone ph-sign-in";
  if (act.includes("logout")) return "ph-duotone ph-sign-out";
  if (act.includes("create") || act.includes("add")) return "ph-duotone ph-plus-circle";
  if (act.includes("delete") || act.includes("remove")) return "ph-duotone ph-trash";
  if (act.includes("restore")) return "ph-duotone ph-arrow-counter-clockwise";
  if (act.includes("update") || act.includes("edit")) return "ph-duotone ph-pencil-line";
  if (act.includes("upload") || act.includes("ingest")) return "ph-duotone ph-cloud-arrow-up";
  if (act.includes("download") || act.includes("export")) return "ph-duotone ph-download-simple";
  if (act.includes("view") || act.includes("preview")) return "ph-duotone ph-eye";
  if (act.includes("approve")) return "ph-duotone ph-check-circle";
  if (act.includes("reject")) return "ph-duotone ph-x-circle";
  if (act.includes("archive")) return "ph-duotone ph-archive";
  if (act.includes("rotate") || act.includes("password")) return "ph-duotone ph-key";
  if (act.includes("backup")) return "ph-duotone ph-database";
  if (act.includes("security") || act.includes("auth")) return "ph-duotone ph-shield-check";
  return "ph-duotone ph-activity";
}

function getSeverityConfig(sev) {
  switch (String(sev || "").toUpperCase()) {
    case "CRITICAL":
      return {
        bg: "bg-red-500/10",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-500/20 dark:border-red-400/20",
        dot: "bg-red-500",
        icon: "ph-fill ph-warning-circle",
      };
    case "WARNING":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-500/20 dark:border-amber-400/20",
        dot: "bg-amber-500",
        icon: "ph-fill ph-warning",
      };
    default:
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-500/20 dark:border-blue-400/20",
        dot: "bg-blue-500",
        icon: "ph-fill ph-info",
      };
  }
}

// 2. CHILD COMPONENTS
function StatCards({ isLoading, stats }) {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-muted" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: "Total Events",
      value: stats.totalLogs || 0,
      sublabel: "Cumulative personal logs",
      colorClass: "from-blue-500 to-blue-700 dark:from-blue-800 dark:to-blue-950",
      iconClass: "ph-database",
    },
    {
      label: "Activity Today",
      value: stats.logsToday || 0,
      sublabel: "Events recorded today",
      colorClass: "from-emerald-500 to-emerald-700 dark:from-emerald-800 dark:to-emerald-950",
      iconClass: "ph-calendar-check",
    },
    {
      label: "Auth Attempts",
      value: stats.authEvents || 0,
      sublabel: "Logins & access events",
      colorClass: "from-amber-500 to-amber-700 dark:from-amber-700 dark:to-amber-950",
      iconClass: "ph-fingerprint",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 transition-all duration-500">
      {cards.map((stat, i) => (
        <div
          key={i}
          className={cn(
            "group relative overflow-hidden rounded-xl border-none p-5 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md bg-linear-to-br",
            stat.colorClass
          )}
        >
          <i className={cn("ph-duotone pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[280px] text-white opacity-[0.07]", stat.iconClass)} />
          <div className="relative z-10">
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                  <i className={cn("ph-bold", stat.iconClass)} /> {stat.label}
                </div>
                <div className="text-[48px] font-semibold text-white tracking-tight">
                  {stat.value.toLocaleString()}
                </div>
                <div className="mt-1 text-[13px] font-normal text-white">
                  {stat.sublabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LogFilters({
  localSearch,
  handleSearchChange,
  logSeverityFilter,
  handleSeverityChange,
  logStartDate,
  setLogStartDate,
  logEndDate,
  setLogEndDate,
  setLogPage,
  logTotal,
  isLoading,
}) {
  const handleQuickRange = (range) => {
    const end = new Date();
    let start = new Date();

    switch (range) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday":
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "last7":
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "last30":
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
    }

    setLogStartDate(format(start, "yyyy-MM-dd"));
    setLogEndDate(format(end, "yyyy-MM-dd"));
    setLogPage(1);
  };

  return (
    <div className={cn(
      "bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10 transition-all duration-500",
      isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
    )}>
      <div className="flex w-full flex-wrap items-end gap-5">
        {/* Search */}
        <div className="min-w-[320px] flex-[1.5]">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500"></label>
            <span className="text-[9px] font-semibold text-pup-maroon dark:text-primary/50">
              {logTotal > 0 ? `${logTotal.toLocaleString()} MATCHES` : "NO RESULTS"}
            </span>
          </div>
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500"></i>
            </div>
            <Input
              type="text"
              placeholder="Search by action, details, or IP..."
              className="h-11 w-full rounded-brand border border-gray-200 bg-white pl-10.5 text-sm font-medium transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300"
              value={localSearch}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Date Range Picker Section */}
        <div className="min-w-[400px] flex-[2]">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
              Time Period
            </label>
            <div className="flex items-center gap-2">
              {["today", "yesterday", "last7", "last30"].map((range) => (
                <button
                  key={range}
                  onClick={() => handleQuickRange(range)}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[9px] font-semibold text-gray-500 transition-all hover:bg-pup-maroon hover:text-white dark:text-zinc-400 dark:bg-muted cursor-pointer"
                >
                  {range.replace("last", "Last ")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                      !logStartDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {logStartDate ? format(new Date(logStartDate), "MMM d, yyyy") : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={logStartDate ? new Date(logStartDate) : undefined}
                    onSelect={(date) => {
                      setLogStartDate(date ? format(date, "yyyy-MM-dd") : "");
                      setLogPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center text-gray-300 dark:text-zinc-650">
               <i className="ph-bold ph-arrow-right"></i>
            </div>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start rounded-brand border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-xs font-semibold shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card",
                      !logEndDate && "text-gray-400 dark:text-zinc-500"
                    )}
                  >
                    <i className="ph-bold ph-calendar-blank mr-2 text-base text-gray-400 dark:text-zinc-500"></i>
                    {logEndDate ? format(new Date(logEndDate), "MMM d, yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-2xl p-0 shadow-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={logEndDate ? new Date(logEndDate) : undefined}
                    onSelect={(date) => {
                      setLogEndDate(date ? format(date, "yyyy-MM-dd") : "");
                      setLogPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Severity filter */}
        <div className="w-36">
          <label className="mb-1.5 block text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
            Severity
          </label>
          <Select
            value={logSeverityFilter}
            onChange={handleSeverityChange}
          >
            <option value="All">All</option>
            <option value="INFO">Information</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>
      </div>
    </div>
  );
}

function LogExpandedRow({ log, handleCopy }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 border-t border-gray-100 p-8 duration-500 dark:border-white/10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Rich Description */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pup-maroon/10 text-pup-maroon dark:text-primary shadow-sm ring-1 ring-pup-maroon/20 dark:bg-red-500/10 dark:ring-red-500/20 dark:shadow-none">
              <i className="ph-duotone ph-newspaper-clipping text-lg"></i>
            </div>
            <h5 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
              Rich Description
            </h5>
          </div>
          <div className="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-card dark:shadow-none">
            <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
              {log.details || "No known description"}
            </p>
          </div>
        </div>

        {/* Network & Device */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20 dark:shadow-none">
              <i className="ph-duotone ph-broadcast text-lg"></i>
            </div>
            <h5 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
              Network & Device
            </h5>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-card dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">IP ADDRESS:</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg dark:text-blue-400 dark:bg-blue-900/30">{log.ip}</span>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:bg-card dark:hover:border-zinc-800 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-500"
                >
                  <i className="ph-bold ph-copy text-xs"></i>
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-gray-50 pt-4 dark:border-white/10">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">USER AGENT:</span>
              <span className="text-[10px] font-semibold text-gray-500 italic bg-gray-50 p-3 rounded-xl border border-gray-100 dark:text-zinc-400 dark:bg-zinc-800/50 dark:border-white/5">
                {log.userAgent || log.user_agent}
              </span>
            </div>
          </div>
        </div>

        {/* Entity Context */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20 dark:shadow-none">
              <i className="ph-duotone ph-cube text-lg"></i>
            </div>
            <h5 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
              Entity Context
            </h5>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-card dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">TARGET TYPE:</span>
              <span className="rounded-xl bg-emerald-50 border border-emerald-100/30 px-3 py-1 text-[10px] font-semibold text-emerald-700 shadow-xs dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/10">
                {log.entityType || log.entity_type || "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-50 pt-4 dark:border-white/10">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">REFERENCE ID:</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{log.entityId || log.entity_id || "N/A"}</span>
                {(log.entityId || log.entity_id) && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(log.entityId || log.entity_id, "Reference ID")}
                    className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:bg-card dark:hover:border-zinc-800 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-500"
                  >
                    <i className="ph-bold ph-copy text-xs"></i>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const LogRow = ({ log, isSelected, isExpanded, toggleRow, setSelectedLog, handleCopy }) => {
  const sevConfig = getSeverityConfig(log.severity);
  const uploaded = formatPHDateTimeParts(log.created_at || log.time);

  return (
    <>
      <tr
        className={cn(
          "group border-l-2 border-transparent transition-all duration-200 hover:bg-gray-50 dark:bg-card dark:hover:bg-white/5 select-none cursor-pointer",
          isSelected && "border-amber-400 bg-amber-50 dark:bg-amber-950/40",
          isExpanded && "bg-gray-50 dark:bg-white/8"
        )}
        onClick={() => toggleRow(log.id)}
      >
        <td className="p-4 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleRow(log.id);
            }}
            className={cn(
              "mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-500 transition-all hover:bg-pup-maroon dark:hover:bg-zinc-800 dark:hover:text-primary hover:text-white cursor-pointer",
              isExpanded && "bg-pup-maroon dark:bg-zinc-700 text-white dark:text-primary rotate-90 shadow-sm"
            )}
          >
            <i className="ph-bold ph-caret-right text-xs"></i>
          </button>
        </td>
        <td className="p-4">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50">
              {uploaded.date}
            </span>
            <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-400">
              {uploaded.time}
            </span>
          </div>
        </td>
        <td className="p-4">
          <div className={cn(
            "flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold tracking-wider transition-all",
            sevConfig.bg,
            sevConfig.text,
            sevConfig.border
          )}>
            <i className={cn(sevConfig.icon, "text-[10px]")}></i>
            {log.severity}
          </div>
        </td>
        <td className="p-4">
          <span className="text-xs font-semibold tracking-tight text-gray-700 dark:text-zinc-300">
            {log.action}
          </span>
        </td>
        <td className="p-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="line-clamp-1 max-w-[500px] text-xs font-medium text-gray-500 dark:text-zinc-400">
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
          <td colSpan={6} className="p-0">
            <LogExpandedRow log={log} handleCopy={handleCopy} />
          </td>
        </tr>
      )}
    </>
  );
};

function SortIndicator({ column, logSortBy, logSortOrder }) {
  if (logSortBy !== column)
    return <i className="ph-bold ph-caret-up-down ml-1 text-[11px] opacity-40 transition-opacity group-hover:opacity-70 dark:opacity-30 dark:group-hover:opacity-60"></i>;
  return logSortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[11px] text-pup-maroon animate-in fade-in zoom-in duration-300 dark:text-primary"></i>
  );
}

function LogTable({
  isLoading,
  error,
  displayLogs,
  selectedLog,
  setSelectedLog,
  logTotal,
  logPage,
  setLogPage,
  itemsPerPage,
  setItemsPerPage,
  jumpPage,
  setJumpPage,
  handleSort,
  logSortBy,
  logSortOrder,
  localSearch,
  logSeverityFilter,
  logStartDate,
  logEndDate,
  setLocalSearch,
  setLogSearch,
  setLogSeverityFilter,
  setLogStartDate,
  setLogEndDate,
  handleCopy,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleItemsPerPageChange = (e) => {
    const value = Number(e.target.value);
    setItemsPerPage(value);
    setLogPage(1);
  };

  const handleJumpPage = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      const val = parseInt(jumpPage);
      const maxPage = Math.max(1, Math.ceil(logTotal / itemsPerPage));
      if (!isNaN(val) && val >= 1 && val <= maxPage) {
        setLogPage(val);
      } else {
        setJumpPage(String(logPage));
      }
    }
  };

  if (isLoading && !displayLogs.length) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="overflow-hidden overflow-x-auto rounded-brand border border-gray-100 bg-white dark:border-white/10 dark:bg-card">
          <table className="min-w-full">
            <thead className="bg-transparent dark:bg-transparent">
              <tr>
                {[1, 2, 3, 4, 5, 6].map((i) => (
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
                  <td className="p-4"><Skeleton className="h-4 w-40 dark:bg-muted" /></td>
                  <td className="p-4"><Skeleton className="h-3 w-full dark:bg-muted" /></td>
                  <td className="p-4 text-center"><Skeleton className="h-8 w-8 mx-auto rounded-full dark:bg-muted" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 text-center dark:border-white/10 dark:bg-muted/30">
        <EmptyHeader className="flex flex-col items-center gap-2">
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-ping rounded-full bg-red-100 opacity-20"></div>
            <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-white shadow-xl dark:bg-card dark:shadow-none">
              <i className="ph-duotone ph-warning-circle text-xl text-red-600" />
            </EmptyMedia>
          </div>
          <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
            Activity Log Error
          </EmptyTitle>
          <EmptyDescription className="max-w-md text-sm font-medium text-gray-500 dark:text-zinc-400">
            {error}
          </EmptyDescription>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full border-gray-200 font-semibold hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/10 dark:bg-card"
          >
            <i className="ph-bold ph-arrows-clockwise mr-2 animate-spin"></i>
            Retry Loading
          </Button>
        </EmptyHeader>
      </Empty>
    );
  }

  const startItem = (logPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(logPage * itemsPerPage, logTotal);
  const totalPages = Math.max(1, Math.ceil(logTotal / itemsPerPage));

  return (
    <div className="space-y-0">
      <div
        className={cn(
          "overflow-hidden rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-500 animate-fade-up",
          isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}
      >
        <div className="overflow-x-auto rounded-[inherit]">
          <table className="min-w-full table-fixed text-sm">
            <thead className="bg-gray-50 backdrop-blur-sm select-none dark:bg-muted">
              <tr className="text-left text-[11px] font-semibold tracking-wider text-gray-800 dark:text-zinc-250">
                <th className="w-[50px] p-4 text-center"></th>
                <th className="w-[180px] p-4">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300 cursor-pointer"
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
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300 cursor-pointer"
                  >
                    Severity{" "}
                    <SortIndicator
                      column="severity"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="w-[250px] p-4">
                  <button
                    onClick={() => handleSort("action")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none dark:text-zinc-300 cursor-pointer"
                  >
                    Event / Action{" "}
                    <SortIndicator
                      column="action"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="min-w-[300px] p-4 dark:text-zinc-200">Description</th>
                <th className="w-[80px] p-4 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {displayLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <Empty className="flex h-[450px] flex-col items-center justify-center border-0 bg-transparent text-center">
                      <EmptyHeader className="flex flex-col items-center gap-0">
                        <div className="relative mb-6">
                          <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card"></div>
                          <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                            <i className="ph-bold ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-650"></i>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          No Activity Found
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                          Try adjusting your search filters to find what you&apos;re looking for.
                        </EmptyDescription>
                        {(localSearch !== "" ||
                          logSeverityFilter !== "All" ||
                          logStartDate !== "" ||
                          logEndDate !== "") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setLocalSearch("");
                              setLogSearch("");
                              setLogSeverityFilter("All");
                              setLogStartDate("");
                              setLogEndDate("");
                              setLogPage(1);
                            }}
                            className="mt-6 flex h-10 items-center gap-3 rounded-brand border border-gray-300 bg-white px-6 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 tracking-wide dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10 cursor-pointer"
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
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logTotal > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-6 px-8 rounded-b-brand dark:border-white/10 dark:bg-card">
            <div className="flex items-center gap-8 select-none cursor-default">
              <div className="flex items-center gap-6 text-[11px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">
                <span>
                  SHOWING <strong className="text-gray-900 dark:text-zinc-50">{endItem - startItem + 1}</strong> OUT OF <strong className="text-gray-900 dark:text-zinc-50">{logTotal.toLocaleString()}</strong> ENTRIES
                </span>

                <div className="flex items-center gap-3 border-l border-gray-200 pl-6 dark:border-white/10">
                  <span className="text-[10px] opacity-60">ROWS:</span>
                  <Select
                    className="h-8 w-16 cursor-pointer rounded-brand border border-gray-300 bg-white px-2 text-[10px] font-semibold text-gray-700 focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-200 dark:hover:bg-white/10 dark:border-white/10"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 select-none">
              <Button
                variant="outline"
                size="sm"
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => p - 1)}
                className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-semibold tracking-widest text-gray-600 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10 cursor-pointer"
              >
                <i className="ph-bold ph-caret-left mr-2 text-base"></i>Prev
              </Button>
              
              <div className="flex h-9 min-w-[48px] cursor-default items-center justify-center rounded-brand border border-gray-200 bg-white px-3 text-[11px] font-semibold text-gray-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none">
                {logPage}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={logPage >= totalPages}
                onClick={() => setLogPage((p) => p + 1)}
                className="h-10 rounded-brand border border-gray-300 bg-white px-5 text-[10px] font-semibold tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-30 dark:bg-card dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-700 dark:border-white/10 cursor-pointer"
              >
                Next<i className="ph-bold ph-caret-right ml-2 text-base"></i>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogDetailSheet({ selectedLog, setSelectedLog, handleCopy }) {
  return (
    <Sheet
      open={!!selectedLog}
      onOpenChange={(open) => !open && setSelectedLog(null)}
    >
      <SheetContent className="font-inter flex w-full flex-col border-l border-gray-200 bg-gray-50 p-0 sm:max-w-md dark:border-white/10 dark:bg-card">
        <SheetHeader className="shrink-0 border-b border-gray-100 bg-gray-50 p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon dark:text-primary shadow-sm dark:border-white/10 dark:bg-card dark:text-primary dark:shadow-none">
              <i className="ph-bold ph-file-text text-xl animate-in zoom-in duration-300"></i>
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                Log Entry
              </SheetTitle>
              <SheetDescription className="mt-1.5 text-left text-sm font-medium text-gray-500 dark:text-zinc-400">
                System Event ID:{" "}
                <span className="font-mono font-semibold text-gray-700 dark:text-zinc-200">
                  {selectedLog?.id}
                </span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6 pb-24">
            {/* Header Info */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
                  Timestamp
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-50">
                  {formatPHDateTime(selectedLog.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
                  Severity
                </p>
                <Badge
                  className={cn(
                    "rounded-sm border-0 px-2 py-0.5 text-[10px] font-semibold",
                    getSeverityConfig(selectedLog.severity).bg,
                    getSeverityConfig(selectedLog.severity).text
                  )}
                >
                  {selectedLog.severity}
                </Badge>
              </div>
            </div>

            {/* Actor Section (Cohesive personal info) */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-user-focus text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
                  Actor Information
                </h4>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-muted">
                  <i className="ph-bold ph-user text-lg text-gray-500 dark:text-zinc-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-zinc-50">{selectedLog.actor || selectedLog.user}</p>
                  <p className="mt-0.5 text-[10px] font-semibold tracking-wider text-pup-maroon dark:text-primary">
                    {selectedLog.role}
                  </p>
                </div>
              </div>
            </Card>

            {/* Event Details */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-newspaper text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
                  Event Details
                </h4>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                    Action Performed
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tracking-tight",
                      getSeverityConfig(selectedLog.severity).text
                    )}
                  >
                    {selectedLog.action}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-3 dark:border-white/10">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                      Description
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(selectedLog.details || "No known description", "Event description")}
                          className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          <i className="ph-bold ph-copy text-xs"></i>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="rounded-brand font-semibold text-[10px] tracking-wider">
                        Copy Description
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-zinc-200">
                    {selectedLog.details || "No known description"}
                  </p>
                </div>

                {(selectedLog.entity_type || selectedLog.entityType || selectedLog.entity_id || selectedLog.entityId) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-white/10">
                    <div>
                      <p className="mb-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                        Target Type
                      </p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 dark:bg-muted">
                        {selectedLog.entityType || selectedLog.entity_type || "N/A"}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                          Reference ID
                        </p>
                        {(selectedLog.entityId || selectedLog.entity_id) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(selectedLog.entityId || selectedLog.entity_id, "Reference ID")}
                                className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300 cursor-pointer"
                              >
                                <i className="ph-bold ph-copy text-xs"></i>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="rounded-brand font-semibold text-[10px] tracking-wider">
                              Copy Entity ID
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <p className="font-mono text-[11px] font-semibold text-gray-900 dark:text-zinc-50">
                        {selectedLog.entityId || selectedLog.entity_id || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Network Data */}
            <Card className="overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-gray-100 bg-transparent px-4 py-3 dark:border-white/10 dark:bg-transparent">
                <i className="ph-bold ph-broadcast text-pup-maroon dark:text-primary"></i>
                <h4 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
                  Network Data
                </h4>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                      <i className="ph-bold ph-globe"></i> IP Address
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(selectedLog.ip, "IP address")}
                          className="h-7 w-7 rounded-lg border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:border-white/10 dark:bg-card dark:hover:border-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          <i className="ph-bold ph-copy text-xs"></i>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="rounded-brand font-semibold text-[10px] tracking-wider">
                        Copy IP Address
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="inline-block rounded border border-gray-100 bg-gray-50 p-2 font-mono text-xs font-semibold text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50">
                    {selectedLog.ip}
                  </p>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-300">
                    <i className="ph-bold ph-desktop"></i> Device &amp; Browser
                  </p>
                  <p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] font-medium text-gray-600 dark:border-white/10 dark:bg-card dark:text-zinc-300">
                    {selectedLog.userAgent || selectedLog.user_agent}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// 3. MAIN WORKSPACE PAGE
export default function AccountActivityPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("DESC");

  // Data State
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfBlobUrl, setPdfPreviewUrl] = useState(null);
  const [previewFrameReady, setPreviewFrameReady] = useState(false);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [jumpPage, setJumpPage] = useState("1");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    localStorage.setItem("pup-logout", Date.now());
    router.push("/");
  };

  // 1. Fetch user session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          if (res.status === 401) {
            router.push("/");
          }
          return;
        }
        setAuthUser(json.data);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [router]);

  // 2. Fetch logs matching filters
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * perPage;
      const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : "";
      const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : "";
      const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : "";
      const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      
      const res = await fetch(
        `/api/audit-logs?mine=1&limit=${perPage}&offset=${offset}&search=${encodeURIComponent(search)}${sevQuery}${startQuery}${endQuery}${sortQuery}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load activity");
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total) || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, severityFilter, startDate, endDate, sortBy, sortOrder]);

  // 3. Fetch statistics
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs/stats?mine=1");
      const json = await res.json();
      if (res.ok && json?.ok) {
        setStats(json.data);
      }
    } catch { /* ignore */ }
  }, []);

  // Sync state & debounced search
  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, search]);

  useEffect(() => {
    if (loadingUser || !authUser) return;
    refresh();
    refreshStats();
  }, [loadingUser, authUser, refresh, refreshStats]);

  // Search Similar handler (called from expanded row/detail sheet actions)
  const handleSearchSimilar = (term) => {
    setLocalSearch(term);
    setSearch(term);
    setPage(1);
  };

  const handleSearchChange = (e) => setLocalSearch(e.target.value);
  const handleSeverityChange = (e) => {
    setSeverityFilter(e.target.value);
    setPage(1);
  };

  // Sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(column);
      setSortOrder("ASC");
    }
    setPage(1);
  };

  // PDF & CSV Exporting
  const fetchAllForExport = async () => {
    const sevQuery = severityFilter !== "All" ? `&severity=${encodeURIComponent(severityFilter)}` : "";
    const startQuery = startDate ? `&startDate=${encodeURIComponent(startDate)}` : "";
    const endQuery = endDate ? `&endDate=${encodeURIComponent(endDate)}` : "";
    const res = await fetch(
      `/api/audit-logs?mine=1&limit=50000&search=${encodeURIComponent(search)}${sevQuery}${startQuery}${endQuery}&sortBy=${sortBy}&sortOrder=${sortOrder}`
    );
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || "Export failed");
    return Array.isArray(json.data) ? json.data : [];
  };

  const handleDownloadCSV = async () => {
    if (total === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const headers = ["Date & Time", "Severity", "Actor", "Role", "Action", "Details", "IP Address", "User Agent", "Entity Type", "Entity ID"];
      const exportRows = allLogs.map((log) => [
        formatPHDateTime(log.created_at),
        log.severity || "INFO",
        log.actor,
        log.role,
        log.action,
        log.details || "No known description",
        log.ip || "—",
        log.user_agent || "—",
        log.entity_type || "—",
        log.entity_id || "—",
      ]);
      const csvContent = [
        headers.join(","),
        ...exportRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const fileName = generateExportFilename("MY-ACTIVITY", "DATA", "csv");
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export Success", { description: "Your activity logs have been exported to CSV." });
    } catch (err) {
      toast.error("Export Failed", { description: err.message || "Unable to export activity logs." });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (total === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const blob = await generateAuditLogsPdf(allLogs, {
        role: "My Account",
        severity: severityFilter,
        search: search,
      });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setPdfPreviewOpen(true);
    } catch (err) {
      toast.error("Preview Failed", { description: err.message || "Unable to generate PDF preview." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadFromPreview = () => {
    if (!pdfBlobUrl) return;
    try {
      const fileName = generateExportFilename("MY-ACTIVITY", "REPORT", "pdf");
      const link = document.createElement("a");
      link.href = pdfBlobUrl;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download Success", { description: "Activity report has been downloaded." });
    } catch (err) {
      toast.error("Download Failed", { description: "Unable to download the PDF report." });
    }
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", { description: `${label} has been successfully copied.` });
  };

  const hasActiveFilters = localSearch !== "" || severityFilter !== "All" || startDate !== "" || endDate !== "";

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50 animate-in fade-in duration-700 dark:bg-background">
        <div className="h-16 bg-white border-b border-gray-200 dark:bg-card dark:border-white/10" />
        <main className="max-w-[1200px] mx-auto p-8 space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="w-64 h-8 dark:bg-muted" />
            <Skeleton className="w-96 h-4 dark:bg-muted" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
             <Skeleton className="h-32 rounded-2xl dark:bg-muted" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-2xl dark:bg-muted" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto py-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <TooltipProvider delayDuration={200}>
          <PageHeader
            icon="ph-clock-counter-clockwise"
            title="My Activity"
            description="Review a complete audit history of actions performed by your account."
            showBorder={false}
            actions={
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handlePreviewPDF}
                    disabled={total === 0 || isExporting}
                    className="flex h-11 px-5 items-center justify-center gap-2 btn-brand-red text-[11px] font-semibold text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none cursor-pointer"
                  >
                    <i className={cn("ph-bold text-base", isExporting ? "ph-circle-notch animate-spin" : "ph-file-pdf")} aria-hidden />
                    {isExporting ? "Generating..." : "Generate Report"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadCSV}
                    disabled={total === 0 || isExporting}
                    className="flex h-9 px-4 items-center justify-center gap-1.5 rounded-brand border border-gray-300 bg-transparent text-[10px] font-semibold text-gray-600 transition-colors hover:border-pup-maroon hover:bg-red-50/50 hover:text-pup-maroon dark:hover:text-red-500 active:scale-95 disabled:opacity-50 dark:bg-transparent dark:text-zinc-300 dark:border-white/10 cursor-pointer"
                  >
                    <i className={cn("ph-bold text-sm", isExporting ? "ph-circle-notch animate-spin" : "ph-file-csv")} aria-hidden />
                    {isExporting ? "Preparing..." : "Export"}
                  </Button>
                </div>

                <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                      router.push(path);
                    }}
                    className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0! cursor-pointer"
                  >
                    <i className="ph-bold ph-arrow-left"></i>
                    Dashboard
                  </Button>
                </div>
              </div>
            }
          />

          <Separator className="mt-8 bg-gray-200 dark:bg-zinc-800" />

          {/* Stats Bar */}
          <div className="mt-8">
            <StatCards isLoading={loading && !stats} stats={stats} />
          </div>

          {/* Table & Filter Card wrapper */}
          <Card className="mt-8 flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
            {/* Active filters row */}
            {hasActiveFilters && (
              <div className={cn(
                "flex-none border-b border-gray-100 bg-white px-4 py-3 transition-all duration-500 animate-in fade-in slide-in-from-top-1 dark:border-white/10 dark:bg-card",
                loading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
              )}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">Active filters:</span>
                  {localSearch && (
                    <div className="flex items-center gap-1 rounded-full border border-gray-300 bg-pup-maroon/10 px-2.5 py-1 text-[10px] font-semibold text-pup-maroon dark:text-primary dark:border-white/10 dark:text-primary">
                      Search: {localSearch}
                      <button
                        onClick={() => { setLocalSearch(""); setSearch(""); setPage(1); }}
                        className="ml-1 hover:text-pup-darkMaroon transition-colors cursor-pointer"
                      >
                        <i className="ph-bold ph-x text-[8px]"></i>
                      </button>
                    </div>
                  )}
                  {severityFilter !== "All" && (
                    <div className="flex items-center gap-1 rounded-full border border-amber-100/30 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                      Severity: {severityFilter}
                      <button
                        onClick={() => { setSeverityFilter("All"); setPage(1); }}
                        className="ml-1 hover:text-amber-800 transition-colors cursor-pointer"
                      >
                        <i className="ph-bold ph-x text-[8px]"></i>
                      </button>
                    </div>
                  )}
                  {(startDate || endDate) && (
                    <div className="flex items-center gap-1 rounded-full border border-emerald-100/30 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                      Range: {startDate || "..."} to {endDate || "..."}
                      <button
                        onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                        className="ml-1 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        <i className="ph-bold ph-x text-[8px]"></i>
                      </button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLocalSearch("");
                      setSearch("");
                      setSeverityFilter("All");
                      setStartDate("");
                      setEndDate("");
                      setPage(1);
                    }}
                    className="h-6 rounded-full border-2 border-dashed border-gray-300 px-3 text-[10px] font-semibold text-pup-maroon dark:text-primary transition-colors hover:border-pup-darkMaroon hover:bg-red-50 hover:text-pup-maroon dark:border-white/10 dark:text-primary dark:bg-red-950/30 cursor-pointer"
                  >
                    CLEAR ALL FILTERS
                  </Button>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <LogFilters
              localSearch={localSearch}
              handleSearchChange={handleSearchChange}
              logSeverityFilter={severityFilter}
              handleSeverityChange={handleSeverityChange}
              logStartDate={startDate}
              setLogStartDate={setStartDate}
              logEndDate={endDate}
              setLogEndDate={setEndDate}
              setLogPage={setPage}
              logTotal={total}
              isLoading={loading}
            />
          </Card>

          {/* Table */}
          <div className="mt-6">
            <LogTable
              isLoading={loading}
              error={null}
              displayLogs={rows}
              selectedLog={selectedLog}
              setSelectedLog={setSelectedLog}
              logTotal={total}
              logPage={page}
              setLogPage={setPage}
              itemsPerPage={perPage}
              setItemsPerPage={setPerPage}
              jumpPage={jumpPage}
              setJumpPage={setJumpPage}
              handleSort={handleSort}
              logSortBy={sortBy}
              logSortOrder={sortOrder}
              localSearch={localSearch}
              logSeverityFilter={severityFilter}
              logStartDate={startDate}
              logEndDate={endDate}
              setLocalSearch={setLocalSearch}
              setLogSearch={setSearch}
              setLogSeverityFilter={setSeverityFilter}
              setLogStartDate={setStartDate}
              setLogEndDate={setEndDate}
              handleCopy={handleCopy}
            />
          </div>

          {/* Log Detail Sheet */}
          <LogDetailSheet
            selectedLog={selectedLog}
            setSelectedLog={setSelectedLog}
            handleCopy={handleCopy}
          />

          {/* PDF Preview Dialog */}
          <PdfPreviewDialog
            pdfPreviewOpen={pdfPreviewOpen}
            setPdfPreviewOpen={setPdfPreviewOpen}
            pdfBlobUrl={pdfBlobUrl}
            setPdfPreviewUrl={setPdfPreviewUrl}
            previewFrameReady={previewFrameReady}
            setPreviewFrameReady={setPreviewFrameReady}
            handleDownloadFromPreview={handleDownloadFromPreview}
            isFullscreenPreview={isFullscreenPreview}
            setIsFullscreenPreview={setIsFullscreenPreview}
          />
        </TooltipProvider>
      </main>
    </div>
  );
}
