"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
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
import LogDetailSheet from "@/components/admin/audit-logs/LogDetailSheet";
import {
  FadeIn,
  SlideUp,
  StaggerContainer,
  StaggerItem,
  PageTransition,
} from "@/components/ui/motion";
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
      bgClass: "from-[#14C8FF] via-[#007AFF] to-[#0055FF] dark:from-[#007AFF] dark:to-[#0033aa]",
      shape1: "from-[#0055FF]/40 to-[#007AFF]/0",
      shape2: "from-[#14C8FF]/30 to-[#007AFF]/0",
      iconClass: "ph-database",
    },
    {
      label: "Activity Today",
      value: stats.logsToday || 0,
      sublabel: "Events recorded today",
      bgClass: "from-[#34d399] via-[#059669] to-[#047857] dark:from-[#059669] dark:to-[#024e37]",
      shape1: "from-[#047857]/40 to-[#059669]/0",
      shape2: "from-[#34d399]/30 to-[#059669]/0",
      iconClass: "ph-calendar-check",
    },
    {
      label: "Auth Attempts",
      value: stats.authEvents || 0,
      sublabel: "Logins & access events",
      bgClass: "from-[#fbbf24] via-[#d97706] to-[#b45309] dark:from-[#d97706] dark:to-[#78350f]",
      shape1: "from-[#b45309]/40 to-[#d97706]/0",
      shape2: "from-[#fbbf24]/30 to-[#d97706]/0",
      iconClass: "ph-fingerprint",
    },
  ];

  return (
    <StaggerContainer className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((stat, i) => (
        <StaggerItem
          key={i}
          className={cn(
            "group relative overflow-hidden rounded-xl border-none p-5 transition-all duration-fast ease-standard hover:-translate-y-0.5 bg-gradient-to-br",
            stat.bgClass,
            i === 0 ? "glass-stat-card-blue" :
            i === 1 ? "glass-stat-card-green" :
            i === 2 ? "glass-stat-card-orange" : ""
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
            <div className={cn("absolute bottom-0 left-0 w-[70%] h-[80%] bg-gradient-to-tr pointer-events-none transition-all duration-slow ease-standard group-hover:scale-110", stat.shape1)} style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 0%)' }} />
            <div className={cn("absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr pointer-events-none transition-all duration-slow ease-standard group-hover:scale-110", stat.shape2)} style={{ clipPath: 'polygon(0% 100%, 100% 100%, 0% 25%)' }} />
          </div>
          <div className="relative z-10">
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-[14px] font-medium text-white">
                  {stat.label}
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
        </StaggerItem>
      ))}
    </StaggerContainer>
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

  const activeShortcut = (() => {
    if (!logStartDate || !logEndDate) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    
    // Check Today
    if (logStartDate === todayStr && logEndDate === todayStr) return "today";
    
    // Check Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, "yyyy-MM-dd");
    if (logStartDate === yesterdayStr && logEndDate === yesterdayStr) return "yesterday";
    
    // Check 7 days
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);
    const last7Str = format(last7, "yyyy-MM-dd");
    if (logStartDate === last7Str && logEndDate === todayStr) return "last7";
    
    // Check 30 days
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const last30Str = format(last30, "yyyy-MM-dd");
    if (logStartDate === last30Str && logEndDate === todayStr) return "last30";
    
    return null;
  })();

  return (
    <div className={cn(
      "bg-white border-t border-gray-100 p-4 backdrop-blur-md dark:bg-card/50 dark:border-white/10 transition-all duration-slow",
      isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
    )}>
      <div className="flex w-full flex-wrap items-center gap-5">
        {/* Search */}
        <div className="flex-[2] min-w-[280px] group relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <i className="ph-bold ph-magnifying-glass text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 text-sm"></i>
          </div>
          <Input
            type="text"
            placeholder="Search by action, details, or IP..."
            className="h-[36px] w-full rounded-[8px] border-[0.5px] border-gray-200 bg-white pl-9 pr-20 text-[13px] font-normal transition-all focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 placeholder:text-gray-400 dark:border-white/10 dark:bg-card dark:text-zinc-300 dark:focus:border-primary"
            value={localSearch}
            onChange={handleSearchChange}
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-[12px] font-normal text-gray-400 dark:text-zinc-500">
            {logTotal > 0 ? `${logTotal.toLocaleString()} results` : "0 results"}
          </div>
        </div>

        {/* Severity Select */}
        <div className="min-w-[130px] flex-1">
          <Select
            value={logSeverityFilter}
            onChange={handleSeverityChange}
            className="h-[36px] rounded-[8px] border-[0.5px] border-gray-200 text-[13px] font-normal"
          >
            <option value="All">Severity</option>
            <option value="INFO">Information</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>

        {/* Time Period shortcuts */}
        <div className="flex items-center gap-[12px] h-[36px] flex-none">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "last7", label: "7 days" },
            { key: "last30", label: "30 days" },
          ].map((range) => {
            const isActive = activeShortcut === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => handleQuickRange(range.key)}
                className={cn(
                  "text-[12px] font-normal transition-all bg-transparent border-0 cursor-pointer shadow-none focus:outline-none focus:ring-0 pb-1",
                  isActive 
                    ? "text-pup-maroon dark:text-red-500 border-b-[2px] border-pup-maroon dark:border-red-500 font-medium" 
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-2 flex-none">
          <div className="w-[120px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                    !logStartDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logStartDate ? format(new Date(logStartDate), "MMM d, yyyy") : "Start Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
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
          <div className="text-[12px] text-gray-400 dark:text-zinc-500 shrink-0">
            →
          </div>
          <div className="w-[120px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-[36px] w-full justify-start rounded-[8px] border-[0.5px] border-gray-200 dark:border-white/10 bg-white dark:bg-card text-left text-[13px] font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-white/10",
                    !logEndDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {logEndDate ? format(new Date(logEndDate), "MMM d, yyyy") : "End Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
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
    </div>
  );
}

function LogExpandedRow({ log, handleCopy }) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 border-t border-gray-100 p-8 duration-slow dark:border-white/10">
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
    label: "Info",
    classes: "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400"
  };
}

