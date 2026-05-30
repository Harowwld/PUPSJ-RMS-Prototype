"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { isAdminRole, isStaffRole } from "@/lib/roleUtils"

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
 * @param {string[]} props.allowedRoles - Array of allowed roles (e.g., ["Admin", "Staff"])
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: "/")
 */
export function AuthGuard({ allowedRoles = [], children, redirectTo = "/" }) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        if (!res.ok) {
          if (res.status === 401) {
            console.log(
              "[AuthGuard] Unauthorized access attempt, redirecting to:",
              redirectTo
            )
            router.push(redirectTo)
            return
          }
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        const json = await res.json()
        if (!json?.ok || !json?.data) {
          setIsAuthorized(false)
          setIsLoading(false)
          return
        }

        const user = json.data

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
          console.log("[AuthGuard] Inactive user access attempt:", user.status)
          router.push(redirectTo)
          return
        }

        // Check role requirements
        if (allowedRoles.length > 0) {
          const userRole = String(user.role || "").toLowerCase()
          
          let hasRequiredRole = false
          if (allowedRoles.includes("Admin")) {
            if (isAdminRole(userRole)) hasRequiredRole = true
          }
          if (!hasRequiredRole && allowedRoles.includes("Staff")) {
            if (isStaffRole(userRole)) hasRequiredRole = true
          }
          
          // Fallback to strict array comparison if not explicitly handled
          if (!hasRequiredRole) {
            hasRequiredRole = allowedRoles.some(
              (role) => String(role).toLowerCase() === userRole
            )
          }

          if (!hasRequiredRole) {
            console.log("[AuthGuard] Insufficient role privileges:", {
              userRole: user.role,
              requiredRoles: allowedRoles,
            })

            // Redirect staff to appropriate page if they try to access admin
            if (isStaffRole(userRole) && allowedRoles.includes("Admin")) {
              router.push("/staff")
              return
            }

            router.push(redirectTo)
            return
          }
        }

        setIsAuthorized(true)
      } catch (err) {
        console.error("[AuthGuard] Auth check failed:", err)
        setIsAuthorized(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, allowedRoles, redirectTo])

  useEffect(() => {
    const handleStorageChange = () => {
      // Re-read storage/preferences and apply
      fetch("/api/auth/me")
        .then(res => res.json())
        .then(json => {
          if (json?.ok && json?.data) {
            const user = json.data;
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
      <div className="font-inter flex h-screen flex-col gap-4 overflow-hidden bg-gray-50 p-4 dark:bg-card">
        <Skeleton className="h-16 w-full shrink-0 rounded-brand" />
        <div className="flex flex-1 gap-4">
          <Skeleton className="h-full w-[30%] rounded-brand" />
          <Skeleton className="h-full w-[70%] rounded-brand" />
        </div>
      </div>
    )
  }

  // Render children if authorized, otherwise render nothing (redirect will happen)
  return isAuthorized ? children : null
}

/**
 * Specific guard for admin-only routes
 */
export function AdminGuard({ children }) {
  return <AuthGuard allowedRoles={["Admin"]}>{children}</AuthGuard>
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
        const res = await fetch("/api/auth/me", { cache: "no-store" })

        if (res.ok) {
          const json = await res.json()
          if (json?.ok && json?.data) {
            setUser(json.data)
            setIsAuthenticated(json.data.status === "Active")
          }
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

