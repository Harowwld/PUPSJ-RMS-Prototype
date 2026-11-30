"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy01Icon, Tick01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";

/**
 * Interactive Copy Button following Apple HIG & RMS Component Standards (Approach A).
 * - Text label by default, with an icon-only option for sheets.
 * - Standard Verb + Noun in idle state: `Copy [Entity]`
 * - Explicit transient confirmation state: `[Entity] Copied!` without color change.
 * - CSS Grid overlay ensures zero layout shift / button width jitter during label transitions.
 * - Auto-reverts after 2000ms with cleanup on unmount.
 * - Fully accessible via `aria-live="polite"`.
 */
export function CopyButton({
  textToCopy,
  entityName = "Data",
  idleLabel,
  copiedLabel,
  showToast = true,
  toastDescription,
  onCopySuccess,
  onClick,
  className,
  variant = "outline",
  size,
  iconOnly = false,
  children,
  ...props
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const resolvedIdleLabel = idleLabel || children || `Copy ${entityName}`;
  const resolvedCopiedLabel = copiedLabel || `${entityName} Copied!`;

  const handleCopy = useCallback(
    async (event) => {
      onClick?.(event);
      if (event.defaultPrevented) return;

      try {
        let text = typeof textToCopy === "function" ? await textToCopy() : textToCopy;
        if (text === null || text === undefined) text = "";
        const str = String(text);

        await navigator.clipboard.writeText(str);

        setCopied(true);
        onCopySuccess?.(str);

        if (showToast) {
          toast.success(resolvedCopiedLabel, {
            description: toastDescription || `${entityName} has been copied to your clipboard.`,
          });
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy text:", err);
        toast.error("Copy Failed", {
          description: "Unable to copy to clipboard. Please check browser permissions.",
        });
      }
    },
    [textToCopy, entityName, resolvedCopiedLabel, showToast, toastDescription, onCopySuccess, onClick]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <Button
      type="button"
      variant={variant}
      size={size || (iconOnly ? "icon-xs" : "sm")}
      aria-label={iconOnly ? resolvedIdleLabel : undefined}
      title={iconOnly ? (copied ? resolvedCopiedLabel : resolvedIdleLabel) : undefined}
      data-sound="copy"
      onClick={handleCopy}
      aria-live="polite"
      className={cn(
        iconOnly ? "shrink-0 rounded-lg" : "h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs transition-all select-none active:scale-95 cursor-pointer",
        className
      )}
      {...props}
    >
      {iconOnly ? (
        <>
          {copied ? <Tick01Icon size={14} aria-hidden="true" /> : <Copy01Icon size={14} aria-hidden="true" />}
          <span className="sr-only" role="status">{copied ? resolvedCopiedLabel : ""}</span>
        </>
      ) : (
        <span className="inline-grid grid-cols-1 grid-rows-1 place-items-center w-full">
          <span
            aria-hidden={!copied}
            className={cn(
              "col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-150",
              copied ? "opacity-100" : "opacity-0 pointer-events-none select-none"
            )}
          >
            {resolvedCopiedLabel}
          </span>
          <span
            aria-hidden={copied}
            className={cn(
              "col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-150",
              copied ? "opacity-0 pointer-events-none select-none" : "opacity-100"
            )}
          >
            {resolvedIdleLabel}
          </span>
        </span>
      )}
    </Button>
  );
}

export default CopyButton;
