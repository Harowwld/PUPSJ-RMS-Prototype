"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function PublicTracker() {
  const [ticketInput, setTicketInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleTrack = async (e) => {
    if (e) e.preventDefault();
    const query = ticketInput.trim();
    if (!query) {
      setError("Please enter a ticket reference number.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/public/track-request?ticket=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Unable to locate document request.");
      }
      setResult(json.data);
    } catch (err) {
      setError(err.message || "Failed to find ticket. Please check the reference number.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "completed" || s === "ready") {
      return "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40";
    }
    if (s === "inprogress") {
      return "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40";
    }
    if (s === "cancelled" || s === "declined" || s === "shredded") {
      return "bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40";
    }
    return "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40";
  };

  const getStepProgress = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "completed" || s === "ready") return 4;
    if (s === "inprogress") return 2;
    if (s === "pending") return 1;
    return 1;
  };

  const STEPS = [
    { num: 1, label: "Received", desc: "Ticket queued" },
    { num: 2, label: "Archive Pull", desc: "Room 1 file fetched" },
    { num: 3, label: "Evaluation", desc: "Dry seal validation" },
    { num: 4, label: "Ready to Claim", desc: "Ground floor counter" },
  ];

  return (
    <section id="tracker" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full font-inter select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] overflow-hidden p-8 sm:p-12 relative"
      >
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-gray-100 dark:border-zinc-800/80 relative z-10">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-1">
              Public Records Verification
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Track Request Status
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Instant verification of Registrar evaluation, archive pulling, and release readiness.
            </p>
          </div>

          <div className="self-start sm:self-auto text-xs font-mono text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 px-3.5 py-1.5 rounded-full border border-gray-200/70 dark:border-zinc-700/60">
            Real-Time Query
          </div>
        </div>

        {/* Apple Spotlight-styled Search Form */}
        <form onSubmit={handleTrack} className="mt-8 relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative group">
              <input
                id="tracker-input"
                type="text" 
                placeholder="Enter Reference Number (e.g. 104 or REQ-2026-0104)"
                value={ticketInput}
                onChange={(e) => {
                  setTicketInput(e.target.value);
                  if (error) setError("");
                }}
                className="h-13 w-full rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 text-sm font-mono placeholder:font-sans placeholder:text-gray-400 px-5 focus:outline-none focus:border-[#800000]/40 focus:ring-4 focus:ring-[#800000]/5 transition-all text-gray-900 dark:text-zinc-100"
              />
            </div>
            <Button 
              id="tracker-submit"
              type="submit" 
              disabled={loading || !ticketInput.trim()}
              className="h-13 px-8 rounded-2xl bg-[#800000] hover:bg-[#600000] text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Checking Records..." : "Verify Status"}
            </Button>
          </div>
        </form>

        {/* Error Notification */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-800 dark:text-red-300"
          >
            {error}
          </motion.div>
        )}

        {/* Results Card */}
        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 p-6 sm:p-8 rounded-3xl bg-gray-50/80 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-700/80 relative z-10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200/80 dark:border-zinc-700/80">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-mono font-bold text-gray-950 dark:text-white">Ticket #{result.id}</span>
                    <span className="text-gray-300 dark:text-zinc-600">·</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{result.doc_type}</span>
                    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1.5 font-normal">
                    Requester: <span className="font-semibold text-gray-800 dark:text-zinc-200">{result.masked_name}</span> ({result.masked_student_no}) · Client: {result.client_type}
                  </p>
                </div>

                <div className="text-xs font-mono text-gray-400 dark:text-zinc-500 sm:text-right">
                  <span>LOGGED: {result.created_at ? new Date(result.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}</span>
                </div>
              </div>

              {/* Minimalist Apple Progress Stepper Track */}
              <div className="mt-8">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {STEPS.map((step) => {
                    const isDone = getStepProgress(result.status) >= step.num;
                    const isCurrent = getStepProgress(result.status) === step.num;
                    return (
                      <div 
                        key={step.num}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDone 
                            ? "bg-white dark:bg-zinc-800 border-black/[0.08] dark:border-white/[0.12] shadow-xs" 
                            : "bg-white/40 dark:bg-zinc-800/20 border-gray-200/60 dark:border-zinc-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-5 h-5 rounded-full text-[11px] font-mono font-bold flex items-center justify-center ${
                            isDone 
                              ? "bg-[#800000] text-white" 
                              : "bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400"
                          }`}>
                            {step.num}
                          </span>
                          <span className={`text-xs font-bold ${isDone ? "text-gray-950 dark:text-white" : "text-gray-400"}`}>
                            {step.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed pl-7">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Updates History */}
              {Array.isArray(result.updates) && result.updates.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-200/80 dark:border-zinc-700/80">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
                    Official Update Log
                  </span>
                  <div className="space-y-2">
                    {result.updates.map((up) => (
                      <div key={up.id} className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white mr-2">{up.status}:</span>
                          <span className="text-gray-600 dark:text-zinc-300">{up.message || "Status updated by Registrar."}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                          {new Date(up.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400 border-t border-gray-200/60 dark:border-zinc-700/60">
                <span>Need to view full details or submit supplementary files?</span>
                <Link href="/login" className="font-semibold text-[#800000] dark:text-red-400 hover:underline">
                  Log in to Student Portal ➔
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </section>
  );
}

