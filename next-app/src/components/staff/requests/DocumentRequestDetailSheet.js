"use client";
import { formatRequestStatus } from "@/lib/auditLogFormatting";
import DocumentRequestTimeline from "@/components/shared/DocumentRequestTimeline";
import CopyButton from "@/components/shared/CopyButton";
import NoticeBanner from "@/components/shared/NoticeBanner";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { MISSING_DOCUMENTS_INQUIRY } from "@/lib/missingDocumentsInquiry";
import SheetPagination from "@/components/shared/SheetPagination";
import { correctionRequirements, maxCorrectionItems } from "@/lib/requestCorrections";
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
import { COMPACT_BADGE_BASE, BADGE_PALETTES, getStatusBadgeClass } from "@/lib/badgeStyles";
import { ALLOWED_REOPEN_TRANSITIONS } from "@/lib/constants";
import { AttachmentViews } from "@/components/shared/FileAttachmentDropzone";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import NarrativeText from "@/components/shared/NarrativeText";
import { EmptyState } from "@/components/ui/empty";
import { Attachment01Icon, Calendar01Icon, Cancel01Icon, CheckmarkCircle01Icon, File02Icon, LockIcon } from "hugeicons-react";
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
  pickupInstructions,
  onPickupInstructionsChange,
  availableStatuses = [],
  isTerminalStatus,
  saving,
  hasEdits,
  correctionDraft = [],
  onCorrectionDraftChange,
  requestingCorrections,
  correctionDraftInvalid,
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

  const requiresDeficiencyMessage = editStatus === "Deficient" && detail?.status !== "Deficient" && !requestingCorrections;
  const charter = detail ? getRequestCharterStatus(detail, slaStandards) : null;
  const isInquiry = detail?.doc_type === MISSING_DOCUMENTS_INQUIRY;
  const isParent = detail?.client_type === "Parent";
  const attachments = Array.isArray(detail?.attachments) ? detail.attachments : [];

  const displayName = formatTitleCase(isParent ? detail?.requester_name : detail?.student_name || detail?.requester_name) || "Requester";

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
                Request details
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
                  ? (isInquiry ? "Inquiry Response Available" : "Ready for Pickup")
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
                ? (isInquiry ? "The Registrar’s response is available in the request timeline." : detail.pickup_instructions || "This request is ready for release.")
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
                    studentNo={isParent ? undefined : studentForRequest?.studentNo || detail.student_no}
                    accountId={isParent ? undefined : studentForRequest?.account_id || studentForRequest?.accountId}
                    avatarFilename={isParent ? null : studentForRequest?.avatar_filename || studentForRequest?.avatarFilename}
                    name={displayName}
                    className="size-11"
                    fallbackClassName="text-sm"
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
                    {formatRequestStatus(detail.status)}
                  </span>
                </div>
              </div>

              {/* 1. Candidate / Requester Information (Standard Info List) */}
              <div className="space-y-2">
                <SheetSectionHeading icon="Contact01Icon" title="Requester information" />

                <div className="divide-y-0">
                  <InfoRow
                    icon=" Tag01Icon"
                    label="Classification"
                  >
                    <span
                      className={cn(
                        COMPACT_BADGE_BASE,
                        isParent ? BADGE_PALETTES.amber
                          : detail.client_type === "Alumni" ? BADGE_PALETTES.purple : BADGE_PALETTES.blue,
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
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-semibold">{detail.student_no}</span>
                        <CopyButton iconOnly textToCopy={detail.student_no} entityName="Student Number" />
                      </div>
                    </InfoRow>
                  )}

                  <InfoRow
                    icon=" GraduationScrollIcon"
                    label="Academic Program"
                    value={
                      detail.course_code
                        ? `${detail.course_code}${detail.course_name ? `: ${detail.course_name}` : ""}`
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
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="break-all">{detail.requester_email || detail.email || "N/A"}</span>
                      {(detail.requester_email || detail.email) && (
                        <CopyButton iconOnly textToCopy={detail.requester_email || detail.email} entityName="Email Address" />
                      )}
                    </div>
                  </InfoRow>

                  {/* Parent / Guardian specifics */}
                  {(isParent || isInquiry) && (
                    <>
                      <InfoRow
                        icon=" UserCircleIcon"
                        label={isParent ? "Student Name" : "Representative"}
                        value={(isParent ? detail.student_name : detail.requester_name) || "N/A"}
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
                            <span className={cn(BADGE_PALETTES.emerald, COMPACT_BADGE_BASE)}>
                              {isInquiry ? "Requester Verified" : "SPA Verified"}
                            </span>
                          ) : (
                            <span className={cn(BADGE_PALETTES.amber, COMPACT_BADGE_BASE)}>
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
                <SheetSectionHeading icon={File02Icon} title="Request and archival details" />

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
                          <span className={cn(charter.badgeClass, COMPACT_BADGE_BASE)}>
                            {charter.label}
                          </span>
                        </div>
                      </InfoRow>

                      <InfoRow
                        icon=" DashboardSpeed01Icon"
                        label="Service Standard"
                      >
                        <span className={cn(charter.tier.badgeClass, COMPACT_BADGE_BASE)}>
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
                      className={cn(getRequestStatusBadgeClass(detail.status), COMPACT_BADGE_BASE)}
                    >
                      {formatRequestStatus(detail.status)}
                    </span>
                  </InfoRow>
                </div>
              </div>

              {/* 3. Supporting Attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/80 dark:border-border">
                  <SheetSectionHeading icon={Attachment01Icon} title={`Supporting attachments (${attachments.length})`} divider={false} />
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
                  <AttachmentViews>
                    {(Attachment) => attachments.map((att) => {
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
                          : att.attachment_type === "correction"
                          ? "Correction File"
                          : "Supporting Document";

                      return (
                        <Attachment
                          key={att.id}
                          readOnly
                          compactBadge
                          item={{ ...att, url: fileUrl }}
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
                  </AttachmentViews>
                )}
              </div>

              {/* 4. Workflow Stage Progression & Action */}
              <div className="space-y-3 pt-2">
                <SheetSectionHeading icon="SlidersHorizontalIcon" title={isTerminalStatus ? "Request lifecycle state" : "Workflow stage progression"} />

                {isTerminalStatus ? (
                  <div className="space-y-2 p-3.5 rounded-xl border border-border/70 dark:border-border/60 bg-gray-50/70 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <LockIcon size="1em" className="text-gray-400 text-xs" />
                        <span>{formatRequestStatus(detail.status)}</span>
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
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
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
                            {s === "Deficient" ? "Action Required" : formatRequestStatus(s)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {detail.correction_items?.length > 0 && (
                      <div className="space-y-2">
                        <SheetSectionHeading icon="Attachment01Icon" title="Requested Corrections" />
                        {detail.correction_items.map((item) => (
                          <div key={item.id} className="rounded-xl bg-muted p-3 text-xs">
                            <p className="font-semibold">{correctionRequirements[item.type]}</p>
                            {item.note && <p className="mt-1 whitespace-pre-wrap">{item.note}</p>}
                            <p className="mt-1 text-muted-foreground">
                              {item.attachmentId
                                ? attachments.find((attachment) => String(attachment.id) === String(item.attachmentId))?.original_filename || "File submitted"
                                : detail.status === "Deficient" ? "Waiting for file" : "Closed without a file"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {requestingCorrections && (
                      <div className="space-y-2 rounded-xl bg-muted/60 p-3">
                        <p className="text-xs font-semibold">Requirements to Correct</p>
                        <p className="text-xs text-muted-foreground">The request returns to the queue when the requester submits a file for every item.</p>
                        {correctionDraft.map((item, index) => {
                          const updateItem = (fields) => onCorrectionDraftChange((items) =>
                            items.map((original) => original.key === item.key ? { ...original, ...fields } : original));
                          return (
                            <div key={item.key} className="space-y-2 rounded-xl bg-background p-3">
                              <div className="flex items-center gap-2">
                                <Select containerClassName="flex-1" usePortal={false} aria-label={`Requirement ${index + 1}`}
                                  value={item.type || null} placeholder="Select a requirement"
                                  onChange={(event) => updateItem({ type: event.target.value })}>
                                  {Object.entries(correctionRequirements).map(([type, label]) => (
                                    <option key={type} value={type}>{label}</option>
                                  ))}
                                </Select>
                                <Button type="button" size="sm" variant="outline"
                                  onClick={() => onCorrectionDraftChange((items) => items.filter(({ key }) => key !== item.key))}>
                                  Remove
                                </Button>
                              </div>
                              <Textarea aria-label={`Instructions for requirement ${index + 1}`} maxLength={500} value={item.note}
                                placeholder={item.type === "other" ? "Describe the file the requester should provide" : "Add instructions (optional)"}
                                onChange={(event) => updateItem({ note: event.target.value })} />
                            </div>
                          );
                        })}
                        {correctionDraft.length < maxCorrectionItems && (
                          <Button type="button" size="sm" variant="outline" onClick={() => onCorrectionDraftChange((items) =>
                            [...items, { key: crypto.randomUUID(), type: "", note: "" }])}>
                            Add Requirement
                          </Button>
                        )}
                      </div>
                    )}

                    {detail.office_id === "registrar" && editStatus === "Ready" && !isInquiry && (
                      <div className="space-y-1">
                        <label htmlFor="request-pickup-instructions" className="text-xs font-semibold">Pickup Instructions</label>
                        <Textarea id="request-pickup-instructions" value={pickupInstructions} maxLength={2000}
                          onChange={(event) => onPickupInstructionsChange(event.target.value)}
                          placeholder="Enter the pickup location, hours, and what to bring" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {requestingCorrections ? "Additional Message (Optional)" : requiresDeficiencyMessage ? "Correction Instructions" : isInquiry && editStatus === "Ready" ? "Inquiry Response" : "Milestone Notice to Requester"}
                        </label>
                        <span className="text-[10px] text-gray-400">Visible in tracking portal</span>
                      </div>
                      <Textarea
                        className="w-full min-h-[72px] resize-none"
                        value={editUpdateMessage}
                        onChange={(e) => setEditUpdateMessage?.(e.target.value)}
                        placeholder={
                          requestingCorrections ? "Add a message that applies to all requested corrections" : requiresDeficiencyMessage ? "Explain what the requester needs to provide" : isInquiry && editStatus === "Ready" ? "Enter the Registrar’s response and any next steps" : editStatus !== detail.status
                            ? "Add custom instructions, or leave empty for the standard milestone note"
                            : "Document printed and certified, awaiting dry seal"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 90-Day Retention Notice */}
              {detail.status === "Ready" && retentionExpiryDate && (
                <section aria-labelledby="request-retention-heading" className="rounded-xl bg-amber-50/70 p-4 dark:bg-amber-950/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <Calendar01Icon size={16} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 id="request-retention-heading" className="text-sm font-semibold text-foreground">
                        PUP ODRS Retention Policy
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        PUP shreds documents that remain unclaimed after 90 days.
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 flex flex-wrap items-end justify-between gap-2 text-xs">
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Scheduled shredding date</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {retentionExpiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </dd>
                    </div>
                    {daysRemaining !== null && (
                      <div>
                        <dt className="sr-only">Retention time remaining</dt>
                        <dd className={cn(COMPACT_BADGE_BASE, BADGE_PALETTES.amber)}>
                          {daysRemaining > 0 ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left` : "Expired"}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              <DocumentRequestTimeline request={detail} showActor />
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
                Reset changes
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 px-4 cursor-pointer disabled:opacity-50"
                onClick={handleManualSave}
                disabled={saving || correctionDraftInvalid || (requiresDeficiencyMessage && !editUpdateMessage.trim())}
              >
                {saving ? "Saving…" : requestingCorrections ? "Request Corrections" : "Save Changes"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
