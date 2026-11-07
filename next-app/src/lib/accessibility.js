/**
 * Accessibility utility module for PUPSJ RMS.
 * Manages high contrast and reduce motion states, localStorage persistence,
 * and cross-tab/cross-page synchronization.
 */

import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";

// High Contrast Keys & Events
export const GLOBAL_HIGH_CONTRAST_KEY = "pup_high_contrast";
export const HIGH_CONTRAST_EVENT = "pup-high-contrast-change";

// Reduce Motion Keys & Events
export const GLOBAL_REDUCE_MOTION_KEY = "pup_reduce_motion";
export const REDUCE_MOTION_EVENT = "pup-reduce-motion-change";

// Font Size Keys & Events
export const FONT_SIZE_LEVELS = ["smaller", "small", "default", "large", "larger"];
export const GLOBAL_FONT_SIZE_KEY = "pup_font_size";
export const FONT_SIZE_EVENT = "pup-font-size-change";

// Pointer Cursor Keys & Events
export const GLOBAL_POINTER_CURSOR_KEY = "pup_pointer_cursor";
export const POINTER_CURSOR_EVENT = "pup-pointer-cursor-change";

/**
 * Returns the localStorage key for high contrast for a specific user ID.
 * @param {string|null} userId 
 * @returns {string}
 */
export function getUserHighContrastKey(userId) {
  return userId ? `pup_high_contrast_${userId}` : GLOBAL_HIGH_CONTRAST_KEY;
}

/**
 * Returns the localStorage key for reduce motion for a specific user ID.
 * @param {string|null} userId
 * @returns {string}
 */
export function getUserReduceMotionKey(userId) {
  return userId ? `pup_reduce_motion_${userId}` : GLOBAL_REDUCE_MOTION_KEY;
}

/**
 * Returns the localStorage key for font size for a specific user ID.
 * @param {string|null} userId
 * @returns {string}
 */
export function getUserFontSizeKey(userId) {
  return userId ? `pup_font_size_${userId}` : GLOBAL_FONT_SIZE_KEY;
}

/**
 * Returns the localStorage key for pointer cursor for a specific user ID.
 * @param {string|null} userId
 * @returns {string}
 */
export function getUserPointerCursorKey(userId) {
  return userId ? `pup_pointer_cursor_${userId}` : GLOBAL_POINTER_CURSOR_KEY;
}

/**
 * Applies or removes the .high-contrast class on document.documentElement.
 * @param {boolean} enabled
 */
export function applyHighContrastClass(enabled) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (enabled) {
    if (!root.classList.contains("high-contrast")) {
      root.classList.add("high-contrast");
    }
  } else {
    root.classList.remove("high-contrast");
  }
}

/**
 * Applies or removes the .reduce-motion class on document.documentElement.
 * @param {boolean} enabled
 */
export function applyReduceMotionClass(enabled) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (enabled) {
    if (!root.classList.contains("reduce-motion")) {
      root.classList.add("reduce-motion");
    }
  } else {
    root.classList.remove("reduce-motion");
  }
}

/**
 * Applies the active font size data attribute and class on document.documentElement.
 * @param {string} size - "smaller" | "small" | "default" | "large" | "larger"
 */
export function applyFontSizeClass(size) {
  if (typeof document === "undefined" || !document.documentElement) return;
  const root = document.documentElement;
  const validSize = FONT_SIZE_LEVELS.includes(size) ? size : "default";

  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-font-size", validSize);
  }

  if (root.classList) {
    FONT_SIZE_LEVELS.forEach((lvl) => {
      root.classList.remove(`font-size-${lvl}`);
    });
    root.classList.add(`font-size-${validSize}`);
  }
}

/**
 * Applies or removes the .pointer-cursor class on document.documentElement.
 * @param {boolean} enabled
 */
export function applyPointerCursorClass(enabled) {
  if (typeof document === "undefined" || !document.documentElement) return;
  const root = document.documentElement;
  if (typeof root.setAttribute === "function") {
    root.setAttribute("data-pointer-cursor", enabled ? "true" : "false");
  }
  if (root.classList) {
    if (enabled) {
      if (!root.classList.contains("pointer-cursor")) {
        root.classList.add("pointer-cursor");
      }
    } else {
      root.classList.remove("pointer-cursor");
    }
  }
}

// In-memory cache to prevent expensive synchronous localStorage scans on every component mount
let cachedReduceMotion = null;
let cachedHighContrast = null;
let cachedFontSize = null;
let cachedPointerCursor = null;

