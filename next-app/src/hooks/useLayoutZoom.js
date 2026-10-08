"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export const ZOOM_SCALES = [0.75, 0.83, 0.92, 1.0, 1.08, 1.17, 1.25];
export const ZOOM_PERCENTAGES = [75, 83, 92, 100, 108, 117, 125];
export const DEFAULT_ZOOM_NODE = 3;

/**
 * Returns the localStorage key for persisting zoom preference.
 * @param {string|null} userId
 */
export function getZoomStorageKey(userId) {
  return userId ? `pup_zoom_node_${userId}` : "pup_zoom_node";
}

/**
 * Custom hook to manage layout zoom level with persistence across sessions and tabs.
 *
 * @param {object|null} authUser - Current authenticated user
 * @returns {object} { zoomNode, setZoomNode, handleZoomMouseDown, zoomFactor, zoomPercentage, zoomStyle }
 */
export function useLayoutZoom(authUser = null) {
  const userId = authUser?.id || null;
  const storageKey = getZoomStorageKey(userId);

  // Initialize zoom node from preferences, localStorage, or default (3 / 100%)
  const [zoomNode, setZoomNodeState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_ZOOM_NODE;
    
    // Check authUser preferences first
    if (authUser?.preferences?.zoom_node !== undefined && authUser.preferences.zoom_node !== null) {
      const prefNode = Number(authUser.preferences.zoom_node);
      if (Number.isInteger(prefNode) && prefNode >= 0 && prefNode <= 6) {
        return prefNode;
      }
    }

    // Check user-scoped localStorage
    if (userId) {
      const userStored = localStorage.getItem(`pup_zoom_node_${userId}`);
      if (userStored !== null) {
        const parsed = parseInt(userStored, 10);
        if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) return parsed;
      }
    }

    // Check global localStorage fallback
    const globalStored = localStorage.getItem("pup_zoom_node");
    if (globalStored !== null) {
      const parsed = parseInt(globalStored, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) return parsed;
    }

    return DEFAULT_ZOOM_NODE;
  });

  const zoomNodeRef = useRef(zoomNode);
  useEffect(() => {
    zoomNodeRef.current = zoomNode;
  }, [zoomNode]);

  const saveTimerRef = useRef(null);

  // Sync state if authUser preferences load after initial render
  useEffect(() => {
    if (authUser?.preferences?.zoom_node !== undefined && authUser.preferences.zoom_node !== null) {
      const prefNode = Number(authUser.preferences.zoom_node);
      if (Number.isInteger(prefNode) && prefNode >= 0 && prefNode <= 6 && prefNode !== zoomNodeRef.current) {
        setZoomNodeState(prefNode);
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, String(prefNode));
          localStorage.setItem("pup_zoom_node", String(prefNode));
        }
      }
    }
  }, [authUser?.preferences?.zoom_node, storageKey]);

  // Persist zoom changes to backend and localStorage
  const updateZoomNode = useCallback((nodeOrFn) => {
    setZoomNodeState((prev) => {
      const nextNode = typeof nodeOrFn === "function" ? nodeOrFn(prev) : nodeOrFn;
      const clamped = Math.max(0, Math.min(6, Math.round(nextNode)));
      if (clamped === prev) return prev;

      // Synchronously store to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, String(clamped));
          localStorage.setItem("pup_zoom_node", String(clamped));
        } catch {
          // ignore localStorage errors (e.g. storage quota)
        }
      }

      // If user is a staff/admin account, debounce-save preference to database
      if (authUser?.id && authUser?.role !== "Student") {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          try {
            await fetch("/api/auth/preferences", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ preferences: { zoom_node: clamped } }),
            });
            if (authUser?.preferences) {
              authUser.preferences.zoom_node = clamped;
            }
          } catch {
            // Background save error ignored, local state remains
          }
        }, 350);
      }

      return clamped;
    });
  }, [authUser, storageKey]);

  // Cleanup pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Handle command palette / header "change-zoom" custom events
  useEffect(() => {
    const handleZoomChange = (e) => {
      const { action } = e.detail || {};
      if (action === "in") updateZoomNode((prev) => Math.min(6, prev + 1));
      else if (action === "out") updateZoomNode((prev) => Math.max(0, prev - 1));
      else if (action === "reset") updateZoomNode(DEFAULT_ZOOM_NODE);
    };

    window.addEventListener("change-zoom", handleZoomChange);
    return () => window.removeEventListener("change-zoom", handleZoomChange);
  }, [updateZoomNode]);

  // Listen for storage events (sync across tabs)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === storageKey || e.key === "pup_zoom_node") {
        const val = parseInt(e.newValue, 10);
        if (Number.isInteger(val) && val >= 0 && val <= 6 && val !== zoomNodeRef.current) {
          setZoomNodeState(val);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  // Handle drag on the slider track
  const handleZoomMouseDown = useCallback((e) => {
    e.preventDefault();
    const track = e.currentTarget;

    const updateFromPosition = (clientX) => {
      const rect = track.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percentage = clickX / rect.width;
      const node = Math.max(0, Math.min(6, Math.round(percentage * 6)));
      updateZoomNode(node);
    };

    const isTouch = e.type === "touchstart";
    const startX = isTouch ? e.touches[0].clientX : e.clientX;
    updateFromPosition(startX);

    const handleMove = (moveEvent) => {
      const clientX = moveEvent.type === "touchmove" ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updateFromPosition(clientX);
    };

    const handleEnd = () => {
      if (isTouch) {
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      } else {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", handleMove, { passive: true });
      document.addEventListener("touchend", handleEnd);
    } else {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    }
  }, [updateZoomNode]);

  const scale = ZOOM_SCALES[zoomNode] ?? 1.0;
  const zoomPercentage = ZOOM_PERCENTAGES[zoomNode] ?? 100;

  const zoomStyle = useMemo(() => ({
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    width: `${100 / scale}%`,
    minHeight: `${100 / scale}%`,
  }), [scale]);

  return {
    zoomNode,
    setZoomNode: updateZoomNode,
    handleZoomMouseDown,
    zoomFactor: scale,
    zoomPercentage,
    zoomStyle,
  };
}
