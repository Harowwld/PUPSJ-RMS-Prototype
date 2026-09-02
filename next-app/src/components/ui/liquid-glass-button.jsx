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
      style={{
        height: `${height}px`,
        borderRadius: `${radius}px`,
        background: themeColor ? "var(--brand-accent, #ad2f2f)" : `linear-gradient(135deg, ${glassColor}, rgba(255, 255, 255, 0.05))`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: themeColor ? "1px solid color-mix(in srgb, var(--brand-accent, #ad2f2f) 75%, black)" : "1px solid rgba(255, 255, 255, 0.2)",
        color: themeColor ? "var(--brand-foreground, #ffffff)" : undefined,
      }}
      className={cn(
        "relative flex items-center justify-center gap-2 overflow-hidden shadow-xs hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