export function invalidateAccessibilityCache() {
  cachedReduceMotion = null;
  cachedHighContrast = null;
  cachedFontSize = null;
  cachedPointerCursor = null;
}

/**
 * Reads the current high contrast preference from localStorage.
 * Checks user-scoped key first (if provided), then global key, then scans for any active user key.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getHighContrastPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (!userId && cachedHighContrast !== null) return cachedHighContrast;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserHighContrastKey(userId));
      if (userVal !== null) {
        const val = userVal === "true";
        cachedHighContrast = val;
        return val;
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_HIGH_CONTRAST_KEY);
    if (globalVal !== null) {
      const val = globalVal === "true";
      cachedHighContrast = val;
      return val;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pup_high_contrast_")) {
        if (localStorage.getItem(key) === "true") {
          cachedHighContrast = true;
          return true;
        }
      }
    }
    cachedHighContrast = false;
  } catch {
    // Ignore localStorage access errors
  }

  return false;
}

/**
 * Reads the current reduce motion preference from localStorage.
 * Checks user-scoped key first (if provided), then global key, then scans for any active user key.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getReduceMotionPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  if (!userId && cachedReduceMotion !== null) return cachedReduceMotion;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserReduceMotionKey(userId));
      if (userVal !== null) {
        const val = userVal === "true";
        cachedReduceMotion = val;
        return val;
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_REDUCE_MOTION_KEY);
    if (globalVal !== null) {
      const val = globalVal === "true";
      cachedReduceMotion = val;
      return val;
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pup_reduce_motion_")) {
        if (localStorage.getItem(key) === "true") {
          cachedReduceMotion = true;
          return true;
        }
      }
    }
    cachedReduceMotion = false;
  } catch {
    // Ignore localStorage access errors
  }

  return false;
}

/**
 * Updates the high contrast preference, updates localStorage,
 * applies the class to <html>, and dispatches custom and storage events.
 * @param {boolean} enabled 
 * @param {string|null} [userId] 
 */
