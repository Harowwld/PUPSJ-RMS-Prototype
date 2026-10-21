"use client";

import { useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn, formatTitleCase } from "@/lib/utils";
import { formatPHDateTime } from "@/lib/timeFormat";
import { getRequestCharterStatus } from "@/lib/citizenCharter";
import { ALLOWED_REOPEN_TRANSITIONS } from "@/lib/constants";

export function getRequestStatusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") {
    return "bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40";
  }
  if (s === "PENDINGPAYMENT" || s === "DEFICIENT") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/40";
  }
  if (s === "PROCESSING" || s === "INPROGRESS") {
    return "bg-[#DBEAFE] text-[#1E40AF] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40";
  }
  if (s === "READY" || s === "DONE" || s === "COMPLETED") {
    return "bg-[#D1FAE5] text-[#065F46] dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40";
  }
  if (s === "CANCELLED") {
    return "bg-gray-100 text-gray-600 dark:bg-zinc-800/50 dark:text-zinc-400 border border-gray-200/60 dark:border-zinc-700/60";
  }
  if (s === "SHREDDED") {
    return "bg-[#FEE2E2] text-[#991B1B] dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-900/40";
  }
  return "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 border border-gray-200/60 dark:border-zinc-700/60";
}

export function getRequestStatusDotClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "READY" || s === "DONE" || s === "COMPLETED") return "bg-emerald-500";
  if (s === "PROCESSING" || s === "INPROGRESS") return "bg-blue-500";
  if (s === "PENDING" || s === "PENDINGPAYMENT" || s === "DEFICIENT") return "bg-amber-500";
  if (s === "SHREDDED") return "bg-rose-500";
  return "bg-gray-400";
}

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

