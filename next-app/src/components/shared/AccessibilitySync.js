"use client";

import { useEffect } from "react";
import {
  applyHighContrastClass,
  getHighContrastPreference,
  setHighContrastPreference,
  HIGH_CONTRAST_EVENT,
} from "@/lib/accessibility";
import { getClientSession } from "@/lib/clientAuth";

export default function AccessibilitySync() {
  useEffect(() => {
    // 1. Immediately apply stored high contrast state on mount
    const initialHc = getHighContrastPreference();
    applyHighContrastClass(initialHc);

    // 2. Sync with user session if available
    let stopped = false;
    getClientSession()
      .then((session) => {
        if (stopped || !session?.ok || !session?.data) return;
        const user = session.data;
        if (!user?.id) return;

        const dbPref = user.preferences?.high_contrast;
        const currentLocal = getHighContrastPreference(user.id);

        if (dbPref !== undefined && dbPref !== null) {
          // If local has not been explicitly configured but DB has it, adopt DB preference
          if (currentLocal !== dbPref) {
            setHighContrastPreference(Boolean(dbPref), user.id);
          }
        }
      })
      .catch(() => {});

    // 3. Listen for cross-component and cross-tab events
    const handleCustomChange = (e) => {
      const enabled = e.detail?.enabled;
      if (typeof enabled === "boolean") {
        applyHighContrastClass(enabled);
      }
    };

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key === "pup_high_contrast" ||
        e.key.startsWith("pup_high_contrast_")
      ) {
        const hc = getHighContrastPreference();
        applyHighContrastClass(hc);
      }
    };

    window.addEventListener(HIGH_CONTRAST_EVENT, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      stopped = true;
      window.removeEventListener(HIGH_CONTRAST_EVENT, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}
