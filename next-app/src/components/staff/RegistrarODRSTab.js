"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { RefreshButton } from "@/components/shared/RefreshButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select } from "@/components/ui/select";

const statuses = ["Pending", "InProgress", "Ready", "Completed", "Cancelled"];

export default function RegistrarODRSTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/registrar/document-requests", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) setRows(json.data);
    else showToast?.({ title: "Load failed", description: json?.error || "Unable to load requests." }, true);
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const save = async () => {
    const res = await fetch(`/api/registrar/document-requests/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, message }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) return showToast?.({ title: "Update failed", description: json?.error || "Unable to save." }, true);
    setMessage("");
    setSelected(json.data);
    await load();
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col h-full gap-4 animate-fade-up font-inter">
        {/* Card Header aligned with other pages */}
        <Card className="rounded-brand border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none overflow-hidden">
          <PageHeader
            icon="ph-tray"
            title="Student Document Requests"
            description="Review, process, and publish status updates for student academic document requests."
            showBorder={false}
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
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
          <section className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5 mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-zinc-50">Request Queue</h2>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                {rows.length} total
              </span>
            </div>
            <div className="space-y-2">
              {rows.length === 0 ? (
                <div className="rounded-brand border border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                  <i className="ph-duotone ph-tray text-3xl text-gray-400 dark:text-zinc-500 mb-2 block"></i>
                  <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">No document requests yet.</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">New student requests will appear here automatically.</p>
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
                          : "border-gray-200 hover:bg-gray-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-gray-900 dark:text-zinc-100 font-semibold">{item.doc_type}</strong>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-gray-500 dark:text-zinc-400">
                        <span>{item.student_name}</span>
                        <span>·</span>
                        <span className="font-mono">{item.student_no || "No Student ID"}</span>
                        {item.client_type && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            item.client_type === "Alumni"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                          }`}>
                            {item.client_type}
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

          <aside className="rounded-brand border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
            {selected ? (
              <div className="flex flex-col h-full">
                <div className="pb-3 border-b border-gray-100 dark:border-white/5 mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-pup-maroon dark:text-primary">Selected Ticket #{selected.id}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-50 mt-0.5">{selected.doc_type}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-zinc-400">
                    <span>Requester: <strong className="text-gray-800 dark:text-zinc-200">{selected.student_name}</strong> {selected.student_no ? `(${selected.student_no})` : <span className="italic text-gray-400">(No Student ID)</span>}</span>
                    {selected.client_type && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        selected.client_type === "Alumni"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40"
                          : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40"
                      }`}>
                        {selected.client_type}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 mb-1">
                      Update Status
                    </label>
                    <Select
                      className="h-10 text-sm font-normal text-gray-800 dark:text-zinc-100 border-gray-300 dark:border-zinc-700 dark:bg-zinc-800"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-zinc-400 mb-1">
                      Student-Visible Update Note
                    </label>
                    <textarea
                      className="min-h-28 w-full rounded-brand border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      placeholder="Add an update message for the student (e.g. Document signed, ready for pick up at Room 201)..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  <Button className="w-full bg-pup-maroon text-white hover:bg-red-900 font-semibold" onClick={save}>
                    Publish Status Update
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-zinc-500">
                <i className="ph-duotone ph-cursor-click text-3xl mb-2"></i>
                <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">Select a request from the queue to view details and post updates.</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}
