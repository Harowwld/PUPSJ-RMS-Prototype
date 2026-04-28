"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Higher-order component that protects routes requiring authentication
 * @param {object} props
 * @param {string[]} props.allowedRoles - Array of allowed roles (e.g., ["Admin", "Staff"])
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: "/")
 */
export function AuthGuard({ allowedRoles = [], children, redirectTo = "/" }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log("[AuthGuard] Unauthorized access attempt, redirecting to:", redirectTo);
            router.push(redirectTo);
            return;
          }
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const json = await res.json();
        if (!json?.ok || !json?.data) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const user = json.data;
        
        // Check if user is active
        if (user.status !== "Active") {
          console.log("[AuthGuard] Inactive user access attempt:", user.status);
          router.push(redirectTo);
          return;
        }

        // Check role requirements
        if (allowedRoles.length > 0) {
          const userRole = String(user.role || "").toLowerCase();
          const hasRequiredRole = allowedRoles.some(role => 
            String(role).toLowerCase() === userRole
          );
          
          if (!hasRequiredRole) {
            console.log("[AuthGuard] Insufficient role privileges:", {
              userRole: user.role,
              requiredRoles: allowedRoles
            });
            
            // Redirect staff to appropriate page if they try to access admin
            if (userRole.includes("staff") && allowedRoles.includes("Admin")) {
              router.push("/staff");
              return;
            }
            
            router.push(redirectTo);
            return;
          }
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error("[AuthGuard] Auth check failed:", err);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, allowedRoles, redirectTo]);

  // Show loading skeleton while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col font-inter overflow-hidden p-4 gap-4">
        <Skeleton className="h-16 w-full rounded-brand shrink-0" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="w-[30%] h-full rounded-brand" />
          <Skeleton className="w-[70%] h-full rounded-brand" />
        </div>
      </div>
    );
  }

  // Render children if authorized, otherwise render nothing (redirect will happen)
  return isAuthorized ? children : null;
}

/**
 * Specific guard for admin-only routes
 */
export function AdminGuard({ children }) {
  return <AuthGuard allowedRoles={["Admin"]}>{children}</AuthGuard>;
}

/**
 * Specific guard for staff routes (any authenticated user)
 */
export function StaffGuard({ children }) {
  return <AuthGuard>{children}</AuthGuard>;
}

/**
 * Hook to check authentication status without redirecting
 * @returns {object} { user: object|null, isLoading: boolean, isAuthenticated: boolean }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        
        if (res.ok) {
          const json = await res.json();
          if (json?.ok && json?.data) {
            setUser(json.data);
            setIsAuthenticated(json.data.status === "Active");
          }
        }
      } catch (err) {
        console.error("[useAuth] Auth check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, isLoading, isAuthenticated };
}
