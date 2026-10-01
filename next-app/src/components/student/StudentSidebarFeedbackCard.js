"use client";

import { useState, useMemo } from "react";
import HugeIcon from "@/components/shared/HugeIcon";
import { cn } from "@/lib/utils";

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Satisfactory",
  4: "Very Good",
  5: "Excellent",
};

const DISMISS_STORAGE_KEY = "rms_student_feedback_sidebar_dismissed";

export default function StudentSidebarFeedbackCard({
  open = true,
  requests = [],
  onRateRequest,
  onDismiss,
}) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) === "true";
    }
    return false;
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [randomSeed] = useState(() => Math.random());

  // Filter unrated requests
  const unratedRequests = useMemo(() => {
    return (requests || []).filter((r) => !r.feedback);
  }, [requests]);

  // Pick a stable random unrated request
  const targetRequest = useMemo(() => {
    if (!unratedRequests.length) return null;
    const index = Math.floor(randomSeed * unratedRequests.length) % unratedRequests.length;
    return unratedRequests[index] || unratedRequests[0] || null;
  }, [unratedRequests, randomSeed]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "true");
    }
    onDismiss?.();
  };

  // If there are no unrated requests or user dismissed the prompt, don't show
  if (dismissed || !targetRequest) {
    return null;
  }

  // Collapsed Sidebar State (68px wide)
  if (!open) {
    return (
      <div className="flex flex-col items-center justify-center w-full px-1 py-2">
        <button
          type="button"
          onClick={() => onRateRequest?.(targetRequest, 0)}
          title={`Rate Request #${targetRequest.id} (${targetRequest.doc_type || "Document"})`}
          aria-label={`Rate Request #${targetRequest.id}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all cursor-pointer shadow-2xs group"
        >
          <HugeIcon className="ph-fill ph-star text-[20px] text-amber-500 transition-transform group-hover:scale-110" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 ring-2 ring-white dark:ring-zinc-950" />
          </span>
        </button>
      </div>
    );
  }

  // Expanded Sidebar State
  return (
    <div className="relative mx-1 mb-2 overflow-hidden rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/70 via-white/80 to-amber-50/40 p-3 shadow-xs backdrop-blur-xs transition-all dark:border-white/10 dark:from-zinc-900/90 dark:via-zinc-900/60 dark:to-zinc-950/90">
      {/* Decorative background watermark */}
      <HugeIcon
        className="ph-fill ph-star pointer-events-none absolute -bottom-4 -right-3 text-7xl text-amber-500/10 dark:text-amber-400/5 select-none"
        aria-hidden="true"
      />

      {/* Top Header Row: Category Badge + Dismiss Button */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100/80 px-2.5 py-0.5 text-[10px] font-semibold text-pup-maroon dark:bg-red-950/60 dark:text-red-300 dark:border dark:border-red-900/40">
          <HugeIcon className="ph-fill ph-chat-circle-dots text-[11px]" />
          Feedback
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss feedback reminder"
          title="Dismiss reminder"
          className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors cursor-pointer active:scale-90"
        >
          <HugeIcon className="ph-bold ph-x text-[13px]" />
        </button>
      </div>

      {/* Content Section */}
      <div className="space-y-1 mb-2.5">
        <h4 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 tracking-[-0.01em] leading-tight">
          How was your request?
        </h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-block text-[11px] font-medium text-pup-maroon dark:text-red-300 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.2 rounded border border-red-100 dark:border-red-900/30">
            #{targetRequest.id}
          </span>
          <span className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium truncate max-w-[155px]" title={targetRequest.doc_type}>
            {targetRequest.doc_type}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal pt-0.5">
          Your rating helps the Registrar improve processing speed and service quality.
        </p>
      </div>

      {/* Interactive Quick Star Rating */}
      <div className="flex flex-col items-center gap-1 pt-1 pb-2">
        <div
          className="flex items-center justify-center gap-1"
          role="radiogroup"
          aria-label="Rate request experience from 1 to 5 stars"
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isHovered = star <= hoverRating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onRateRequest?.(targetRequest, star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}: ${RATING_LABELS[star]}`}
                title={`Rate ${star} star${star > 1 ? "s" : ""}: ${RATING_LABELS[star]}`}
                className="group relative flex h-7 w-7 items-center justify-center rounded-lg p-0.5 transition-transform active:scale-85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-5 w-5 transition-colors duration-150",
                    isHovered
                      ? "fill-amber-400 text-amber-400 drop-shadow-xs scale-110"
                      : "fill-transparent text-gray-300 dark:text-zinc-600 group-hover:text-amber-300"
                  )}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Hover sentiment helper */}
        <span
          className={cn(
            "text-[10px] font-semibold transition-all h-3.5",
            hoverRating > 0
              ? "text-amber-700 dark:text-amber-300"
              : "text-transparent select-none"
          )}
        >
          {hoverRating > 0 ? RATING_LABELS[hoverRating] : "—"}
        </span>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={() => onRateRequest?.(targetRequest, hoverRating || 0)}
        className="h-8 w-full text-xs font-semibold rounded-xl bg-pup-maroon hover:bg-pup-darkMaroon text-white dark:bg-red-800 dark:hover:bg-red-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center border-0"
      >
        Rate Request
      </button>
    </div>
  );
}
