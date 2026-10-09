/**
 * Accessibility utility module for PUPSJ RMS.
 * Manages high contrast state, localStorage persistence, and cross-tab/cross-page synchronization.
 */

export const GLOBAL_HIGH_CONTRAST_KEY = "pup_high_contrast";
export const HIGH_CONTRAST_EVENT = "pup-high-contrast-change";

/**
 * Returns the localStorage key for a specific user ID.
 * @param {string|null} userId 
 * @returns {string}
 */
export function getUserHighContrastKey(userId) {
  return userId ? `pup_high_contrast_${userId}` : GLOBAL_HIGH_CONTRAST_KEY;
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
 * Reads the current high contrast preference from localStorage.
 * Checks user-scoped key first (if provided), then global key, then scans for any active user key.
 * @param {string|null} [userId]
 * @returns {boolean}
 */
export function getHighContrastPreference(userId = null) {
  if (typeof window === "undefined" || !window.localStorage) return false;

  try {
    // 1. Check user-scoped key if userId is provided
    if (userId) {
      const userVal = localStorage.getItem(getUserHighContrastKey(userId));
      if (userVal !== null) {
        return userVal === "true";
      }
    }

    // 2. Check global fallback key
    const globalVal = localStorage.getItem(GLOBAL_HIGH_CONTRAST_KEY);
    if (globalVal !== null) {
      return globalVal === "true";
    }

    // 3. Fallback scan for any user-scoped key
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
 * Updates the high contrast preference, updates localStorage (both global and user-scoped),
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
    // Dispatch local custom event
    window.dispatchEvent(
      new CustomEvent(HIGH_CONTRAST_EVENT, { detail: { enabled: boolVal, userId } })
    );

    // Dispatch synthetic storage event to inform components listening to "storage"
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
