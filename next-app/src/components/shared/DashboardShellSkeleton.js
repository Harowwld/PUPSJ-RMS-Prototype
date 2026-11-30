"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useLayoutZoom } from "@/hooks/useLayoutZoom"

const navigationPlaceholders = [
  { key: "first" },
  { type: "header" },
  { key: "second" },
  { key: "third" },
  { type: "header" },
  { key: "fourth" },
]

/** Initial dashboard layout with placeholders for navigation and the workspace. */
export default function DashboardShellSkeleton({ children }) {
  const { zoomStyle } = useLayoutZoom()

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-jakarta dark:bg-zinc-950/30 select-none">
      <span role="status" className="sr-only">Loading dashboard</span>

      {/* Shared dashboard liquid-gradient background */}
      <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Main Body with Sidebar + Main Workspace (no page header in this layout) */}
      <div
        inert
        className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row"
        style={zoomStyle}
      >
        {/* Mobile Top Bar (< md) — shared Sidebar renders this in place of a page header */}
        <div className="md:hidden flex h-[52px] w-full shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/80 px-3 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
            <Skeleton className="h-[22px] w-[22px] rounded dark:bg-muted" />
            <Skeleton className="h-4 w-[88px] rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
            <Skeleton className="h-8 w-8 rounded-full dark:bg-muted" />
          </div>
        </div>

        {/* Sidebar Skeleton — mirrors shared Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-full w-[275px] shrink-0 flex-col overflow-hidden bg-white/25 px-3 py-3 backdrop-blur-xl dark:bg-zinc-950/25">
          {/* 1. Top Row: Logo + Collapse Button */}
          <div className="mb-4 flex h-[40px] w-full shrink-0 items-center justify-between px-1">
            <div className="flex items-center min-w-0">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                <Skeleton className="h-[22px] w-[22px] shrink-0 rounded dark:bg-muted" />
              </div>
              <Skeleton className="ml-1.5 h-4 w-[88px] rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-lg dark:bg-muted" />
          </div>

          {/* 2. Command Palette Trigger */}
          <div className="mb-2 w-full shrink-0">
            <div className="flex h-[38px] w-full items-center justify-between rounded-xl border border-black/[0.06] bg-black/[0.04] pl-1 pr-2.5 dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center min-w-0">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="h-4 w-4 shrink-0 rounded dark:bg-muted" />
                </div>
                <Skeleton className="ml-1.5 h-3.5 w-[130px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full dark:bg-muted" />
            </div>
          </div>

          {/* 3. Navigation Items */}
          <div className="flex min-h-0 w-full flex-1 flex-col gap-[2px] overflow-y-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigationPlaceholders.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`header-${idx}`} className="mb-1 mt-3 h-[22px] shrink-0 px-2">
                    <Skeleton className="h-2.5 w-[124px] rounded dark:bg-muted" />
                  </div>
                )
              }

              return (
                <div
                  key={item.key}
                  className="flex h-[40px] w-full shrink-0 items-center rounded-xl px-1"
                >
                  <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                    <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="ml-1.5 h-3.5 w-[140px] rounded dark:bg-muted" />
                </div>
              )
            })}
          </div>

          {/* 4. Bottom: Profile Menu */}
          <div className="mt-auto flex w-full shrink-0 justify-center border-t border-gray-200/80 pt-2 dark:border-white/10">
            <div className="flex w-full items-center rounded-xl px-1 py-1.5">
              <div className="flex h-9 w-[38px] shrink-0 items-center justify-center">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full dark:bg-muted" />
              </div>
              <div className="ml-1.5 flex min-w-0 flex-1 flex-col gap-1 leading-tight">
                <Skeleton className="h-3 w-[104px] rounded dark:bg-muted" />
                <Skeleton className="h-2.5 w-[76px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="mr-1 h-3 w-3 shrink-0 rounded dark:bg-muted" />
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton Area */}
        <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white dark:bg-zinc-950/50 flex flex-col">
          <div className="flex w-full flex-[1_0_auto] min-h-full flex-col p-2 md:pl-1 [&>*]:flex-[1_0_auto]">
            {children ?? (
              <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card">
                <div className="space-y-2 border-b border-border p-4 sm:p-6">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-64 max-w-full" />
                </div>
                <div className="space-y-4 p-4 sm:p-6">
                  <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
