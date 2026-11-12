"use client";
import React, { useState, useMemo, useSyncExternalStore } from "react";
import { MeshGradient } from "@mesh-gradient/react";
import { APPLE_WALLPAPER_PRESETS, getAppleWallpaperPreset } from "@/lib/constants";
import {
  DYNAMIC_COVER_MOODS,
  generateDynamicCoverTheme,
} from "@/lib/dynamicCoverGenerator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppReducedMotion } from "@/lib/motion";
import { DiceFaces03Icon, ColorsIcon, Tick01Icon } from "hugeicons-react";

const SPRING_LAYOUT = { type: "spring", stiffness: 450, damping: 28 };

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function AppleProfileCover({
  wallpaperId = "sequoia",
  onSelectWallpaper,
  className,
  showControls = true,
}) {
  const isMounted = useIsMounted();
  const shouldReduceMotion = useAppReducedMotion();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState("all");
  const [shuffleCount, setShuffleCount] = useState(0);

  const [customTheme, setCustomTheme] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("pupsj_profile_cover_custom");
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore storage errors
      }
    }
    return null;
  });

  const [activeId, setActiveId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pupsj_profile_cover_id");
        if (saved) {
          return saved;
        }
      } catch {
        // ignore storage errors
      }
    }
    return wallpaperId || "sequoia";
  });

  const currentPreset = useMemo(() => {
    if (activeId.startsWith("custom-mesh-") && customTheme && customTheme.id === activeId) {
      return customTheme;
    }
    return getAppleWallpaperPreset(activeId);
  }, [activeId, customTheme]);

  // Staged theme for the live preview in the modal
  const [stagedTheme, setStagedTheme] = useState(currentPreset);

  const handleOpenChange = (open) => {
    if (open) {
      setStagedTheme(currentPreset);
    }
    setPickerOpen(open);
  };

  const handleSelectPreset = (preset) => {
    setStagedTheme(preset);
  };

  const handleRollTheme = (mood = selectedMood) => {
    const next = generateDynamicCoverTheme(mood);
    setStagedTheme(next);
    setShuffleCount((c) => c + 1);
  };

  const handleApplyStagedTheme = () => {
    if (!stagedTheme) return;
    setActiveId(stagedTheme.id);
    if (stagedTheme.isDynamic) {
      setCustomTheme(stagedTheme);
      try {
        localStorage.setItem("pupsj_profile_cover_id", stagedTheme.id);
        localStorage.setItem("pupsj_profile_cover_custom", JSON.stringify(stagedTheme));
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        localStorage.setItem("pupsj_profile_cover_id", stagedTheme.id);
      } catch {
        // ignore storage errors
      }
    }
    if (onSelectWallpaper) {
      onSelectWallpaper(stagedTheme.id);
    }
    toast.success(`Theme updated to ${stagedTheme.name}`, {
      description: stagedTheme.theme,
    });
    setPickerOpen(false);
  };

  return (
    <div
      className={cn(
        "group relative h-44 sm:h-52 w-full overflow-hidden select-none bg-zinc-950",
        className
      )}
    >
      {/* Background Layer: CSS Radial Mesh Fallback + Hardware WebGL MeshGradient */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{ background: currentPreset.cssGradient }}
      >
        {isMounted && (
          <MeshGradient
            key={activeId}
            options={{
              colors: currentPreset.colors,
              animationSpeed: 0.25,
            }}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              inset: 0,
            }}
          />
        )}
      </div>

      {/* Apple Specular Top Rim Light Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

      {/* Subtle Noise / Glass Texture Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-black/[0.04] backdrop-contrast-[1.05]" />

      {/* Apple Ambient Bottom Depth Vignette */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />

      {/* Top Banner Controls: Change Cover Button (Hidden by default, revealed on hover, text-only per Apple HIG) */}
      {showControls && (
        <div className="absolute top-3.5 right-3.5 sm:right-5 z-10 transition-opacity duration-200 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setStagedTheme(currentPreset);
              setPickerOpen(true);
            }}
            className="h-8 px-3.5 text-xs font-semibold rounded-full bg-black/45 hover:bg-black/65 text-white border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Change Profile Cover Theme"
          >
            Change Cover
          </Button>
        </div>
      )}

      {/* Profile Cover Theme Selector Modal: Unified 1-Tab 2-Sided Architecture */}
      <Dialog open={pickerOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-3xl lg:max-w-4xl p-0 overflow-hidden rounded-[24px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-jakarta flex flex-col md:h-[500px] max-h-[92vh]">
          {/* Modal Header spanning full width across both sides (Frameless, no bottom line) */}
          <div className="px-5 sm:px-6 pt-5 pb-2 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-50">
                Profile Cover Themes
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Personalize your profile header with dynamic mesh gradients and curated institutional themes.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* 2-Sided Workspace (Unified in 1 View/Tab) */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* Left Pane: Curated Presets Selection */}
            <div className="w-full md:w-[54%] lg:w-[56%] flex flex-col p-4 sm:p-5 border-b md:border-b-0 md:border-r border-black/[0.06] dark:border-white/[0.08] overflow-hidden min-h-0">
              <div className="flex items-center justify-between shrink-0 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Curated Presets ({APPLE_WALLPAPER_PRESETS.length})
                </span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Select to preview
                </span>
              </div>

              {/* Presets Grid: Compact Height Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto flex-1 pr-1.5 select-none">
                {APPLE_WALLPAPER_PRESETS.map((preset) => {
                  const isStaged = stagedTheme?.id === preset.id;
                  const isCurrent = activeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "group relative flex items-center gap-2 py-1.5 px-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.98]",
                        isStaged
                          ? "bg-white dark:bg-zinc-800 border-pup-maroon/60 dark:border-red-500/60 ring-2 ring-pup-maroon/20 dark:ring-red-500/20 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                          : "border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-black/15 dark:hover:border-white/20"
                      )}
                    >
                      {/* Swatch Preview: Compact Circular Color Lens */}
                      <div
                        className="relative size-8.5 rounded-full shrink-0 overflow-hidden shadow-2xs border border-black/10 dark:border-white/20 ring-2 ring-black/5 dark:ring-white/10"
                        style={{ background: preset.cssGradient }}
                      >
                        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 bg-black/[0.04] pointer-events-none" />
                      </div>

                      {/* Information */}
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="text-[12px] font-semibold text-gray-900 dark:text-zinc-100 truncate block">
                          {preset.name}
                        </span>
                        <p className="text-[10.5px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-tight truncate">
                          {preset.theme}
                        </p>
                      </div>

                      {/* Selected Checkmark Pill */}
                      {isCurrent && (
                        <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-gray-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
                          <Tick01Icon size="0.65em" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Live Preview, Harmonic Mesh Generator & Actions */}
            <div className="w-full md:w-[46%] lg:w-[44%] p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden">
              <div className="h-full flex flex-col justify-between p-3.5 sm:p-4 rounded-[22px] bg-gray-50/80 dark:bg-zinc-850/50 border border-black/[0.06] dark:border-white/[0.08] shadow-xs overflow-hidden min-h-0">
                <div className="space-y-3 min-h-0 flex flex-col overflow-y-auto pr-0.5">
                  {/* Live Preview Label & Badge */}
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                      Live Preview
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900 dark:text-zinc-100">
                        <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                          <Tick01Icon size={8} className="stroke-[3]" />
                        </span>
                        <span>Theme</span>
                      </span>
                      <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                      <span className="font-medium text-gray-500 dark:text-zinc-400">
                        {stagedTheme?.isDynamic ? "Dynamic Mesh" : "Curated Preset"}
                      </span>
                    </span>
                  </div>

                  {/* Live Stage Viewport */}
                  <div className="relative h-28 sm:h-30 w-full rounded-2xl overflow-hidden shadow-inner border border-black/10 dark:border-white/10 bg-zinc-950 flex flex-col justify-end p-3 select-none shrink-0">
                    <div
                      className="absolute inset-0 transition-all duration-300"
                      style={{ background: stagedTheme?.cssGradient || currentPreset.cssGradient }}
                    >
                      {isMounted && (
                        <MeshGradient
                          key={stagedTheme?.id || "fallback"}
                          options={{
                            colors: stagedTheme?.colors || currentPreset.colors,
                            animationSpeed: 0.25,
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                            inset: 0,
                          }}
                        />
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    <div className="pointer-events-none absolute inset-0 bg-black/[0.04] backdrop-contrast-[1.05]" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

                    <div className="relative z-10 flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9.5px] font-semibold uppercase tracking-wider text-white/70 block truncate">
                          {stagedTheme?.theme || "Harmonic Blend"}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white drop-shadow-xs truncate">
                          {stagedTheme?.name || "Dynamic Mesh"}
                        </h4>
                      </div>

                      {/* 4 Color Swatches */}
                      <div className="flex items-center gap-1 shrink-0 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/15">
                        {(stagedTheme?.colors || currentPreset.colors).map((c, i) => (
                          <span
                            key={i}
                            style={{ backgroundColor: c }}
                            className="size-3.5 rounded-full aspect-square border border-white/30 shadow-2xs shrink-0"
                            title={`Color ${i + 1}: ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Harmonic Palette Box with Avatar-style Color Circles */}
                  <div className="p-3 rounded-2xl bg-white dark:bg-zinc-800/80 border border-black/[0.04] dark:border-white/[0.06] space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ColorsIcon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs shrink-0" />
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-zinc-300 truncate">
                          Harmonic Palette
                        </span>
                        <span className="text-[10.5px] font-medium text-gray-400 dark:text-zinc-500 truncate hidden sm:inline">
                          • {DYNAMIC_COVER_MOODS.find((m) => m.id === selectedMood)?.label}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollTheme(selectedMood)}
                        className="h-7.5 px-3 text-xs font-semibold rounded-xl border border-black/[0.08] dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <motion.span
                          animate={{ rotate: shuffleCount * 180 }}
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 20 }}
                          className="inline-flex items-center justify-center"
                        >
                          <DiceFaces03Icon size="1em" className="text-pup-maroon dark:text-red-400" />
                        </motion.span>
                        <span>Shuffle Theme</span>
                      </Button>
                    </div>

                    {/* Color Circles Grid: Exactly like the avatar color circles */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 place-items-center pt-1">
                      {DYNAMIC_COVER_MOODS.map((m) => {
                        const isCurrentMood = selectedMood === m.id;
                        return (
                          <div key={m.id} className="flex items-center justify-center size-7 sm:size-7.5 shrink-0 aspect-square">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMood(m.id);
                                handleRollTheme(m.id);
                              }}
                              style={{
                                background: m.swatchGradient || m.dotColor || "#800000",
                              }}
                              className="relative size-5.5 rounded-full aspect-square shrink-0 cursor-pointer shadow-2xs border border-black/10 dark:border-white/20 transition-transform duration-150 hover:scale-110 active:scale-90 flex items-center justify-center"
                              title={m.label}
                              aria-label={m.label}
                            >
                              {isCurrentMood && (
                                <motion.span
                                  layoutId="active-cover-mood-ring"
                                  transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                                  className="absolute -inset-1 rounded-full ring-2 ring-gray-950 dark:ring-white pointer-events-none"
                                />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Actions: Cancel & Apply */}
                <div className="flex items-center justify-end gap-2 pt-2.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPickerOpen(false)}
                    className="h-8.5 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApplyStagedTheme}
                    className="h-8.5 px-4 text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    Apply Theme
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
