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
 * Reads the current high contrast preference from localStorage.
 * Checks user-scoped key first (if provided), then global key, then scans for any active user key.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getHighContrastPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserHighContrastKey(userId));
      if (userVal !== null) {
        return userVal === "true";
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_HIGH_CONTRAST_KEY);
    if (globalVal !== null) {
      return globalVal === "true";
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pup_high_contrast_")) {
        if (localStorage.getItem(key) === "true") {
          return true;
        }
      }
    }
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

  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserReduceMotionKey(userId));
      if (userVal !== null) {
        return userVal === "true";
      }
    }

    const globalVal = localStorage.getItem(GLOBAL_REDUCE_MOTION_KEY);
    if (globalVal !== null) {
      return globalVal === "true";
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("pup_reduce_motion_")) {
        if (localStorage.getItem(key) === "true") {
          return true;
        }
      }
    }
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
  const [prefReduced, setPrefReduced] = useState(() => getReduceMotionPreference(userId));

  useEffect(() => {
    // Sync initial state
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

  return Boolean(osReduced || prefReduced);
}
