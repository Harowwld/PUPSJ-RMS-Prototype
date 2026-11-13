"use client";

import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { useState } from "react";
import SheetPagination from "@/components/shared/SheetPagination";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/shared/CopyButton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn, formatLogDetails } from "@/lib/utils";
import { COMPACT_BADGE_BASE, SUPERADMIN_BADGE_BASE as BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import NarrativeText from "@/components/shared/NarrativeText";
import AuditActorAvatar from "@/components/shared/AuditActorAvatar";
import { Cancel01Icon, Copy01Icon, GlobeIcon, Shield01Icon, Tick01Icon } from "hugeicons-react";
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
      classes: BADGE_PALETTES.rose,
      dotClass: "bg-red-500",
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      classes: BADGE_PALETTES.amber,
      dotClass: "bg-amber-500",
    };
  }
  return {
    label: "Info",
    classes: BADGE_PALETTES.blue,
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
  const [copiedField, setCopiedField] = useState(null);
  const handleCopyField = (text, label, fieldKey) => {
    if (!text) return;
    handleCopy?.(text, label);
    if (fieldKey) {
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField((curr) => (curr === fieldKey ? null : curr)), 2000);
    }
  };
  const formattedTime = selectedLog ? formatLastSync(selectedLog.time || selectedLog.created_at) : "";
  const severityInfo = selectedLog ? getSeverityInfo(selectedLog.severity) : null;

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
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
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
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
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
          <NoticeBanner tone={severityInfo?.label === "Critical" || severityInfo?.label === "Security" ? "danger" : severityInfo?.label === "Warning" ? "warning" : "info"} title={severityInfo?.label ? `${severityInfo.label} Audit Event` : "Activity Log"}>
            {severityInfo?.label === "Critical" || severityInfo?.label === "Security"
                ? "High-priority security or administrative event recorded in activity history."
                : severityInfo?.label === "Warning"
                ? "Precautionary system event flagged for operational review."
                : "Recorded activity with a timestamp and actor attribution."}
          </NoticeBanner>
        )}

        {selectedLog && (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            {/* Identity / Actor Summary Strip (Unboxed) */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
              <div className="flex items-center gap-3.5 min-w-0">
                <AuditActorAvatar
                  log={selectedLog}
                  className="size-11 border-0"
                  fallbackClassName="font-bold text-sm"
                />
                <div className="min-w-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate block">
                    {hideActor ? "Account Activity" : (selectedLog.actor_display_name || selectedLog.user || selectedLog.actor || "System")}
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                    {hideActor ? (selectedLog.actor_display_name || selectedLog.user || selectedLog.actor) : (selectedLog.role || "System")}
                    {selectedLog.officeName ? ` • ${selectedLog.officeName}` : selectedLog.scope ? ` • ${selectedLog.scope}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(BADGE_PALETTES.gray, "font-sans tabular-nums text-xs", COMPACT_BADGE_BASE)}>
                  #LOG-{selectedLog.rawId ?? selectedLog.id}
                </span>
                {severityInfo && (
                  <span
                    className={cn(severityInfo.classes, COMPACT_BADGE_BASE)}
                  >
                    {severityInfo.label}
                  </span>
                )}
              </div>
            </div>

            {/* 1. Event Specification (Standard Information Rows) */}
            <div className="space-y-2">
              <SheetSectionHeading icon={Shield01Icon} title="Event Specification" />

              <div className="divide-y-0">
                <InfoRow
                  icon=" Tag01Icon"
                  label="Log Sequence ID"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 font-semibold">
                      #{selectedLog.rawId ?? selectedLog.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyField(String(selectedLog.rawId ?? selectedLog.id), "Log ID", "log_id")}
                      className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                      title="Copy Log ID"
                    >
                      {copiedField === "log_id" ? (
                        <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                      ) : (
                        <Copy01Icon size="1em" className="text-[11px]" />
                      )}
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
                      className={cn(severityInfo.classes, BADGE_BASE)}
                    >
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
                      {selectedLog.actor_display_name || selectedLog.user || selectedLog.actor}
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
                            onClick={() => handleCopyField(selectedLog.entityId, "Reference ID", "ref_id")}
                            className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                            title="Copy Reference ID"
                          >
                            {copiedField === "ref_id" ? (
                              <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                            ) : (
                              <Copy01Icon size="1em" className="text-[11px]" />
                            )}
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
                      <NarrativeText text={selectedLog.details} mode="full" />
                    </div>
                    {selectedLog.details && (
                      <CopyButton
                        iconOnly
                        textToCopy={() => formatLogDetails(selectedLog.details)}
                        entityName="Narrative"
                        idleLabel="Copy full narrative"
                      />
                    )}
                  </div>
                </InfoRow>
              </div>
            </div>

            {/* 2. Network & Forensic Origin (Standard Information Rows) */}
            <div className="space-y-2">
              <SheetSectionHeading icon={GlobeIcon} title="Forensic & Network Origin" />

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
                        onClick={() => handleCopyField(selectedLog.ip, "IP Address", "ip")}
                        className="w-5 h-5 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Copy IP"
                      >
                        {copiedField === "ip" ? (
                          <Tick01Icon size="1em" className="text-[11px] text-gray-700 dark:text-zinc-200" />
                        ) : (
                          <Copy01Icon size="1em" className="text-[11px]" />
                        )}
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedLog(null)}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          <div>
            {selectedLog && (
              <CopyButton
                iconOnly
                textToCopy={() => JSON.stringify(selectedLog, null, 2)}
                entityName="Record Data"
                idleLabel="Copy Record Data"
              />
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
