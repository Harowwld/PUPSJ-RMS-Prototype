"use client";
import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { MISSING_DOCUMENTS_INQUIRY } from "@/lib/missingDocumentsInquiry";
import SheetPagination from "@/components/shared/SheetPagination";
import { Textarea } from "@/components/ui/textarea";

import { useMemo } from "react";

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
import { COMPACT_BADGE_BASE, BADGE_BASE, BADGE_PALETTES, getStatusBadgeClass } from "@/lib/badgeStyles";
import { ALLOWED_REOPEN_TRANSITIONS } from "@/lib/constants";
import { AttachedFileCard } from "@/components/shared/FileAttachmentDropzone";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import NarrativeText from "@/components/shared/NarrativeText";
import { EmptyState } from "@/components/ui/empty";
import { Attachment01Icon, Clock01Icon, Alert02Icon, Calendar01Icon, Cancel01Icon, CheckmarkCircle01Icon, File02Icon, LockIcon, Time01Icon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
export function getRequestStatusBadgeClass(status) {
  return getStatusBadgeClass(status);
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
  const isInquiry = detail?.doc_type === MISSING_DOCUMENTS_INQUIRY;
  const isParent = detail?.client_type === "Parent";
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];

  const displayName = formatTitleCase(detail?.student_name || detail?.requester_name) || "Requester";
  const nameParts = displayName ? displayName.trim().split(/\s+/) : [];
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase() || "RQ";

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
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col h-full p-0 overflow-hidden"
      >
        <SheetHeader className="shrink-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <div>
              <SheetTitle>
                Request Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Detailed information and actions for document request
              </SheetDescription>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {typeof totalCount === "number" && totalCount > 1 && (
                <SheetPagination
                  compact
                  label="Record navigation"
                  page={Math.max(1, (currentIndex ?? 0) + 1)}
                  totalPages={totalCount}
                  onPrevious={onNavigatePrev}
                  onNext={onNavigateNext}
                  previousDisabled={currentIndex <= 0}
                  nextDisabled={currentIndex >= totalCount - 1}
                  previousLabel="Previous Request"
                  nextLabel="Next Request"
                />
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
                aria-label="Close"
                title="Close"
              >
                <Cancel01Icon size="1em" className="text-sm" />
              </button>
            </div>
          </div>
        </SheetHeader>

        {/* Line-Attached Edge-to-Edge Status Notice */}
        {detail && (
          <NoticeBanner tone={["Ready", "Completed"].includes(detail.status) ? "success" : ["PendingPayment", "Deficient"].includes(detail.status) ? "warning" : ["Cancelled", "Declined"].includes(detail.status) ? "danger" : "info"} title={detail.status === "Ready"
                  ? "Ready for Claiming"
                  : detail.status === "PendingPayment"
                  ? "Payment Required"
                  : detail.status === "Deficient"
                  ? "Deficiency Notice"
                  : detail.status === "Completed"
                  ? "Request Completed"
                  : detail.status === "InProgress"
                  ? "Fulfillment In Progress"
                  : "Pending Review"}>
            {detail.status === "Ready"
                ? "Document printed, certified, and ready for release at Registrar Window 1."
                : detail.status === "PendingPayment"
                ? "Awaiting proof of payment receipt upload from the student/client."
                : detail.status === "Deficient"
                ? "Additional credentials or clarification required before document issuance."
                : detail.status === "Completed"
                ? "Document claimed and transaction finalized in university archives."
                : detail.status === "InProgress"
                ? "Staff is actively retrieving records and compiling requested credentials."
                : "Awaiting staff evaluation and task assignment in ODRS queue."}
          </NoticeBanner>
        )}

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
              {/* Profile Identity Summary Strip (Unboxed) */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/80 dark:border-border">
                <div className="flex items-center gap-3.5 min-w-0">
                  <ProfileAvatar
                    id={studentForRequest?.id || studentForRequest?.account_id || studentForRequest?.accountId || studentForRequest?.studentNo || detail.student_no}
                    studentNo={studentForRequest?.studentNo || detail.student_no}
                    accountId={studentForRequest?.account_id || studentForRequest?.accountId}
                    avatarFilename={studentForRequest?.avatar_filename || studentForRequest?.avatarFilename}
                    name={displayName}
                    initials={initials}
                    className="size-11 rounded-full border border-pup-maroon/20 shadow-2xs"
                    fallbackClassName="bg-pup-maroon/10 font-bold text-sm text-pup-maroon dark:bg-red-950/40 dark:text-red-400"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base font-bold text-gray-900 dark:text-zinc-100 truncate">
                        {displayName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(getRequestStatusBadgeClass(detail.status), COMPACT_BADGE_BASE)}
                  >
                    {detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}
                  </span>
                </div>
              </div>

              {/* 1. Candidate / Requester Information (Standard Info List) */}
              <div className="space-y-2">
                <SheetSectionHeading icon="Contact01Icon" title="Requester Information" />

                <div className="divide-y-0">
                  <InfoRow
                    icon=" Tag01Icon"
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
                      icon=" Tag01Icon"
                      label="Student Number"
                    >
                      <span className="font-sans tabular-nums text-gray-800 dark:text-zinc-200 font-semibold">
                        {detail.student_no}
                      </span>
                    </InfoRow>
                  )}

                  <InfoRow
                    icon=" GraduationScrollIcon"
                    label="Academic Program"
                    value={
                      detail.course_code
                        ? `${detail.course_code}${detail.course_name ? ` — ${detail.course_name}` : ""}`
                        : studentForRequest?.courseCode || "N/A"
                    }
                  />

                  <InfoRow
                    icon=" CallIcon"
                    label="Contact Number"
                    value={detail.requester_contact || "N/A"}
                  />

                  <InfoRow
                    icon=" Mail01Icon"
                    label="Email Address"
                    value={detail.requester_email || detail.email || "N/A"}
                  />

                  {/* Parent / Guardian specifics */}
                  {(isParent || isInquiry) && (
                    <>
                      <InfoRow
                        icon=" UserCircleIcon"
                        label="Representative"
                        value={detail.requester_name || "N/A"}
                      />
                      {isParent && <InfoRow
                        icon=" UserSearch01Icon"
                        label="Relationship"
                        value={detail.requester_relationship || "Legal Guardian"}
                      />}
                      <InfoRow
                        icon=" Shield01Icon"
                        label={isInquiry ? "Requester Verification" : "SPA Status"}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {detail.spa_verified ? (
                            <span className={cn(BADGE_PALETTES.emerald, BADGE_BASE)}>
                              {isInquiry ? "Requester Verified" : "SPA Verified"}
                            </span>
                          ) : (
                            <span className={cn(BADGE_PALETTES.amber, BADGE_BASE)}>
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
                            {detail.spa_verified ? "Revoke Verification" : isInquiry ? "Verify Requester" : "Verify SPA"}
                          </Button>
                        </div>
                      </InfoRow>
                    </>
                  )}

                  <InfoRow
                    icon=" Message01Icon"
                    label="Stated Purpose"
                  >
                    {detail.notes ? (
                      <NarrativeText text={detail.notes} mode="full" />
                    ) : (
                      <span className="text-gray-400 dark:text-zinc-500">No stated purpose entered.</span>
                    )}
                  </InfoRow>
                </div>
              </div>

              {/* 2. Document & Archival Information (Standard Info List) */}
              <div className="space-y-2">
                <SheetSectionHeading icon={File02Icon} title="Request & Archival Details" />

                <div className="divide-y-0">
                  <InfoRow
                    icon=" Files01Icon"
                    label="Document Requested"
                    value={detail.doc_type || "N/A"}
                  />

                  <InfoRow
                    icon=" Calendar01Icon"
                    label="Date Submitted"
                    value={formatPHDateTime(detail.created_at)}
                  />

                  {charter && (
                    <>
                      <InfoRow
                        icon=" HourglassIcon"
                        label="Target Deadline"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">
                            {charter.deadlineFormatted}
                          </span>
                          <span className={cn(charter.badgeClass, BADGE_BASE)}>
                            {charter.label}
                          </span>
                        </div>
                      </InfoRow>

                      <InfoRow
                        icon=" DashboardSpeed01Icon"
                        label="Service Standard"
                      >
                        <span className={cn(charter.tier.badgeClass, BADGE_BASE)}>
                          {charter.tier.name} ({charter.tier.days} {slaStandards?.workingDaysOnly !== false ? "working days" : "calendar days"})
                        </span>
                      </InfoRow>
                    </>
                  )}

                  <InfoRow
                    icon=" WarehouseIcon"
                    label="Archive Location"
                  >
                    {studentForRequest || detail.room ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans tabular-nums text-xs font-semibold text-gray-800 dark:text-zinc-200">
                          Room {detail.room || studentForRequest?.room} • Cabinet {detail.cabinet || studentForRequest?.cabinet} • Drawer {detail.drawer || studentForRequest?.drawer}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleLocateCoordinates}
                          className="h-7 px-2.5"
                        >
                          Locate Drawer
                        </Button>
                      </div>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-normal">
                        No active storage coordinates mapped.
                      </span>
                    )}
                  </InfoRow>

                  <InfoRow
                    icon=" CheckmarkCircle01Icon"
                    label="Current Status"
                  >
                    <span
                      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", getRequestStatusBadgeClass(detail.status), BADGE_BASE)}
                    >
                      {detail.status === "InProgress" ? "In Progress" : detail.status === "PendingPayment" ? "Pending Payment" : detail.status}
                    </span>
                  </InfoRow>
                </div>
              </div>

              {/* 3. Supporting Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                  <SheetSectionHeading icon={Attachment01Icon} title={`Supporting Attachments (${attachments.length})`} divider={false} />
                  <span className="text-[11px] text-gray-400">Official uploads</span>
                </div>

                {attachments.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    icon={Attachment01Icon}
                    title="No Supporting Attachments"
                    description="No supporting attachments uploaded for this request."
                  />
                ) : (
                  <div className="flex flex-wrap items-start gap-3 pt-1">
                    {attachments.map((att) => {
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
                        <AttachedFileCard
                          key={att.id}
                          item={{ ...att, url: fileUrl }}
                          readOnly={true}
                          onPreview={() => {
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
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Workflow Stage Progression & Action */}
              <div className="space-y-3 pt-2">
                <SheetSectionHeading icon="SlidersHorizontalIcon" title={isTerminalStatus ? "Request Lifecycle State" : "Workflow Stage Progression"} />

                {isTerminalStatus ? (
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <LockIcon size="1em" className="text-gray-400 text-xs" />
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
                        className="h-8 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
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
                      <Textarea
                        className="w-full min-h-[72px] resize-none"
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
                    <Calendar01Icon size="1em" className="text-amber-700 dark:text-amber-500 text-lg shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-amber-950 dark:text-amber-300 block tracking-wider text-[10px] uppercase">
                        PUP ODRS Retention Policy
                      </span>
                      <span className="text-gray-600 dark:text-zinc-400 block mt-0.5 leading-normal">
                        Unclaimed documents are shredded after 90 days according to ODRS policy.
                      </span>
                      <span className="text-amber-800 dark:text-amber-400 font-bold block mt-1 flex items-center gap-1.5">
                        <Alert02Icon size={16}  />
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
                <SheetSectionHeading icon={Time01Icon} title={`Activity History (${detail.updates?.length || 0})`} />

                {Array.isArray(detail.updates) && detail.updates.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detail.updates.map((u, idx) => (
                      <div
                        key={u.id || idx}
                        className="p-3 rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 border border-border/70 dark:border-border/60 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-gray-800 dark:text-zinc-200">
                            {u.status === "InProgress" ? "In Progress" : u.status}
                          </span>
                          <span className="text-gray-400 dark:text-zinc-500 font-sans tabular-nums text-[10px]">
                            {formatPHDateTime(u.created_at)}
                          </span>
                        </div>
                        {u.message && (
                          <div className="text-gray-600 dark:text-zinc-300 text-xs leading-relaxed">
                            <NarrativeText text={u.message} mode="full" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                          <span>By {u.actor_name || "Staff"}</span>
                          {u.actor_id && (
                            <span className="font-sans tabular-nums text-[9px] px-1.5 py-0.2 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                              {u.actor_id}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    variant="compact"
                    icon={Clock01Icon}
                    title="No Activity Recorded Yet"
                    description="Updates to this request will appear here."
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Executive Footer - Clean Action Bar */}
        <SheetFooter className="shrink-0 p-4 px-6 flex items-center justify-between gap-3 flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Close
          </Button>

          {hasEdits && (
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetEdits}
                disabled={saving}
                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Reset Changes
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-4 cursor-pointer disabled:opacity-50"
                onClick={handleManualSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