export function setHighContrastPreference(enabled, userId = null) {
  const boolVal = Boolean(enabled);
  cachedHighContrast = boolVal;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_HIGH_CONTRAST_KEY, String(boolVal));
      if (userId) {
        localStorage.setItem(getUserHighContrastKey(userId), String(boolVal));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  applyHighContrastClass(boolVal);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HIGH_CONTRAST_EVENT, { detail: { enabled: boolVal, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return boolVal;
}

/**
 * Updates the reduce motion preference, updates localStorage,
 * applies the class to <html>, and dispatches custom and storage events.
 * @param {boolean} enabled
 * @param {string|null} [userId]
 */
export function setReduceMotionPreference(enabled, userId = null) {
  const boolVal = Boolean(enabled);
  cachedReduceMotion = boolVal;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_REDUCE_MOTION_KEY, String(boolVal));
      if (userId) {
        localStorage.setItem(getUserReduceMotionKey(userId), String(boolVal));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  applyReduceMotionClass(boolVal);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(REDUCE_MOTION_EVENT, { detail: { enabled: boolVal, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return boolVal;
}

/**
 * Toggles the high contrast state.
 * @param {string|null} [userId]
 * @returns {boolean} New state
 */
export function toggleHighContrastPreference(userId = null) {
  const current = getHighContrastPreference(userId);
  return setHighContrastPreference(!current, userId);
}

/**
 * Toggles the reduce motion state.
 * @param {string|null} [userId]
 * @returns {boolean} New state
 */
export function toggleReduceMotionPreference(userId = null) {
  const current = getReduceMotionPreference(userId);
  return setReduceMotionPreference(!current, userId);
}

/**
 * React hook that returns true if either the OS prefers-reduced-motion media query
 * is active OR the user has explicitly enabled "Reduce Motion" in app accessibility settings.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function useAppReducedMotion(userId = null) {
  const osReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [prefReduced, setPrefReduced] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPrefReduced(getReduceMotionPreference(userId));

    const handleCustomChange = (e) => {
      if (typeof e.detail?.enabled === "boolean") {
        setPrefReduced(e.detail.enabled);
      }
    };

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key === GLOBAL_REDUCE_MOTION_KEY ||
        e.key.startsWith("pup_reduce_motion_")
      ) {
        setPrefReduced(getReduceMotionPreference(userId));
      }
    };

    window.addEventListener(REDUCE_MOTION_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(REDUCE_MOTION_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [userId]);

  if (!mounted) {
    return false;
  }

  return Boolean(osReduced || prefReduced);
}

/**
 * Reads the current font size preference from localStorage.
 * @param {string|null} [userId]
 * @returns {string} "smaller" | "small" | "default" | "large" | "larger"
 */
export function getFontSizePreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return "default";
  if (!userId && cachedFontSize !== null) return cachedFontSize;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserFontSizeKey(userId));
      if (userVal && FONT_SIZE_LEVELS.includes(userVal)) {
        cachedFontSize = userVal;
        return userVal;
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_FONT_SIZE_KEY);
    if (globalVal && FONT_SIZE_LEVELS.includes(globalVal)) {
      cachedFontSize = globalVal;
      return globalVal;
    }
  } catch {
    // Ignore localStorage access errors
  }

  return "default";
}

/**
 * Updates the font size preference, updates localStorage,
 * applies data-font-size to <html>, and dispatches custom events.
 * @param {string} size
 * @param {string|null} [userId]
 * @returns {string}
 */
export function setFontSizePreference(size, userId = null) {
  const validSize = FONT_SIZE_LEVELS.includes(size) ? size : "default";
  cachedFontSize = validSize;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_FONT_SIZE_KEY, validSize);
      if (userId) {
        localStorage.setItem(getUserFontSizeKey(userId), validSize);
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  applyFontSizeClass(validSize);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(FONT_SIZE_EVENT, { detail: { size: validSize, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return validSize;
}

/**
 * Reads the current pointer cursor preference from localStorage.
 * Defaults to true so interactive controls provide tactile hand feedback.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getPointerCursorPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return true;
  if (!userId && cachedPointerCursor !== null) return cachedPointerCursor;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserPointerCursorKey(userId));
      if (userVal !== null) {
        const val = userVal === "true";
        cachedPointerCursor = val;
        return val;
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_POINTER_CURSOR_KEY);
    if (globalVal !== null) {
      const val = globalVal === "true";
      cachedPointerCursor = val;
      return val;
    }
  } catch {
    // Ignore localStorage access errors
  }

  return true;
}

/**
 * Updates the pointer cursor preference, updates localStorage,
 * applies class to <html>, and dispatches custom events.
 * @param {boolean} enabled
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function setPointerCursorPreference(enabled, userId = null) {
  const boolVal = Boolean(enabled);
  cachedPointerCursor = boolVal;

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(GLOBAL_POINTER_CURSOR_KEY, String(boolVal));
      if (userId) {
        localStorage.setItem(getUserPointerCursorKey(userId), String(boolVal));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  applyPointerCursorClass(boolVal);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(POINTER_CURSOR_EVENT, { detail: { enabled: boolVal, userId } })
    );
    window.dispatchEvent(new Event("storage"));
  }

  return boolVal;
}

/**
 * Toggles the pointer cursor state.
 * @param {string|null} [userId]
 * @returns {boolean} New state
 */
export function togglePointerCursorPreference(userId = null) {
  const current = getPointerCursorPreference(userId);
  return setPointerCursorPreference(!current, userId);
}

/**
 * React hook to observe active font size level.
 * @param {string|null} [userId]
 * @returns {string}
 */
export function useFontSize(userId = null) {
  const [fontSize, setFontSizeState] = useState(() => getFontSizePreference(userId));

  useEffect(() => {
    const handleCustomChange = (e) => {
      if (e.detail?.size && FONT_SIZE_LEVELS.includes(e.detail.size)) {
        setFontSizeState(e.detail.size);
      }
    };

    const handleStorageChange = (e) => {
      if (!e.key || e.key === GLOBAL_FONT_SIZE_KEY || e.key.startsWith("pup_font_size_")) {
        setFontSizeState(getFontSizePreference(userId));
      }
    };

    window.addEventListener(FONT_SIZE_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(FONT_SIZE_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [userId]);

  return fontSize;
}

/**
 * React hook to observe active pointer cursor state.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function usePointerCursor(userId = null) {
  const [pointerCursor, setPointerCursorState] = useState(() => getPointerCursorPreference(userId));

  useEffect(() => {
    const handleCustomChange = (e) => {
      if (typeof e.detail?.enabled === "boolean") {
        setPointerCursorState(e.detail.enabled);
      }
    };

    const handleStorageChange = (e) => {
      if (!e.key || e.key === GLOBAL_POINTER_CURSOR_KEY || e.key.startsWith("pup_pointer_cursor_")) {
        setPointerCursorState(getPointerCursorPreference(userId));
      }
    };

    window.addEventListener(POINTER_CURSOR_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(POINTER_CURSOR_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [userId]);

  return pointerCursor;
}
