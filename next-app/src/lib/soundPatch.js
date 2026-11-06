/**
 * Kobra UI Synthesized Sound Patch & Element Classifier for PUPSJ RMS.
 *
 * Uses `@web-kits/audio` directly (`definePatch` + `setMasterVolume`) so that
 * interface sounds remain independent of Reduce Motion, while respecting
 * user-scoped master enabled, volume, and per-category preferences.
 */

import { definePatch, setMasterVolume } from "@web-kits/audio";
import {
  getSoundEnabledPreference,
  getSoundVolumePreference,
  getSoundCategoriesPreference,
  CUE_TO_CATEGORY,
} from "./soundPreferences.js";

export const KOBRA_UI_PATCH = {
  name: "kobra-ui",
  sounds: {
    tap: {
      source: { type: "sine", frequency: 1300, fm: { ratio: 0.5, depth: 100 } },
      envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.005 },
      gain: 0.2,
    },
    select: {
      source: { type: "triangle", frequency: { start: 900, end: 780 } },
      envelope: { attack: 0.001, decay: 0.055 },
      gain: 0.26,
    },
    toggleOn: {
      source: { type: "sine", frequency: { start: 520, end: 880 } },
      envelope: { attack: 0.002, decay: 0.085 },
      gain: 0.3,
    },
    toggleOff: {
      source: { type: "sine", frequency: { start: 780, end: 420 } },
      envelope: { attack: 0.002, decay: 0.085 },
      gain: 0.28,
    },
    open: {
      source: { type: "triangle", frequency: { start: 320, end: 620 } },
      filter: { type: "lowpass", frequency: 2600 },
      envelope: { attack: 0.006, decay: 0.13 },
      gain: 0.24,
    },
    close: {
      source: { type: "triangle", frequency: { start: 560, end: 300 } },
      filter: { type: "lowpass", frequency: 2200 },
      envelope: { attack: 0.004, decay: 0.11 },
      gain: 0.22,
    },
    tick: {
      source: { type: "square", frequency: 1400 },
      filter: { type: "lowpass", frequency: 3000 },
      envelope: { decay: 0.014 },
      gain: 0.1,
    },
    sliderTick: {
      layers: [
        {
          source: { type: "noise", color: "white" },
          filter: { type: "bandpass", frequency: 3000, resonance: 4 },
          envelope: { attack: 0, decay: 0.02, sustain: 0, release: 0.006 },
          gain: 0.19,
        },
        {
          source: { type: "sine", frequency: 700 },
          envelope: { attack: 0, decay: 0.012, sustain: 0, release: 0.004 },
          gain: 0.09,
        },
      ],
    },
    destructive: {
      layers: [
        {
          source: { type: "triangle", frequency: { start: 300, end: 170 } },
          filter: { type: "lowpass", frequency: 1400 },
          envelope: { attack: 0.002, decay: 0.12 },
          gain: 0.32,
        },
        {
          source: { type: "noise", color: "brown" },
          filter: { type: "bandpass", frequency: 700, resonance: 1.1 },
          envelope: { decay: 0.05 },
          gain: 0.06,
        },
      ],
    },
    key: {
      layers: [
        {
          source: { type: "sine", frequency: { start: 1000, end: 900 } },
          envelope: { attack: 0.001, decay: 0.028 },
          gain: 0.14,
        },
        {
          source: { type: "noise", color: "white" },
          filter: { type: "bandpass", frequency: 3200, resonance: 2 },
          envelope: { decay: 0.01 },
          gain: 0.035,
        },
      ],
    },
    success: {
      layers: [
        {
          source: { type: "triangle", frequency: 784 },
          envelope: { attack: 0.004, decay: 0.16 },
          gain: 0.22,
        },
        {
          source: { type: "triangle", frequency: 1175 },
          envelope: { attack: 0.004, decay: 0.22 },
          gain: 0.18,
          delay: 0.075,
        },
      ],
    },
    error: {
      layers: [
        {
          source: { type: "triangle", frequency: 300 },
          filter: { type: "lowpass", frequency: 1200 },
          envelope: { attack: 0.003, decay: 0.13 },
          gain: 0.26,
        },
        {
          source: { type: "triangle", frequency: 224 },
          filter: { type: "lowpass", frequency: 1000 },
          envelope: { attack: 0.003, decay: 0.2 },
          gain: 0.24,
          delay: 0.09,
        },
      ],
    },
    warning: {
      layers: [
        {
          source: { type: "triangle", frequency: 622 },
          filter: { type: "lowpass", frequency: 2800 },
          envelope: { attack: 0.003, decay: 0.14 },
          gain: 0.2,
        },
        {
          source: { type: "triangle", frequency: 622 },
          filter: { type: "lowpass", frequency: 2800 },
          envelope: { attack: 0.003, decay: 0.18 },
          gain: 0.17,
          delay: 0.085,
        },
      ],
    },
    copy: {
      layers: [
        {
          source: { type: "sine", frequency: 1200 },
          envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
          gain: 0.16,
        },
        {
          source: { type: "sine", frequency: 1400 },
          envelope: { attack: 0, decay: 0.015, sustain: 0, release: 0.006 },
          delay: 0.04,
          gain: 0.14,
        },
      ],
    },
    notification: {
      layers: [
        {
          source: { type: "triangle", frequency: 523 },
          envelope: { attack: 0.008, decay: 0.3, sustain: 0.03, release: 0.12 },
          gain: 0.14,
        },
        {
          source: { type: "triangle", frequency: 784 },
          envelope: { attack: 0.008, decay: 0.25, sustain: 0.02, release: 0.1 },
          delay: 0.12,
          gain: 0.12,
        },
      ],
    },
    swoosh: {
      source: { type: "sine", frequency: { start: 300, end: 2000 } },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0, release: 0.04 },
      gain: 0.12,
    },
    chirp: {
      source: { type: "sine", frequency: { start: 1200, end: 1500 } },
      envelope: { attack: 0, decay: 0.03, sustain: 0, release: 0.01 },
      gain: 0.08,
    },
    command: {
      layers: [
        {
          source: { type: "triangle", frequency: { start: 1046, end: 784 } },
          envelope: { attack: 0.001, decay: 0.075 },
          gain: 0.2,
        },
        {
          source: { type: "sine", frequency: 1568 },
          envelope: { attack: 0.001, decay: 0.045 },
          gain: 0.06,
          delay: 0.018,
        },
      ],
    },
    blocked: {
      source: { type: "sine", frequency: 180 },
      filter: { type: "lowpass", frequency: 700 },
      envelope: { attack: 0.004, decay: 0.06 },
      gain: 0.16,
    },
  },
};

