"use client";

import { useState, useMemo } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Cancel01Icon, StarIcon } from "hugeicons-react";
import { RequestFeedbackBackdrop } from "./RequestFeedbackCard";
import styles from "./RequestFeedbackCard.module.css";

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

  // Collapsed Sidebar State (60px wide)
  if (!open) {
    return (
      <div className="flex flex-col items-center justify-center w-full px-1 py-1">
        <button
          type="button"
          onClick={() => onRateRequest?.(targetRequest, 0)}
          title={`Rate Request ${targetRequest.id} (${targetRequest.doc_type || "Document"})`}
          aria-label={`Rate Request ${targetRequest.id}`}
          className="relative flex h-[38px] w-[38px] mx-auto items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all cursor-pointer shadow-2xs group"
        >
          <StarIcon size="1em" className="text-[19px] text-amber-500 transition-transform group-hover:scale-110" />
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
    <section
      aria-label="Experience Feedback"
      className={`${styles.card} relative isolate mx-1 overflow-hidden rounded-2xl p-3 text-white`}
    >
      <RequestFeedbackBackdrop sizes="240px" />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss feedback reminder"
        title="Dismiss reminder"
        className="absolute right-2 top-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white/85 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Cancel01Icon size={13} aria-hidden="true" />
      </button>
      <div className="px-5 text-center">
        <h4 className="text-balance text-[15px] font-semibold leading-snug tracking-tight text-white">
          How was your request?
        </h4>
        <p className="mt-1 truncate text-xs font-medium leading-relaxed text-white/90" title={targetRequest.doc_type}>
          {targetRequest.doc_type || "Document request"}
          <span className="font-normal tabular-nums text-white/75"> · {targetRequest.id}</span>
        </p>
      </div>

      {/* Interactive Quick Star Rating */}
      <div className="flex flex-col items-center gap-1 pt-1.5 pb-1">
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
                className="group relative flex h-7 w-7 items-center justify-center rounded-lg p-0.5 transition-transform active:scale-85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/80 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className={cn(
                    "h-5 w-5 transition-colors duration-150",
                    isHovered
                      ? "fill-amber-400 text-amber-400 drop-shadow-xs scale-110"
                      : "fill-transparent text-white/75 group-hover:text-amber-300"
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
              ? "text-amber-300"
              : "text-transparent select-none"
          )}
        >
          {hoverRating > 0 ? RATING_LABELS[hoverRating] : ""}
        </span>
      </div>

      <Button
        size="sm"
        type="button"
        onClick={() => onRateRequest?.(targetRequest, hoverRating || 0)}
        className="w-full border-0 focus-visible:ring-white/80 focus-visible:ring-offset-0"
      >
        Rate Service
      </Button>
    </section>
  );
}
