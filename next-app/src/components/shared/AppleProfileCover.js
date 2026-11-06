"use client";

import React, { useState, useSyncExternalStore } from "react";
import { MeshGradient } from "@mesh-gradient/react";
import { APPLE_WALLPAPER_PRESETS, getAppleWallpaperPreset } from "@/lib/constants";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pupsj_profile_cover_id");
        if (saved && APPLE_WALLPAPER_PRESETS.some((p) => p.id === saved)) {
          return saved;
        }
      } catch {
        // ignore storage errors
      }
    }
    return wallpaperId || "sequoia";
  });

  const currentPreset = getAppleWallpaperPreset(activeId);

  const handlePickPreset = (presetId) => {
    setActiveId(presetId);
    try {
      localStorage.setItem("pupsj_profile_cover_id", presetId);
    } catch {
      // ignore storage errors
    }
    if (onSelectWallpaper) {
      onSelectWallpaper(presetId);
    }
    const chosen = getAppleWallpaperPreset(presetId);
    toast.success(`Theme updated to ${chosen.name}`, {
      description: chosen.theme,
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
            onClick={() => setPickerOpen(true)}
            className="h-8 px-3.5 text-xs font-semibold rounded-full bg-black/45 hover:bg-black/65 text-white border border-white/25 backdrop-blur-md shadow-xs active:scale-95 transition-all cursor-pointer"
            title="Change Profile Cover Theme"
          >
            Change Cover
          </Button>
        </div>
      )}

      {/* Profile Cover Theme Selector Modal */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="w-full max-w-4xl sm:max-w-4xl p-5 sm:p-6 rounded-[22px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] font-jakarta">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-50">
              Profile Cover Themes
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
              Personalize your profile header with dynamic mesh gradients and institutional ambient themes.
            </DialogDescription>
          </DialogHeader>

          {/* Compact 2-Column Wide Grid for Choice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3.5 max-h-[58vh] overflow-y-auto pr-1">
            {APPLE_WALLPAPER_PRESETS.map((preset) => {
              const isSelected = activeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePickPreset(preset.id)}
                  className={cn(
                    "group relative flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.98]",
                    isSelected
                      ? "bg-white dark:bg-zinc-800 border-pup-maroon/60 dark:border-red-500/60 ring-2 ring-pup-maroon/20 dark:ring-red-500/20 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "border-black/[0.08] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-black/15 dark:hover:border-white/20"
                  )}
                >
                  {/* Swatch Preview: Circular Color Lens */}
                  <div
                    className="relative size-11 sm:size-12 rounded-full shrink-0 overflow-hidden shadow-2xs border border-black/10 dark:border-white/20 ring-2 ring-black/5 dark:ring-white/10"
                    style={{ background: preset.cssGradient }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-black/[0.04] pointer-events-none" />
                  </div>

                  {/* Information & Compact Description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {preset.name}
                        </span>
                        <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 hidden sm:inline truncate">
                          • {preset.theme}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-[9.5px] font-semibold px-2 py-0.2 rounded-full bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/20 dark:text-red-300 border border-pup-maroon/20 dark:border-red-500/30 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-tight truncate sm:line-clamp-1">
                      {preset.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3.5 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
              className="h-8.5 px-4 text-xs font-semibold rounded-xl border border-black/[0.06] dark:border-white/[0.08]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
