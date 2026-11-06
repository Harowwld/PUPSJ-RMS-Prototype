/**
 * Interface Sound Preferences utility module for PUPSJ RMS.
 * Manages master sound enabled state, volume level, and per-category sound toggles,
 * localStorage persistence, and cross-tab/cross-page synchronization.
 *
 * Mirrors the architecture of `src/lib/accessibility.js`.
 */

// Master Sound Enabled Keys & Events
export const GLOBAL_SOUND_ENABLED_KEY = "pup_sound_enabled";
export const SOUND_ENABLED_EVENT = "pup-sound-enabled-change";

// Master Sound Volume Keys & Events
export const GLOBAL_SOUND_VOLUME_KEY = "pup_sound_volume";
export const SOUND_VOLUME_EVENT = "pup-sound-volume-change";
export const DEFAULT_SOUND_VOLUME = 0.5;

// Per-Category Sound Keys & Events
export const GLOBAL_SOUND_CATEGORIES_KEY = "pup_sound_categories";
export const SOUND_CATEGORIES_EVENT = "pup-sound-categories-change";

// Unified Sound Preferences Change Event
export const SOUND_PREFS_EVENT = "pup-sound-prefs-change";

/**
 * Canonical 6 sound categories aligned with Kobra Sound & Apple HIG.
 */
export const SOUND_CATEGORY_IDS = [
  "presses",
  "toggles",
  "surfaces",
  "values",
  "outcomes",
  "notifications",
];

export const DEFAULT_SOUND_CATEGORIES = {
  presses: true,
  toggles: true,
  surfaces: true,
  values: true,
  outcomes: true,
  notifications: true,
};

export const SOUND_CATEGORY_DEFINITIONS = [
  {
    id: "presses",
    label: "Clicks & Navigation",
    description: "Tactile acoustic feedback when pressing buttons, links, tabs, and menu options.",
    sampleCue: "tap",
    cues: ["tap", "select", "command", "chirp"],
  },
  {
    id: "toggles",
    label: "Switches & Toggles",
    description: "Directional rising and falling tones when toggling switches, checkboxes, and radio controls.",
    sampleCue: "toggleOn",
    cues: ["toggleOn", "toggleOff"],
  },
  {
    id: "surfaces",
    label: "Panels, Sheets & Menus",
    description: "Subtle spatial sweeps when opening or closing dialogs, sheets, popovers, and dropdowns.",
    sampleCue: "open",
    cues: ["open", "close", "swoosh"],
  },
  {
    id: "values",
    label: "Sliders & Value Stepper",
    description: "Soft precision ticks when dragging sliders, stepping values, or entering verification digits.",
    sampleCue: "tick",
    cues: ["tick", "sliderTick", "key"],
  },
  {
    id: "outcomes",
    label: "Action Outcomes & Toasts",
    description: "Harmonic phrases for success, warning, error alerts, clipboard copy, and blocked controls.",
    sampleCue: "success",
    cues: ["success", "error", "warning", "destructive", "blocked", "copy"],
  },
  {
    id: "notifications",
    label: "Live Notifications",
    description: "Gentle two-note chime when a new institutional notification or request update arrives.",
    sampleCue: "notification",
    cues: ["notification"],
  },
];

/**
 * Maps every individual cue name in the synthesizer patch to its owning category ID.
 */
export const CUE_TO_CATEGORY = {
  tap: "presses",
  select: "presses",
  command: "presses",
  chirp: "presses",
  toggleOn: "toggles",
  toggleOff: "toggles",
  open: "surfaces",
  close: "surfaces",
  swoosh: "surfaces",
  tick: "values",
  sliderTick: "values",
  key: "values",
  success: "outcomes",
  error: "outcomes",
  warning: "outcomes",
  destructive: "outcomes",
  blocked: "outcomes",
  copy: "outcomes",
  notification: "notifications",
};

export function getUserSoundEnabledKey(userId) {
  return userId ? `pup_sound_enabled_${userId}` : GLOBAL_SOUND_ENABLED_KEY;
}

export function getUserSoundVolumeKey(userId) {
  return userId ? `pup_sound_volume_${userId}` : GLOBAL_SOUND_VOLUME_KEY;
}

export function getUserSoundCategoriesKey(userId) {
  return userId ? `pup_sound_categories_${userId}` : GLOBAL_SOUND_CATEGORIES_KEY;
}

// In-memory cache to prevent repeated localStorage parsing on every pointer event
let cachedSoundEnabled = null;
let cachedSoundVolume = null;
let cachedSoundCategories = null;

export function invalidateSoundPreferencesCache() {
  cachedSoundEnabled = null;
  cachedSoundVolume = null;
  cachedSoundCategories = null;
}

/**
 * Validates and normalizes a sound categories object.
 * @param {object|string|null} raw
 * @returns {{ presses: boolean, toggles: boolean, surfaces: boolean, values: boolean, outcomes: boolean, notifications: boolean }}
 */
export function normalizeSoundCategories(raw) {
  let obj = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  }
  const normalized = { ...DEFAULT_SOUND_CATEGORIES };
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const id of SOUND_CATEGORY_IDS) {
      if (typeof obj[id] === "boolean") {
        normalized[id] = obj[id];
      }
    }
  }
  return normalized;
}

/**
 * Validates whether an input is a valid partial or full sound_categories object for API validation.
 */
export function isValidSoundCategoriesPreference(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > SOUND_CATEGORY_IDS.length) return false;
  return keys.every(
    (k) => SOUND_CATEGORY_IDS.includes(k) && typeof value[k] === "boolean"
  );
}

