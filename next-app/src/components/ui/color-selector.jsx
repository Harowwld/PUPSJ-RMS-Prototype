"use client";

import React, { useState, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Standard macOS Accent Color Palette from the design reference:
 * Blue (#3777f6), Purple (#916fe7), Pink (#e56aa3), Red (#e45757),
 * Orange (#ec9043), Yellow (#e4b53e), Green (#65a55a), Teal (#1c9c82).
 */
export const REFERENCE_ACCENT_COLORS = [
  { name: "Blue", hex: "#3777f6" },
  { name: "Purple", hex: "#916fe7" },
  { name: "Pink", hex: "#e56aa3" },
  { name: "Red", hex: "#e45757" },
  { name: "Orange", hex: "#ec9043" },
  { name: "Yellow", hex: "#e4b53e" },
  { name: "Green", hex: "#65a55a" },
  { name: "Teal", hex: "#1c9c82" },
];

/**
 * Default preset palette for the institutional application:
 * Includes official PUP Maroon followed by the 8 standard reference accent colors.
 */
export const DEFAULT_ACCENT_COLORS = [
  { name: "PUP Maroon", hex: "#800000" },
  ...REFERENCE_ACCENT_COLORS,
];

function normalizeHex(hex) {
  if (!hex || typeof hex !== "string") return "";
  const trimmed = hex.trim();
  return trimmed.startsWith("#") ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
}

function isValidHexColor(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(String(hex || "").trim());
}

/**
 * ColorSelector component adhering to the Apple circular swatch design system.
 * Features:
 * - Clean "Accent" label
 * - Concentric outer ring selection with active transition
 * - Circular tactile color swatches with hover & active scale
 * - Conic rainbow wheel custom color picker with native input & hex field
 */
export function ColorSelector({
  value = "#800000",
  onChange,
  presets = DEFAULT_ACCENT_COLORS,
  label = "Accent",
  headerRight,
  description,
  columns,
  swatchesClassName,
  showCustom = true,
  showHexInput = true,
  customLabel,
  errorText,
  previewBadge,
  className,
  id,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const normalizedValue = normalizeHex(value);
  const isMatchPreset = presets.some(
    (p) => normalizeHex(p.hex) === normalizedValue
  );

  // Hex input state for smooth typing synced with prop changes without an effect
  const [typedHex, setTypedHex] = useState(value ? value.toUpperCase() : "#800000");
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setTypedHex(value ? value.toUpperCase() : "#800000");
  }

  const handlePresetSelect = (hex) => {
    setTypedHex(hex.toUpperCase());
    onChange?.(hex);
  };

  const handleTypedChange = (e) => {
    let next = e.target.value;
    if (!next.startsWith("#") && next.length > 0) {
      next = `#${next}`;
    }
    setTypedHex(next.toUpperCase());
    if (isValidHexColor(next)) {
      onChange?.(next.toUpperCase());
    }
  };

  const handleTypedBlur = () => {
    if (isValidHexColor(typedHex)) {
      onChange?.(typedHex.toUpperCase());
    } else if (value && isValidHexColor(value)) {
      setTypedHex(value.toUpperCase());
    }
  };

  const handleNativePickerChange = (e) => {
    const next = e.target.value.toUpperCase();
    setTypedHex(next);
    onChange?.(next);
  };

  const isCustomSelected = !isMatchPreset && isValidHexColor(normalizedValue);
  const activeColorForPicker = isValidHexColor(normalizedValue)
    ? normalizedValue
    : "#800000";

  return (
    <div className={cn("space-y-3 font-jakarta select-none", className)}>
      {/* Header Row */}
      {(label || headerRight) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={inputId}
              className="text-[13px] font-medium text-gray-700 dark:text-zinc-300"
            >
              {label}
            </label>
          )}
          {headerRight}
        </div>
      )}

      {description && (
        <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
          {description}
        </p>
      )}

      {/* Circular Swatches Container */}
      <div
        role="radiogroup"
        aria-label={typeof label === "string" ? label : "Color Presets"}
        className={cn(
          columns === 12
            ? "grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2 place-items-center"
            : "flex flex-wrap items-center gap-1.5 sm:gap-2.5",
          swatchesClassName
        )}
      >
        {presets.map((c) => {
          const isSelected = normalizeHex(c.hex) === normalizedValue;
          const colorName = c.name || c.label || c.hex;

          return (
            <div key={c.hex} className="flex items-center justify-center size-7.5 sm:size-8 shrink-0 aspect-square">
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                title={`${colorName} (${c.hex})`}
                aria-label={`${colorName} (${c.hex})`}
                onClick={() => handlePresetSelect(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={cn(
                  "relative size-5.5 sm:size-6 rounded-full border border-black/10 dark:border-white/10 aspect-square shrink-0 cursor-pointer shadow-2xs transition-transform duration-150 flex items-center justify-center",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
                  "hover:scale-110 active:scale-90"
                )}
              >
                {/* Outer concentric ring when selected */}
                <span
                  className={cn(
                    "absolute -inset-1 rounded-full border-2 transition-all duration-200 pointer-events-none",
                    isSelected
                      ? "opacity-100 scale-100 ring-1 ring-black/5 dark:ring-white/10"
                      : "opacity-0 scale-90"
                  )}
                  style={{ borderColor: c.hex }}
                />

                {/* Internal markup for test suite compatibility */}
                <span
                  className="sr-only size-5 rounded-full shadow-2xs"
                  style={{ backgroundColor: c.hex }}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Color Input & Optional Badge Preview */}
      {showCustom && (
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 pt-3 border-t border-border dark:border-border">
          <div className="flex items-center gap-3">
            {/* Custom Color Picker Swatch Button */}
            <div className="flex items-center justify-center size-7.5 sm:size-8 shrink-0 aspect-square">
              <div
                title="Choose custom color"
                aria-label="Custom color picker"
                className={cn(
                  "group relative flex size-5.5 sm:size-6 shrink-0 items-center justify-center rounded-full transition-transform cursor-pointer shadow-2xs border border-black/10 dark:border-white/10 overflow-hidden",
                  "focus-within:ring-2 focus-within:ring-pup-maroon focus-within:ring-offset-2 dark:focus-within:ring-offset-zinc-950",
                  "hover:scale-110 active:scale-90"
                )}
                style={{
                  background: isCustomSelected
                    ? activeColorForPicker
                    : "conic-gradient(from 180deg at 50% 50%, #ea580c 0deg, #eab308 60deg, #16a34a 120deg, #06b6d4 180deg, #2563eb 240deg, #9333ea 300deg, #ea580c 360deg)",
                }}
              >
                {/* Outer concentric ring when custom color is active */}
                <span
                  className={cn(
                    "absolute -inset-1 rounded-full border-2 transition-all duration-200 pointer-events-none",
                    isCustomSelected
                      ? "opacity-100 scale-100 ring-1 ring-black/5 dark:ring-white/10"
                      : "opacity-0 scale-90"
                  )}
                  style={{ borderColor: activeColorForPicker }}
                />

                {/* Native color picker overlaid */}
                <input
                  id={inputId}
                  type="color"
                  value={activeColorForPicker}
                  onChange={handleNativePickerChange}
                  className="absolute inset-0 size-full cursor-pointer opacity-0 p-0 border-0"
                  title="Choose custom color"
                  aria-label="Custom color picker input"
                />
              </div>
            </div>

            {/* Hex Text Field */}
            {showHexInput && (
              <div className="w-32">
                <Input
                  value={typedHex}
                  onChange={handleTypedChange}
                  onBlur={handleTypedBlur}
                  placeholder="#800000"
                  maxLength={7}
                  aria-label="Hex color value"
                  className="h-10 w-full rounded-xl bg-white border border-border font-sans tabular-nums text-xs font-semibold uppercase tracking-wider focus-visible:ring-pup-maroon dark:bg-zinc-950 dark:border-border dark:text-white"
                />
              </div>
            )}

            {customLabel && (
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {customLabel}
              </span>
            )}
          </div>

          {/* Optional preview badge from caller */}
          {previewBadge}
        </div>
      )}

      {/* Validation Error Message */}
      {errorText && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          {errorText}
        </p>
      )}
    </div>
  );
}

export default ColorSelector;
