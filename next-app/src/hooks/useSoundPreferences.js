"use client";

import { useState, useEffect } from "react";
import {
  getSoundEnabledPreference,
  getSoundVolumePreference,
  getSoundCategoriesPreference,
  invalidateSoundPreferencesCache,
  SOUND_PREFS_EVENT,
  SOUND_ENABLED_EVENT,
  SOUND_VOLUME_EVENT,
  SOUND_CATEGORIES_EVENT,
} from "@/lib/soundPreferences";

/**
 * React hook that subscribes to sound preferences in real time across tabs and components.
 * @param {string|null} [userId]
 */
export function useSoundPreferences(userId = null) {
  const [state, setState] = useState(() => ({
    enabled: getSoundEnabledPreference(userId),
    volume: getSoundVolumePreference(userId),
    categories: getSoundCategoriesPreference(userId),
  }));

  useEffect(() => {
    const sync = () => {
      invalidateSoundPreferencesCache();
      setState({
        enabled: getSoundEnabledPreference(userId),
        volume: getSoundVolumePreference(userId),
        categories: getSoundCategoriesPreference(userId),
      });
    };

    sync();

    window.addEventListener(SOUND_PREFS_EVENT, sync);
    window.addEventListener(SOUND_ENABLED_EVENT, sync);
    window.addEventListener(SOUND_VOLUME_EVENT, sync);
    window.addEventListener(SOUND_CATEGORIES_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(SOUND_PREFS_EVENT, sync);
      window.removeEventListener(SOUND_ENABLED_EVENT, sync);
      window.removeEventListener(SOUND_VOLUME_EVENT, sync);
      window.removeEventListener(SOUND_CATEGORIES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  return state;
}

export default useSoundPreferences;
