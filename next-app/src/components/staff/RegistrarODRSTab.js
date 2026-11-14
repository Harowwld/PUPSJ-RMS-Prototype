"use client";
import { Textarea } from "@/components/ui/textarea";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { downloadDocument } from "@/lib/documentDownload";
import NoticeBanner from "@/components/shared/NoticeBanner";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";
import RegistrarODRSSkeleton from "@/components/staff/skeletons/RegistrarODRSSkeleton";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ALLOWED_STATUS_TRANSITIONS,
  TERMINAL_REQUEST_STATUSES,
  ALLOWED_REOPEN_TRANSITIONS,
} from "@/lib/constants";
import { formatErrorMessage } from "@/lib/errorUtils";
import { cn } from "@/lib/utils";
import { BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles";
import { Cursor01Icon as EmptyCursor01Icon, InboxIcon as EmptyInboxIcon , Attachment01Icon, CheckmarkCircle01Icon, Clock01Icon, LockIcon, Shield01Icon, StarIcon} from "hugeicons-react";

const statuses = ["Pending", "Deficient", "PendingPayment", "InProgress", "Ready", "Completed", "Cancelled", "Shredded"];

export default function RegistrarODRSTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const [spaSaving, setSpaSaving] = useState(false);

  // Reopen Request state
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenTargetStatus, setReopenTargetStatus] = useState("InProgress");
  const [reopenReason, setReopenReason] = useState("");
  const [reopenSubmitting, setReopenSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/registrar/document-requests", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setRows(json.data);
      } else {
        showToast?.(
          formatErrorMessage(json?.error || "Unable to load document requests.", {
            defaultTitle: "Failed to Load Requests",
          }),
          true
        );
      }
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "Failed to Load Requests",
        }),
        true
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async () => {
    try {
      const res = await fetch(`/api/registrar/document-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, message }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        return showToast?.(
          formatErrorMessage(json?.error || "Unable to update request status.", {
            defaultTitle: "Update Failed",
          }),
          true
        );
      }
      setMessage("");
      setSelected(json.data);
      await load();
      showToast?.({
        title: "Request Updated",
        description: `Request status has been set to ${status}.`,
      });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "Update Failed",
        }),
        true
      );
    }
  };

  const toggleSpaVerified = async () => {
    if (!selected?.id) return;
    setSpaSaving(true);
    try {
      const res = await fetch(`/api/registrar/document-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaVerified: !selected.spa_verified }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        return showToast?.(
          formatErrorMessage(json?.error || "Unable to update SPA verification status.", {
            defaultTitle: "SPA Verification Failed",
          }),
          true
        );
      }
      setSelected(json.data);
      await load();
      showToast?.({
        title: "SPA Verification Updated",
        description: json.data.spa_verified
          ? "Special Power of Attorney has been marked as verified."
          : "Special Power of Attorney verification was revoked.",
      });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "SPA Verification Failed",
        }),
        true
      );
    } finally {
      setSpaSaving(false);
    }
  };

  const handleConfirmReopen = async () => {
    if (!selected?.id || reopenReason.trim().length < 5) return;
    setReopenSubmitting(true);
    try {
      const res = await fetch(`/api/registrar/document-requests/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reopenTargetStatus,
          allowReopen: true,
          reopenReason: reopenReason.trim(),
          message: reopenReason.trim(),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        showToast?.(
          formatErrorMessage(json?.error || "Unable to reopen request.", {
            defaultTitle: "Reopen Failed",
          }),
          true
        );
        return;
      }
      setSelected(json.data);
      setStatus(json.data.status || "Pending");
      setReopenModalOpen(false);
      setReopenReason("");
      await load();
      showToast?.({
        title: "Request Reopened",
        description: `Request status has been set to ${reopenTargetStatus}.`,
      });
    } catch (err) {
      showToast?.(
        formatErrorMessage(err, {
          defaultTitle: "Reopen Failed",
        }),
        true
      );
    } finally {
      setReopenSubmitting(false);
    }
  };

  const getStatusBadgeClass = (s) => {
    const st = String(s || "").toLowerCase();
    if (st === "approved" || st === "completed" || st === "ready") {
      return BADGE_PALETTES.emerald;
    }
    if (st === "inprogress") {
      return BADGE_PALETTES.blue;
    }
    if (st === "declined" || st === "cancelled") {
      return BADGE_PALETTES.rose;
    }
    return BADGE_PALETTES.amber;
  };

  if (loading) {
    return <RegistrarODRSSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col flex-[1_0_auto] w-full animate-fade-up font-jakarta">
        {/* ONE Single Card Container */}
        <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          <PageHeader
            icon="InboxIcon"
            title="Student Document Requests"
            description="Review, process, and publish status updates for student academic document requests."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <RefreshButton
                onRefresh={async () => {
                  setRefreshing(true);
                  try {
                    await load();
                  } finally {
                    setRefreshing(false);
                  }
                }}
                isLoading={refreshing}
                title="Refresh Requests"
              />
            }
          />

          <div className="grid flex-[1_0_auto] grid-cols-1 lg:grid-cols-[1fr_360px] border-t border-border dark:border-border divide-y lg:divide-y-0 lg:divide-x divide-border dark:divide-border">
            <section className="flex flex-col bg-white p-6 dark:bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Request Queue</h2>
              <span className={cn("rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300", BADGE_BASE)}>
                {rows.length} total
              </span>
            </div>
            <div className="space-y-2">
              {rows.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia><EmptyInboxIcon size="1em" /></EmptyMedia>
                      <EmptyTitle>
                        No Document Requests Yet
                      </EmptyTitle>
                      <EmptyDescription>
                        New student requests submitted via ODRS will appear here automatically.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                rows.map((item) => {
                  const isSelected = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setSelected(item); setStatus(item.status); setMessage(""); }}
                      className={`block w-full rounded-brand border p-3.5 text-left text-sm transition-all ${
                        isSelected
                          ? "border-pup-maroon/40 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20 shadow-xs"
                          : "border-border hover:bg-gray-50 dark:border-border dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-gray-900 dark:text-zinc-100 font-semibold">{item.doc_type}</strong>
                        <div className="flex items-center gap-1.5">
                          {item.feedback && (
                            <span className={cn(BADGE_PALETTES.amber, "gap-1", BADGE_BASE)}>
                              <StarIcon size="1em" className="text-[11px] text-amber-500" />
                              <span>{item.feedback.rating}/5</span>
                            </span>
                          )}
                          <span className={cn(getStatusBadgeClass(item.status), BADGE_BASE)}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-gray-900 dark:text-zinc-300">
                        <span>{item.student_name}</span>
                        <span>·</span>
                        <span>{item.student_no || "No Student ID"}</span>
                        {item.client_type && (
                          <span className={cn(item.client_type === "Parent"
                              ? BADGE_PALETTES.amber
                              : item.client_type === "Alumni"
                              ? BADGE_PALETTES.purple
                              : BADGE_PALETTES.blue, BADGE_BASE)}>
                            {item.client_type === "Parent" ? "Parent/Guardian" : item.client_type}
                          </span>
                        )}
                        {(Number(item.attachment_count) > 0 || (Array.isArray(item.attachments) && item.attachments.length > 0)) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-900 dark:text-zinc-300" title={`${item.attachment_count || item.attachments?.length} attachment(s)`}>
                            <Attachment01Icon size="1em" className="text-[11px]" />
                            {item.attachment_count || item.attachments?.length}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p className="mt-2 text-xs text-gray-600 line-clamp-2 italic bg-gray-50/80 dark:bg-zinc-800/60 p-2 rounded-sm dark:text-zinc-300">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <aside className="flex flex-col bg-white p-6 dark:bg-card">
            {selected ? (
              <div className="flex flex-col h-full">
                <div className="pb-3 border-b border-border dark:border-border mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-pup-maroon dark:text-primary">Selected Ticket #{selected.id}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 mt-0.5">{selected.doc_type}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-900 dark:text-zinc-300">
                    <span>Requester: <strong className="text-gray-800 dark:text-zinc-200">{selected.student_name}</strong> {selected.student_no ? `(${selected.student_no})` : <span className="italic text-gray-400">(No Student ID)</span>}</span>
                    {selected.client_type && (
                      <span className={cn(selected.client_type === "Parent"
                          ? BADGE_PALETTES.amber
                          : selected.client_type === "Alumni"
                          ? BADGE_PALETTES.purple
                          : BADGE_PALETTES.blue, BADGE_BASE)}>
                        {selected.client_type === "Parent" ? "Parent/Guardian" : selected.client_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Parent / Guardian Information and SPA Verification */}
                {selected.client_type === "Parent" && (
                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-3.5 border border-amber-200/70 dark:border-amber-900/40 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <Shield01Icon size="1em" className="text-xs text-amber-600 dark:text-amber-400" />
                        Parent / Legal Guardian
                      </span>
                      {selected.spa_verified ? (
                        <span className={cn(BADGE_PALETTES.emerald, "gap-1", BADGE_BASE)}>
                          <CheckmarkCircle01Icon size="1em" className="text-[10px]" />
                          SPA Verified
                        </span>
                      ) : (
                        <span className={cn(BADGE_PALETTES.amber, "gap-1", BADGE_BASE)}>
                          <Clock01Icon size="1em" className="text-[10px]" />
                          SPA Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 space-y-0.5">
                      <div>Name: <strong>{selected.requester_name || "N/A"}</strong> ({selected.requester_relationship || "Legal Guardian"})</div>
                      {selected.requester_contact && <div>Contact: <span className="font-sans tabular-nums">{selected.requester_contact}</span></div>}
                    </div>
                    <div className="pt-1 border-t border-amber-200/50 dark:border-amber-900/30 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={spaSaving}
                        onClick={toggleSpaVerified}
                        title={selected.spa_verified ? "Revoke SPA Verification" : "Verify SPA Authority"}
                        className={`h-7 px-3 text-xs font-semibold rounded-lg ${
                          selected.spa_verified
                            ? "border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {selected.spa_verified ? "Revoke SPA" : "Verify SPA"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Supporting Attachments */}
                {Array.isArray(selected.attachments) && selected.attachments.length > 0 && (
                  <div className="rounded-xl bg-gray-50/70 dark:bg-zinc-800/40 p-3.5 border border-border dark:border-border space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Attachment01Icon size="1em" className="text-xs" />
                        Attachments ({selected.attachments.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selected.attachments.map((att) => {
                        const isPdf = att.original_filename?.toLowerCase().endsWith(".pdf") || att.mime_type === "application/pdf";
                        const isPreviewable = isPdf || att.mime_type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(att.original_filename || "");
                        const fileUrl = att.url || `/api/document-requests/${selected.id}/attachments/${att.id}`;
                        return (
                          <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-border/60 dark:border-border text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              {att.attachment_type === "receipt" && <span className="block text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Proof of Payment</span>}
                              <span className="block truncate font-medium text-gray-800 dark:text-zinc-200" title={att.original_filename}>{att.original_filename}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isPreviewable && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPdfPreviewData({
                                      url: fileUrl,
                                      title: att.original_filename,
                                      subtitle: `Attachment for Request #${selected.id}`,
                                      studentName: selected.student_name || "Requester",
                                      docType: att.attachment_type === "receipt" ? "Proof of Payment" : att.attachment_type || "Supporting Document",
                                      originalFilename: att.original_filename,
                                    });
                                    setPdfPreviewOpen(true);
                                  }}
                                  className="h-6 px-2 text-[10px] font-semibold rounded-md border"
                                >
                                  {PDF_ACTION_LABELS.preview}
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await downloadDocument(fileUrl, att.original_filename);
                                  } catch (error) {
                                    showToast?.({ title: "Download Failed", description: error.message }, true);
                                  }
                                }}
                                className="h-6 px-2 inline-flex items-center text-[10px] font-semibold rounded-md border border-border dark:border-border hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                              >
                                {isPdf ? PDF_ACTION_LABELS.download : PDF_ACTION_LABELS.original}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.feedback && (
                  <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-3.5 border border-amber-200/70 dark:border-amber-900/40 space-y-1.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <StarIcon size="1em" className="text-xs text-amber-500" />
                        Student Rating & Experience
                      </span>
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {selected.feedback.rating}/5
                      </span>
                    </div>
                    {selected.feedback.aspect_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {selected.feedback.aspect_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-white/80 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {selected.feedback.comments && (
                      <p className="text-xs text-gray-700 dark:text-zinc-300 italic pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
                        &ldquo;{selected.feedback.comments}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 mb-1">
                      {Boolean(selected?.status && TERMINAL_REQUEST_STATUSES.includes(selected.status)) ? "Request Status" : "Update Status"}
                    </label>
                    {Boolean(selected?.status && TERMINAL_REQUEST_STATUSES.includes(selected.status)) ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-10 px-3 rounded-xl border border-border dark:border-border bg-gray-50 dark:bg-zinc-800/80 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-zinc-200">
                          <span className="flex items-center gap-1.5 truncate">
                            <LockIcon size="1em" className="text-gray-400 text-xs" />
                            <span>{selected.status}</span>
                          </span>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            Closed
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                          onClick={() => {
                            const allowed = ALLOWED_REOPEN_TRANSITIONS[selected.status] || ["InProgress"];
                            setReopenTargetStatus(allowed[0] || "InProgress");
                            setReopenReason("");
                            setReopenModalOpen(true);
                          }}
                        >
                          Reopen Request
                        </Button>
                      </div>
                    ) : (
                      <Select
                        className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-sm font-normal text-gray-800 dark:text-zinc-100 shadow-none"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {((selected?.status && ALLOWED_STATUS_TRANSITIONS[selected.status]) || statuses).map((item) => (
                          <option key={item} value={item}>{item === "PendingPayment" ? "Pending Payment" : item}</option>
                        ))}
                      </Select>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 mb-1">
                      {status === "Deficient" ? "Deficiency Comment (required)" : status === "PendingPayment" ? "Payment Instructions" : "Student-Visible Update Note"}
                    </label>
                    <Textarea
                      className="min-h-28 w-full"
                      placeholder={status === "Deficient" ? "Explain what the student is missing (required)..." : status === "PendingPayment" ? "Explain the amount and how to submit payment..." : "Add an update message for the student (e.g. Document signed, ready for pick up at Room 201)..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <Button className="w-full h-10 cursor-pointer" onClick={save} disabled={status === "Deficient" && !message.trim()}>
                    Publish
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-4">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia><EmptyCursor01Icon size="1em" /></EmptyMedia>
                    <EmptyTitle>
                      No Request Selected
                    </EmptyTitle>
                    <EmptyDescription>
                      Select a request from the queue to view details and post updates.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </aside>
          </div>
        </Card>
      </div>

      {/* Reopen Request Dialog Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
          <DialogHeader className="p-6 pb-0 text-left">
            <div className="flex items-center gap-3">
              <div>
                <DialogTitle>
                  Reopen Document Request
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Reopen closed request #{selected?.id} to reactivate workflow and notify the student.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                Target Reactivation Status
              </label>
              <Select
                className="w-full h-10 px-3 text-xs font-medium text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-border rounded-xl cursor-pointer"
                value={reopenTargetStatus}
                onChange={(e) => setReopenTargetStatus(e.target.value)}
              >
                {(ALLOWED_REOPEN_TRANSITIONS[selected?.status] || ["InProgress"]).map((st) => (
                  <option key={st} value={st}>
                    {st === "InProgress" ? "In Progress" : st}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                  Written Justification / Reason
                </label>
                <span className="text-[11px] text-gray-400">
                  {reopenReason.trim().length}/5 chars min
                </span>
              </div>
              <Textarea
                className="w-full min-h-[90px] resize-none"
                placeholder="State the official reason for reopening (e.g., student appeal granted, payment verified, clerical error correction)..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>


          </div>

          <NoticeBanner tone="info" className="mb-6">
            Reopening adds an activity-history entry and posts an update on the student portal.
          </NoticeBanner>
          <DialogFooter className="p-6 pt-0 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              onClick={() => setReopenModalOpen(false)}
              disabled={reopenSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-4 cursor-pointer disabled:opacity-50"
              onClick={handleConfirmReopen}
              disabled={reopenSubmitting || reopenReason.trim().length < 5}
            >
              {reopenSubmitting ? "Reopening Request…" : "Reopen Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Document Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfPreviewData(null);
        }}
        preview={pdfPreviewData}
      />
    </TooltipProvider>
  );
}
