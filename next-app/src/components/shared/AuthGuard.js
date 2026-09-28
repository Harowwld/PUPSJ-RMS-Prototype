"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getRoleBranding } from "@/lib/roleBranding"
import { getClientSession } from "@/lib/clientAuth"

export const AuthUserContext = createContext(null)
export const useAuthUser = () => useContext(AuthUserContext)

function applyAccessibility(highContrast) {
  if (typeof window === "undefined") return;
  
  if (highContrast) {
    document.documentElement.classList.add("high-contrast");
  } else {
    document.documentElement.classList.remove("high-contrast");
  }
}

/**
 * Higher-order component that protects routes requiring authentication
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: "/")
 */
export function AuthGuard({ children, redirectTo = "/" }) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getClientSession()
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
            document.documentElement.style.setProperty("--brand-accent", branding.color);
            document.documentElement.style.setProperty("--brand-foreground", branding.foreground || "#ffffff");
            document.documentElement.setAttribute("data-brand-accent", branding.color);
            document.documentElement.setAttribute("data-brand-foreground", branding.foreground || "#ffffff");
          }
        }

        // Setup accessibility scaling and high contrast preferences
        if (user && user.id) {
          const hcKey = `pup_high_contrast_${user.id}`;
          
          let highContrast = user.preferences?.high_contrast;
          
          if (localStorage.getItem(hcKey) !== null) {
            highContrast = localStorage.getItem(hcKey) === "true";
          } else {
            localStorage.setItem(hcKey, String(!!highContrast));
          }
          
          applyAccessibility(highContrast);
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
        router.push(redirectTo)
      } finally {
        setIsLoading(false)
      }
    };
    checkAuth();
  }, [router, redirectTo])

  useEffect(() => {
    const handleStorageChange = () => {
      // Re-read storage/preferences and apply
      getClientSession()
        .then(session => {
          if (session.ok && session.data) {
            const user = session.data;
            const hcKey = `pup_high_contrast_${user.id}`;
            
            const highContrast = localStorage.getItem(hcKey) === "true";
            
            applyAccessibility(highContrast);
          }
        })
        .catch(err => console.error(err));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Show loading skeleton while checking authentication
  if (isLoading) {
    return (
      <div className="font-jakarta flex min-h-screen flex-col gap-4 bg-gray-50 p-4 dark:bg-card">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[30%] rounded-brand" />
          <Skeleton className="h-full w-[70%] rounded-brand" />
        </div>
      </div>
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
export function SystemAdminGuard({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

export function SuperAdminGuard({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

/**
 * Specific guard for admin-only routes
 */
export function AdminGuard({ children }) {
  return <AuthGuard>{children}</AuthGuard>
}

/**
 * Specific guard for staff routes (any authenticated user)
 */
export function StaffGuard({ children }) {
  return <AuthGuard>{children}</AuthGuard>
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
