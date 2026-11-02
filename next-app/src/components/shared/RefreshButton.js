"use client";

import { Loading03Icon, RefreshIcon } from "hugeicons-react";
import { Button } from "@/components/ui/button";

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
      className={`rounded-xl text-gray-500 transition-colors hover:border-[color:var(--brand-accent,#800000)] hover:text-[color:var(--brand-accent,#800000)] dark:text-zinc-400 ${className || ""}`}
    >
      <Icon size={18} aria-hidden="true" className={isLoading ? "animate-spin" : undefined} />
    </Button>
  );
}
