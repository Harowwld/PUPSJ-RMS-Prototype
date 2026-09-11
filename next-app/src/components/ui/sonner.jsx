"use client"

import { toast as hotToast, useToaster } from "react-hot-toast";
import { toast as sonnerToast } from "sonner";
import React, { useEffect } from "react";

// 1. Play Tone logic (warning/error digital beeps)
const playTone = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    if (type === "error") {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(320, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(240, now + 0.10);
      gain2.gain.setValueAtTime(0.08, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.10);
      osc2.stop(now + 0.25);
    } else if (type === "warning") {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, now + 0.09);
      gain2.gain.setValueAtTime(0.06, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.18);
    }
  } catch (e) {
    console.error("[Toast Audio] Playback failed:", e);
  }
};

// Helper to recursively extract plain text from React nodes, strings, objects, etc.
const extractText = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(" ");
  if (React.isValidElement(node)) return extractText(node.props?.children);
  if (typeof node === "object") {
    if (typeof node.message === "string") return node.message;
    if (typeof node.description === "string") return node.description;
    if (typeof node.title === "string") return node.title;
  }
  return "";
};

// 2. Custom Hot Toast trigger implementing Apple's 5 Dynamic Stages
const triggerCustomToast = (message, options = {}, type = "default") => {
  const safeOptions = (options && typeof options === "object") ? options : {};
  let titleContent = message;
  let descContent = safeOptions.description || "";

  // If message is an object with title/description or an Error (and not a React element)
  if (message && typeof message === "object" && !React.isValidElement(message)) {
    if (message instanceof Error) {
      titleContent = message.message || "An unexpected error occurred";
    } else if ("title" in message || "description" in message) {
      titleContent = message.title || "";
      if (!descContent && message.description) {
        descContent = message.description;
      }
    }
  }

  const rawTitleText = extractText(titleContent);
  const rawDescText = extractText(descContent);
  const lowerTitle = `${rawTitleText} ${rawDescText}`.toLowerCase();
  
  // Play Tone if Warning or Error
  if (type === "error" || type === "warning" || lowerTitle.includes("fail") || lowerTitle.includes("error") || lowerTitle.includes("warning")) {
    playTone(type === "error" ? "error" : "warning");
  }

  // Determine Stage
  let stage = 1;
  const hasAction = !!safeOptions.action;
  const isDismissable = 
    type === "error" || 
    type === "warning" || 
    safeOptions.duration === Infinity || 
    lowerTitle.includes("fail") || 
    lowerTitle.includes("error") || 
    lowerTitle.includes("warning");
  const matchesStage2 = 
    lowerTitle.includes("layout saved") || 
    lowerTitle.includes("approved") || 
    lowerTitle.includes("added") || 
    lowerTitle.includes("registered") || 
    lowerTitle.includes("created") || 
    lowerTitle.includes("restored") || 
    lowerTitle.includes("complete") || 
    lowerTitle.includes("generated") || 
    lowerTitle.includes("uploaded") ||
    lowerTitle.includes("finalized") ||
    lowerTitle.includes("success") ||
    lowerTitle.includes("successful") ||
    lowerTitle.includes("deleted") ||
    lowerTitle.includes("archived") ||
    lowerTitle.includes("removed") ||
    lowerTitle.includes("download") ||
    lowerTitle.includes("downloaded") ||
    lowerTitle.includes("initiated") ||
    lowerTitle.includes("reset") ||
    lowerTitle.includes("cleared") ||
    lowerTitle.includes("clear") ||
    lowerTitle.includes("changed") ||
    lowerTitle.includes("updated") ||
    lowerTitle.includes("saved");

  if (isDismissable) {
    stage = 3;
  } else if (hasAction) {
    const needsIcon = 
      matchesStage2 ||
      lowerTitle.includes("returned") || 
      lowerTitle.includes("ready") || 
      lowerTitle.includes("export") || 
      type === "info" ||
      type === "loading";
    stage = needsIcon ? 5 : 4;
  } else {
    stage = (matchesStage2 || !!descContent || type === "success" || type === "info" || type === "loading") ? 2 : 1;
  }

  const duration = (isDismissable || type === "loading") ? Infinity : (safeOptions.duration || 3000);

  return hotToast.custom(
    (t) => {
      // Entry and exit animations
      const animationClass = t.visible 
        ? "animate-[apple-toast-slide-down_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" 
        : "animate-[apple-toast-slide-up_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]";

      return (
        <div 
          className={`rms-toast flex flex-row flex-nowrap items-center gap-[10px] rounded-full w-max max-w-[min(500px,calc(100vw-32px))] pointer-events-auto ${animationClass}`}
        >
          {/* Left Icon (Stage 2, 3, 5) */}
          {(stage === 2 || stage === 3 || stage === 5) && (
            <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white border-none shadow-xs ${
              type === "error" || type === "warning" ? "bg-[#e30000]" :
              type === "info" ? "bg-blue-500" :
              type === "loading" ? "bg-zinc-800 dark:bg-zinc-700" :
              "bg-[#16a34a]"
            }`}>
              {type === "error" || type === "warning" ? (
                <i className="ph-bold ph-warning text-[14px] text-white" />
              ) : type === "info" ? (
                <i className="ph-bold ph-info text-[14px] text-white" />
              ) : type === "loading" ? (
                <i className="ph-bold ph-spinner animate-spin text-[14px] text-white" />
              ) : (
                <i className="ph-bold ph-check text-[14px] text-white" />
              )}
            </div>
          )}
          
          {/* Text Block */}
          <div className="relative z-10 flex flex-col justify-center min-w-0 flex-1 py-0.5">
            {React.isValidElement(titleContent) ? (
              titleContent
            ) : (
              <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-snug break-words">
                {titleContent}
              </span>
            )}
            {descContent && (
              typeof descContent === "string" || typeof descContent === "number" ? (
                <span className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5 leading-snug break-words">
                  {descContent}
                </span>
              ) : (
                descContent
              )
            )}
          </div>
          
          {/* Stage 3 Dismiss Button */}
          {stage === 3 && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hotToast.dismiss(t.id);
              }}
              className="relative z-10 h-7 w-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center cursor-pointer shrink-0 ml-auto border-none outline-none transition-colors"
            >
              <i className="ph-bold ph-x text-gray-500 dark:text-zinc-400 text-xs" />
            </button>
          )}
          
          {/* Stage 4 or 5 Action Button */}
          {(stage === 4 || stage === 5) && safeOptions.action && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                safeOptions.action.onClick?.(e);
                hotToast.dismiss(t.id);
              }}
              className="relative z-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 py-1 px-3 text-[12px] font-semibold cursor-pointer shrink-0 ml-auto border-none outline-none transition-colors"
            >
              <span className={
                String(safeOptions.action.label || "").toLowerCase() === "undo"
                  ? "text-[#16a34a] dark:text-emerald-400"
                  : (safeOptions.action.destructive || lowerTitle.includes("returned"))
                    ? "text-[#e30000] dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
              }>
                {safeOptions.action.label}
              </span>
            </button>
          )}
        </div>
      );
    },
    {
      id: safeOptions.id,
      duration: duration,
      position: 'top-center',
    }
  );
};

// 3. Re-exportable custom toast interface with full callable support
const toastFn = (msg, opts) => triggerCustomToast(msg, opts, "default");
toastFn.success = (msg, opts) => triggerCustomToast(msg, opts, "success");
toastFn.error = (msg, opts) => triggerCustomToast(msg, opts, "error");
toastFn.warning = (msg, opts) => triggerCustomToast(msg, opts, "warning");
toastFn.info = (msg, opts) => triggerCustomToast(msg, opts, "info");
toastFn.loading = (msg, opts) => triggerCustomToast(msg, opts, "loading");
toastFn.message = (msg, opts) => triggerCustomToast(msg, opts, "default");
toastFn.dismiss = (id) => hotToast.dismiss(id);
toastFn.promise = (promise, msgs = {}, opts = {}) => {
  const loadingMsg = typeof msgs.loading === "function" ? msgs.loading() : msgs.loading;
  const id = loadingMsg ? triggerCustomToast(loadingMsg, opts, "loading") : undefined;
  return promise
    .then((res) => {
      if (id) hotToast.dismiss(id);
      const successMsg = typeof msgs.success === "function" ? msgs.success(res) : msgs.success;
      if (successMsg) triggerCustomToast(successMsg, opts, "success");
      return res;
    })
    .catch((err) => {
      if (id) hotToast.dismiss(id);
      const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
      if (errorMsg) triggerCustomToast(errorMsg, opts, "error");
      throw err;
    });
};
toastFn.custom = (jsx, opts) => hotToast.custom(jsx, opts);

export const toast = toastFn;

// 4. Monkey patch the 'sonner' package exports directly so direct imports keep working
try {
  if (sonnerToast) {
    sonnerToast.success = toastFn.success;
    sonnerToast.error = toastFn.error;
    sonnerToast.warning = toastFn.warning;
    sonnerToast.info = toastFn.info;
    sonnerToast.loading = toastFn.loading;
    sonnerToast.message = toastFn.message;
    sonnerToast.dismiss = toastFn.dismiss;
    sonnerToast.promise = toastFn.promise;
    sonnerToast.custom = toastFn.custom;
  }
} catch (e) {
  console.warn("Could not patch sonner toast exports:", e);
}

// 5. Custom Toaster renderer using CSP-safe classes with Apple liquid glass styling
const Toaster = () => {
  const { toasts, handlers } = useToaster({ duration: 3000, position: "top-center" });

  useEffect(() => {
    // Limit to 3 active visible toasts
    const visibleToasts = toasts.filter((t) => t.visible);
    if (visibleToasts.length > 3) {
      // Dismiss the oldest one (first in the list)
      hotToast.dismiss(visibleToasts[0].id);
    }
  }, [toasts]);

  return (
    <div
      className="rms-toast-viewport"
      onMouseEnter={handlers.startPause}
      onMouseLeave={handlers.endPause}
      aria-live="polite"
    >
      {toasts.map((toastItem) => {
        const animationClass = toastItem.visible
          ? "animate-[apple-toast-slide-down_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
          : "animate-[apple-toast-slide-up_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]";

        const content = typeof toastItem.message === "function"
          ? toastItem.message(toastItem)
          : (
            <div className={`rms-toast flex flex-row flex-nowrap items-center gap-[10px] rounded-full w-max max-w-[min(500px,calc(100vw-32px))] pointer-events-auto ${animationClass}`}>
              <div className="relative z-10 flex flex-col justify-center min-w-0 flex-1 py-0.5">
                <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-snug break-words">
                  {typeof toastItem.message === "string" ? toastItem.message : String(toastItem.message || "")}
                </span>
              </div>
            </div>
          );

        return (
          <div
            key={toastItem.id}
            className={toastItem.visible ? "" : "pointer-events-none"}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};

export { Toaster };
