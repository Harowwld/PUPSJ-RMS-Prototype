"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Capsule Stepped Slider
 *
 * Designed according to Apple HIG & design-taste-frontend standards:
 * - Fluid box-fill geometry: the active fill seamlessly fills the container up to the indicator bar
 * - Dual-layer optical text inversion: text & dots smoothly invert contrast as the fill sweeps across
 * - Brand-aware theme: uses rich PUP Maroon / var(--brand-accent, #800000) as default, eliminating dull gray-on-gray
 * - Zero-latency pointer tracking: instant 1:1 tracking when dragging, smooth ease-out on release or programmatic change
 * - Compact, refined sizing (default h-8 / 32px) matching Apple / Figma standard controls
 * - Accessible native range input overlay with keyboard support (arrows, Home, End, PageUp/Down)
 * - SoundEffects listener integration via [data-slot="slider-track"] and type="range"
 */
const Slider = React.forwardRef(
  (
    {
      value,
      defaultValue = 50,
      min = 0,
      max = 100,
      step = 1,
      onChange,
      onValueChange,
      onChangeCommit,
      label = "Opacity",
      showValue = true,
      formatValue = (v) => Math.round(v),
      ticks = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
      showTicks = true,
      disabled = false,
      className,
      ariaLabel,
      id,
      name,
      size = "default",
      variant = "brand",
      fillClassName,
      ...props
    },
    ref
  ) => {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState(
      defaultValue !== undefined ? defaultValue : min
    );
    const currentValue = isControlled ? value : internalValue;
    const [isDragging, setIsDragging] = React.useState(false);

    // Normalize value within min-max bounds
    const clampedValue = Math.max(min, Math.min(max, Number(currentValue) || 0));
    const rangeSpan = max - min;
    const percentage = rangeSpan > 0 ? ((clampedValue - min) / rangeSpan) * 100 : 0;
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    const handleInputChange = (e) => {
      if (disabled) return;
      const nextVal = parseFloat(e.target.value);
      if (!isControlled) {
        setInternalValue(nextVal);
      }
      onChange?.(nextVal);
      onValueChange?.(nextVal);
    };

    const handlePointerDown = () => {
      if (disabled) return;
      setIsDragging(true);
    };

    const handleCommit = (e) => {
      setIsDragging(false);
      if (disabled) return;
      const finalVal = parseFloat(e.currentTarget.value);
      onChangeCommit?.(finalVal);
    };

    // Compact sizing: default is 32px (h-8), sm is 30px (h-7.5), md is 36px (h-9)
    const sizeClasses = {
      sm: "h-7.5 rounded-lg text-[11px]",
      default: "h-8 rounded-xl text-xs",
      md: "h-9 rounded-xl text-xs",
      lg: "h-10 rounded-xl text-sm",
    }[size] || "h-8 rounded-xl text-xs";

    // Vibrant fill color variants (replaces dull gray with lively, prestigious colors)
    const variantFillClasses = {
      brand: "bg-[var(--brand-accent,#800000)] dark:bg-[var(--brand-accent,#800000)]",
      maroon: "bg-pup-maroon dark:bg-red-700",
      blue: "bg-blue-600 dark:bg-blue-500",
      emerald: "bg-emerald-600 dark:bg-emerald-500",
      neutral: "bg-gray-800 dark:bg-zinc-700",
    }[variant] || "bg-[var(--brand-accent,#800000)] dark:bg-[var(--brand-accent,#800000)]";

    const activeFillClass = fillClassName || variantFillClasses;

    return (
      <div
        ref={ref}
        data-slot="slider-track"
        className={cn(
          "relative w-full max-w-[260px] select-none overflow-hidden flex items-center justify-between outline-none",
          sizeClasses,
          // Recessed capsule track: clearly distinct from white parent cards & toolbars so it clearly reads as a slider
          "bg-gray-100 dark:bg-zinc-800 border border-black/[0.08] dark:border-white/[0.1] shadow-2xs",
          // Accessible focus styling: subtle border tint on keyboard focus only (never on mouse click)
          "focus-within:has-[:focus-visible]:border-pup-maroon/60 dark:focus-within:has-[:focus-visible]:border-red-400/60",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
        {...props}
      >
        {/* Base Layer (Unfilled Side): Crisp dark text, subtle muted dots on clean surface */}
        <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none select-none">
          {label && (
            <span className="text-xs font-semibold tracking-tight text-gray-700 dark:text-zinc-300 font-jakarta">
              {label}
            </span>
          )}

          {showTicks && Array.isArray(ticks) && (
            <div className="absolute inset-0 pointer-events-none select-none">
              {ticks.map((tickPct) => (
                <span
                  key={tickPct}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full w-[2px] h-[2px] bg-gray-400 dark:bg-zinc-500"
                  style={{ left: `${tickPct}%` }}
                />
              ))}
            </div>
          )}

          {showValue && (
            <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-zinc-100 font-jakarta">
              {formatValue(clampedValue)}
            </span>
          )}
        </div>

        {/* Active Fill Layer (Clipped by percentage): Rich vibrant brand accent with white text & white dots */}
        <div
          data-slot="slider-fill"
          className={cn(
            "absolute inset-0 pointer-events-none",
            activeFillClass,
            isDragging ? "transition-none" : "transition-[clip-path] duration-150 ease-out"
          )}
          style={{ clipPath: `inset(0 ${100 - clampedPercentage}% 0 0)` }}
        >
          <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none select-none">
            {label && (
              <span className="text-xs font-semibold tracking-tight text-white font-jakarta">
                {label}
              </span>
            )}

            {showTicks && Array.isArray(ticks) && (
              <div className="absolute inset-0 pointer-events-none select-none">
                {ticks.map((tickPct) => (
                  <span
                    key={tickPct}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full w-[2px] h-[2px] bg-white/70"
                    style={{ left: `${tickPct}%` }}
                  />
                ))}
              </div>
            )}

            {showValue && (
              <span className="text-xs font-semibold tabular-nums text-white font-jakarta">
                {formatValue(clampedValue)}
              </span>
            )}
          </div>
        </div>

        {/* Vertical Indicator Bar: Crisp white vertical dividing line right at the leading edge */}
        <div
          data-slot="slider-thumb"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none z-20 shadow-[0_0_2px_rgba(0,0,0,0.35)]",
            size === "sm" ? "w-[1.75px] h-3.5" : "w-[2px] h-4",
            clampedPercentage <= 0 ? "opacity-0" : "bg-white",
            isDragging ? "transition-none" : "transition-[left] duration-150 ease-out"
          )}
          style={{ left: `${clampedPercentage}%` }}
          aria-hidden="true"
        />

        {/* Transparent Native Range Input Overlay: Provides 100% full drag, keyboard, ARIA & ratchet ticks */}
        <input
          type="range"
          id={id}
          name={name}
          min={min}
          max={max}
          step={step}
          value={clampedValue}
          disabled={disabled}
          aria-label={ariaLabel || (typeof label === "string" ? label : "Slider")}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clampedValue}
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          onChange={handleInputChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          onKeyUp={handleCommit}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer active:cursor-grabbing z-30 m-0 outline-none focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
