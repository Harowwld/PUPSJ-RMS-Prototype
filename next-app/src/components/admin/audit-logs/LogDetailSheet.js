"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

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
    classes: "bg-[#E0F2FE] text-[#0369A1] dark:bg-blue-950/40 dark:text-blue-400"
  };
}

function formatLastSync(val) {
  if (!val || val === "Never") return "Never"
  try {
    const d = new Date(val.replace(' at ', ' '))
    if (isNaN(d.getTime())) {
      const parsed = new Date(val)
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        })
      }
      return val
    }
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  } catch (e) {
    return val
  }
}

export default function LogDetailSheet({ 
  selectedLog, 
  setSelectedLog, 
  handleCopy,
  onSearchSimilar,
  onNext,
  onPrev,
  hasNext,
  hasPrev
}) {
  const formattedTime = selectedLog ? formatLastSync(selectedLog.time || selectedLog.created_at) : "";
  const severityInfo = selectedLog ? getSeverityInfo(selectedLog.severity) : null;
  const initials = selectedLog
    ? (selectedLog.user || "")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const formattedDescription = (() => {
    if (!selectedLog) return "";
    const text = selectedLog.details || "No known description";
    const parts = text.split(/'([^']+)'/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="font-medium text-[#111111] dark:text-zinc-50">{part}</span>;
      }
      return part;
    });
  })();

  return (
    <Sheet
      open={!!selectedLog}
      onOpenChange={(open) => !open && setSelectedLog(null)}
    >
      <SheetContent 
        className="font-inter flex flex-col border-l bg-white p-[24px_20px] shadow-none sm:max-w-[320px] w-[320px] dark:border-white/10 dark:bg-[#121214]"
        style={{ borderLeft: '0.5px solid rgba(0,0,0,0.08)' }}
      >
        <SheetHeader className="shrink-0 p-0 mb-6 border-b-0 bg-transparent text-left relative">
          <div className="flex flex-col text-left">
            <SheetTitle className="text-left text-[18px] font-semibold tracking-[-0.01em] text-[#111111] dark:text-zinc-50">
              Log Entry
            </SheetTitle>
            <SheetDescription className="mt-[2px] text-left text-[12px] font-normal text-[#8E8E93]">
              System Event ID: {selectedLog?.id}
            </SheetDescription>
          </div>
        </SheetHeader>

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto pr-1 -mr-1 pb-24">
            {/* Header Info */}
            <div 
              className="flex justify-between items-end pb-4 border-black/5 dark:border-white/5"
              style={{ borderBottomWidth: '0.5px', borderBottomStyle: 'solid' }}
            >
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8E8E93] mb-1">
                  Timestamp
                </p>
                <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">{formattedTime}</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#8E8E93] mb-1">
                  Severity
                </p>
                <span
                  className={cn(
                    "inline-flex w-fit items-center justify-center rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium tracking-[0.04em]",
                    severityInfo.classes
                  )}
                >
                  {severityInfo.label}
                </span>
              </div>
            </div>

            {/* Actor Section */}
            <div className="flex flex-col">
              <div className="flex items-center gap-[6px] mb-[12px]">
                <i className="ti ti-user text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
                  Actor
                </h4>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-card p-[16px] rounded-[8px]" style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/5 bg-gray-50 dark:border-white/5 dark:bg-zinc-800">
                  <span className="text-[12px] font-medium text-[#8E8E93]">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#111111] dark:text-zinc-50">{selectedLog.user}</p>
                  <p className="mt-0.5 text-[12px] font-normal text-[#8E8E93]">
                    {selectedLog.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="flex flex-col">
              <div className="flex items-center gap-[6px] mb-[12px]">
                <i className="ti ti-file-text text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
                  Details
                </h4>
              </div>
              <div className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-[8px]" style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                    Action
                  </p>
                  <p className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                    {selectedLog.action === "Rotate Password" ? "Password Rotated" : selectedLog.action}
                  </p>
                </div>

                <div className="border-t border-black/5 pt-[16px] dark:border-white/5">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                      Description
                    </p>
                    <button
                      onClick={() => handleCopy(selectedLog.details || "No description", "Description")}
                      className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                    >
                      <i className="ti ti-copy text-[14px]" style={{ fontSize: '14px' }}></i>
                    </button>
                  </div>
                  <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-50 leading-[1.5]">
                    {formattedDescription}
                  </p>
                </div>

                {(selectedLog.entityType || selectedLog.entityId) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-black/5 pt-[16px] dark:border-white/5">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                        Target
                      </p>
                      <span className="text-[13px] font-normal text-[#111111] dark:text-zinc-150">
                        {selectedLog.entityType || "N/A"}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                          Reference ID
                        </p>
                        {selectedLog.entityId && (
                          <button
                            onClick={() => handleCopy(selectedLog.entityId, "Reference ID")}
                            className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                          >
                            <i className="ti ti-copy text-[14px]" style={{ fontSize: '14px' }}></i>
                          </button>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-[#111111] dark:text-zinc-50">
                        {selectedLog.entityId || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Network Data */}
            <div className="flex flex-col">
              <div className="flex items-center gap-[6px] mb-[12px]">
                <i className="ti ti-wifi text-[14px]" style={{ fontSize: '14px', color: '#8E8E93' }}></i>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8E8E93]">
                  Network
                </h4>
              </div>
              <div className="space-y-[16px] bg-white dark:bg-card p-[16px] rounded-[8px]" style={{ border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                      IP Address
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSearchSimilar(selectedLog.ip)}
                        className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                      >
                        <i className="ti ti-search text-[14px]" style={{ fontSize: '14px' }}></i>
                      </button>
                      <button
                        onClick={() => handleCopy(selectedLog.ip, "IP Address")}
                        className="w-7 h-7 rounded-[6px] hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-white/10 text-[#C7C7CC] hover:text-[#111111] dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors"
                      >
                        <i className="ti ti-copy text-[14px]" style={{ fontSize: '14px' }}></i>
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] font-normal text-[#111111] dark:text-zinc-50">
                    {selectedLog.ip || "::1"}
                  </p>
                </div>
                <div className="border-t border-black/5 pt-[16px] dark:border-white/5">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8E8E93]">
                    Browser
                  </p>
                  <p className="text-[12px] font-normal text-[#8E8E93] leading-[1.5]">
                    {selectedLog.userAgent || selectedLog.user_agent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100 bg-white p-4 backdrop-blur-sm dark:border-white/10 dark:bg-[#121214]/80">
          <div className="flex items-center justify-between gap-[8px]">
            <button
              disabled={!hasPrev}
              onClick={onPrev}
              className="flex-1 h-[36px] rounded-[8px] bg-transparent text-[13px] font-normal text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer dark:text-zinc-300 dark:hover:bg-white/5 border border-black/15 dark:border-white/20 select-none"
            >
              ← Previous Log
            </button>
            <button
              disabled={!hasNext}
              onClick={onNext}
              className="flex-1 h-[36px] rounded-[8px] bg-transparent text-[13px] font-normal text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer dark:text-zinc-300 dark:hover:bg-white/5 border border-black/15 dark:border-white/20 select-none"
            >
              Next Log →
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
