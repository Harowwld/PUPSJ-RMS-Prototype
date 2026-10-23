"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientSession } from "@/lib/clientAuth";
import { getDefaultDashboardPath } from "@/lib/roleUtils";

const VALID_TABS = new Set(["profile", "security", "preferences", "activity"]);

function AccountRedirect() {
  const router = useRouter();
  const [dashboardPath, setDashboardPath] = useState(null);

  useEffect(() => {
    (async () => {
      let target = "/staff";
      try {
        const session = await getClientSession();
        if (session.ok && session.data) {
          target = getDefaultDashboardPath(session.data.role);
        } else {
          router.replace("/login");
          return;
        }
      } catch {
        router.replace("/login");
        return;
      }
      setDashboardPath(target);
      const tab = new URLSearchParams(window.location.search).get("tab");
      const suffix = tab && VALID_TABS.has(tab) ? `&tab=${tab}` : "";
      router.replace(`${target}?view=settings${suffix}`, { scroll: false });
    })();
  }, [router]);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-jakarta">
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto py-6 px-4 sm:px-8">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card min-h-[600px]">
            <div className="p-6 border-b border-border dark:border-border flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="w-48 h-6" />
                <Skeleton className="w-72 h-4" />
              </div>
              <Skeleton className="w-28 h-10 rounded-xl" />
            </div>
            <div className="p-8 space-y-6">
              <Skeleton className="w-40 h-6" />
              <Skeleton className="w-full h-32 rounded-xl" />
              <Skeleton className="w-full h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AccountPage() {
  return <AccountRedirect />;
}
