"use client";

import { Loading03Icon, RefreshIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton({
  onRefresh,
  isLoading = false,
  title,
  "aria-label": ariaLabel,
  disabled = false,
  className,
}) {
  const Icon = isLoading ? Loading03Icon : RefreshIcon;
  const accessibleName = ariaLabel || title || "Refresh";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      title={title || accessibleName}
      aria-label={accessibleName}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      onClick={onRefresh}
      className={cn(
        "rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all",
        className
      )}
    >
      <Icon size={18} aria-hidden="true" className={isLoading ? "animate-spin" : undefined} />
    </Button>
  );
}
