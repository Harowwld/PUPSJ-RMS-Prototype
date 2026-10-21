"use client";

import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Standard Information Row (label : value)
 * Clean metadata layout aligned with colons and icons.
 */
function InfoRow({ icon, label, value, children, className }) {
  return (
    <div
      className={cn(
        "grid grid-cols-[135px_12px_1fr] sm:grid-cols-[150px_14px_1fr] items-start gap-1 text-xs py-1.5 border-b border-gray-100/70 dark:border-zinc-800/50 last:border-0",
        className
      )}
    >
      <div className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-2 truncate">
        {icon && (
          <HugeIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
        )}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-gray-300 dark:text-zinc-600 select-none">:</span>
      <div className="text-gray-900 dark:text-zinc-100 font-semibold break-words min-w-0">
        {children ?? (value || <span className="text-gray-400 font-normal italic">None</span>)}
      </div>
    </div>
  );
}

function getSeverityInfo(sev) {
  const s = String(sev || "").toUpperCase();
  if (s === "CRITICAL") {
    return {
      label: "Critical",
      classes: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200/60 dark:border-red-900/40",
      dotClass: "bg-red-500",
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/40",
      dotClass: "bg-amber-500",
    };
  }
  return {
    label: "Info",
    classes: "bg-sky-50 text-sky-800 dark:bg-blue-950/40 dark:text-blue-400 border-sky-200/60 dark:border-blue-900/40",
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
  currentIndex,
  totalCount,
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
    : "AU";

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

  const isNavigable = typeof totalCount === "number" && totalCount > 1;

  return (
    <Sheet
      open={!!selectedLog}
      onOpenChange={(open) => !open && setSelectedLog(null)}
    >
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Top Header matching reference design: Audit Event Details < > 01 of 100 X */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Audit Event Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Immutable forensic log entry recorded by PUPSJ Records Keeper.
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {isNavigable && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={!hasPrev && (typeof currentIndex === "number" ? currentIndex <= 0 : false)}
                    onClick={onPrev}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Log"
                    title="Previous Log"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext && (typeof currentIndex === "number" ? currentIndex >= totalCount - 1 : false)}
                    onClick={onNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Log"
                    title="Next Log"
                  >
                    <HugeIcon className="ph-bold ph-caret-right text-xs" />
                  </button>
                  <span className="font-mono text-[11px] font-semibold text-gray-700 dark:text-zinc-300 ml-0.5">
                    {String(Math.max(1, (currentIndex ?? 0) + 1)).padStart(2, "0")} of {String(totalCount).padStart(2, "0")}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Identity / Actor Summary Strip */}
            <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-pup-maroon/20 bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400">
                  {initials || "AU"}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                    {hideActor ? "Account Activity" : (selectedLog.user || "System")}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                    {hideActor ? selectedLog.user : (selectedLog.role || "System")}
                    {selectedLog.officeName ? ` • ${selectedLog.officeName}` : selectedLog.scope ? ` • ${selectedLog.scope}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
                  #LOG-{selectedLog.id}
                </span>
                {severityInfo && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs",
                      severityInfo.classes
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", severityInfo.dotClass)} />
                    {severityInfo.label}
                  </span>
                )}
              </div>
            </div>

            {/* 1. Event Specification (Standard Information Rows) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                <HugeIcon className="ph-bold ph-shield-check text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Event Specification
                </h3>
              </div>

              <div className="divide-y-0">
                <InfoRow
                  icon="ph-bold ph-hash"
                  label="Log Sequence ID"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-800 dark:text-zinc-200 font-semibold">
                      #{selectedLog.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy?.(String(selectedLog.id), "Log ID")}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="Copy Log ID"
                    >
                      <HugeIcon className="ph-bold ph-copy text-[11px]" />
                    </button>
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-lightning"
                  label="Action Type"
                  value={selectedLog.action === "Rotate Password" ? "Password Rotated" : selectedLog.action}
                />

                <InfoRow
                  icon="ph-bold ph-warning-circle"
                  label="Security Severity"
                >
                  {severityInfo && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                        severityInfo.classes
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", severityInfo.dotClass)} />
                      {severityInfo.label}
                    </span>
                  )}
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-clock"
                  label="Timestamp"
                >
                  <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {formattedTime}
                  </span>
                </InfoRow>

                {!hideActor && (
                  <InfoRow
                    icon="ph-bold ph-user"
                    label="Responsible Actor"
                  >
                    <span>
                      {selectedLog.user}
                      <span className="text-gray-500 dark:text-zinc-400 font-normal ml-1">
                        ({selectedLog.role || "User"}{selectedLog.officeName ? ` • ${selectedLog.officeName}` : ""})
                      </span>
                    </span>
                  </InfoRow>
                )}

                {(selectedLog.entityType || selectedLog.entityId) && (
                  <>
                    <InfoRow
                      icon="ph-bold ph-cube"
                      label="Target Entity"
                      value={selectedLog.entityType || "N/A"}
                    />

                    {selectedLog.entityId && (
                      <InfoRow
                        icon="ph-bold ph-identification-card"
                        label="Reference ID"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                            {selectedLog.entityId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy?.(selectedLog.entityId, "Reference ID")}
                            className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Copy Reference ID"
                          >
                            <HugeIcon className="ph-bold ph-copy text-[11px]" />
                          </button>
                        </div>
                      </InfoRow>
                    )}
                  </>
                )}

                {(selectedLog.officeName || selectedLog.scope) && (
                  <InfoRow
                    icon="ph-bold ph-buildings"
                    label="Office / Scope"
                    value={selectedLog.officeName || selectedLog.scope}
                  />
                )}

                <InfoRow
                  icon="ph-bold ph-text-align-left"
                  label="Narrative Details"
                >
                  <div className="space-y-1">
                    <div className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed font-normal">
                      {formattedDescription}
                    </div>
                    {selectedLog.details && (
                      <button
                        type="button"
                        onClick={() => handleCopy?.(selectedLog.details, "Description")}
                        className="text-[11px] text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer pt-0.5"
                      >
                        <HugeIcon className="ph-bold ph-copy text-xs" />
                        <span>Copy full narrative</span>
                      </button>
                    )}
                  </div>
                </InfoRow>
              </div>
            </div>

            {/* 2. Network & Forensic Origin (Standard Information Rows) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                <HugeIcon className="ph-bold ph-globe text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Forensic & Network Origin
                </h3>
              </div>

              <div className="divide-y-0">
                <InfoRow
                  icon="ph-bold ph-map-pin"
                  label="IP Address"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      {selectedLog.ip || "::1"}
                    </span>
                    <div className="flex items-center gap-1">
                      {onSearchSimilar && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onSearchSimilar(selectedLog.ip)}
                          className="h-6 px-2 text-[10px] font-semibold rounded-md border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          title="Filter logs by this IP"
                        >
                          Filter IP
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopy?.(selectedLog.ip, "IP Address")}
                        className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Copy IP"
                      >
                        <HugeIcon className="ph-bold ph-copy text-[11px]" />
                      </button>
                    </div>
                  </div>
                </InfoRow>

                <InfoRow
                  icon="ph-bold ph-desktop"
                  label="Client Environment"
                >
                  <span className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed font-mono break-all font-normal">
                    {selectedLog.userAgent || selectedLog.user_agent || "Direct System Execution"}
                  </span>
                </InfoRow>
              </div>
            </div>
          </div>
        )}

        {/* Executive Action Bar Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex flex-row items-center justify-between">
          <div>
            {selectedLog && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCopy?.(JSON.stringify(selectedLog, null, 2), "Log JSON")}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                title="Copy raw audit log JSON"
              >
                <HugeIcon className="ph-bold ph-copy text-sm" />
                <span>Copy JSON</span>
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedLog(null)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
