"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import DashboardShellSkeleton from "@/components/shared/DashboardShellSkeleton"
import { getRoleBranding } from "@/lib/roleBranding"
import { getClientSession } from "@/lib/clientAuth"

import {
  applyHighContrastClass,
  getHighContrastPreference,
  setHighContrastPreference,
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
export function AuthGuard({ children, fallback, redirectTo = "/login" }) {
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

        // Setup accessibility scaling and high contrast preferences
        if (user && user.id) {
          let highContrast = user.preferences?.high_contrast;
          if (typeof highContrast === "boolean") {
            setHighContrastPreference(highContrast, user.id);
          } else {
            highContrast = getHighContrastPreference(user.id);
            applyHighContrastClass(highContrast);
          }
        }

        // Check if user is active (case-insensitive for safety)
        if (String(user.status || "").toLowerCase() !== "active") {
          console.info("[auth-debug] route_guard.redirect_inactive_account", { path: window.location.pathname, status: user.status, redirectTo })
          console.log("[AuthGuard] Inactive user access attempt:", user.status)
          router.push(redirectTo)
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
  }, [router, redirectTo])

  useEffect(() => {
    const handleStorageChange = () => {
      const highContrast = getHighContrastPreference();
      applyHighContrastClass(highContrast);
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Show loading skeleton while checking authentication — mirrors the actual
  // dashboard layout (sidebar + workspace, no page header). Pages pass their
  // own page-matched skeleton via the `fallback` prop.
  if (isLoading) {
    if (fallback) {
      return fallback
    }
    return (
      <DashboardShellSkeleton
        items={[
          { key: "overview", label: "Overview" },
          { type: "header", label: "Records" },
          { key: "records", label: "Records" },
          { key: "requests", label: "Requests" },
          { type: "header", label: "System" },
          { key: "settings", label: "Settings" },
        ]}
      >
        <div className="flex flex-1 flex-col min-h-full w-full gap-6 animate-fade-up">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card flex flex-col flex-1 min-h-[500px] mb-4 isolate">
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48 rounded dark:bg-muted" />
                <Skeleton className="h-3.5 w-72 rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            </div>

            {/* Toolbar Row */}
            <div className="h-14 border-t border-border dark:border-border p-4 px-6 flex items-center justify-between bg-gray-50/40 dark:bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-64 rounded-xl dark:bg-muted" />
                <Skeleton className="h-9 w-32 rounded-xl dark:bg-muted" />
              </div>
              <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            </div>

            {/* Table Body Rows */}
            <div className="p-6 space-y-4 flex-1 rounded-b-2xl">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 border-b border-border dark:border-border flex items-center justify-between last:border-b-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-6 w-20 rounded-full dark:bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DashboardShellSkeleton>
    )
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
  return <AuthGuard fallback={fallback}>{children}</AuthGuard>
}

export function SuperAdminGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback}>{children}</AuthGuard>
}

/**
 * Specific guard for admin-only routes
 */
export function AdminGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback}>{children}</AuthGuard>
}

/**
 * Specific guard for staff routes (any authenticated user)
 */
export function StaffGuard({ children, fallback }) {
  return <AuthGuard fallback={fallback}>{children}</AuthGuard>
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
