"use client";
import HugeIcon from "@/components/shared/HugeIcon";
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
      return "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    }
    if (st === "inprogress") {
      return "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    }
    if (st === "declined" || st === "cancelled") {
      return "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    }
    return "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
  };

  if (loading) {
    return <RegistrarODRSSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col min-h-full w-full flex-1 gap-4 animate-fade-up font-jakarta">
        {/* Card Header aligned with other pages */}
        <Card className="rounded-brand border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none overflow-hidden">
          <PageHeader
            icon="ph-tray"
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
        </Card>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-brand border border-border bg-white p-5 shadow-sm dark:border-border dark:bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-border dark:border-border mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Request Queue</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                {rows.length} total
              </span>
            </div>
            <div className="space-y-2">
              {rows.length === 0 ? (
                <div className="py-16 flex-1 flex flex-col items-center justify-center min-h-[360px] w-full">
                  <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                    <EmptyHeader className="flex flex-col items-center gap-0">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                        <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                          <HugeIcon className="ph-duotone ph-tray text-3xl text-pup-maroon dark:text-red-400" />
                        </EmptyMedia>
                      </div>
                      <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                        No Document Requests Yet
                      </EmptyTitle>
                      <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
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
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                              <HugeIcon className="ph-fill ph-star text-[11px] text-amber-500" />
                              <span>{item.feedback.rating}/5</span>
                            </span>
                          )}
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-gray-900 dark:text-zinc-300">
                        <span>{item.student_name}</span>
                        <span>·</span>
                        <span>{item.student_no || "No Student ID"}</span>
                        {item.client_type && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            item.client_type === "Parent"
                              ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                              : item.client_type === "Alumni"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                          }`}>
                            {item.client_type === "Parent" ? "Parent/Guardian" : item.client_type}
                          </span>
                        )}
                        {(Number(item.attachment_count) > 0 || (Array.isArray(item.attachments) && item.attachments.length > 0)) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-900 dark:text-zinc-300" title={`${item.attachment_count || item.attachments?.length} attachment(s)`}>
                            <HugeIcon className="ph-bold ph-paperclip text-[11px]" />
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

          <aside className="rounded-brand border border-border bg-white p-5 shadow-sm dark:border-border dark:bg-card">
            {selected ? (
              <div className="flex flex-col h-full">
                <div className="pb-3 border-b border-border dark:border-border mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-pup-maroon dark:text-primary">Selected Ticket #{selected.id}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 mt-0.5">{selected.doc_type}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-900 dark:text-zinc-300">
                    <span>Requester: <strong className="text-gray-800 dark:text-zinc-200">{selected.student_name}</strong> {selected.student_no ? `(${selected.student_no})` : <span className="italic text-gray-400">(No Student ID)</span>}</span>
                    {selected.client_type && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        selected.client_type === "Parent"
                          ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40"
                          : selected.client_type === "Alumni"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                      }`}>
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
                        <HugeIcon className="ph-bold ph-shield-check text-xs text-amber-600 dark:text-amber-400" />
                        Parent / Legal Guardian
                      </span>
                      {selected.spa_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <HugeIcon className="ph-fill ph-check-circle text-[10px]" />
                          SPA Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <HugeIcon className="ph-fill ph-clock text-[10px]" />
                          SPA Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-700 dark:text-zinc-300 space-y-0.5">
                      <div>Name: <strong>{selected.requester_name || "N/A"}</strong> ({selected.requester_relationship || "Legal Guardian"})</div>
                      {selected.requester_contact && <div>Contact: <span className="font-mono">{selected.requester_contact}</span></div>}
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
                        <HugeIcon className="ph-bold ph-paperclip text-xs" />
                        Attachments ({selected.attachments.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selected.attachments.map((att) => {
                        const isPdf = att.original_filename?.toLowerCase().endsWith(".pdf") || att.mime_type === "application/pdf";
                        const fileUrl = att.url || `/api/document-requests/${selected.id}/attachments/${att.id}`;
                        return (
                          <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-border/60 dark:border-border text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              {att.attachment_type === "receipt" && <span className="block text-[9px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Proof of Payment</span>}
                              <span className="block truncate font-medium text-gray-800 dark:text-zinc-200" title={att.original_filename}>{att.original_filename}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isPdf && (
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
                                  Preview
                                </Button>
                              )}
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.original_filename}
                                className="h-6 px-2 inline-flex items-center text-[10px] font-semibold rounded-md border border-border dark:border-border hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
                              >
                                Download
                              </a>
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
                        <HugeIcon className="ph-fill ph-star text-xs text-amber-500" />
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
                            <HugeIcon className="ph-bold ph-lock-simple text-gray-400 text-xs" />
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
                          className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
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
                    <textarea
                      className="min-h-28 w-full rounded-brand border border-border bg-white px-3 py-2 text-sm outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10 dark:border-border dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder={status === "Deficient" ? "Explain what the student is missing (required)..." : status === "PendingPayment" ? "Explain the amount and how to submit payment..." : "Add an update message for the student (e.g. Document signed, ready for pick up at Room 201)..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <Button className="w-full btn-brand-red text-white font-semibold rounded-xl h-10 shadow-xs cursor-pointer active:scale-95 transition-all" onClick={save} disabled={status === "Deficient" && !message.trim()}>
                    Publish
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center py-16 px-4">
                <Empty className="flex h-full flex-col items-center justify-center border-0 bg-transparent text-center text-gray-900 dark:text-zinc-300">
                  <EmptyHeader className="flex flex-col items-center gap-0">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 scale-150 animate-pulse rounded-full bg-gray-50 opacity-50 dark:bg-card" />
                      <EmptyMedia className="relative z-10 flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-white shadow-md dark:border-border dark:bg-card dark:shadow-none">
                        <HugeIcon className="ph-duotone ph-cursor-click text-3xl text-pup-maroon dark:text-red-400" />
                      </EmptyMedia>
                    </div>
                    <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                      No Request Selected
                    </EmptyTitle>
                    <EmptyDescription className="max-w-xs text-xs font-medium text-gray-900 dark:text-zinc-300 mt-1">
                      Select a request from the queue to view details and post updates.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Reopen Request Dialog Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-border shadow-2xl rounded-2xl dark:bg-card dark:border-border">
          <DialogHeader className="p-6 bg-white dark:bg-card border-none pb-0 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                <HugeIcon className="ph-bold ph-arrow-counter-clockwise text-lg" />
              </div>
              <div>
                <DialogTitle className="text-[16px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                  Reopen Document Request
                </DialogTitle>
                <DialogDescription className="text-[13px] font-normal text-gray-600 dark:text-zinc-300 mt-1">
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
                menuClassName="rounded-xl border border-border bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
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
                  Written Justification / Reason <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-gray-400">
                  {reopenReason.trim().length}/5 chars min
                </span>
              </div>
              <textarea
                className="w-full min-h-[90px] p-3 text-xs font-normal text-gray-900 dark:text-zinc-100 bg-[#F5F5F7] dark:bg-zinc-800/50 border border-border rounded-xl focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus:outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                placeholder="State the official reason for reopening (e.g., student appeal granted, payment verified, clerical error correction)..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>

            <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-3 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <HugeIcon className="ph-fill ph-info text-sm shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                Reopening adds an activity-history entry and posts an update on the student portal.
              </span>
            </div>
          </div>

          <DialogFooter className="p-6 pt-0 bg-white dark:bg-card border-none flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              onClick={() => setReopenModalOpen(false)}
              disabled={reopenSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              onClick={handleConfirmReopen}
              disabled={reopenSubmitting || reopenReason.trim().length < 5}
            >
              {reopenSubmitting ? "Reopening..." : "Confirm Reopen"}
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
