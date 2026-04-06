"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPHDateTime } from "@/lib/timeFormat";

export default function AccountActivityPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/");
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
          return;
        }
        setAuthUser(json.data);
      } finally {
        setLoadingUser(false);
      }
    })();
  }, [router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * perPage;
      const res = await fetch(
        `/api/audit-logs?mine=1&limit=${perPage}&offset=${offset}&search=${encodeURIComponent(search)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to load activity");
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(json.total) || 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  useEffect(() => {
    if (loadingUser) return;
    if (!authUser) return;
    refresh();
  }, [loadingUser, authUser, refresh]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const displayPage = Math.min(page, totalPages);

  const displayRows = useMemo(() => rows, [rows]);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="h-16 bg-white border-b border-gray-200" />
        <main className="max-w-[1100px] mx-auto p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 font-inter">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1100px] mx-auto py-8 px-6">
        {/* Sleek Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-pup-maroon uppercase tracking-widest mb-1">
              <i className="ph-bold ph-clock-counter-clockwise"></i>
              Audit Activity
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Activity</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Recent actions performed by your account.</p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/account")}
            className="h-11 px-6 font-black uppercase tracking-widest text-xs border-gray-300 hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-sm flex items-center gap-2 shrink-0 rounded-brand group"
          >
            <i className="ph-bold ph-arrow-left transition-transform group-hover:-translate-x-1"></i>
            Return to Account
          </Button>
        </div>

        <Card className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                  Search Activity
                </label>
                <div className="relative">
                  <i className="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <Input
                    type="text"
                    placeholder="Search actions..."
                    className="pl-10 h-12 w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 items-end justify-end">
                <div className="w-40">
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    Items
                  </label>
                  <select
                    className="h-12 w-full rounded-brand border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-6 flex flex-col min-h-0">
            <div className={`flex-1 overflow-auto rounded-brand ${displayRows.length === 0 && !loading ? "" : "border border-gray-200"}`}>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-600">
                    <th className="p-3 font-bold w-52">Date & Time</th>
                    <th className="p-3 font-bold">Action</th>
                    <th className="p-3 font-bold text-right w-40">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <Skeleton className="h-4 w-40" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-[70%]" />
                        </td>
                        <td className="p-3 text-right">
                          <Skeleton className="h-4 w-28 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : displayRows.length === 0 ? (
                    <tr className="border-0 hover:bg-transparent">
                      <td colSpan={3} className="p-0 border-0">
                        <div className="h-[320px] flex flex-col items-center justify-center text-center text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
                            <i className="ph-duotone ph-clock-counter-clockwise text-3xl text-pup-maroon"></i>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            No activity yet
                          </div>
                          <div className="text-sm font-medium text-gray-600 mt-1 max-w-md">
                            Actions performed by your account will appear here.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                          {formatPHDateTime(r.created_at)}
                        </td>
                        <td className="p-3 text-xs font-medium text-gray-700">
                          {r.action}
                        </td>
                        <td className="p-3 text-right font-mono text-[11px] text-gray-400">
                          {r.ip || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 ? (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500">
                  Showing {(displayPage - 1) * perPage + 1}-
                  {Math.min(displayPage * perPage, total)} of{" "}
                  <strong className="text-gray-900">{total.toLocaleString()}</strong>{" "}
                  activity entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    <i className="ph-bold ph-caret-left"></i> Previous
                  </Button>
                  <div className="px-3 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-md h-8 flex items-center justify-center min-w-12 shadow-sm">
                    {displayPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={displayPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs font-bold text-gray-600"
                  >
                    Next <i className="ph-bold ph-caret-right"></i>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

