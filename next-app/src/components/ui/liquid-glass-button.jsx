"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function LiquidGlassButton({
  children,
  onClick,
  height = 40,
  radius = 20,
  glassColor = "rgba(128, 0, 0, 0.15)",
  className,
  type = "button",
  disabled = false,
  themeColor = true,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-height={`${height}px`}
      data-radius={`${radius}px`}
      data-theme-color={String(themeColor)}
      data-glass-color={glassColor}
      className={cn(
        "rms-liquid-glass-button relative flex items-center justify-center gap-2 overflow-hidden shadow-xs hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