export default function DocumentRequestDetailSheet({
  open,
  onOpenChange,
  selectedId,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
  detail,
  detailLoading,
  editStatus,
  setEditStatus,
  editUpdateMessage,
  setEditUpdateMessage,
  availableStatuses = [],
  isTerminalStatus,
  saving,
  hasEdits,
  handleResetEdits,
  handleManualSave,
  patchDetail,
  studentForRequest,
  requestNeedsPhysicalVerification,
  setFileWarningOpen,
  onLocateOnMap,
  setPdfPreviewData,
  setPdfPreviewOpen,
  slaStandards,
  setReopenTargetStatus,
  setReopenReason,
  setReopenModalOpen,
  retentionExpiryDate,
  daysRemaining,
}) {
  if (!open) return null;

  const charter = detail ? getRequestCharterStatus(detail, slaStandards) : null;
  const isParent = detail?.client_type === "Parent";
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];

  const displayName = formatTitleCase(detail?.student_name || detail?.requester_name) || "Requester";
  const initials = useMemo(() => {
    if (!displayName) return "RQ";
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  const handleLocateCoordinates = () => {
    const target = studentForRequest || (detail?.room ? {
      room: detail.room,
      cabinet: detail.cabinet,
      drawer: detail.drawer,
      studentNo: detail.student_no,
      name: detail.student_name || detail.requester_name,
    } : null);
    if (!target) return;
    if (requestNeedsPhysicalVerification) {
      setFileWarningOpen?.(true);
      return;
    }
    onLocateOnMap?.(target);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
      }}
    >
      <SheetContent
        side="right"
        size="default"
        showCloseButton={false}
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Top Header matching reference design: Request Details < > 01 of 100 X */}
        <SheetHeader className="shrink-0 p-0 border-b border-border dark:border-border bg-white dark:bg-card">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <SheetTitle className="text-base font-bold text-gray-900 dark:text-zinc-50 tracking-tight">
                Request Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and actions for document request
              </SheetDescription>
            </div>

            <div className="flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={currentIndex <= 0}
                    onClick={onNavigatePrev}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Previous Request"
                    title="Previous Request"
                  >
                    <HugeIcon className="ph-bold ph-caret-left text-xs" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex >= totalCount - 1}
                    onClick={onNavigateNext}
                    className="w-7 h-7 rounded-lg border border-border/80 dark:border-border flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Next Request"
                    title="Next Request"
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
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <HugeIcon className="ph-bold ph-x text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Single-Column Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-2xl dark:bg-muted" />
              <Skeleton className="h-32 w-full rounded-2xl dark:bg-muted" />
              <Skeleton className="h-32 w-full rounded-2xl dark:bg-muted" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Profile Card Summary Strip */}
              <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-pup-maroon/10 dark:bg-red-950/40 text-pup-maroon dark:text-red-400 border border-pup-maroon/20 flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono truncate mt-0.5">
                      {detail.student_no ? `Student No: ${detail.student_no}` : `Client: ${detail.client_type || "Requester"}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(studentForRequest || detail.room) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleLocateCoordinates}
                      className="h-8 px-3 text-xs font-semibold rounded-xl btn-brand-red text-white! cursor-pointer shadow-xs active:scale-95"
                      style={{ color: "#ffffff" }}
                      title="Locate filing location on archive map"
                    >
                      <HugeIcon className="ph-bold ph-warehouse text-xs mr-1.5" />
                      Locate
                    </Button>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                      getRequestStatusBadgeClass(detail.status)
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", getRequestStatusDotClass(detail.status))} />
                    {detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}
                  </span>
                </div>
              </div>

              {/* 1. Candidate / Requester Information (Standard Info List) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                  <HugeIcon className="ph-bold ph-identification-card text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Requester Information
                  </h3>
                </div>

                <div className="divide-y-0">
                  <InfoRow
                    icon="ph-bold ph-user"
                    label="Requester Name"
                    value={displayName}
                  />

                  <InfoRow
                    icon="ph-bold ph-tag"
                    label="Classification"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                        isParent
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40"
                          : detail.client_type === "Alumni"
                          ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/30"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/30"
                      )}
                    >
                      {isParent ? "Parent / Guardian" : detail.client_type === "Alumni" ? "Alumni" : "Enrolled Student"}
                    </span>
                  </InfoRow>

                  {detail.student_no && (
                    <InfoRow
                      icon="ph-bold ph-hash"
                      label="Student Number"
                    >
                      <span className="font-mono text-gray-800 dark:text-zinc-200 font-semibold">
                        {detail.student_no}
                      </span>
                    </InfoRow>
                  )}

                  <InfoRow
                    icon="ph-bold ph-graduation-cap"
                    label="Academic Program"
                    value={
                      detail.course_code
                        ? `${detail.course_code}${detail.course_name ? ` — ${detail.course_name}` : ""}`
                        : studentForRequest?.courseCode || "N/A"
                    }
                  />

                  <InfoRow
                    icon="ph-bold ph-phone"
                    label="Contact Number"
                    value={detail.requester_contact || "N/A"}
                  />

                  <InfoRow
                    icon="ph-bold ph-envelope"
                    label="Email Address"
                    value={detail.requester_email || detail.email || "N/A"}
                  />

                  {/* Parent / Guardian specifics */}
                  {isParent && (
                    <>
                      <InfoRow
                        icon="ph-bold ph-user-circle"
                        label="Representative"
                        value={detail.requester_name || "N/A"}
                      />
                      <InfoRow
                        icon="ph-bold ph-users"
                        label="Relationship"
                        value={detail.requester_relationship || "Legal Guardian"}
                      />
                      <InfoRow
                        icon="ph-bold ph-shield-check"
                        label="SPA Status"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {detail.spa_verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <HugeIcon className="ph-fill ph-check-circle text-xs" />
                              SPA Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <HugeIcon className="ph-fill ph-clock text-xs" />
                              Verification Pending
                            </span>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            disabled={saving}
                            onClick={() => patchDetail({ spaVerified: !detail.spa_verified })}
                            className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            {detail.spa_verified ? "Revoke SPA" : "Verify SPA"}
                          </Button>
                        </div>
                      </InfoRow>
                    </>
                  )}

                  <InfoRow
                    icon="ph-bold ph-chat-text"
                    label="Stated Purpose"
                    value={detail.notes || "No stated purpose entered."}
                  />
                </div>
              </div>

              {/* 2. Document & Archival Information (Standard Info List) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                  <HugeIcon className="ph-bold ph-file-text text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Request & Archival Details
                  </h3>
                </div>

                <div className="divide-y-0">
                  <InfoRow
                    icon="ph-bold ph-files"
                    label="Document Requested"
                    value={detail.doc_type || "N/A"}
                  />

                  <InfoRow
                    icon="ph-bold ph-calendar-blank"
                    label="Date Submitted"
                    value={formatPHDateTime(detail.created_at)}
                  />

                  {charter && (
                    <>
                      <InfoRow
                        icon="ph-bold ph-hourglass-high"
                        label="Target Deadline"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">
                            {charter.deadlineFormatted}
                          </span>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", charter.badgeClass)}>
                            <HugeIcon className={cn("ph-bold", charter.icon || "ph-clock")} />
                            {charter.label}
                          </span>
                        </div>
                      </InfoRow>

                      <InfoRow
                        icon="ph-bold ph-gauge"
                        label="Service Standard"
                      >
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold", charter.tier.badgeClass)}>
                          {charter.tier.name} ({charter.tier.days} {slaStandards?.workingDaysOnly !== false ? "working days" : "calendar days"})
                        </span>
                      </InfoRow>
                    </>
                  )}

                  <InfoRow
                    icon="ph-bold ph-warehouse"
                    label="Archive Location"
                  >
                    {studentForRequest || detail.room ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-gray-800 dark:text-zinc-200">
                          Room {detail.room || studentForRequest?.room} • Cabinet {detail.cabinet || studentForRequest?.cabinet} • Drawer {detail.drawer || studentForRequest?.drawer}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleLocateCoordinates}
                          className="h-6 px-2 text-[10px] font-semibold rounded-md border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
                        >
                          Locate
                        </Button>
                      </div>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-normal">
                        No active storage coordinates mapped.
                      </span>
                    )}
                  </InfoRow>

                  <InfoRow
                    icon="ph-bold ph-check-circle"
                    label="Current Status"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        getRequestStatusBadgeClass(detail.status)
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", getRequestStatusDotClass(detail.status))} />
                      {detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}
                    </span>
                  </InfoRow>
                </div>
              </div>

              {/* 3. Supporting Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                  <div className="flex items-center gap-2">
                    <HugeIcon className="ph-bold ph-paperclip text-pup-maroon dark:text-red-400 text-sm" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                      Supporting Attachments ({attachments.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400">Official uploads</span>
                </div>

                {attachments.length === 0 ? (
                  <div className="py-4 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
                    No supporting attachments uploaded for this request.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 dark:border-border divide-y divide-border/70 dark:divide-border overflow-hidden bg-white dark:bg-zinc-900/30">
                    {attachments.map((att) => {
                      const isPdf = att.original_filename?.toLowerCase().endsWith(".pdf") || att.mime_type === "application/pdf";
                      const fileUrl = att.url || `/api/document-requests/${detail.id}/attachments/${att.id}`;
                      const typeLabel =
                        att.attachment_type === "spa"
                          ? "Special Power of Attorney (SPA)"
                          : att.attachment_type === "valid_id"
                          ? "Valid Government ID"
                          : att.attachment_type === "receipt"
                          ? "Proof of Payment"
                          : att.attachment_type === "clearance"
                          ? "Clearance Slip"
                          : "Supporting Document";

                      return (
                        <div
                          key={att.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-border/60">
                              <HugeIcon className={isPdf ? "ph-bold ph-file-pdf text-red-500 text-base" : "ph-bold ph-file-image text-blue-500 text-base"} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block">
                                {att.original_filename}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                                  {typeLabel}
                                </span>
                                {att.size_bytes && (
                                  <>
                                    <span className="text-gray-300 dark:text-zinc-600">•</span>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                      {(att.size_bytes / 1024).toFixed(1)} KB
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPdf && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPdfPreviewData?.({
                                    url: fileUrl,
                                    title: att.original_filename,
                                    subtitle: `${typeLabel} for Request #${detail.id}`,
                                    studentName: detail.student_name || "Requester",
                                    docType: typeLabel,
                                    originalFilename: att.original_filename,
                                  });
                                  setPdfPreviewOpen?.(true);
                                }}
                                className="h-7 px-2.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-2xs cursor-pointer active:scale-95 transition-all"
                              >
                                Preview
                              </Button>
                            )}
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={att.original_filename}
                              className="inline-flex items-center justify-center h-7 px-2.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Workflow Stage Progression & Action */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                  <HugeIcon className="ph-bold ph-sliders text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    {isTerminalStatus ? "Request Lifecycle State" : "Workflow Stage Progression"}
                  </h3>
                </div>

                {isTerminalStatus ? (
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between gap-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <HugeIcon className="ph-bold ph-lock-simple text-gray-400 text-xs" />
                        <span>{detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Fulfilled / Closed
                      </span>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                        onClick={() => {
                          const allowed = ALLOWED_REOPEN_TRANSITIONS[detail.status] || ["InProgress"];
                          setReopenTargetStatus?.(allowed[0] || "InProgress");
                          setReopenReason?.("");
                          setReopenModalOpen?.(true);
                        }}
                      >
                        Reopen Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                        Advance Request Stage
                      </label>
                      <Select
                        className="w-full h-10 py-1 px-3 text-xs font-semibold text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-border dark:border-border rounded-xl shadow-none cursor-pointer"
                        buttonClassName="h-10 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 border-border dark:border-border text-gray-900 dark:text-zinc-100"
                        value={editStatus}
                        disabled={saving}
                        onChange={(e) => {
                          const val = e?.target?.value || e;
                          setEditStatus?.(val);
                        }}
                        onValueChange={(val) => setEditStatus?.(val)}
                        usePortal={false}
                      >
                        {availableStatuses.map((s) => (
                          <option key={s} value={s}>
                            {s === "InProgress" ? "In Progress" : s}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          Milestone Notice to Requester
                        </label>
                        <span className="text-[10px] text-gray-400">Visible in tracking portal</span>
                      </div>
                      <textarea
                        className="w-full min-h-[72px] p-3 text-xs text-gray-900 dark:text-zinc-100 bg-gray-50/60 dark:bg-zinc-800/50 border border-border dark:border-border rounded-xl focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                        value={editUpdateMessage}
                        onChange={(e) => setEditUpdateMessage?.(e.target.value)}
                        placeholder={
                          editStatus !== detail.status
                            ? "Optional: Add custom instructions (or leave empty to post standard milestone notification)..."
                            : "e.g. Document printed and certified, awaiting dry seal..."
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 90-Day Retention Notice */}
              {detail.status === "Ready" && retentionExpiryDate && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-950/40 dark:bg-amber-950/15">
                  <div className="flex gap-2.5">
                    <HugeIcon className="ph-bold ph-calendar-blank text-amber-700 dark:text-amber-500 text-lg shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px] uppercase">
                        PUP ODRS Retention Policy
                      </span>
                      <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                        Unclaimed documents are shredded after 90 days according to ODRS policy.
                      </span>
                      <span className="text-amber-800 dark:text-amber-400 font-bold block mt-1 flex items-center gap-1.5">
                        <HugeIcon className="ph-bold ph-warning" />
                        Shred Schedule: {retentionExpiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {daysRemaining !== null && (
                          <span className="text-gray-500 dark:text-zinc-500 font-normal">({daysRemaining > 0 ? `${daysRemaining}d left` : "Expired"})</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Activity History / Timeline */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-border/80 dark:border-border">
                  <HugeIcon className="ph-bold ph-clock-counter-clockwise text-pup-maroon dark:text-red-400 text-sm" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                    Activity History ({detail.updates?.length || 0})
                  </h3>
                </div>

                {Array.isArray(detail.updates) && detail.updates.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detail.updates.map((u, idx) => (
                      <div
                        key={u.id || idx}
                        className="p-3 rounded-xl bg-gray-50/70 dark:bg-zinc-900/40 border border-border/80 dark:border-border text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-800 dark:text-zinc-200">
                            {u.status === "InProgress" ? "In Progress" : u.status}
                          </span>
                          <span className="text-gray-400 dark:text-zinc-500 font-mono text-[10px]">
                            {formatPHDateTime(u.created_at)}
                          </span>
                        </div>
                        {u.message && (
                          <p className="text-gray-600 dark:text-zinc-300 text-xs leading-relaxed">
                            {u.message}
                          </p>
                        )}
                        <div className="text-[10px] text-gray-400 dark:text-zinc-500">
                          By {u.actor_name || "Staff"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-3 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
                    No activity records logged yet.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Executive Footer - Clean Action Bar */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex items-center justify-between gap-3 flex-row">
          <div>
            {hasEdits && (
              <Button
                type="button"
                variant="outline"
                onClick={handleResetEdits}
                disabled={saving}
                className="h-10 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Reset Changes
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              Close
            </Button>
            {hasEdits && (
              <Button
                type="button"
                className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                style={{ color: "#ffffff" }}
                onClick={handleManualSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