export const SOUND_NAMES = Object.keys(KOBRA_UI_PATCH.sounds);

export const JITTER = {
  tap: 26,
  select: 22,
  toggleOn: 14,
  toggleOff: 14,
  open: 10,
  close: 10,
  tick: 18,
  sliderTick: 10,
  key: 20,
  destructive: 12,
  blocked: 30,
  chirp: 24,
  command: 8,
  copy: 6,
  notification: 3,
  swoosh: 14,
  success: 5,
  error: 5,
  warning: 5,
};

const TOGGLE_SLOTS = new Set([
  "switch",
  "checkbox",
  "toggle",
  "toggle-group-item",
  "radio-group-item",
  "context-menu-checkbox-item",
  "context-menu-radio-item",
  "dropdown-menu-checkbox-item",
  "dropdown-menu-radio-item",
  "menubar-checkbox-item",
  "menubar-radio-item",
]);

export const INTERACTIVE_SELECTOR =
  '[data-sound], [data-slot], button, a[href], [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], input[type="checkbox"], input[type="radio"], input[type="range"]';

export const TEXT_ENTRY_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, [contenteditable="true"], [contenteditable=""]';

export function jitter(cents) {
  return (Math.random() * 2 - 1) * cents;
}

export function isControlOn(el) {
  if (!el) return false;
  if (typeof HTMLInputElement !== "undefined" && el instanceof HTMLInputElement) {
    return Boolean(el.checked);
  }
  const ariaChecked = el.getAttribute?.("aria-checked");
  if (ariaChecked === "true") return true;
  if (ariaChecked === "false") return false;
  const ariaPressed = el.getAttribute?.("aria-pressed");
  if (ariaPressed === "true") return true;
  if (ariaPressed === "false") return false;
  const dataState = el.getAttribute?.("data-state");
  if (dataState === "checked" || dataState === "on") return true;
  if (dataState === "unchecked" || dataState === "off") return false;
  if (el.getAttribute?.("data-checked") !== null && el.getAttribute?.("data-checked") !== "false") {
    return true;
  }
  return false;
}

