"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

import Header from "@/components/layout/Header";
import { getClientSession } from "@/lib/clientAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MultiCriteriaFilter from "@/components/shared/MultiCriteriaFilter";
import ActiveFilterChips from "@/components/shared/ActiveFilterChips";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getRoleBranding } from "@/lib/roleBranding";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { generateAuditLogsPdf } from "@/lib/pdfGenerator";
import { generateExportFilename } from "@/lib/exportHelpers";
import PdfPreviewDialog from "@/components/admin/audit-logs/PdfPreviewDialog";
import LogDetailSheet from "@/components/admin/audit-logs/LogDetailSheet";
import LogPagination from "@/components/admin/audit-logs/LogPagination";
import { PageTransition } from "@/components/ui/motion";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

// 1. CHILD COMPONENTS
function StatCards({ isLoading, stats }) {
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpiOrder, setKpiOrder] = useState(["total", "today", "auth"]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!selectedKpi) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedKpi(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [selectedKpi]);

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
      key: "total",
      label: "Total Events",
      value: stats.totalLogs || 0,
      sublabel: "Cumulative personal logs",
      color: "blue",
      iconClass: "ph-database",
    },
    {
      key: "today",
      label: "Activity Today",
      value: stats.logsToday || 0,
      sublabel: "Events recorded today",
      color: "emerald",
      iconClass: "ph-calendar-check",
    },
    {
      key: "auth",
      label: "Auth Attempts",
      value: stats.authEvents || 0,
      sublabel: "Logins & access events",
      color: "amber",
      iconClass: "ph-fingerprint",
    },
  ];

  const getSubColor = (color) => {
    switch (color) {
      case "blue": return "text-blue-600 dark:text-blue-400";
      case "emerald": return "text-emerald-600 dark:text-emerald-400";
      case "amber": return "text-amber-600 dark:text-amber-400";
      default: return "text-gray-500";
    }
  };

  const getRingColor = (color) => {
    switch (color) {
      case "blue": return "border-blue-500/40 dark:border-blue-500/40 ring-1 ring-blue-500/20";
      case "emerald": return "border-emerald-500/40 dark:border-emerald-500/40 ring-1 ring-emerald-500/20";
      case "amber": return "border-amber-500/40 dark:border-amber-500/40 ring-1 ring-amber-500/20";
      default: return "";
    }
  };

  return (
    <div ref={containerRef}>
      <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 items-start relative z-20 transition-all duration-500">
      {kpiOrder.map((kpiKey) => {
        const stat = cards.find(s => s.key === kpiKey);
        if(!stat) return null;
        return (
        <Reorder.Item as="div" value={stat.key}
          key={stat.key}
          className={cn(
            "relative group rounded-xl",
            selectedKpi === stat.key ? "z-30" : "z-10"
          )}
        >
          <div 
            onClick={() => setSelectedKpi(selectedKpi === stat.key ? null : stat.key)}
            className={cn(
              "relative overflow-hidden rounded-[18px] border cursor-pointer select-none transition-all shadow-none outline outline-1 outline-gray-200/80 dark:outline-white/10 flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900",
              selectedKpi === stat.key
                ? getRingColor(stat.color)
                : "border-gray-100 dark:border-white/5"
            )}
          >
            <div className="flex justify-between items-start p-4 pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                  {stat.label}
                </span>
              </div>
              <div className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0", stat.color === "blue" ? "bg-[#3b82f6]" : stat.color === "emerald" ? "bg-[#10b981]" : stat.color === "red" ? "bg-[#ef4444]" : stat.color === "indigo" ? "bg-[#6366f1]" : "bg-[#f59e0b]")}>
                <HugeIcon className={cn("ph-bold text-[15px]", stat.iconClass)} />
              </div>
            </div>
            
            <div className="flex justify-between items-end p-4 pt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                  {stat.value.toLocaleString()}
                </span>
                <span className={cn("text-[11px] font-medium mb-1", getSubColor(stat.color))}>
                  {stat.sublabel}
                </span>
              </div>
              <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
            </div>
          </div>

          {/* Absolute details container */}
          <div className={cn(
            "absolute top-full left-0 right-0 z-[100] mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-zinc-900 transition-all duration-300 ease-in-out origin-top",
            selectedKpi === stat.key ? "scale-y-100 opacity-100 translate-y-0" : "scale-y-95 opacity-0 -translate-y-2 pointer-events-none"
          )} onClick={(e) => e.stopPropagation()}>
            <div className="space-y-3">
              {stat.key === "total" && (
                <div className="bg-gray-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Cumulative history of all account actions recorded securely for audit purposes.
                </div>
              )}
              {stat.key === "today" && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Activity burst over the last 24 hours. Includes all data read and write operations.
                </div>
              )}
              {stat.key === "auth" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Login sessions, password changes, and sensitive access requests authenticated.
                </div>
              )}
            </div>
          </div>
        </Reorder.Item>
      );})}
      </Reorder.Group>
    </div>
  );
}

