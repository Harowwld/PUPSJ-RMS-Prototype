"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircleIcon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "hugeicons-react";
import { RequestFeedbackBackdrop } from "@/components/student/RequestFeedbackCard";
import styles from "./NoticeBanner.module.css";
import { cn } from "@/lib/utils";
import { useAppReducedMotion, EASE_OUT } from "@/lib/motion";

export default function NoticeBanner({ children, title, tone = "info", action, dismissKey, onDismiss, className, role, imageSizes = "100vw", ...props }) {
  const [dismissed, setDismissed] = useState(false);
  const shouldReduceMotion = useAppReducedMotion();

  useEffect(() => {
    if (!dismissKey) return;
    const sync = () => { try { setDismissed(sessionStorage.getItem(`notice:${dismissKey}`) === "dismissed"); } catch { /* Storage can be unavailable. */ } };
    sync();
    window.addEventListener("notice-dismissed", sync);
    return () => window.removeEventListener("notice-dismissed", sync);
  }, [dismissKey]);

  const hasDescription = children != null && children !== false && children !== "";
  const Icon = tone === "success" ? CheckmarkCircle02Icon : tone === "info" ? InformationCircleIcon : AlertCircleIcon;

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          data-slot="notice-banner"
          data-tone={tone}
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
            "shrink-0 overflow-hidden",
            shouldReduceMotion ? "" : "transition-none"
          )}
        >
          <div className={cn(styles.surface, "relative isolate flex w-full flex-wrap items-center gap-x-3 gap-y-1 overflow-hidden px-6 py-1.5 text-xs leading-relaxed text-white", className)} {...props}>
            <RequestFeedbackBackdrop sizes={imageSizes} />
            <Icon size={16} aria-hidden="true" className="shrink-0" />
            <div className={cn("min-w-0 flex-1 wrap-anywhere", action && "basis-48")}>
              {title && (
                <>
                  <strong className="font-semibold">{title}{hasDescription && !String(title).trimEnd().endsWith(":") && ":"}</strong>
                  {hasDescription && " "}
                </>
              )}
              {children}
            </div>
            {(action || dismissKey || onDismiss) && (
              <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
                {action && <div className="shrink-0">{action}</div>}
                {(dismissKey || onDismiss) && (
                  <button
                    type="button"
                    aria-label="Dismiss notice"
                    className="flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-current dark:hover:bg-white/15"
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
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