export function rowPitch(el) {
  const siblings = el?.parentElement?.children;
  if (!siblings) return 0;
  const idx = Array.from(siblings).indexOf(el);
  if (idx < 0) return 0;
  return Math.min(idx, 7) * 55;
}

/**
 * Classifies a single interactive DOM element into a sound cue object
 * `{ sound, detune?, velocity? }`, or `null` if the element is not a recognized control.
 */
export function classifyElement(el) {
  if (!el || typeof el !== "object") return null;
  const dataset = el.dataset || {};
  const slot = dataset.slot || "";
  const named = dataset.sound;

  if (named === "none" || named === "off") {
    return { sound: "none" };
  }
  if (named && named in KOBRA_UI_PATCH.sounds) {
    return { sound: named };
  }

  const matchesFn = typeof el.matches === "function" ? el.matches.bind(el) : () => false;

  if (
    TOGGLE_SLOTS.has(slot) ||
    matchesFn(
      'input[type="checkbox"], input[type="radio"], [role="switch"], [aria-pressed], [role="menuitemcheckbox"], [role="menuitemradio"]'
    )
  ) {
    return { sound: isControlOn(el) ? "toggleOff" : "toggleOn" };
  }

  if (dataset.variant === "destructive" || dataset.variant === "danger") {
    return { sound: "destructive" };
  }

  if (slot.endsWith("-close")) {
    return { sound: "close" };
  }

  if (slot.endsWith("-clear") || slot.endsWith("-remove")) {
    return { sound: "chirp" };
  }

  if (slot === "tabs-trigger" || matchesFn('[role="tab"]')) {
    return { sound: "select", detune: rowPitch(el) };
  }

  if (slot.endsWith("-trigger") || slot === "select-trigger") {
    const expanded = el.getAttribute?.("aria-expanded");
    const dataState = el.getAttribute?.("data-state");
    const dataPopupOpen = el.getAttribute?.("data-popup-open");
    if (expanded === null && dataState === null && dataPopupOpen === null) {
      return { sound: "select" };
    }
    const isOpen =
      expanded === "true" || dataState === "open" || dataPopupOpen !== null;
    return { sound: isOpen ? "close" : "open" };
  }

  if (
    slot.endsWith("-item") ||
    slot.endsWith("-link") ||
    slot.endsWith("-option") ||
    matchesFn('[role="menuitem"], [role="option"]')
  ) {
    return { sound: "select", detune: rowPitch(el) };
  }

  if (
    slot === "slider-thumb" ||
    slot === "slider-track" ||
    matchesFn('input[type="range"], [role="slider"]')
  ) {
    return { sound: "tick" };
  }

  if (slot === "button" || matchesFn('button, a[href], [role="button"]')) {
    const soft = dataset.variant === "ghost" || dataset.variant === "link";
    return { sound: "tap", velocity: soft ? 0.78 : 1 };
  }

  return null;
}

