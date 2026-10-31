"use client";

import { useState, useEffect } from "react";
import { AlertCircleIcon, Cancel01Icon, CheckmarkCircle02Icon, InformationCircleIcon } from "hugeicons-react";
import { cn } from "@/lib/utils";

const tones = {
  warning: "border-amber-200/90 bg-amber-50/90 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200",
  success: "border-emerald-200/90 bg-emerald-50/90 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-200",
  info: "border-blue-200/90 bg-blue-50/90 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/25 dark:text-blue-200",
  danger: "border-rose-200/90 bg-rose-50/90 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200",
};

export default function NoticeBanner({ children, tone = "info", action, dismissKey, onDismiss, className, role, ...props }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!dismissKey) return;
    const sync = () => { try { setDismissed(sessionStorage.getItem(`notice:${dismissKey}`) === "dismissed"); } catch { /* Storage can be unavailable. */ } };
    sync();
    window.addEventListener("notice-dismissed", sync);
    return () => window.removeEventListener("notice-dismissed", sync);
  }, [dismissKey]);
  if (dismissed) return null;
  const Icon = tone === "success" ? CheckmarkCircle02Icon : tone === "info" ? InformationCircleIcon : AlertCircleIcon;
  return (
    <div data-slot="notice-banner" role={role ?? (tone === "danger" ? "alert" : "status")} className={cn("flex w-full items-start gap-3 border-y px-5 py-2.5 text-xs leading-relaxed sm:px-6", tones[tone] ?? tones.info, className)} {...props}>
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {(dismissKey || onDismiss) && <button type="button" aria-label="Dismiss notice" className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-current dark:hover:bg-white/10" onClick={() => {
        setDismissed(true);
        if (dismissKey) {
          try { sessionStorage.setItem(`notice:${dismissKey}`, "dismissed"); } catch { /* Keep local dismissal when storage is unavailable. */ }
          window.dispatchEvent(new Event("notice-dismissed"));
        }
        onDismiss?.();
      }}><Cancel01Icon size={16} aria-hidden="true" /></button>}
    </div>
  );
}
