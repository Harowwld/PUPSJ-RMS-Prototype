"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircleIcon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import { useAppReducedMotion, EASE_OUT } from "@/lib/motion";

const tones = {
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-200",
  danger: "border-rose-500/20 bg-rose-500/10 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200",
};

export default function NoticeBanner({ children, tone = "info", action, dismissKey, onDismiss, className, role, ...props }) {
  const [dismissed, setDismissed] = useState(false);
  const shouldReduceMotion = useAppReducedMotion();

  useEffect(() => {
    if (!dismissKey) return;
    const sync = () => { try { setDismissed(sessionStorage.getItem(`notice:${dismissKey}`) === "dismissed"); } catch { /* Storage can be unavailable. */ } };
    sync();
    window.addEventListener("notice-dismissed", sync);
    return () => window.removeEventListener("notice-dismissed", sync);
  }, [dismissKey]);

  const Icon = tone === "success" ? CheckmarkCircle02Icon : tone === "info" ? InformationCircleIcon : AlertCircleIcon;

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          data-slot="notice-banner"
          role={role ?? (tone === "danger" ? "alert" : "status")}
          initial={{ opacity: 1, height: "auto" }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{
            opacity: 0,
            height: 0,
            transition: shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: EASE_OUT },
          }}
          className={cn(
            "overflow-hidden select-none",
            shouldReduceMotion ? "" : "transition-none"
          )}
        >
          <div className={cn("flex w-full items-start gap-3 border-y px-5 py-2.5 text-xs leading-relaxed sm:px-6", tones[tone] ?? tones.info, className)} {...props}>
            <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 break-words font-medium">{children}</div>
            {action && <div className="shrink-0">{action}</div>}
            {(dismissKey || onDismiss) && (
              <button
                type="button"
                aria-label="Dismiss notice"
                className="flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-black/8 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-current dark:hover:bg-white/15"
                onClick={() => {
                  setDismissed(true);
                  if (dismissKey) {
                    try { sessionStorage.setItem(`notice:${dismissKey}`, "dismissed"); } catch { /* Keep local dismissal when storage is unavailable. */ }
                    window.dispatchEvent(new Event("notice-dismissed"));
                  }
                  onDismiss?.();
                }}
              >
                <Cancel01Icon size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