const LogRow = ({ log, isSelected, isExpanded, toggleRow, setSelectedLog, handleCopy }) => {
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
    <>
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
            className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-transform duration-fast"
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
        <td className="py-0 px-4 align-middle text-[13px] font-medium text-[#111111] dark:text-zinc-50">
          {log.action === "Rotate Password" ? "Password Rotated" : log.action}
        </td>
        <td className="py-0 px-4 align-middle">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[500px] truncate text-[13px] font-normal text-[#8E8E93]">
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
            <button
              onClick={() => setSelectedLog(log)}
              className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#E5484D] dark:hover:text-red-400 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
            >
              <i className="ti ti-eye text-[16px]"></i>
            </button>
          </div>
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
  if (logSortBy !== column) {
    return <i className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
  }
  return logSortOrder === "ASC" ? (
    <i className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></i>
  ) : (
    <i className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></i>
  )
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
        <div className="overflow-visible rounded-brand border border-gray-100 bg-white dark:border-white/10 dark:bg-card">
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
          "overflow-visible rounded-brand border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-slow animate-fade-up",
          isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
        )}
      >
        <div className="overflow-visible rounded-[inherit]">
          <table className="min-w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:bg-card dark:border-white/10 select-none">
              <tr className="text-left text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">
                <th className="w-[50px] p-4 text-center"></th>
                <th className="w-[180px] p-4">
                  <button
                    onClick={() => handleSort("created_at")}
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em] cursor-pointer"
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
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em] cursor-pointer"
                  >
                    Level{" "}
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
                    className="group flex items-center transition-colors hover:text-pup-maroon dark:hover:text-red-500 focus:outline-none text-[12px] font-medium tracking-[0.04em] cursor-pointer"
                  >
                    Event / Action{" "}
                    <SortIndicator
                      column="action"
                      logSortBy={logSortBy}
                      logSortOrder={logSortOrder}
                    />
                  </button>
                </th>
                <th className="min-w-[300px] p-4 text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Description</th>
                <th className="w-[80px] p-4 text-center text-[12px] font-medium tracking-[0.04em] text-gray-400 dark:text-zinc-500">Action</th>
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
              <div className="flex items-center gap-6 text-[12px] font-normal text-gray-400 dark:text-zinc-500">
                <span>
                  Showing {endItem - startItem + 1} of {logTotal}
                </span>

                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                  <span className="text-[12px] text-gray-400 dark:text-zinc-500">Rows:</span>
                  <div className="flex items-center gap-1">
                    {[10, 20, 50, 100].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleItemsPerPageChange({ target: { value: size } })}
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

            <div className="flex shrink-0 items-center gap-3 select-none">
              <button
                disabled={logPage <= 1}
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                className="h-8 bg-transparent text-[12px] font-normal text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
              >
                Prev
              </button>

              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-[6px] border border-gray-200/80 bg-white px-2.5 text-[12px] font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                {logPage}
              </div>

              <button
                disabled={logPage >= totalPages}
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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

  useEffect(() => {
    if (!authUser) return;
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    if (isAdminRole(authUser.role)) {
      link.href = '/admin-logo.png';
    } else {
      link.href = '/staff-logo.png';
    }
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [authUser]);

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

  const handleNextLog = () => {
    if (!selectedLog) return;
    const currentIndex = rows.findIndex((log) => log.id === selectedLog.id);
    if (currentIndex < rows.length - 1) {
      setSelectedLog(rows[currentIndex + 1]);
    }
  };

  const handlePrevLog = () => {
    if (!selectedLog) return;
    const currentIndex = rows.findIndex((log) => log.id === selectedLog.id);
    if (currentIndex > 0) {
      setSelectedLog(rows[currentIndex - 1]);
    }
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
    if (total === 0 || isGeneratingPdf || isExporting) return;
    setIsGeneratingPdf(true);
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
      setIsGeneratingPdf(false);
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
      <div className="min-h-screen bg-gray-50 dark:bg-background">
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
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <PageTransition className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="max-w-[1400px] mx-auto py-10 px-6">
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
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadCSV}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="h-10 w-[68px] justify-center font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center rounded-brand shadow-none! border-0! cursor-pointer"
                  >
                    {isExporting ? (
                      <i className="ph-bold ph-spinner animate-spin text-[16px]"></i>
                    ) : (
                      "Export"
                    )}
                  </Button>
                  <LiquidGlassButton
                    type="button"
                    onClick={handlePreviewPDF}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    height={36}
                    radius={18}
                    glassColor="rgba(10, 132, 255, 0.15)"
                    className="w-[142px] text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all dark:shadow-none cursor-pointer"
                  >
                    {isGeneratingPdf ? (
                      <i className="ph-bold ph-spinner animate-spin text-[16px] flex items-center justify-center"></i>
                    ) : (
                      "Get Report"
                    )}
                  </LiquidGlassButton>
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
            {/* Active Filter Chips Row */}
            {hasActiveFilters && (() => {
              const formatChipDate = (dateStr) => {
                if (!dateStr) return "..."
                try {
                  return format(new Date(dateStr), "MMM d, yyyy")
                } catch (e) {
                  return dateStr
                }
              }
              return (
                <div className={cn(
                  "flex-none border-b border-gray-100 bg-white px-6 py-3 transition-all duration-slow animate-in fade-in slide-in-from-top-1 dark:border-white/10 dark:bg-card",
                  loading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
                )}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-500">Active filters:</span>
                    {localSearch && (
                      <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Search: {localSearch}
                        <button
                          onClick={() => { setLocalSearch(""); setSearch(""); setPage(1); }}
                          className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {severityFilter !== "All" && (
                      <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        Severity: {severityFilter}
                        <button
                          onClick={() => { setSeverityFilter("All"); setPage(1); }}
                          className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    {(startDate || endDate) && (
                      <div className="flex items-center gap-[6px] rounded-[6px] bg-gray-100 dark:bg-zinc-800 px-[10px] py-[4px] text-[12px] font-normal text-gray-900 dark:text-zinc-50">
                        {formatChipDate(startDate)} – {formatChipDate(endDate)}
                        <button
                          onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                          className="text-[12px] text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors cursor-pointer border-0 bg-transparent p-0 leading-none"
                        >
                          ×
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
                      className="h-auto text-[12px] font-medium text-gray-400 dark:text-zinc-500 border-0 bg-transparent hover:bg-transparent shadow-none p-0 hover:text-red-600 dark:hover:text-red-500 transition-colors cursor-pointer"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )
            })()}

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
            onSearchSimilar={handleSearchSimilar}
            onNext={handleNextLog}
            onPrev={handlePrevLog}
            hasNext={rows.length > 0 && selectedLog && rows.findIndex(l => l.id === selectedLog.id) < rows.length - 1}
            hasPrev={rows.length > 0 && selectedLog && rows.findIndex(l => l.id === selectedLog.id) > 0}
            hideActor={true}
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
        </div>
        </PageTransition>
        </div>
        );
        }