/**
 * Walks up the DOM from an event target to resolve the appropriate sound cue.
 */
export function soundForTarget(target, keyed = false) {
  if (!target || typeof target.closest !== "function") return null;

  if (target.closest(".command-overlay, [data-command-palette]")) {
    const pointed = keyed ? target.getAttribute?.("aria-activedescendant") : null;
    const row = pointed
      ? document.getElementById(pointed)
      : target.closest(".command-option, [data-command-item]");
    if (!row) return null;
    return {
      sound: row.querySelector(".command-option-more") ? "chirp" : "command",
    };
  }

  const labelEl = target.closest("label");
  const labeled = (labelEl && labelEl.control) || target;
  if (typeof labeled.closest === "function" && labeled.closest(TEXT_ENTRY_SELECTOR)) {
    return null;
  }

  let el =
    typeof labeled.closest === "function"
      ? labeled.closest(INTERACTIVE_SELECTOR)
      : null;

  while (el) {
    if (
      typeof el.matches === "function" &&
      el.matches(':disabled, [aria-disabled="true"], [data-disabled]')
    ) {
      return { sound: "blocked" };
    }
    const cue = classifyElement(el);
    if (cue) {
      if (cue.sound === "none") return null;
      return cue;
    }
    el = el.parentElement?.closest?.(INTERACTIVE_SELECTOR) ?? null;
  }

  return null;
}

// Singleton patch instance & warm state
let patchInstance = null;
let audioWarm = false;

export function getPatchInstance() {
  if (typeof window === "undefined") return null;
  if (!patchInstance) {
    patchInstance = definePatch(KOBRA_UI_PATCH);
  }
  return patchInstance;
}

export function warmAudioEngine() {
  if (typeof window === "undefined" || audioWarm) return;
  if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
    return;
  }
  const patch = getPatchInstance();
  if (!patch) return;
  try {
    audioWarm = true;
    patch.play("tap", { volume: 0.0001 });
  } catch {
    audioWarm = false;
  }
}

/**
 * Plays a cue through the synthesized Kobra patch.
 *
 * @param {{ sound: string, detune?: number, velocity?: number } | string} cueOrName
 * @param {{ force?: boolean, volumeOverride?: number, userId?: string|null }} [options]
 */
export function playSoundCue(cueOrName, options = {}) {
  if (typeof window === "undefined") return;
  const cue =
    typeof cueOrName === "string" ? { sound: cueOrName } : cueOrName;
  if (!cue || !cue.sound || !(cue.sound in KOBRA_UI_PATCH.sounds)) return;

  const { force = false, volumeOverride, userId = null } = options;

  if (!force) {
    const enabled = getSoundEnabledPreference(userId);
    if (!enabled) return;

    const categoryId = CUE_TO_CATEGORY[cue.sound];
    if (categoryId) {
      const categories = getSoundCategoriesPreference(userId);
      if (categories[categoryId] === false) return;
    }
  }

  const patch = getPatchInstance();
  if (!patch) return;

  const targetVolume =
    typeof volumeOverride === "number"
      ? Math.min(1, Math.max(0, volumeOverride))
      : getSoundVolumePreference(userId);

  try {
    setMasterVolume(targetVolume);
  } catch {
    // Ignore audio context errors prior to gesture
  }

  const trigger = () => {
    try {
      setMasterVolume(targetVolume);
      patch.play(cue.sound, {
        detune: (cue.detune ?? 0) + jitter(JITTER[cue.sound] ?? 10),
        velocity: (cue.velocity ?? 1) * (0.9 + Math.random() * 0.1),
      });
    } catch {
      // Ignore Web Audio autoplay rejection if user hasn't interacted yet
    }
  };

  if (audioWarm) {
    trigger();
    return;
  }

  audioWarm = true;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      window.setTimeout(trigger, 0);
    });
  } else {
    trigger();
  }
}