function parseDateLocal(str) {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

function LogFilters({
  localSearch,
  handleSearchChange,
  setLocalSearch,
  setSearch,
  filterCriteriaGroups,
  onResetFilters,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  setPage,
  total = 0,
  isLoading = false,
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
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case "last30":
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        break;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
    setPage(1);
  };

  const activeShortcut = (() => {
    if (!startDate || !endDate) return null;
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (startDate === todayStr && endDate === todayStr) return "today";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = format(yesterday, "yyyy-MM-dd");
    if (startDate === yestStr && endDate === yestStr) return "yesterday";

    const last7 = new Date();
    last7.setDate(last7.getDate() - 6);
    if (startDate === format(last7, "yyyy-MM-dd") && endDate === todayStr) return "last7";

    const last30 = new Date();
    last30.setDate(last30.getDate() - 29);
    if (startDate === format(last30, "yyyy-MM-dd") && endDate === todayStr) return "last30";

    return null;
  })();

  return (
    <div
      className={cn(
        "border-t border-gray-100 dark:border-white/10 p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-zinc-900/30 flex-wrap transition-all duration-slow",
        isLoading ? "opacity-40 blur-[1px] grayscale-[0.1]" : "opacity-100"
      )}
    >
      {/* Search Input with Pure Number Count (Left side) */}
      <div className="relative flex-1 sm:w-64 min-w-[200px] max-w-sm group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <HugeIcon className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm" />
        </div>
        <Input
          type="text"
          placeholder="Search action, details, IP..."
          className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-8 pr-16 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
          value={localSearch}
          onChange={handleSearchChange}
          disabled={isLoading}
        />
        <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                setSearch("");
                setPage(1);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer p-0.5 transition-colors border-0 bg-transparent flex items-center justify-center"
              title="Clear search"
            >
              <HugeIcon className="ph-bold ph-x-circle text-[13px]" />
            </button>
          )}
          <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono pointer-events-none">
            {total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Filter controls (Right side) */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Multi-Criteria Popover Filter */}
        <div className="w-full sm:w-auto shrink-0">
          <MultiCriteriaFilter
            title="Filter Logs"
            buttonLabel="Filter"
            groups={filterCriteriaGroups}
            align="end"
            onReset={onResetFilters}
          />
        </div>

        {/* Time Shortcuts */}
        <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5 shrink-0">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yest." },
            { key: "last7", label: "7d" },
            { key: "last30", label: "30d" },
          ].map((range) => {
            const isActive = activeShortcut === range.key;
            return (
              <button
                key={range.key}
                type="button"
                onClick={() => handleQuickRange(range.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-slate-900 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-100 shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                )}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-[105px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                    !startDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {startDate ? format(parseDateLocal(startDate), "MMM d") : "Start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? parseDateLocal(startDate) : undefined}
                  onSelect={(date) => {
                    setStartDate(date ? format(date, "yyyy-MM-dd") : "");
                    setPage(1);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <span className="text-[12px] text-gray-400 dark:text-zinc-500">→</span>
          <div className="w-[105px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-left text-xs font-normal shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 px-2.5 cursor-pointer",
                    !endDate ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-200"
                  )}
                >
                  {endDate ? format(parseDateLocal(endDate), "MMM d") : "End"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-card" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? parseDateLocal(endDate) : undefined}
                  onSelect={(date) => {
                    setEndDate(date ? format(date, "yyyy-MM-dd") : "");
                    setPage(1);
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
              <HugeIcon  className="ph-duotone ph-newspaper-clipping text-lg"></HugeIcon>
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
              <HugeIcon  className="ph-duotone ph-broadcast text-lg"></HugeIcon>
            </div>
            <h5 className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-300">
              Network & Device
            </h5>
          </div>
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-card dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 dark:text-zinc-300">IP ADDRESS:</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg dark:text-blue-400 dark:bg-blue-900/30">{log.ip}</span>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(log.ip, "IP Address")}
                  className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:bg-card dark:hover:border-zinc-800 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-500"
                >
                  <HugeIcon  className="ph-bold ph-copy text-xs"></HugeIcon>
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
              <HugeIcon  className="ph-duotone ph-cube text-lg"></HugeIcon>
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
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{log.entityId || log.entity_id || "N/A"}</span>
                {(log.entityId || log.entity_id) && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(log.entityId || log.entity_id, "Reference ID")}
                    className="h-8 w-8 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-300 hover:bg-red-50 hover:text-pup-maroon dark:hover:text-red-500 shadow-xs transition-all dark:bg-card dark:hover:border-zinc-800 dark:border-white/10 dark:hover:bg-white/5 dark:text-zinc-500"
                  >
                    <HugeIcon  className="ph-bold ph-copy text-xs"></HugeIcon>
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
    } catch {
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
            className="mx-auto flex h-7 w-7 items-center justify-center bg-transparent border-none text-[#8E8E93] hover:text-[#111111] dark:hover:text-zinc-200 cursor-pointer transition-colors duration-fast"
          >
            {isExpanded ? (
              <HugeIcon className="ph-bold ph-minus text-[14px]" />
            ) : (
              <HugeIcon className="ph-bold ph-plus text-[14px]" />
            )}
          </button>
        </td>
        <td className="py-0 px-4 align-middle text-[13px] font-normal text-[#111111] dark:text-zinc-50">
          {formattedTimestamp}
        </td>
        <td className="py-0 px-4 align-middle">
          <span
            className={cn(
              "inline-flex w-fit items-center justify-center rounded-full px-[10px] py-[2.5px] text-[11px] font-medium tracking-[0.04em] shadow-none transition-all",
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
              <HugeIcon  className="ti ti-eye text-[16px]"></HugeIcon>
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
    return <HugeIcon  className="ph-bold ph-caret-up-down ml-1 text-[12px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"></HugeIcon>
  }
  return logSortOrder === "ASC" ? (
    <HugeIcon  className="ph-bold ph-caret-up ml-1 text-[12px] text-gray-400"></HugeIcon>
  ) : (
    <HugeIcon  className="ph-bold ph-caret-down ml-1 text-[12px] text-gray-400"></HugeIcon>
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
  embedded = true,
}) {
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  if (isLoading && !displayLogs.length) {
    return (
      <div className={cn("space-y-0", embedded ? "flex flex-1 flex-col min-h-0" : "")}>
        <div className={cn(
          "overflow-visible bg-white dark:bg-card",
          embedded
            ? "flex-1 min-h-0 flex flex-col border-t border-gray-100 dark:border-white/10 rounded-b-2xl"
            : "rounded-2xl border border-gray-100 dark:border-white/10"
        )}>
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
      <div className={cn(
        "flex flex-1 min-h-[320px] flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-zinc-400",
        embedded
          ? "border-t border-gray-100 dark:border-white/10 rounded-b-2xl bg-white dark:bg-card"
          : "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      )}>
        <Empty className="flex flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
          <EmptyHeader className="flex flex-col items-center gap-2">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-red-100 opacity-20"></div>
              <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-red-100 bg-white shadow-xl dark:bg-card dark:shadow-none">
                <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-red-600" />
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
              className="mt-6 h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Retry
            </Button>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", embedded ? "flex flex-1 flex-col min-h-0" : "")}>
      <div
        className={cn(
          embedded
            ? "flex-1 min-h-0 flex flex-col overflow-visible isolate border-t border-gray-100 dark:border-white/10 rounded-b-2xl bg-white dark:bg-card transition-all duration-slow"
            : "overflow-visible rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card shadow-sm dark:shadow-none transition-all duration-slow animate-fade-up",
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
                            <HugeIcon  className="ph-bold ph-magnifying-glass text-xl text-gray-300 dark:text-zinc-650"></HugeIcon>
                          </EmptyMedia>
                        </div>
                        <EmptyTitle className="text-xl font-semibold text-gray-900 dark:text-zinc-50">
                          {Boolean(localSearch !== "" || logSeverityFilter !== "All" || logStartDate !== "" || logEndDate !== "")
                            ? "No Activity Found"
                            : "No Activity Recorded Yet"}
                        </EmptyTitle>
                        <EmptyDescription className="max-w-xs text-sm font-medium text-gray-500 dark:text-zinc-400">
                          {Boolean(localSearch !== "" || logSeverityFilter !== "All" || logStartDate !== "" || logEndDate !== "")
                            ? "Try adjusting your search filters to find what you're looking for."
                            : "Your sign-ins, security changes, and account actions will automatically appear here."}
                        </EmptyDescription>
                        {(localSearch !== "" ||
                          logSeverityFilter !== "All" ||
                          logStartDate !== "" ||
                          logEndDate !== "") && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setLocalSearch("");
                              setLogSearch("");
                              setLogSeverityFilter("All");
                              setLogStartDate("");
                              setLogEndDate("");
                              setLogPage(1);
                            }}
                            title="Reset Filters"
                            className="mt-6 h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Reset
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
          <LogPagination
            logTotal={logTotal}
            logPage={logPage}
            setLogPage={setLogPage}
            itemsPerPage={itemsPerPage}
            displayCount={displayLogs.length}
            handleItemsPerPageChange={(size) => {
              setItemsPerPage(size);
              setLogPage(1);
            }}
          />
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

  const roleBranding = getRoleBranding(authUser);
  const brandAccent = authUser?.accent_color || roleBranding.color || "#800000";
  const brandForeground = roleBranding.foreground || "#FFFFFF";

  useEffect(() => {
    if (typeof window !== "undefined" && brandAccent) {
      document.documentElement.style.setProperty("--brand-accent", brandAccent);
      document.documentElement.style.setProperty("--brand-foreground", brandForeground);
    }
  }, [brandAccent, brandForeground]);

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedSeverities = useMemo(() => {
    if (!severityFilter || severityFilter === "All") return [];
    return severityFilter.split(",").map((s) => s.trim()).filter(Boolean);
  }, [severityFilter]);

  const filterCriteriaGroups = useMemo(() => [
    {
      id: "severity",
      label: "Severity",
      options: [
        { id: "INFO", label: "Information", dotColor: "bg-blue-500" },
        { id: "WARNING", label: "Warnings", dotColor: "bg-amber-500" },
        { id: "CRITICAL", label: "Critical", dotColor: "bg-rose-500" },
      ],
      selected: selectedSeverities,
      onChange: (vals) => {
        setSeverityFilter(vals.length === 0 ? "All" : vals.join(","));
        setPage(1);
      },
    },
  ], [selectedSeverities]);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    localStorage.setItem("pup-logout", Date.now());
    window.location.href = "/login";
  };

  // 1. Fetch user session
  useEffect(() => {
    (async () => {
      try {
        const session = await getClientSession();
        if (!session.ok || !session.data) {
          if (session.status === 401) {
            router.push("/login");
          }
          return;
        }
        setAuthUser(session.data);
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

  // Debounced search
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

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), refreshStats()]);
  }, [refresh, refreshStats]);

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
        log?.created_at ? formatPHDateTime(log.created_at) : "—",
        log?.severity || "INFO",
        log?.actor || "System",
        log?.role || "—",
        log?.action || "—",
        log?.details || "No known description",
        log?.ip || "—",
        log?.user_agent || "—",
        log?.entity_type || "—",
        log?.entity_id || "—",
      ]);
      const csvContent = [
        headers.join(","),
        ...exportRows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
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
    } catch {
      toast.error("Download Failed", { description: "Unable to download the PDF report." });
    }
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", { description: `${label} has been successfully copied.` });
  };

  if (loadingUser) {
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-jakarta">
        <Header authUser={authUser} onLogout={handleLogout} />
        <main className="flex-1 min-h-0 overflow-y-auto w-full">
          <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto py-6 px-4 sm:px-8">
            <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none min-h-[600px] isolate">
              {/* Header Skeleton */}
              <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-44 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-72 rounded dark:bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-24 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-24 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
                </div>
              </div>

              {/* KPI Stat Cards Skeleton */}
              <div className="px-6 py-6 pb-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl dark:bg-muted" />
                  ))}
                </div>
              </div>

              {/* Filter Toolbar Skeleton */}
              <div className="p-4 px-6 border-t border-gray-100 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
                </div>
                <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
              </div>

              {/* Table Rows Skeleton */}
              <div className="flex-1 p-6 space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-12 border-b border-gray-100 dark:border-white/5 flex items-center justify-between last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                      <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                    </div>
                    <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div 
      className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-jakarta"
      style={{
        "--brand-accent": brandAccent,
        "--brand-foreground": brandForeground,
      }}
    >
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col">
        <PageTransition className="w-full flex-1">
          <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto py-6 px-4 sm:px-8">
            <TooltipProvider delayDuration={200}>
            {/* ONE Single Card Container encapsulating Header, Metrics, Toolbar, Table & Pagination */}
            <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 flex-1">
            <PageHeader
              icon="ph-clock-counter-clockwise"
              title="My Activity"
              description="Review a complete audit history of actions performed by your account."
              showBorder={false}
              className="p-6"
              titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
              descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
              actions={
                <div className="flex items-center gap-3">
                  <RefreshButton
                    onRefresh={handleRefresh}
                    isLoading={loading}
                    title="Refresh Activity"
                  />

                  <Button
                    variant="outline"
                    onClick={handleDownloadCSV}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handlePreviewPDF}
                    disabled={total === 0 || isExporting || isGeneratingPdf}
                    className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer px-5 shadow-xs"
                  >
                    {isGeneratingPdf ? "Generating..." : "Report"}
                  </Button>

                </div>
              }
            />

            {/* Stats Bar */}
            <div className="px-6 pb-6">
              <StatCards isLoading={loading && !stats} stats={stats} />
            </div>

            {/* Filter Bar */}
            <LogFilters
              localSearch={localSearch}
              handleSearchChange={handleSearchChange}
              setLocalSearch={setLocalSearch}
              setSearch={setSearch}
              filterCriteriaGroups={filterCriteriaGroups}
              onResetFilters={() => {
                setSeverityFilter("All");
                setPage(1);
              }}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              setPage={setPage}
              total={total}
              isLoading={loading}
            />

            {/* Active Filter Chips Row */}
            <ActiveFilterChips
              groups={filterCriteriaGroups}
              selected={{ severity: selectedSeverities }}
              onRemove={(groupId, val) => {
                const next = selectedSeverities.filter((v) => v !== val);
                setSeverityFilter(next.length === 0 ? "All" : next.join(","));
                setPage(1);
              }}
              searchQuery={localSearch}
              onClearSearch={() => {
                setLocalSearch("");
                setSearch("");
                setPage(1);
              }}
              extraChips={[
                ...(startDate || endDate
                  ? [
                      {
                        groupLabel: "Date Range",
                        label: `${startDate ? format(parseDateLocal(startDate), "MMM d, yyyy") : "Start"} → ${endDate ? format(parseDateLocal(endDate), "MMM d, yyyy") : "End"}`,
                        onClear: () => {
                          setStartDate("");
                          setEndDate("");
                          setPage(1);
                        },
                      },
                    ]
                  : []),
              ]}
              onClearAll={() => {
                setLocalSearch("");
                setSearch("");
                setSeverityFilter("All");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
            />

            {/* Table */}
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
              embedded={true}
            />
          </Card>

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
      </main>
    </div>
        );
        }
