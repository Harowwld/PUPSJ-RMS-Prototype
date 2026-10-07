"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getClientSession, installSessionFetch, refreshClientSession, subscribeSessionExpiry } from "@/lib/clientAuth";

export default function SessionRefresh() {
  const pathname = usePathname();

  useEffect(() => {
    let timer;
    let stopped = false;
    let expiresAt = null;
    const protectedPage = /^\/(admin|staff|systemadmin|superadmin|student|account)(\/|$)/.test(pathname || "");
    const restoreFetch = installSessionFetch();

    const renew = async () => {
      try {
        const renewed = await refreshClientSession();
        if (!renewed && !stopped && expiresAt) {
          clearTimeout(timer);
          timer = setTimeout(renew, 30_000);
        }
      } catch {
        // A temporary network failure should not end a valid session.
        if (!stopped && expiresAt) {
          clearTimeout(timer);
          timer = setTimeout(renew, 30_000);
        }
      }
    };
    const unsubscribe = subscribeSessionExpiry((expiry) => {
      expiresAt = expiry;
      clearTimeout(timer);
      if (!stopped && expiry) {
        timer = setTimeout(renew, Math.max(1000, expiry * 1000 - Date.now() - 60_000));
      }
    });
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      if (expiresAt && expiresAt * 1000 - Date.now() <= 60_000) void renew();
      else if (protectedPage && !expiresAt) void getClientSession().catch(() => {});
    };
    if (protectedPage) void getClientSession().catch(() => {});
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      restoreFetch();
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [pathname]);

  return null;
}
