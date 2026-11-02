"use client";


import SheetPagination from "@/components/shared/SheetPagination";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn, formatLogDetails } from "@/lib/utils";
import AuditActorAvatar from "@/components/shared/AuditActorAvatar";
import { Cancel01Icon, Copy01Icon, GlobeIcon, Shield01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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
          <AppIcon className={cn("text-gray-400 dark:text-zinc-500 text-sm shrink-0", icon)} />
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
  const formattedDescription = (() => {
    if (!selectedLog) return "";
    const text = formatLogDetails(selectedLog.details) || "No known description";
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
        <SheetHeader className="shrink-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <SheetTitle>
                Audit Event Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Immutable forensic log entry recorded by PUPSJ Records Keeper.
              </SheetDescription>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {isNavigable && (
                <SheetPagination
                  compact
                  label="Record navigation"
                  page={Math.max(1, (currentIndex ?? 0) + 1)}
                  totalPages={totalCount}
                  onPrevious={onPrev}
                  onNext={onNext}
                  previousDisabled={!hasPrev && (typeof currentIndex === "number" ? currentIndex <= 0 : false)}
                  nextDisabled={!hasNext && (typeof currentIndex === "number" ? currentIndex >= totalCount - 1 : false)}
                  previousLabel="Previous Log"
                  nextLabel="Next Log"
                />
              )}

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Line-Attached Edge-to-Edge Severity & Integrity Notice */}
        {selectedLog && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-6 py-2.5 text-xs border-b transition-colors shrink-0",
              severityInfo?.label === "Critical" || severityInfo?.label === "Security"
                ? "border-rose-200/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200"
                : severityInfo?.label === "Warning"
                ? "border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200"
                : "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200"
            )}
          >
            <AppIcon
              className={cn(
                " text-[15px] shrink-0",
                severityInfo?.label === "Critical" || severityInfo?.label === "Security"
                  ? "Alert01Icon text-rose-600 dark:text-rose-400"
                  : severityInfo?.label === "Warning"
                  ? "Alert01Icon text-amber-600 dark:text-amber-400"
                  : "Shield01Icon text-emerald-600 dark:text-emerald-400"
              )}
            />
            <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
              <strong className="font-semibold">
                {severityInfo?.label ? `${severityInfo.label} Audit Event:` : "Forensic Audit Log:"}
              </strong>{" "}
              {severityInfo?.label === "Critical" || severityInfo?.label === "Security"
                ? "High-priority security or administrative event recorded to immutable audit ledger."
                : severityInfo?.label === "Warning"
                ? "Precautionary system event flagged for operational review."
                : "Verified ledger entry recorded with cryptographic timestamp and actor attribution."}
            </span>
          </div>
        )}

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Identity / Actor Summary Strip (Unboxed) */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
              <div className="flex items-center gap-3.5 min-w-0">
                <AuditActorAvatar
                  log={selectedLog}
                  className="size-11 border border-pup-maroon/20"
                  fallbackClassName="font-bold text-sm bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400"
                />
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
                <span className="font-sans tabular-nums text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/80 dark:border-zinc-700/60 shadow-2xs">
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
                <Shield01Icon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Event Specification
                </h3>
              </div>

              <div className="divide-y-0">
                <InfoRow
                  icon=" Tag01Icon"
                  label="Log Sequence ID"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 font-semibold">
                      #{selectedLog.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy?.(String(selectedLog.id), "Log ID")}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="Copy Log ID"
                    >
                      <Copy01Icon size="1em" className="text-[11px]" />
                    </button>
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" EnergyIcon"
                  label="Action Type"
                  value={selectedLog.action === "Rotate Password" ? "Password Rotated" : selectedLog.action}
                />

                <InfoRow
                  icon=" Alert01Icon"
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
                  icon=" Clock01Icon"
                  label="Timestamp"
                >
                  <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    {formattedTime}
                  </span>
                </InfoRow>

                {!hideActor && (
                  <InfoRow
                    icon=" UserIcon"
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
                      icon=" AlignBoxBottomCenterIcon"
                      label="Target Entity"
                      value={selectedLog.entityType || "N/A"}
                    />

                    {selectedLog.entityId && (
                      <InfoRow
                        icon=" Contact01Icon"
                        label="Reference ID"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
                            {selectedLog.entityId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy?.(selectedLog.entityId, "Reference ID")}
                            className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Copy Reference ID"
                          >
                            <Copy01Icon size="1em" className="text-[11px]" />
                          </button>
                        </div>
                      </InfoRow>
                    )}
                  </>
                )}

                {(selectedLog.officeName || selectedLog.scope) && (
                  <InfoRow
                    icon=" Building01Icon"
                    label="Office / Scope"
                    value={selectedLog.officeName || selectedLog.scope}
                  />
                )}

                <InfoRow
                  icon=" TextAlignLeftIcon"
                  label="Narrative Details"
                >
                  <div className="space-y-1">
                    <div className="text-xs text-gray-800 dark:text-zinc-200 leading-relaxed font-normal">
                      {formattedDescription}
                    </div>
                    {selectedLog.details && (
                      <button
                        type="button"
                        onClick={() => handleCopy?.(formatLogDetails(selectedLog.details), "Description")}
                        className="text-[11px] text-gray-500 hover:text-pup-maroon dark:text-zinc-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer pt-0.5"
                      >
                        <Copy01Icon size="1em" className="text-xs" />
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
                <GlobeIcon size="1em" className="text-pup-maroon dark:text-red-400 text-sm" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                  Forensic & Network Origin
                </h3>
              </div>

              <div className="divide-y-0">
                <InfoRow
                  icon=" Location01Icon"
                  label="IP Address"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
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
                        <Copy01Icon size="1em" className="text-[11px]" />
                      </button>
                    </div>
                  </div>
                </InfoRow>

                <InfoRow
                  icon=" ComputerIcon"
                  label="Client Environment"
                >
                  <span className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed font-sans tabular-nums break-all font-normal">
                    {selectedLog.userAgent || selectedLog.user_agent || "Direct System Execution"}
                  </span>
                </InfoRow>
              </div>
            </div>
          </div>
        )}

        {/* Executive Action Bar Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 flex flex-row items-center justify-between">
          <div>
            {selectedLog && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCopy?.(JSON.stringify(selectedLog, null, 2), "Log JSON")}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-2"
                title="Copy activity record data"
              >
                <Copy01Icon size="1em" className="text-sm" />
                <span>Copy Record Data</span>
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
