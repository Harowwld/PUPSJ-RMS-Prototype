"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { setMasterVolume } from "@web-kits/audio";
import { useSoundPreferences } from "@/hooks/useSoundPreferences";
import {
  soundForTarget,
  playSoundCue,
  warmAudioEngine,
  TEXT_ENTRY_SELECTOR,
} from "@/lib/soundPatch";
import { getClientSession, subscribeClientPrincipal } from "@/lib/clientAuth";

const PORTAL_PREFIXES = ["/admin", "/staff", "/systemadmin", "/student", "/account"];

function isPortalPathname(pathname) {
  if (!pathname) return false;
  return PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function span(min, max, value) {
  return max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function sliderRange(el) {
  if (typeof HTMLInputElement !== "undefined" && el instanceof HTMLInputElement) {
    return {
      min: Number(el.min || 0),
      max: Number(el.max || 100),
      step: Math.abs(Number(el.step)) || 1,
    };
  }
  const read = (name, fallback) => {
    const value = Number(el?.getAttribute?.(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    min: read("aria-valuemin", 0),
    max: read("aria-valuemax", 100),
    step: 1,
  };
}

export default function SoundEffects() {
  const pathname = usePathname();
  const [authUser, setAuthUser] = useState(null);
  const { enabled, volume } = useSoundPreferences(authUser?.id || null);
  const wasEnabledRef = useRef(enabled);
  const lastRangeValuesRef = useRef(new WeakMap());

  const isPortalRoute = isPortalPathname(pathname);
  const isActivePortal = Boolean(isPortalRoute && authUser?.id);

  // Track authenticated principal so sounds immediately stop on sign-out
  useEffect(() => {
    let mounted = true;
    if (isPortalRoute) {
      getClientSession()
        .then((session) => {
          if (!mounted) return;
          setAuthUser(session?.ok && session?.data ? session.data : null);
        })
        .catch(() => {});
    }

    const unsubscribe = subscribeClientPrincipal((principal) => {
      if (!mounted) return;
      setAuthUser(principal || null);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [isPortalRoute]);

  // Keep master volume synchronized with user preference
  useEffect(() => {
    if (!isActivePortal || !enabled) return;
    try {
      setMasterVolume(volume);
    } catch {
      // Ignore if AudioContext not yet unlocked
    }
  }, [isActivePortal, enabled, volume]);

  // Play swoosh cue when user unmutes / enables interface sounds inside a portal
  useEffect(() => {
    const cameBack = !wasEnabledRef.current && enabled;
    wasEnabledRef.current = enabled;
    if (cameBack && isActivePortal) {
      playSoundCue({ sound: "swoosh" }, { force: true, userId: authUser?.id });
    }
  }, [enabled, isActivePortal, authUser?.id]);

  // Warm up audio engine on portal mount if enabled
  useEffect(() => {
    if (!isActivePortal || !enabled) return undefined;
    const timer = window.setTimeout(() => {
      warmAudioEngine();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [isActivePortal, enabled]);

  // Global delegated DOM event & mutation listeners
  useEffect(() => {
    if (!isActivePortal || !enabled) return undefined;

    const userId = authUser?.id || null;
    const TICK_GAP_MS = 28;
    const TICK_LAG_MS = 60;
    const DRAG_SLOP_PX = 3;

    let grab = null;
    let nextTickAt = 0;
    const queued = new Set();

    const stopTicking = () => {
      for (const timer of queued) clearTimeout(timer);
      queued.clear();
      nextTickAt = 0;
    };

    const tick = (detune, now) => {
      if (nextTickAt - now > TICK_LAG_MS) return false;
      const wait = nextTickAt - now;
      nextTickAt += TICK_GAP_MS;
      const cue = { sound: "sliderTick", detune };
      if (wait <= 0) {
        playSoundCue(cue, { userId });
        return true;
      }
      const timer = setTimeout(() => {
        queued.delete(timer);
        playSoundCue(cue, { userId });
      }, wait);
      queued.add(timer);
      return true;
    };

    const ratchet = (el, from, to) => {
      const { min, max, step } = sliderRange(el);
      const crossed = Math.round(Math.abs(to - from) / step);
      if (!Number.isFinite(crossed) || crossed < 1) return;
      const now = performance.now();
      nextTickAt = Math.max(nextTickAt, now);
      const direction = Math.sign(to - from);
      for (let i = 1; i <= crossed; i++) {
        const value = from + direction * step * i;
        if (!tick(span(min, max, value) * 900, now)) break;
      }
    };

    const onPointerDown = (event) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const cue = soundForTarget(event.target, false);
      if (!cue) return;
      if (cue.sound === "tick") {
        grab = { x: event.clientX, y: event.clientY, dragged: false };
        const rangeEl = event.target.closest('input[type="range"], [role="slider"]');
        if (rangeEl instanceof HTMLInputElement) {
          lastRangeValuesRef.current.set(rangeEl, Number(rangeEl.value));
        }
      }
      playSoundCue(cue, { userId });
    };

    const onKeyDown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat || !(event.target instanceof Element)) return;
      const typing = event.target.matches(TEXT_ENTRY_SELECTOR);
      const driving =
        event.key === "Enter" &&
        event.target.closest(".command-overlay, [data-command-palette]");
      if (typing && !driving) return;
      const cue = soundForTarget(event.target, true);
      if (cue) playSoundCue(cue, { userId });
    };

    const onPointerMove = (event) => {
      if (!grab || grab.dragged) return;
      if (
        Math.hypot(event.clientX - grab.x, event.clientY - grab.y) > DRAG_SLOP_PX
      ) {
        grab.dragged = true;
      }
    };

    const onPointerUp = () => {
      if (grab) stopTicking();
      grab = null;
    };

    const onContextMenu = () => {
      playSoundCue({ sound: "open" }, { userId });
    };

    const onInput = (event) => {
      if (!event.isTrusted) return;
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;

      // Native <input type="range"> slider drag ratchet ticks
      if (el.type === "range") {
        const nextVal = Number(el.value);
        const prevVal = lastRangeValuesRef.current.get(el);
        lastRangeValuesRef.current.set(el, nextVal);
        if (typeof prevVal === "number" && prevVal !== nextVal) {
          ratchet(el, prevVal, nextVal);
        } else {
          const { min, max } = sliderRange(el);
          const now = performance.now();
          nextTickAt = Math.max(nextTickAt, now);
          tick(span(min, max, nextVal) * 900, now);
        }
        return;
      }

      // OTP digit entry pitched by position
      if (el.closest('[data-slot="input-otp"], [data-otp-input]')) {
        const deleting = event.inputType?.startsWith?.("delete") ?? false;
        playSoundCue(
          {
            sound: "key",
            detune: el.value.length * 45 - (deleting ? 260 : 0),
          },
          { userId }
        );
      }
    };

    const observer = new MutationObserver((records) => {
      let slid = false;
      for (const record of records) {
        const el = record.target;
        if (!(el instanceof HTMLElement)) continue;
        const attrName = record.attributeName ?? "";
        const value = el.getAttribute(attrName);
        const entered =
          value !== null && value !== "false" && value !== record.oldValue;

        switch (attrName) {
          case "aria-valuenow": {
            if (slid || !el.matches('input[type="range"], [role="slider"]')) {
              break;
            }
            if (value === null || record.oldValue === null) break;
            if (grab && !grab.dragged) break;
            slid = true;
            if (grab) {
              ratchet(el, Number(record.oldValue), Number(value));
              break;
            }
            const { min, max } = sliderRange(el);
            const now = performance.now();
            nextTickAt = Math.max(nextTickAt, now);
            tick(span(min, max, Number(value)) * 900, now);
            break;
          }
          case "data-success": {
            if (entered) playSoundCue({ sound: "success" }, { userId });
            break;
          }
          case "aria-invalid":
          case "data-error": {
            if (entered) playSoundCue({ sound: "error" }, { userId });
            break;
          }
          default:
            break;
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "aria-valuenow",
        "aria-invalid",
        "data-success",
        "data-error",
      ],
    });

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("input", onInput, true);

    return () => {
      observer.disconnect();
      stopTicking();
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("input", onInput, true);
    };
  }, [isActivePortal, enabled, authUser?.id]);

  return null;
}
