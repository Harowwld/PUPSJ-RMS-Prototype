"use client";

import { useEffect } from "react";
import {
  applyHighContrastClass,
  getHighContrastPreference,
  setHighContrastPreference,
  HIGH_CONTRAST_EVENT,
  applyReduceMotionClass,
  getReduceMotionPreference,
  setReduceMotionPreference,
  REDUCE_MOTION_EVENT,
  applyFontSizeClass,
  getFontSizePreference,
  setFontSizePreference,
  FONT_SIZE_EVENT,
  applyPointerCursorClass,
  getPointerCursorPreference,
  setPointerCursorPreference,
  POINTER_CURSOR_EVENT,
} from "@/lib/accessibility";
import { getClientSession } from "@/lib/clientAuth";

export default function AccessibilitySync() {
  useEffect(() => {
    // 1. Immediately apply stored accessibility states on mount
    const initialHc = getHighContrastPreference();
    applyHighContrastClass(initialHc);

    const initialRm = getReduceMotionPreference();
    applyReduceMotionClass(initialRm);

    const initialFs = getFontSizePreference();
    applyFontSizeClass(initialFs);

    const initialPc = getPointerCursorPreference();
    applyPointerCursorClass(initialPc);

    // 2. Sync with user session if available
    let stopped = false;
    getClientSession()
      .then((session) => {
        if (stopped || !session?.ok || !session?.data) return;
        const user = session.data;
        if (!user?.id) return;

        // Sync high contrast
        const dbHc = user.preferences?.high_contrast;
        const currentLocalHc = getHighContrastPreference(user.id);
        if (dbHc !== undefined && dbHc !== null) {
          if (currentLocalHc !== dbHc) {
            setHighContrastPreference(Boolean(dbHc), user.id);
          }
        }

        // Sync reduce motion
        const dbRm = user.preferences?.reduce_motion;
        const currentLocalRm = getReduceMotionPreference(user.id);
        if (dbRm !== undefined && dbRm !== null) {
          if (currentLocalRm !== dbRm) {
            setReduceMotionPreference(Boolean(dbRm), user.id);
          }
        }

        // Sync font size
        const dbFs = user.preferences?.font_size;
        const currentLocalFs = getFontSizePreference(user.id);
        if (dbFs) {
          if (currentLocalFs !== dbFs) {
            setFontSizePreference(dbFs, user.id);
          }
        }

        // Sync pointer cursor
        const dbPc = user.preferences?.pointer_cursor;
        const currentLocalPc = getPointerCursorPreference(user.id);
        if (dbPc !== undefined && dbPc !== null) {
          if (currentLocalPc !== dbPc) {
            setPointerCursorPreference(Boolean(dbPc), user.id);
          }
        }
      })
      .catch(() => {});

    // 3. Listen for cross-component and cross-tab events
    const handleContrastChange = (e) => {
      const enabled = e.detail?.enabled;
      if (typeof enabled === "boolean") {
        applyHighContrastClass(enabled);
      }
    };

    const handleMotionChange = (e) => {
      const enabled = e.detail?.enabled;
      if (typeof enabled === "boolean") {
        applyReduceMotionClass(enabled);
      }
    };

    const handleFontSizeChange = (e) => {
      const size = e.detail?.size;
      if (size) {
        applyFontSizeClass(size);
      }
    };

    const handlePointerCursorChange = (e) => {
      const enabled = e.detail?.enabled;
      if (typeof enabled === "boolean") {
        applyPointerCursorClass(enabled);
      }
    };

    const handleStorageChange = (e) => {
      if (
        !e.key ||
        e.key === "pup_high_contrast" ||
        e.key.startsWith("pup_high_contrast_")
      ) {
        applyHighContrastClass(getHighContrastPreference());
      }
      if (
        !e.key ||
        e.key === "pup_reduce_motion" ||
        e.key.startsWith("pup_reduce_motion_")
      ) {
        applyReduceMotionClass(getReduceMotionPreference());
      }
      if (
        !e.key ||
        e.key === "pup_font_size" ||
        e.key.startsWith("pup_font_size_")
      ) {
        applyFontSizeClass(getFontSizePreference());
      }
      if (
        !e.key ||
        e.key === "pup_pointer_cursor" ||
        e.key.startsWith("pup_pointer_cursor_")
      ) {
        applyPointerCursorClass(getPointerCursorPreference());
      }
    };

    window.addEventListener(HIGH_CONTRAST_EVENT, handleContrastChange);
    window.addEventListener(REDUCE_MOTION_EVENT, handleMotionChange);
    window.addEventListener(FONT_SIZE_EVENT, handleFontSizeChange);
    window.addEventListener(POINTER_CURSOR_EVENT, handlePointerCursorChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      stopped = true;
      window.removeEventListener(HIGH_CONTRAST_EVENT, handleContrastChange);
      window.removeEventListener(REDUCE_MOTION_EVENT, handleMotionChange);
      window.removeEventListener(FONT_SIZE_EVENT, handleFontSizeChange);
      window.removeEventListener(POINTER_CURSOR_EVENT, handlePointerCursorChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}
