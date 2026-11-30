"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton"
import { getRoleBranding } from "@/lib/roleBranding"
import { getClientSession } from "@/lib/clientAuth"
import { getPageAccessRedirect } from "@/lib/roleUtils"

import {
  applyHighContrastClass,
  getHighContrastPreference,
  setHighContrastPreference,
  applyReduceMotionClass,
  getReduceMotionPreference,
  setReduceMotionPreference,
  applyFontSizeClass,
  getFontSizePreference,
  setFontSizePreference,
  applyPointerCursorClass,
  getPointerCursorPreference,
  setPointerCursorPreference,
} from "@/lib/accessibility"

export const AuthUserContext = createContext(null)
export const useAuthUser = () => useContext(AuthUserContext)

/**
 * Higher-order component that protects routes requiring authentication
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {React.ReactNode} props.fallback - Loading skeleton matching the page layout (optional)
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: "/login")
 */
export function AuthGuard({ children, fallback, redirectTo = "/login", requiredPath = null }) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let stopped = false;
    let retryTimer;
    const checkAuth = async () => {
      let retrying = false;
      try {
        const session = await getClientSession()
        if (stopped) return;
        if (session.status >= 500 || session.status === 429) {
          retrying = true;
          retryTimer = setTimeout(checkAuth, 30_000);
          return;
        }
        console.info("[auth-debug] route_guard.session_response", { path: window.location.pathname, status: session.status })

        if (!session.ok) {
          console.info("[auth-debug] route_guard.redirect_invalid_session", { path: window.location.pathname, redirectTo })
          router.push(redirectTo)
          return
        }

        if (!session.data) {
          router.push(redirectTo)
          return
        }

        const user = session.data
        setCurrentUser(user)

        // Setup role branding CSS variables at root level
        if (typeof window !== "undefined" && user) {
          const branding = getRoleBranding(user);
          if (branding?.color) {
          }
        }

        // Setup accessibility scaling, high contrast, reduce motion, font size, and pointer cursor preferences
        if (user && user.id) {
          let highContrast = user.preferences?.high_contrast;
          if (typeof highContrast === "boolean") {
            setHighContrastPreference(highContrast, user.id);
          } else {
            highContrast = getHighContrastPreference(user.id);
            applyHighContrastClass(highContrast);
          }

          let reduceMotion = user.preferences?.reduce_motion;
          if (typeof reduceMotion === "boolean") {
            setReduceMotionPreference(reduceMotion, user.id);
          } else {
            reduceMotion = getReduceMotionPreference(user.id);
            applyReduceMotionClass(reduceMotion);
          }

          let fontSize = user.preferences?.font_size;
          if (fontSize) {
            setFontSizePreference(fontSize, user.id);
          } else {
            fontSize = getFontSizePreference(user.id);
            applyFontSizeClass(fontSize);
          }

          let pointerCursor = user.preferences?.pointer_cursor;
          if (typeof pointerCursor === "boolean") {
            setPointerCursorPreference(pointerCursor, user.id);
          } else {
            pointerCursor = getPointerCursorPreference(user.id);
            applyPointerCursorClass(pointerCursor);
          }
        }

        // Check if user is active (case-insensitive for safety)
        if (String(user.status || "").toLowerCase() !== "active") {
          console.info("[auth-debug] route_guard.redirect_inactive_account", { path: window.location.pathname, status: user.status, redirectTo })
          console.log("[AuthGuard] Inactive user access attempt:", user.status)
          router.push(redirectTo)
          return
        }

        const pageRedirect = requiredPath ? getPageAccessRedirect(requiredPath, user.role) : null
        if (pageRedirect) {
          router.replace(pageRedirect)
          return
        }

        setIsAuthorized(true)
      } catch (err) {
        console.error("[AuthGuard] Validation error:", err)
        if (!stopped) {
          retrying = true;
          retryTimer = setTimeout(checkAuth, 30_000);
        }
      } finally {
        if (!stopped && !retrying) setIsLoading(false)
      }
    };
    checkAuth();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
    };
  }, [router, redirectTo, requiredPath])

  useEffect(() => {
    const handleStorageChange = () => {
      const highContrast = getHighContrastPreference();
      applyHighContrastClass(highContrast);
      const reduceMotion = getReduceMotionPreference();
      applyReduceMotionClass(reduceMotion);
      const fontSize = getFontSizePreference();
      applyFontSizeClass(fontSize);
      const pointerCursor = getPointerCursorPreference();
      applyPointerCursorClass(pointerCursor);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handlePreferencesChanged = (e) => {
      if (e?.detail?.preferences) {
        setCurrentUser((prev) =>
          prev ? { ...prev, preferences: { ...(prev.preferences || {}), ...e.detail.preferences } } : prev
        );
      }
    };
    window.addEventListener("user-preferences-changed", handlePreferencesChanged);
    return () => {
      window.removeEventListener("user-preferences-changed", handlePreferencesChanged);
    };
  }, []);

  if (isLoading) {
    return fallback ?? <DashboardShellSkeleton />
  }

  // Render children if authorized, otherwise render nothing (redirect will happen)
  return isAuthorized ? (
    <AuthUserContext.Provider value={currentUser}>
      {React.isValidElement(children)
        ? React.cloneElement(children, { authUser: currentUser })
        : children}
    </AuthUserContext.Provider>
  ) : null
}

/**
 * Specific guard for systemadmin-only routes
 */
export function SystemAdminGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback} requiredPath="/systemadmin">{children}</AuthGuard>
}

export function SuperAdminGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback} requiredPath="/systemadmin">{children}</AuthGuard>
}

/**
 * Specific guard for admin-only routes
 */
export function AdminGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback} requiredPath="/admin">{children}</AuthGuard>
}

/**
 * Specific guard for staff routes (Staff and Admin)
 */
export function StaffGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback} requiredPath="/staff">{children}</AuthGuard>
}

/**
 * Hook to check authentication status without redirecting
 * @returns {object} { user: object|null, isLoading: boolean, isAuthenticated: boolean }
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getClientSession()

        if (session.ok && session.data) {
          setUser(session.data)
          setIsAuthenticated(session.data.status === "Active")
        }
      } catch (err) {
        console.error("[useAuth] Auth check failed:", err)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  return { user, isLoading, isAuthenticated }
}
