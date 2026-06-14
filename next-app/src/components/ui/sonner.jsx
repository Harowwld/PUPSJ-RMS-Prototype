"use client"

import { Toaster as HotToaster, toast as hotToast, useToasterStore } from "react-hot-toast";
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

// 2. Custom Hot Toast trigger implementing Apple's 5 Dynamic Stages
const triggerCustomToast = (message, options = {}, type = "default") => {
  const titleText = typeof message === "string" ? message : (message?.props?.children || String(message || ""));
  const descText = options.description || "";
  
  const lowerTitle = titleText.toLowerCase();
  
  // Play Tone if Warning or Error
  if (type === "error" || type === "warning" || lowerTitle.includes("fail") || lowerTitle.includes("error") || lowerTitle.includes("warning")) {
    playTone(type === "error" ? "error" : "warning");
  }

  // Determine Stage
  let stage = 1;
  const hasAction = !!options.action;
  const isDismissable = 
    type === "error" || 
    type === "warning" || 
    options.duration === Infinity || 
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
            type === "info";
          stage = needsIcon ? 5 : 4;
        } else {
          stage = (matchesStage2 || !!descText || type === "success" || type === "info") ? 2 : 1;
        }

  const duration = isDismissable ? Infinity : (options.duration || 3000);

  return hotToast.custom(
    (t) => {
      // Entry and exit animations
      const animationClass = t.visible 
        ? "animate-[apple-toast-slide-down_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" 
        : "animate-[apple-toast-slide-up_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]";

      return (
        <div 
          className={`flex items-center gap-[10px] bg-white dark:bg-zinc-900 border-[0.5px] border-black/[0.08] dark:border-white/[0.08] rounded-full w-max max-w-[450px] pointer-events-auto ${animationClass}`}
          style={{
            borderRadius: '999px',
            padding: '8px 16px 8px 10px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            border: '0.5px solid rgba(0,0,0,0.08)',
          }}
        >
          {/* Left Icon (Stage 2, 3, 5) */}
          {(stage === 2 || stage === 3 || stage === 5) && (
            <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white border-none ${
              type === "error" || type === "warning" ? "bg-[#e30000]" :
              type === "info" ? "bg-blue-500" : "bg-[#16a34a]"
            }`}>
              {type === "error" || type === "warning" ? (
                <i className="ph-bold ph-warning text-[14px] text-white" />
              ) : type === "info" ? (
                <i className="ph-bold ph-info text-[14px] text-white" />
              ) : (
                <i className="ph-bold ph-check text-[14px] text-white" />
              )}
            </div>
          )}
          
          {/* Text Block */}
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-tight">
              {titleText}
            </span>
            {descText && (
              <span className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-[2px] leading-tight">
                {descText}
              </span>
            )}
          </div>
          
          {/* Stage 3 Dismiss Button */}
          {stage === 3 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                hotToast.dismiss(t.id);
              }}
              className="h-7 w-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer shrink-0 ml-auto border-none outline-none"
            >
              <i className="ph-bold ph-x text-gray-500 dark:text-zinc-400 text-xs" />
            </button>
          )}
          
          {/* Stage 4 or 5 Action Button */}
          {(stage === 4 || stage === 5) && options.action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                options.action.onClick?.(e);
                hotToast.dismiss(t.id);
              }}
              className="rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 py-1 px-3 text-[12px] font-semibold cursor-pointer shrink-0 ml-auto border-none outline-none"
            >
              <span className={
                options.action.destructive || 
                lowerTitle.includes("returned") || 
                options.action.label.toLowerCase() === "undo"
                  ? "text-[#e30000] dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }>
                {options.action.label}
              </span>
            </button>
          )}
        </div>
      );
    },
    {
      id: options.id,
      duration: duration,
      position: 'top-center',
    }
  );
};

// 3. Re-exportable custom toast interface
export const toast = {
  success: (msg, opts) => triggerCustomToast(msg, opts, "success"),
  error: (msg, opts) => triggerCustomToast(msg, opts, "error"),
  warning: (msg, opts) => triggerCustomToast(msg, opts, "warning"),
  info: (msg, opts) => triggerCustomToast(msg, opts, "info"),
  loading: (msg, opts) => triggerCustomToast(msg, opts, "loading"),
  message: (msg, opts) => triggerCustomToast(msg, opts, "default"),
  dismiss: (id) => hotToast.dismiss(id),
};

// 4. Monkey patch the 'sonner' package exports directly so direct imports keep working
try {
  if (sonnerToast) {
    sonnerToast.success = toast.success;
    sonnerToast.error = toast.error;
    sonnerToast.warning = toast.warning;
    sonnerToast.info = toast.info;
    sonnerToast.loading = toast.loading;
    sonnerToast.message = toast.message;
    sonnerToast.dismiss = toast.dismiss;
  }
} catch (e) {
  console.warn("Could not patch sonner toast exports:", e);
}

// 5. Custom Toaster Wrapper rendering react-hot-toast's Toaster container
const Toaster = () => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    // Limit to 3 active visible toasts
    const visibleToasts = toasts.filter((t) => t.visible);
    if (visibleToasts.length > 3) {
      // Dismiss the oldest one (first in the list)
      hotToast.dismiss(visibleToasts[0].id);
    }
  }, [toasts]);

  return (
    <HotToaster
      position="top-center"
      containerStyle={{
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
      }}
      toastOptions={{
        duration: 3000,
      }}
    />
  );
};

export { Toaster };

