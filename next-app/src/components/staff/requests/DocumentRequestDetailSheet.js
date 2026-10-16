"use client";

import { useState } from "react";
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

export default function DocumentRequestDetailSheet({
  open,
  onOpenChange,
  selectedId,
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
  const [mobileTab, setMobileTab] = useState("overview"); // "overview" | "attachments" | "workflow" | "history"

  if (!open) return null;

  const charter = detail ? getRequestCharterStatus(detail, slaStandards) : null;
  const isParent = detail?.client_type === "Parent";
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-[50vw] xl:max-w-[50vw] data-[side=right]:w-full data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl data-[side=right]:lg:max-w-[50vw] data-[side=right]:xl:max-w-[50vw] flex flex-col h-full bg-white dark:bg-card border-l border-border dark:border-border p-0 shadow-2xl overflow-hidden"
      >
        {/* Executive Header */}
        <SheetHeader className="shrink-0 p-6 pb-4 pr-16 border-b border-border dark:border-border bg-gradient-to-r from-gray-50/90 via-white to-gray-50/50 dark:from-zinc-900/90 dark:via-card dark:to-zinc-900/50 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-pup-maroon dark:bg-red-950/40 dark:text-red-400 border border-pup-maroon/20">
                #REQ-{selectedId || detail?.id}
              </span>

              {detail && (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border",
                      isParent
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40"
                        : detail.client_type === "Alumni"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/30"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/30"
                    )}
                  >
                    {isParent ? "Parent/Guardian" : detail.client_type === "Alumni" ? "Alumni" : "Student"}
                  </span>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0",
                      getRequestStatusBadgeClass(detail.status)
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", getRequestStatusDotClass(detail.status))} />
                    {detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}
                  </span>
                </>
              )}
            </div>

            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-zinc-50 leading-snug truncate">
              {detail?.doc_type || "Document Request"}
            </SheetTitle>

            <SheetDescription className="mt-1 text-xs text-gray-500 dark:text-zinc-400 flex items-center gap-2 flex-wrap">
              <span>Requester: <strong className="text-gray-900 dark:text-zinc-200">{formatTitleCase(detail?.student_name || detail?.requester_name) || "N/A"}</strong></span>
              {detail?.student_no && (
                <>
                  <span>•</span>
                  <span className="font-mono text-gray-700 dark:text-zinc-300 font-semibold">{detail.student_no}</span>
                </>
              )}
              {detail?.created_at && (
                <>
                  <span>•</span>
                  <span>Logged {formatPHDateTime(detail.created_at)}</span>
                </>
              )}
            </SheetDescription>
          </div>

          {/* Mobile Tab Switcher (< md) */}
          <div className="mt-4 pt-3 border-t border-border/80 dark:border-border flex md:hidden items-center justify-between gap-1 bg-gray-100/70 dark:bg-zinc-800/50 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileTab("overview")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "overview"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("attachments")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "attachments"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Files ({attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("workflow")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "workflow"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              Decision
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("history")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer",
                mobileTab === "history"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:text-zinc-400"
              )}
            >
              History
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl dark:bg-muted" />
              <Skeleton className="h-24 w-full rounded-2xl dark:bg-muted" />
              <Skeleton className="h-32 w-full rounded-2xl dark:bg-muted" />
            </div>
          ) : detail ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Requester Profile, Coordinates, Purpose, Attachments */}
              <div
                className={cn(
                  "md:col-span-7 space-y-6",
                  mobileTab !== "overview" && mobileTab !== "attachments" && "hidden md:block"
                )}
              >
                {/* Requester Identity Bento */}
                {(mobileTab === "overview" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-user text-xs" />
                      Requester Profile
                    </h4>

                    <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-base font-bold text-gray-900 dark:text-zinc-100">
                            {formatTitleCase(detail.student_name || detail.requester_name) || "N/A"}
                          </span>
                          {detail.student_no && (
                            <div className="mt-1">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-border/80 dark:border-border">
                                {detail.student_no}
                              </span>
                            </div>
                          )}
                        </div>

                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                            isParent
                              ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40"
                              : detail.client_type === "Alumni"
                              ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/30"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/30"
                          )}
                        >
                          {isParent ? "Parent / Guardian" : detail.client_type === "Alumni" ? "Alumni" : "Enrolled Student"}
                        </span>
                      </div>

                      {/* Parent relationship specifics */}
                      {isParent && (
                        <div className="pt-2.5 border-t border-border/80 dark:border-border text-xs text-gray-600 dark:text-zinc-300 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Representative:</span>
                            <span className="font-semibold text-gray-900 dark:text-zinc-100">{detail.requester_name || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Relationship:</span>
                            <span className="font-semibold text-gray-900 dark:text-zinc-100">{detail.requester_relationship || "Legal Guardian"}</span>
                          </div>
                          {detail.requester_contact && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Contact No:</span>
                              <span className="font-mono font-medium text-gray-900 dark:text-zinc-100">{detail.requester_contact}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Program information */}
                      {(detail.course_code || studentForRequest?.courseCode) && (
                        <div className="pt-2.5 border-t border-border/80 dark:border-border text-xs">
                          <span className="text-gray-500 dark:text-zinc-400">Academic Program: </span>
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">
                            {detail.course_code || studentForRequest?.courseCode}
                            {detail.course_name ? ` — ${detail.course_name}` : ""}
                          </span>
                        </div>
                      )}

                      {/* Requester email */}
                      {(detail.requester_email || detail.email) && (
                        <div className="pt-2.5 border-t border-border/80 dark:border-border text-xs text-gray-600 dark:text-zinc-400 flex items-center gap-1.5">
                          <HugeIcon className="ph-bold ph-envelope text-gray-400" />
                          <span className="truncate">{detail.requester_email || detail.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Physical Storage Location Coordinates Card */}
                {(mobileTab === "overview" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-archive text-xs" />
                      Physical Archive Filing Location
                    </h4>

                    <div className="rounded-2xl border border-border/80 dark:border-border bg-gradient-to-br from-gray-50/80 via-white to-gray-50/40 dark:from-zinc-900/60 dark:via-card dark:to-zinc-900/40 p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-pup-maroon text-white flex items-center justify-center shadow-xs shrink-0">
                            <HugeIcon className="ph-bold ph-warehouse text-lg" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                              Storage Coordinates
                            </span>
                            {studentForRequest || detail.room ? (
                              <div className="text-sm font-bold text-gray-900 dark:text-zinc-100 mt-0.5 flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                                  Room {detail.room || studentForRequest?.room}
                                </span>
                                <span className="text-gray-300 dark:text-zinc-600">•</span>
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                                  Cabinet {detail.cabinet || studentForRequest?.cabinet}
                                </span>
                                <span className="text-gray-300 dark:text-zinc-600">•</span>
                                <span className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-zinc-700">
                                  Drawer {detail.drawer || studentForRequest?.drawer}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                {detail.student_no
                                  ? "No active storage coordinates mapped."
                                  : "Alumni record without assigned filing coordinates."}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          disabled={!studentForRequest && !detail.room}
                          onClick={() => {
                            const target = studentForRequest || (detail.room ? {
                              room: detail.room,
                              cabinet: detail.cabinet,
                              drawer: detail.drawer,
                              studentNo: detail.student_no,
                              name: detail.student_name || detail.requester_name,
                            } : null);
                            if (!target) return;
                            if (requestNeedsPhysicalVerification) {
                              setFileWarningOpen(true);
                              return;
                            }
                            onLocateOnMap(target);
                          }}
                          className="h-9 px-4 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
                          style={{ color: "#ffffff" }}
                        >
                          Locate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* RA 10173 SPA Verification Callout (For Parent Releases) */}
                {isParent && (mobileTab === "overview" || typeof window === "undefined") && (
                  <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <HugeIcon className="ph-bold ph-shield-check text-amber-700 dark:text-amber-400 text-base" />
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                          Special Power of Attorney (SPA) Verification
                        </span>
                      </div>
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
                    </div>
                    <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      {detail.spa_verified
                        ? `SPA and identity verified by ${detail.spa_verified_by || "Registrar Staff"} ${detail.spa_verified_at ? `on ${formatPHDateTime(detail.spa_verified_at)}` : ""}. Authorized for release under RA 10173.`
                        : "Under RA 10173 (Data Privacy Act), third-party parent/guardian releases strictly require verifying the attached Special Power of Attorney and valid government ID before issuing official documents."}
                    </p>
                    <div className="pt-1 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        onClick={() => patchDetail({ spaVerified: !detail.spa_verified })}
                        className={cn(
                          "h-8 px-4 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95",
                          detail.spa_verified
                            ? "border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                        )}
                      >
                        {detail.spa_verified ? "Revoke" : "Verify"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stated Purpose */}
                {(mobileTab === "overview" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-chat-text text-xs" />
                      Requester Stated Purpose
                    </h4>
                    <div className="p-4 rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 text-xs text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {detail.notes || <span className="text-gray-400 italic">No stated purpose entered by requester.</span>}
                    </div>
                  </div>
                )}

                {/* Supporting Attachments Section */}
                {(mobileTab === "attachments" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                        <HugeIcon className="ph-bold ph-paperclip text-xs" />
                        Supporting Attachments ({attachments.length})
                      </h4>
                      <span className="text-[11px] text-gray-400">Official student / parent uploads</span>
                    </div>

                    {attachments.length === 0 ? (
                      <div className="p-6 text-center rounded-2xl border border-dashed border-border dark:border-border text-xs text-gray-400 dark:text-zinc-500 bg-gray-50/40 dark:bg-zinc-900/20">
                        <HugeIcon className="ph-duotone ph-files text-2xl mb-1.5 block mx-auto opacity-50" />
                        No supporting attachments uploaded for this request.
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border/80 dark:border-border overflow-hidden divide-y divide-border/80 dark:divide-border bg-white dark:bg-zinc-900/30">
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
                              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-border/60 dark:border-border">
                                  <HugeIcon className={isPdf ? "ph-bold ph-file-pdf text-red-500 text-lg" : "ph-bold ph-file-image text-blue-500 text-lg"} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100 truncate block">
                                    {att.original_filename}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                      {typeLabel}
                                    </span>
                                    {att.size_bytes && (
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        {(att.size_bytes / 1024).toFixed(1)} KB
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {isPdf && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPdfPreviewData({
                                        url: fileUrl,
                                        title: att.original_filename,
                                        subtitle: `${typeLabel} for Request #${detail.id}`,
                                        studentName: detail.student_name || "Requester",
                                        docType: typeLabel,
                                        originalFilename: att.original_filename,
                                      });
                                      setPdfPreviewOpen(true);
                                    }}
                                    className="h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                                  >
                                    Preview
                                  </Button>
                                )}
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.original_filename}
                                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs active:scale-95 transition-all cursor-pointer"
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
                )}
              </div>

              {/* Right Column: SLA Turnaround, Decision Rail, Activity Log */}
              <div
                className={cn(
                  "md:col-span-5 space-y-6",
                  mobileTab !== "workflow" && mobileTab !== "history" && "hidden md:block"
                )}
              >
                {/* Service Standard (SLA) Turnaround Card */}
                {charter && (mobileTab === "workflow" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                        <HugeIcon className="ph-bold ph-gauge text-xs" />
                        Service Standard (SLA)
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        {slaStandards?.workingDaysOnly !== false ? "working days" : "calendar days"}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/60 dark:bg-zinc-900/40 p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold", charter.tier.badgeClass)}>
                          {charter.tier.name} ({charter.tier.days} Days)
                        </span>
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold", charter.badgeClass)}>
                          <HugeIcon className={cn("ph-bold", charter.icon || "ph-clock")} />
                          {charter.label}
                        </span>
                      </div>
                      <div className="text-xs pt-1 border-t border-border/60 dark:border-border flex items-center justify-between">
                        <span className="text-gray-500">Target Deadline:</span>
                        <span className="font-semibold text-gray-900 dark:text-zinc-100">{charter.deadlineFormatted}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                        {charter.detail}. {charter.tier.description}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Status & Decision Action Rail */}
                {(mobileTab === "workflow" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-sliders text-xs" />
                      {isTerminalStatus ? "Request Lifecycle State" : "Workflow Stage Progression"}
                    </h4>

                    <div className="rounded-2xl border border-border/80 dark:border-border bg-white dark:bg-zinc-900/40 p-4 space-y-3.5 shadow-xs">
                      {isTerminalStatus ? (
                        <div className="space-y-2">
                          <div className="h-10 px-3.5 rounded-xl border border-border dark:border-border bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-between gap-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200">
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
                              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              onClick={() => {
                                const allowed = ALLOWED_REOPEN_TRANSITIONS[detail.status] || ["InProgress"];
                                setReopenTargetStatus(allowed[0] || "InProgress");
                                setReopenReason("");
                                setReopenModalOpen(true);
                              }}
                            >
                              Reopen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
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
                              setEditStatus(val);
                            }}
                            onValueChange={(val) => setEditStatus(val)}
                            usePortal={false}
                          >
                            {availableStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s === "InProgress" ? "In Progress" : s}
                              </option>
                            ))}
                          </Select>
                        </div>
                      )}

                      {/* Add Timeline Update Message */}
                      <div className="space-y-1.5 pt-2 border-t border-border/80 dark:border-border">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                            {isTerminalStatus ? "Archival Audit Note" : "Milestone Notice to Requester"}
                          </label>
                          <span className="text-[10px] text-gray-400">
                            {isTerminalStatus ? "Audit record" : "Visible in tracking portal"}
                          </span>
                        </div>
                        <textarea
                          className="w-full min-h-[80px] p-3 text-xs text-gray-900 dark:text-zinc-100 bg-gray-50/60 dark:bg-zinc-800/50 border border-border dark:border-border rounded-xl focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                          value={editUpdateMessage}
                          onChange={(e) => setEditUpdateMessage(e.target.value)}
                          placeholder={
                            isTerminalStatus
                              ? "Add an archival note or release verification detail..."
                              : editStatus !== detail.status
                              ? "Optional: Add custom instructions (or leave empty to post standard milestone notification)..."
                              : "e.g. Document printed and certified, awaiting dry seal..."
                          }
                        />
                      </div>

                      {/* Save Action Button */}
                      {hasEdits && (
                        <div className="pt-2 flex items-center justify-end gap-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all"
                            onClick={handleResetEdits}
                            disabled={saving}
                          >
                            Reset
                          </Button>
                          <Button
                            type="button"
                            className="h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                            style={{ color: "#ffffff" }}
                            onClick={handleManualSave}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 90-Day Retention Notice */}
                {detail.status === "Ready" && retentionExpiryDate && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-950/40 dark:bg-amber-950/15">
                    <div className="flex gap-3">
                      <HugeIcon className="ph-bold ph-calendar-blank text-amber-700 dark:text-amber-500 text-xl shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px] uppercase">
                          PUP ODRS Retention Policy
                        </span>
                        <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                          Unclaimed documents are shredded after 90 days according to ODRS policy.
                        </span>
                        <span className="text-amber-800 dark:text-amber-400 font-bold block mt-1.5 flex items-center gap-1.5">
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

                {/* Activity Log / Timeline */}
                {(mobileTab === "history" || typeof window === "undefined") && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-clock-counter-clockwise text-xs" />
                      Activity History ({detail.updates?.length || 0})
                    </h4>

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
                      <div className="p-4 text-center rounded-2xl border border-dashed border-border dark:border-border text-xs text-gray-400 dark:text-zinc-500">
                        No activity records logged yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Executive Footer */}
        <SheetFooter className="shrink-0 p-4 px-6 border-t border-border dark:border-border bg-gray-50/70 dark:bg-zinc-900/40 flex items-center justify-between flex-row">
          <span className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
            {detail ? `Transaction ID: REQ-${detail.id}` : ""}
          </span>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
