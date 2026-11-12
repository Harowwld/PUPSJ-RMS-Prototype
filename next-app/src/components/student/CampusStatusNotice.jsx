"use client";

import { Cancel01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { RequestFeedbackBackdrop } from "./RequestFeedbackCard";
import feedbackStyles from "./RequestFeedbackCard.module.css";

export default function CampusStatusNotice({ title, children, action, onDismiss, imageSizes = "(max-width: 640px) 100vw, 576px" }) {
  return (
    <div className={cn(feedbackStyles.card, "relative isolate flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 overflow-hidden px-6 py-1.5 text-xs leading-relaxed text-white")}>
      <RequestFeedbackBackdrop sizes={imageSizes} />
      <div className={cn("min-w-0 flex-1", action && "basis-64")}>
        <strong className="font-semibold">{title}</strong>
        <span className="text-white/85"> · {children}</span>
      </div>
      {action}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Dismiss notice"
          title="Dismiss notice"
        >
          <Cancel01Icon size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
