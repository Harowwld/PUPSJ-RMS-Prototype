"use client";

import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/40",
      dotClass: "bg-red-500",
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40",
      dotClass: "bg-amber-500",
    };
  }
  return {
    label: "Info",
    classes: "bg-sky-50 text-sky-800 dark:bg-blue-950/40 dark:text-blue-400 border border-sky-200/60 dark:border-blue-900/40",
    dotClass: "bg-sky-500",
  };
}

function formatLastSync(val) {
  if (!val || val === "Never") return "Never";
  try {
    const d = new Date(val.replace(" at ", " "));
    if (isNaN(d.getTime())) {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
      return val;
    }
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return val;
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
  hasPrev,
  hideActor = false,
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
        return (
          <span key={i} className="font-semibold text-gray-900 dark:text-zinc-50">
            {part}
          </span>
        );
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
        className="flex flex-col border-l border-border dark:border-border bg-white dark:bg-card p-0 shadow-2xl w-full sm:max-w-[480px] md:max-w-[540px] data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] data-[side=right]:md:max-w-[540px] overflow-hidden"
      >
        {/* Executive Header */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-16 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50 text-left">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60">
                #LOG-{selectedLog?.id}
              </span>
              {severityInfo && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    severityInfo.classes
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", severityInfo.dotClass)} />
                  {severityInfo.label}
                </span>
              )}
            </div>

            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
              Audit Event Details
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              Immutable forensic log entry recorded by PUPSJ Records Keeper.
            </SheetDescription>
          </div>
        </SheetHeader>

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6 pb-28">
            {/* Timestamp Info Tile */}
            <div className="p-3.5 rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-0.5">
                  Timestamp
                </p>
                <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 font-mono">
                  {formattedTime}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-border/60 dark:border-border flex items-center justify-center text-gray-500">
                <HugeIcon className="ph-bold ph-calendar text-sm" />
              </div>
            </div>

            {/* Actor Section */}
            {!hideActor && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <HugeIcon className="ph-bold ph-user text-xs" />
                  Responsible Actor
                </h4>
                <div className="flex items-center gap-3.5 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/80 dark:border-border shadow-xs">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-pup-maroon/20 bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 font-bold text-xs">
                    {initials || "ST"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900 dark:text-zinc-50">
                      {selectedLog.user}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                      {selectedLog.role}
                      {selectedLog.officeName ? ` • ${selectedLog.officeName}` : selectedLog.scope ? ` • ${selectedLog.scope}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event Details */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                <HugeIcon className="ph-bold ph-file-text text-xs" />
                Action & Specification
              </h4>
              <div className="space-y-3.5 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/80 dark:border-border shadow-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                    Action Type
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-zinc-50">
                    {selectedLog.action === "Rotate Password" ? "Password Rotated" : selectedLog.action}
                  </p>
                </div>

                <div className="border-t border-border/70 dark:border-border pt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      Description & Narrative
                    </p>
                    <button
                      onClick={() => handleCopy(selectedLog.details || "No description", "Description")}
                      aria-label="Copy Description"
                      className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                    >
                      <HugeIcon className="ph-bold ph-copy text-xs" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                    {formattedDescription}
                  </p>
                </div>

                {(selectedLog.entityType || selectedLog.entityId || selectedLog.officeName || selectedLog.scope) && (
                  <div className="grid grid-cols-2 gap-3 border-t border-border/70 dark:border-border pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-0.5">
                        Target Entity
                      </p>
                      <span className="text-xs font-semibold text-gray-900 dark:text-zinc-200">
                        {selectedLog.entityType || "N/A"}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                          Reference ID
                        </p>
                        {selectedLog.entityId && (
                          <button
                            onClick={() => handleCopy(selectedLog.entityId, "Reference ID")}
                            aria-label="Copy Reference ID"
                            className="w-6 h-6 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                          >
                            <HugeIcon className="ph-bold ph-copy text-[11px]" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100">
                        {selectedLog.entityId || "N/A"}
                      </p>
                    </div>

                    {(selectedLog.officeName || selectedLog.scope) && (
                      <div className="col-span-2 border-t border-border/70 dark:border-border pt-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-0.5">
                          Scope / Assigned Office
                        </p>
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          {selectedLog.officeName || selectedLog.scope}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Network & Device Forensics */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                <HugeIcon className="ph-bold ph-shield-check text-xs" />
                Network & Forensic Origin
              </h4>
              <div className="space-y-3 bg-white dark:bg-zinc-900/40 p-4 rounded-2xl border border-border/80 dark:border-border shadow-xs">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                      IP Address
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSearchSimilar(selectedLog.ip)}
                        aria-label="Search Similar IP"
                        className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                        title="Filter logs by this IP"
                      >
                        <HugeIcon className="ph-bold ph-magnifying-glass text-xs" />
                      </button>
                      <button
                        onClick={() => handleCopy(selectedLog.ip, "IP Address")}
                        aria-label="Copy IP Address"
                        className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center transition-colors border-0 bg-transparent"
                        title="Copy IP"
                      >
                        <HugeIcon className="ph-bold ph-copy text-xs" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-mono font-semibold text-gray-900 dark:text-zinc-100">
                    {selectedLog.ip || "::1"}
                  </p>
                </div>

                <div className="border-t border-border/70 dark:border-border pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                    User Agent & Client Environment
                  </p>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed font-mono break-all">
                    {selectedLog.userAgent || selectedLog.user_agent || "Direct System Execution"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Navigation Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border/80 bg-white/90 p-4 px-6 backdrop-blur-md dark:border-border dark:bg-card/90">
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              disabled={!hasPrev}
              onClick={onPrev}
              className="h-10 px-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={!hasNext}
              onClick={onNext}
              className="h-10 px-5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold text-xs active:scale-95 transition-all cursor-pointer shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