/**
 * Reads the current master sound enabled preference from localStorage.
 * Defaults to false (opt-in) per institutional shared-office UX standards.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getSoundEnabledPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (!userId && cachedSoundEnabled !== null) return cachedSoundEnabled;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserSoundEnabledKey(userId));
      if (userVal !== null) {
        const val = userVal === "true";
        cachedSoundEnabled = val;
        return val;
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_SOUND_ENABLED_KEY);
    if (globalVal !== null) {
      const val = globalVal === "true";
      cachedSoundEnabled = val;
      return val;
    }

    cachedSoundEnabled = false;
  } catch {
    // Ignore localStorage access errors
  }

  return false;
}

/**
 * Updates the master sound enabled preference in localStorage and dispatches sync events.
 * @param {boolean} enabled
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function setSoundEnabledPreference(enabled, userId = null) {
  const boolVal = Boolean(enabled);
  cachedSoundEnabled = boolVal;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_SOUND_ENABLED_KEY, String(boolVal));
      if (userId) {
        localStorage.setItem(getUserSoundEnabledKey(userId), String(boolVal));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SOUND_ENABLED_EVENT, { detail: { enabled: boolVal, userId } })
    );
    window.dispatchEvent(
      new CustomEvent(SOUND_PREFS_EVENT, { detail: { enabled: boolVal, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return boolVal;
}

/**
 * Reads the current master sound volume preference (0.0 to 1.0) from localStorage.
 * @param {string|null} [userId]
 * @returns {number}
 */
export function getSoundVolumePreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return DEFAULT_SOUND_VOLUME;
  if (!userId && cachedSoundVolume !== null) return cachedSoundVolume;

  const parseVol = (raw) => {
    if (raw === null || raw === undefined || raw === "") return null;
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    return Math.min(1, Math.max(0, num));
  };

  try {
    if (userId) {
      const userVal = parseVol(localStorage.getItem(getUserSoundVolumeKey(userId)));
      if (userVal !== null) {
        cachedSoundVolume = userVal;
        return userVal;
      }
    }

    const globalVal = parseVol(localStorage.getItem(GLOBAL_SOUND_VOLUME_KEY));
    if (globalVal !== null) {
      cachedSoundVolume = globalVal;
      return globalVal;
    }

    cachedSoundVolume = DEFAULT_SOUND_VOLUME;
  } catch {
    // Ignore localStorage access errors
  }

  return DEFAULT_SOUND_VOLUME;
}

/**
 * Updates the master sound volume preference (clamped 0.0–1.0) in localStorage and dispatches sync events.
 * @param {number} volume
 * @param {string|null} [userId]
 * @returns {number}
 */
export function setSoundVolumePreference(volume, userId = null) {
  const num = Number(volume);
  const clamped = Number.isFinite(num)
    ? Math.round(Math.min(1, Math.max(0, num)) * 100) / 100
    : DEFAULT_SOUND_VOLUME;
  cachedSoundVolume = clamped;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_SOUND_VOLUME_KEY, String(clamped));
      if (userId) {
        localStorage.setItem(getUserSoundVolumeKey(userId), String(clamped));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SOUND_VOLUME_EVENT, { detail: { volume: clamped, userId } })
    );
    window.dispatchEvent(
      new CustomEvent(SOUND_PREFS_EVENT, { detail: { volume: clamped, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return clamped;
}

/**
 * Reads the per-category sound preferences from localStorage.
 * @param {string|null} [userId]
 * @returns {{ presses: boolean, toggles: boolean, surfaces: boolean, values: boolean, outcomes: boolean, notifications: boolean }}
 */
export function getSoundCategoriesPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_SOUND_CATEGORIES };
  }
  if (!userId && cachedSoundCategories !== null) return cachedSoundCategories;

  try {
    if (userId) {
      const userRaw = localStorage.getItem(getUserSoundCategoriesKey(userId));
      if (userRaw !== null) {
        const parsed = normalizeSoundCategories(userRaw);
        cachedSoundCategories = parsed;
        return parsed;
      }
    }

    const globalRaw = localStorage.getItem(GLOBAL_SOUND_CATEGORIES_KEY);
    if (globalRaw !== null) {
      const parsed = normalizeSoundCategories(globalRaw);
      cachedSoundCategories = parsed;
      return parsed;
    }

    cachedSoundCategories = { ...DEFAULT_SOUND_CATEGORIES };
  } catch {
    // Ignore localStorage access errors
  }

  return { ...DEFAULT_SOUND_CATEGORIES };
}

/**
 * Updates the per-category sound preferences in localStorage and dispatches sync events.
 * @param {object} categories
 * @param {string|null} [userId]
 * @returns {{ presses: boolean, toggles: boolean, surfaces: boolean, values: boolean, outcomes: boolean, notifications: boolean }}
 */
export function setSoundCategoriesPreference(categories, userId = null) {
  const current = getSoundCategoriesPreference(userId);
  const merged = normalizeSoundCategories({ ...current, ...(categories || {}) });
  cachedSoundCategories = merged;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const serialized = JSON.stringify(merged);
      localStorage.setItem(GLOBAL_SOUND_CATEGORIES_KEY, serialized);
      if (userId) {
        localStorage.setItem(getUserSoundCategoriesKey(userId), serialized);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SOUND_CATEGORIES_EVENT, { detail: { categories: merged, userId } })
    );
    window.dispatchEvent(
      new CustomEvent(SOUND_PREFS_EVENT, { detail: { categories: merged, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return merged;
}

/**
 * Checks whether a specific cue name is allowed to play under the current preferences.
 * @param {string} cueName
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function isSoundCueEnabled(cueName, userId = null) {
  if (!getSoundEnabledPreference(userId)) return false;
  const categoryId = CUE_TO_CATEGORY[cueName];
  if (!categoryId) return true;
  const categories = getSoundCategoriesPreference(userId);
  return categories[categoryId] !== false;
}
