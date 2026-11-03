"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** A single, ordered toolbar row for record search, filters, views and table controls. */
export default function DataViewToolbar({
  children,
  className,
  label = "Search and filters",
}) {
  return (
    <div
      data-slot="data-view-toolbar"
      role="group"
      aria-label={label}
      className={cn("data-view-toolbar", className)}
    >
      {children}
    </div>
  );
}
